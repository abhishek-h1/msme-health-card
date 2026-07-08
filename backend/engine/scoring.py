"""MSME Health Card scoring engine.

Takes the raw synthetic data for one business (as produced by
`backend/data/generator.py`) and computes 7 sub-scores plus a combined overall
Health Score, all on a 0-100 scale.

Sub-scores:
    1. revenue_stability   - GST turnover trend/consistency (falls back to UPI
                              inflow for thin-file businesses, see below)
    2. cash_flow_health    - UPI inflow/outflow ratio, level + consistency
    3. liquidity           - bank balance relative to monthly expenses
    4. compliance          - GST filing + EPFO contribution timeliness
    5. concentration       - customer/vendor concentration (synthesized proxy,
                              see ASSUMPTION note on score_concentration)
    6. invoice_collection  - bounced-payment frequency, recency-weighted
    7. digital_footprint   - how much data exists across all sources at all;
                              doubles as a confidence indicator

MISSING-DATA HANDLING (see compute_overall): a sub-score is only marked
unavailable when *all* of its underlying data sources are absent. When that
happens, the overall score is a weighted average over the remaining
available sub-scores with weights renormalized to sum to 1 -- an unavailable
sub-score is dropped, not scored as 0. This is what stops a data gap (e.g. a
sole proprietor with no EPFO because they have no employees) from unfairly
tanking the overall Health Score.
"""

from __future__ import annotations

import random
import statistics
from typing import Optional

# ---------------------------------------------------------------------------
# Weights
# ---------------------------------------------------------------------------

SUB_SCORE_LABELS = {
    "revenue_stability": "Revenue Stability",
    "cash_flow_health": "Cash Flow Health",
    "liquidity": "Liquidity / Working Capital",
    "compliance": "Compliance & Formality",
    "concentration": "Customer/Vendor Concentration",
    "invoice_collection": "Invoice Collection Efficiency",
    "digital_footprint": "Digital Footprint Depth",
}

DEFAULT_WEIGHTS: dict[str, float] = {
    "revenue_stability": 0.20,
    "cash_flow_health": 0.20,
    "liquidity": 0.15,
    "compliance": 0.15,
    "concentration": 0.10,
    "invoice_collection": 0.10,
    "digital_footprint": 0.10,
}

# Per-sector overrides layered on top of DEFAULT_WEIGHTS, e.g. to weight
# compliance higher for manufacturing once there's real feedback to tune
# against. Empty for now -- this is the hook for that future tuning.
SECTOR_WEIGHT_OVERRIDES: dict[str, dict[str, float]] = {}


def get_weights(sector: Optional[str]) -> dict[str, float]:
    weights = dict(DEFAULT_WEIGHTS)
    if sector and sector in SECTOR_WEIGHT_OVERRIDES:
        weights.update(SECTOR_WEIGHT_OVERRIDES[sector])
    return weights


# ---------------------------------------------------------------------------
# Small numeric helpers shared across sub-scores
# ---------------------------------------------------------------------------

def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    return numerator / denominator if denominator else default


def filter_by_month(records: list[dict], months_window: Optional[set[str]]) -> list[dict]:
    if months_window is None:
        return records
    return [r for r in records if r["month"] in months_window]


def trend_and_consistency(values: list[float]) -> dict:
    """Shared level-trend/consistency helper used by several sub-scores.

    consistency_score: 100 when the series has ~zero relative variance, decaying
    as the coefficient of variation grows.
    trend_score: 50 = flat, 100 = ~+50% growth from first half to second half of
    the series, 0 = ~-50% decline. Used in place of true YoY growth since this
    dataset only covers a single 12-month window (no prior-year data to compare).
    """
    n = len(values)
    if n == 0:
        return {"consistency_score": 50.0, "trend_score": 50.0, "trend_pct": 0.0, "cv": 0.0}
    if n == 1:
        return {"consistency_score": 60.0, "trend_score": 50.0, "trend_pct": 0.0, "cv": 0.0}

    mean_val = statistics.mean(values)
    cv = safe_div(statistics.pstdev(values), mean_val)
    consistency_score = clamp(100 - cv * 150)

    half = n // 2
    mean_first = statistics.mean(values[:half])
    mean_second = statistics.mean(values[half:])
    trend_pct = safe_div(mean_second - mean_first, mean_first)
    trend_score = clamp(50 + trend_pct * 100)

    return {
        "consistency_score": round(consistency_score, 2),
        "trend_score": round(trend_score, 2),
        "trend_pct": round(trend_pct, 4),
        "cv": round(cv, 4),
    }


# ---------------------------------------------------------------------------
# Sub-score 1: Revenue Stability
# ---------------------------------------------------------------------------

def score_revenue_stability(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    filings = filter_by_month(raw["gst"]["filings"], months_window)

    if len(filings) >= 6:
        values = [f["turnover_reported"] for f in filings]
        source = "gst_turnover"
    else:
        # ASSUMPTION/FALLBACK: thin-file businesses have too little (or zero)
        # GST history to assess a revenue trend from filings alone. UPI inflow
        # exists for the full window regardless of GST registration, so we use
        # it as a turnover proxy instead of failing/zeroing this sub-score.
        upi_rows = filter_by_month(raw["upi"]["monthly_summary"], months_window)
        values = [r["inflow_amount"] for r in upi_rows]
        source = "upi_inflow_proxy"

    if not values:
        return {"score": None, "available": False, "details": {"reason": "no revenue data available"}}

    stats = trend_and_consistency(values)
    score = clamp(0.5 * stats["trend_score"] + 0.5 * stats["consistency_score"])
    return {
        "score": round(score, 2),
        "available": True,
        "details": {"source": source, "num_months": len(values), **stats},
    }


# ---------------------------------------------------------------------------
# Sub-score 2: Cash Flow Health
# ---------------------------------------------------------------------------

def score_cash_flow_health(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    rows = filter_by_month(raw["upi"]["monthly_summary"], months_window)
    if not rows:
        return {"score": None, "available": False, "details": {"reason": "no UPI data available"}}

    ratios = []
    for r in rows:
        if r["outflow_amount"] > 0:
            ratios.append(min(r["inflow_amount"] / r["outflow_amount"], 3.0))
        else:
            ratios.append(3.0 if r["inflow_amount"] > 0 else 1.0)

    stats = trend_and_consistency(ratios)
    level_score = clamp(50 + (statistics.mean(ratios) - 1) * 100)
    score = clamp(0.5 * level_score + 0.3 * stats["consistency_score"] + 0.2 * stats["trend_score"])
    return {
        "score": round(score, 2),
        "available": True,
        "details": {"avg_inflow_outflow_ratio": round(statistics.mean(ratios), 3), **stats},
    }


# ---------------------------------------------------------------------------
# Sub-score 3: Liquidity / Working Capital
# ---------------------------------------------------------------------------

def score_liquidity(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    bank_rows = filter_by_month(raw["bank"]["monthly_summary"], months_window)
    if not bank_rows:
        return {"score": None, "available": False, "details": {"reason": "no bank data available"}}

    upi_expense_by_month = {
        r["month"]: r["outflow_amount"] for r in filter_by_month(raw["upi"]["monthly_summary"], months_window)
    }
    # "Months of buffer" = average balance / that month's outflow (expense proxy).
    buffer_months = [
        safe_div(r["average_balance"], upi_expense_by_month.get(r["month"], 0), default=3.0)
        for r in bank_rows
    ]

    stats = trend_and_consistency(buffer_months)
    avg_buffer = statistics.mean(buffer_months)
    level_score = clamp(avg_buffer * 40)  # ~2.5 months of buffer -> 100
    score = clamp(0.6 * level_score + 0.4 * stats["trend_score"])
    return {
        "score": round(score, 2),
        "available": True,
        "details": {"avg_months_buffer": round(avg_buffer, 2), "trend_pct": stats["trend_pct"]},
    }


# ---------------------------------------------------------------------------
# Sub-score 4: Compliance & Formality
# ---------------------------------------------------------------------------

STATUS_WEIGHTS = {
    "filed_on_time": 100.0,
    "on_time": 100.0,
    "filed_late": 50.0,
    "delayed": 50.0,
    "missed": 0.0,
}


def score_compliance(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    components = []
    details: dict = {}

    filings = filter_by_month(raw["gst"]["filings"], months_window)
    if raw["gst"]["gstin_registered"] and filings:
        gst_component = statistics.mean(STATUS_WEIGHTS[f["status"]] for f in filings)
        components.append(gst_component)
        details["gst_component"] = round(gst_component, 2)
        details["gst_filings_considered"] = len(filings)

    epfo_rows = filter_by_month(raw["epfo"]["monthly_contributions"], months_window)
    if raw["epfo"]["epfo_registered"] and epfo_rows:
        epfo_component = statistics.mean(STATUS_WEIGHTS[r["status"]] for r in epfo_rows)
        components.append(epfo_component)
        details["epfo_component"] = round(epfo_component, 2)
        details["epfo_months_considered"] = len(epfo_rows)

    # --- MISSING-DATA HANDLING (key pitch point) ---
    # A sole proprietor with zero employees has no EPFO records -- that is not
    # a compliance failure, it's a non-applicable data source. We average over
    # whichever of GST/EPFO actually exist, rather than treating a missing one
    # as a 0. Only when *neither* signal exists (fully informal, no employees)
    # is this whole sub-score marked unavailable, which then triggers the
    # overall-score reweighting in compute_overall instead of tanking the score.
    if not components:
        return {"score": None, "available": False, "details": {"reason": "no GST or EPFO compliance records available"}}

    score = statistics.mean(components)
    return {"score": round(score, 2), "available": True, "details": details}


# ---------------------------------------------------------------------------
# Sub-score 5: Customer/Vendor Concentration
# ---------------------------------------------------------------------------

def score_concentration(raw: dict) -> dict:
    """
    ASSUMPTION: backend/data/generator.py does not currently emit per-counterparty
    UPI transaction breakdowns -- only aggregate daily inflow/outflow. In the
    absence of real counterparty-level data, this synthesizes a plausible
    counterparty distribution as a stand-in proxy, deterministically seeded from
    the business_id (not true randomness) so results are stable across calls.
    Swap this out for a real distribution once the UPI/AA integration exposes one.

    Unlike the other sub-scores this is intentionally NOT windowed by month --
    counterparty concentration is treated as a structural property of the
    business rather than something that should wobble month to month.
    """
    total_txn = sum(r["txn_count"] for r in raw["upi"]["monthly_summary"])
    if total_txn <= 0:
        return {"score": None, "available": False, "details": {"reason": "no UPI transactions to assess"}}

    business_id = raw["business_id"]
    rng = random.Random(f"concentration-proxy:{business_id}")
    num_counterparties = max(3, min(40, round(total_txn / 15)))
    # Lower alpha -> more skewed/concentrated distribution; higher -> more even.
    # Derived deterministically from the business id, not sampled at request time.
    alpha = 0.3 + (sum(business_id.encode()) % 100) / 100 * 1.2
    samples = [rng.gammavariate(alpha, 1.0) for _ in range(num_counterparties)]
    total = sum(samples) or 1.0
    shares = [s / total for s in samples]

    hhi = sum(s * s for s in shares)  # Herfindahl-Hirschman Index: 1/n (even) .. 1 (single counterparty)
    score = clamp(100 * (1 - hhi))
    top3_share = round(sum(sorted(shares, reverse=True)[:3]), 3)

    return {
        "score": round(score, 2),
        "available": True,
        "details": {
            "assumption": "synthesized counterparty distribution (generator has no real counterparty data)",
            "estimated_counterparties": num_counterparties,
            "hhi": round(hhi, 4),
            "top3_counterparty_share": top3_share,
        },
    }


# ---------------------------------------------------------------------------
# Sub-score 6: Invoice Collection Efficiency
# ---------------------------------------------------------------------------

def score_invoice_collection(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    rows = filter_by_month(raw["bank"]["monthly_summary"], months_window)
    if not rows:
        return {"score": None, "available": False, "details": {"reason": "no bank data available"}}

    bounce_counts = [r["bounced_payments_count"] for r in rows]
    avg_bounces = statistics.mean(bounce_counts)

    # Recent bounce activity is more predictive of a *current* collection
    # problem than an old one-off, so weight the most recent third more heavily.
    n = len(bounce_counts)
    recent_cut = max(1, n - max(1, n // 3))
    recent_slice = bounce_counts[recent_cut:] or bounce_counts
    recent_avg = statistics.mean(recent_slice)

    weighted_bounces = 0.4 * avg_bounces + 0.6 * recent_avg
    score = clamp(100 - weighted_bounces * 25)
    return {
        "score": round(score, 2),
        "available": True,
        "details": {
            "avg_monthly_bounces": round(avg_bounces, 2),
            "recent_avg_monthly_bounces": round(recent_avg, 2),
        },
    }


# ---------------------------------------------------------------------------
# Sub-score 7: Digital Footprint Depth
# ---------------------------------------------------------------------------

def score_digital_footprint(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    months_in_window = months_window if months_window is not None else set(raw["period"]["months"])
    num_months = max(1, len(months_in_window))

    gst_filings = filter_by_month(raw["gst"]["filings"], months_window)
    upi_rows = filter_by_month(raw["upi"]["monthly_summary"], months_window)
    bank_rows = filter_by_month(raw["bank"]["monthly_summary"], months_window)
    epfo_rows = filter_by_month(raw["epfo"]["monthly_contributions"], months_window)

    gst_coverage = safe_div(len(gst_filings), num_months)
    epfo_coverage = safe_div(len(epfo_rows), num_months) if raw["epfo"]["epfo_registered"] else 0.0
    bank_coverage = 1.0 if bank_rows else 0.0

    total_txn = sum(r["txn_count"] for r in upi_rows)
    # Rough heuristic, not a calibrated threshold: ~60 UPI txns/month is
    # treated as a "rich" digital footprint for a business this size.
    volume_benchmark = 60 * num_months
    upi_volume_score = clamp(safe_div(total_txn, volume_benchmark), 0, 1)

    depth = 25 * gst_coverage + 25 * upi_volume_score + 25 * bank_coverage + 25 * epfo_coverage

    return {
        "score": round(clamp(depth), 2),
        "available": True,  # this sub-score is itself the confidence indicator; it is never "missing"
        "details": {
            "gst_months_present": len(gst_filings),
            "epfo_months_present": len(epfo_rows),
            "upi_txn_count": total_txn,
            "sources_present": {
                "gst": len(gst_filings) > 0,
                "upi": len(upi_rows) > 0,
                "bank": len(bank_rows) > 0,
                "epfo": raw["epfo"]["epfo_registered"],
            },
        },
    }


# ---------------------------------------------------------------------------
# Combining sub-scores into the overall Health Score
# ---------------------------------------------------------------------------

def compute_overall(sub_scores: dict[str, dict], sector: Optional[str]) -> tuple[float, dict[str, float]]:
    """Weighted average of available sub-scores, with missing ones dropped and
    remaining weights renormalized to sum to 1 -- see module docstring."""
    weights = get_weights(sector)
    available = {k: v for k, v in sub_scores.items() if v["available"]}
    total_weight = sum(weights[k] for k in available)
    if total_weight == 0:
        return 0.0, {}

    normalized_weights = {k: weights[k] / total_weight for k in available}
    overall = sum(sub_scores[k]["score"] * normalized_weights[k] for k in available)
    return round(clamp(overall), 2), {k: round(w, 4) for k, w in normalized_weights.items()}


def compute_score_snapshot(raw: dict, months_window: Optional[set[str]] = None) -> dict:
    sub_scores = {
        "revenue_stability": score_revenue_stability(raw, months_window),
        "cash_flow_health": score_cash_flow_health(raw, months_window),
        "liquidity": score_liquidity(raw, months_window),
        "compliance": score_compliance(raw, months_window),
        "concentration": score_concentration(raw),  # structural, not windowed -- see docstring
        "invoice_collection": score_invoice_collection(raw, months_window),
        "digital_footprint": score_digital_footprint(raw, months_window),
    }
    overall_score, weights_used = compute_overall(sub_scores, raw.get("sector"))
    return {"overall_score": overall_score, "sub_scores": sub_scores, "weights_used": weights_used}


def compute_monthly_trend(raw: dict, num_months: int = 6) -> list[dict]:
    """Overall score for each of the last `num_months`, each computed from a
    trailing 6-month window of data ending at that month. This is what lets the
    frontend plot a trend line that visibly moves for e.g. a declining business."""
    months = raw["period"]["months"]
    trend = []
    for i in range(len(months) - num_months, len(months)):
        window = set(months[max(0, i - 5):i + 1])
        snapshot = compute_score_snapshot(raw, months_window=window)
        trend.append({"month": months[i], "overall_score": snapshot["overall_score"]})
    return trend


def score_business(raw: dict) -> dict:
    """Top-level entry point: full scoring result for one business's raw data."""
    snapshot = compute_score_snapshot(raw, months_window=None)
    monthly_trend = compute_monthly_trend(raw, num_months=6)

    data_completeness = {
        "gst": raw["gst"]["gstin_registered"] and len(raw["gst"]["filings"]) > 0,
        "upi": len(raw["upi"]["monthly_summary"]) > 0,
        "bank": len(raw["bank"]["monthly_summary"]) > 0,
        "epfo": raw["epfo"]["epfo_registered"],
    }

    sub_scores = {
        key: {
            "label": SUB_SCORE_LABELS[key],
            "score": value["score"],
            "available": value["available"],
            "details": value["details"],
        }
        for key, value in snapshot["sub_scores"].items()
    }

    return {
        "business_id": raw["business_id"],
        "name": raw["name"],
        "overall_score": snapshot["overall_score"],
        "weights_used": snapshot["weights_used"],
        "sub_scores": sub_scores,
        "monthly_trend": monthly_trend,
        "data_completeness": data_completeness,
    }
