"""Synthetic data generator for the MSME Health Card demo.

Generates 12 months of GST, UPI, Account Aggregator (bank), and EPFO data for a
fixed roster of fictional MSMEs. Businesses are deliberately varied (thin-file but
healthy, declining-on-paper, and a stable/growing/seasonal mix) so the scoring
engine has meaningful contrast to demo against.

Run directly to (re)write the JSON files under backend/data/synthetic/:

    python data/generator.py
"""

from __future__ import annotations

import calendar
import json
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

SYNTHETIC_DIR = Path(__file__).resolve().parent / "synthetic"

# Deterministic seed so re-running the generator reproduces the same demo data.
SEED = "msme-health-card-2026"

NUM_MONTHS = 12
# The 12-month window ends with the month this dataset was authored in.
END_YEAR, END_MONTH = 2026, 7

EPF_CONTRIBUTION_RATE = 0.24  # combined employer + employee share, for mock purposes


@dataclass
class BusinessSpec:
    business_id: str
    name: str
    sector: str
    archetype: str  # thin_file_strong_cashflow | declining_on_paper | stable | growing | volatile_seasonal
    registration_type: str  # sole_proprietor | partnership | pvt_ltd
    base_monthly_turnover: float
    has_epfo: bool = True
    base_employee_count: int = 0
    gst_registered: bool = True
    # Index into the 12-month window from which GST filings begin (thin-file
    # businesses that only recently registered). None when gst_registered is False.
    gst_registered_from_index: Optional[int] = 0


SECTOR_META = {
    "Apparel & Tailoring Services": dict(
        merchant_category="Apparel & Fashion", avg_ticket=700, avg_wage=14000,
        weekend_pattern="weekend_heavy", season="none",
    ),
    "Home-Based Food & Catering": dict(
        merchant_category="Food & Beverage", avg_ticket=350, avg_wage=12000,
        weekend_pattern="weekend_heavy", season="none",
    ),
    "Electronics Repair Services": dict(
        merchant_category="Electronics & Repair Services", avg_ticket=900, avg_wage=15000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Retail & Grocery": dict(
        merchant_category="Grocery & Retail", avg_ticket=450, avg_wage=13000,
        weekend_pattern="weekend_heavy", season="none",
    ),
    "Apparel Manufacturing": dict(
        merchant_category="Apparel & Textiles", avg_ticket=15000, avg_wage=16000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Auto Parts Trading": dict(
        merchant_category="Automotive Parts", avg_ticket=3500, avg_wage=17000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Printing & Packaging": dict(
        merchant_category="Printing & Packaging", avg_ticket=6000, avg_wage=16000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Wholesale Trading": dict(
        merchant_category="Wholesale Trade", avg_ticket=12000, avg_wage=18000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Textile Trading": dict(
        merchant_category="Textiles", avg_ticket=8000, avg_wage=15000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Restaurant & Food Service": dict(
        merchant_category="Food & Beverage", avg_ticket=500, avg_wage=13000,
        weekend_pattern="weekend_heavy", season="festive_winter",
    ),
    "Logistics & Transport": dict(
        merchant_category="Transport & Logistics", avg_ticket=9000, avg_wage=16000,
        weekend_pattern="weekday_heavy", season="fiscal_year_end",
    ),
    "Furniture Manufacturing": dict(
        merchant_category="Furniture & Home Goods", avg_ticket=20000, avg_wage=15000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Personal Care Services": dict(
        merchant_category="Personal Care & Salons", avg_ticket=800, avg_wage=12000,
        weekend_pattern="weekend_heavy", season="none",
    ),
    "Pharmacy & Retail": dict(
        merchant_category="Pharmacy & Healthcare", avg_ticket=400, avg_wage=14000,
        weekend_pattern="weekend_heavy", season="none",
    ),
    "Wholesale Stationery": dict(
        merchant_category="Stationery & Office Supplies", avg_ticket=5000, avg_wage=14000,
        weekend_pattern="weekday_heavy", season="none",
    ),
    "Electrical Goods Retail": dict(
        merchant_category="Electrical & Electronics Retail", avg_ticket=4000, avg_wage=15000,
        weekend_pattern="weekend_heavy", season="electrical_dual",
    ),
}

SEASON_PROFILES = {
    "festive_winter": {"peak": {10, 11, 12}, "low": {6, 7, 8}},
    "fiscal_year_end": {"peak": {3, 10, 11}, "low": {6, 7}},
    "electrical_dual": {"peak": {4, 5, 6, 10, 11}, "low": {7, 8}},
    "none": {"peak": set(), "low": set()},
}

BUSINESS_SPECS: list[BusinessSpec] = [
    # -- 3-4 "strong but thin-file": little/no GST or EPFO history, strong UPI cash flow --
    BusinessSpec(
        "MSME-001", "Rekha Fashions", "Apparel & Tailoring Services",
        "thin_file_strong_cashflow", "sole_proprietor", 350_000,
        has_epfo=False, gst_registered=False, gst_registered_from_index=None,
    ),
    BusinessSpec(
        "MSME-002", "Sunrise Tiffin Services", "Home-Based Food & Catering",
        "thin_file_strong_cashflow", "sole_proprietor", 280_000,
        has_epfo=False, gst_registered=False, gst_registered_from_index=None,
    ),
    BusinessSpec(
        "MSME-003", "QuickFix Mobile Repair", "Electronics Repair Services",
        "thin_file_strong_cashflow", "sole_proprietor", 420_000,
        has_epfo=False, gst_registered=True, gst_registered_from_index=8,
    ),
    BusinessSpec(
        "MSME-004", "Om Sai Kirana Store", "Retail & Grocery",
        "thin_file_strong_cashflow", "sole_proprietor", 500_000,
        has_epfo=False, gst_registered=True, gst_registered_from_index=9,
    ),
    # -- 3-4 "looks good on paper but declining": solid GST history, recent negative trend --
    BusinessSpec(
        "MSME-005", "Vishal Garments Manufacturing Pvt Ltd", "Apparel Manufacturing",
        "declining_on_paper", "pvt_ltd", 4_200_000, base_employee_count=38,
    ),
    BusinessSpec(
        "MSME-006", "Prime Auto Components", "Auto Parts Trading",
        "declining_on_paper", "partnership", 2_600_000, base_employee_count=14,
    ),
    BusinessSpec(
        "MSME-007", "Balaji Print & Packaging", "Printing & Packaging",
        "declining_on_paper", "partnership", 1_800_000, base_employee_count=11,
    ),
    BusinessSpec(
        "MSME-008", "Coastal Traders Pvt Ltd", "Wholesale Trading",
        "declining_on_paper", "pvt_ltd", 3_500_000, base_employee_count=22,
    ),
    # -- remainder: stable / growing / volatile-seasonal mix --
    BusinessSpec(
        "MSME-009", "Ganga Textile Traders", "Textile Trading",
        "growing", "partnership", 1_500_000, base_employee_count=9,
    ),
    BusinessSpec(
        "MSME-010", "Spice Route Multicuisine Restaurant", "Restaurant & Food Service",
        "volatile_seasonal", "partnership", 900_000, base_employee_count=12,
    ),
    BusinessSpec(
        "MSME-011", "FixIt Electronics Repair Hub", "Electronics Repair Services",
        "stable", "sole_proprietor", 380_000, has_epfo=False,
    ),
    BusinessSpec(
        "MSME-012", "Shree Logistics & Carriers", "Logistics & Transport",
        "volatile_seasonal", "partnership", 2_200_000, base_employee_count=20,
    ),
    BusinessSpec(
        "MSME-013", "Himalayan Furniture Works", "Furniture Manufacturing",
        "growing", "partnership", 1_600_000, base_employee_count=16,
    ),
    BusinessSpec(
        "MSME-014", "Nova Beauty & Salon Chain", "Personal Care Services",
        "growing", "pvt_ltd", 1_100_000, base_employee_count=18,
    ),
    BusinessSpec(
        "MSME-015", "Annapurna Grocery Mart", "Retail & Grocery",
        "stable", "sole_proprietor", 600_000, has_epfo=False,
    ),
    BusinessSpec(
        "MSME-016", "Metro Family Pharmacy", "Pharmacy & Retail",
        "stable", "partnership", 950_000, base_employee_count=6,
    ),
    BusinessSpec(
        "MSME-017", "Vraj Stationery Wholesalers", "Wholesale Stationery",
        "stable", "partnership", 1_300_000, base_employee_count=8,
    ),
    BusinessSpec(
        "MSME-018", "Bright Spark Electricals", "Electrical Goods Retail",
        "volatile_seasonal", "partnership", 1_700_000, base_employee_count=10,
    ),
]


def month_sequence(end_year: int, end_month: int, count: int) -> list[tuple[int, int]]:
    months = []
    y, m = end_year, end_month
    for _ in range(count):
        months.append((y, m))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    months.reverse()
    return months


MONTHS = month_sequence(END_YEAR, END_MONTH, NUM_MONTHS)


def month_str(y: int, m: int) -> str:
    return f"{y:04d}-{m:02d}"


def add_months(y: int, m: int, delta: int) -> tuple[int, int]:
    total = y * 12 + (m - 1) + delta
    return total // 12, total % 12 + 1


def seasonal_factor(month: int, season: str) -> float:
    profile = SEASON_PROFILES[season]
    if month in profile["peak"]:
        return 1.3
    if month in profile["low"]:
        return 0.7
    return 1.0


def weekend_multiplier(weekday: int, pattern: str) -> float:
    if pattern == "weekend_heavy":
        return {4: 1.1, 5: 1.4, 6: 1.3}.get(weekday, 0.9)
    if pattern == "weekday_heavy":
        return 0.6 if weekday == 5 else 0.4 if weekday == 6 else 1.15
    return 1.0


def build_monthly_turnover(spec: BusinessSpec, rng: random.Random) -> list[float]:
    n = NUM_MONTHS
    base = spec.base_monthly_turnover
    season = SECTOR_META[spec.sector]["season"]
    values = []
    for i, (_, m) in enumerate(MONTHS):
        if spec.archetype == "thin_file_strong_cashflow":
            level = 1.0 + 0.18 * (i / (n - 1))
            noise = rng.uniform(0.94, 1.06)
        elif spec.archetype == "declining_on_paper":
            if i < n - 4:
                level = 1.0 + rng.uniform(-0.05, 0.05)
            else:
                recency = (i - (n - 4) + 1) / 4
                level = 1.0 - 0.55 * recency
            noise = rng.uniform(0.95, 1.05)
        elif spec.archetype == "growing":
            level = 1.0 + 0.5 * (i / (n - 1))
            noise = rng.uniform(0.93, 1.07)
        elif spec.archetype == "volatile_seasonal":
            level = seasonal_factor(m, season)
            noise = rng.uniform(0.85, 1.15)
        else:  # stable
            level = 1.0
            noise = rng.uniform(0.90, 1.10)
        values.append(round(base * level * noise, 2))
    return values


def gst_filing_outcome(spec: BusinessSpec, month_idx: int, rng: random.Random) -> tuple[str, Optional[int]]:
    n = NUM_MONTHS
    if spec.archetype == "declining_on_paper" and month_idx >= n - 4:
        recency = (month_idx - (n - 4) + 1) / 4
        missed_p = 0.12 + 0.20 * recency
        late_p = 0.35
        r = rng.random()
        if r < missed_p:
            return "missed", None
        if r < missed_p + late_p:
            return "filed_late", rng.randint(5, 12 + round(recency * 15))
        return "filed_on_time", rng.randint(-3, 0)
    if spec.archetype == "thin_file_strong_cashflow":
        r = rng.random()
        if r < 0.85:
            return "filed_on_time", rng.randint(-3, 0)
        if r < 0.97:
            return "filed_late", rng.randint(1, 8)
        return "missed", None
    r = rng.random()
    if r < 0.92:
        return "filed_on_time", rng.randint(-5, 0)
    if r < 0.98:
        return "filed_late", rng.randint(1, 10)
    return "missed", None


def generate_gst(spec: BusinessSpec, rng: random.Random, monthly_turnover: list[float]) -> dict:
    if not spec.gst_registered:
        return {"gstin_registered": False, "registered_since": None, "filings": []}

    start_index = spec.gst_registered_from_index or 0
    filings = []
    for i, (y, m) in enumerate(MONTHS):
        if i < start_index:
            continue
        status, offset = gst_filing_outcome(spec, i, rng)
        next_y, next_m = add_months(y, m, 1)
        due_date = date(next_y, next_m, 20)
        if status == "missed":
            filing_date = None
            days_late = None
        else:
            filing_date = due_date + timedelta(days=offset)
            days_late = max(0, offset)
        turnover_reported = round(monthly_turnover[i] * rng.uniform(0.97, 1.03), 2)
        filings.append({
            "month": month_str(y, m),
            "turnover_reported": turnover_reported,
            "due_date": due_date.isoformat(),
            "filing_date": filing_date.isoformat() if filing_date else None,
            "status": status,
            "days_late": days_late,
        })

    registered_since = month_str(*MONTHS[start_index])
    return {"gstin_registered": True, "registered_since": registered_since, "filings": filings}


def outflow_ratio(spec: BusinessSpec, month_idx: int) -> float:
    n = NUM_MONTHS
    if spec.archetype == "declining_on_paper":
        if month_idx < n - 4:
            return 0.62
        recency = (month_idx - (n - 4) + 1) / 4
        return 0.62 + 0.45 * recency
    return {
        "thin_file_strong_cashflow": 0.50,
        "growing": 0.58,
        "stable": 0.60,
        "volatile_seasonal": 0.63,
    }[spec.archetype]


def upi_share(spec: BusinessSpec) -> float:
    return {
        "thin_file_strong_cashflow": 0.90,
        "declining_on_paper": 0.40,
        "growing": 0.45,
        "stable": 0.45,
        "volatile_seasonal": 0.45,
    }[spec.archetype]


def generate_upi(spec: BusinessSpec, rng: random.Random, monthly_turnover: list[float]) -> dict:
    meta = SECTOR_META[spec.sector]
    avg_ticket = meta["avg_ticket"]
    share = upi_share(spec)
    daily = []

    for i, (y, m) in enumerate(MONTHS):
        days_in_month = calendar.monthrange(y, m)[1]
        month_inflow_total = monthly_turnover[i] * share
        weights = [
            weekend_multiplier(date(y, m, d).weekday(), meta["weekend_pattern"])
            for d in range(1, days_in_month + 1)
        ]
        weight_sum = sum(weights)
        ratio = outflow_ratio(spec, i)

        for d, w in zip(range(1, days_in_month + 1), weights):
            share_of_month = w / weight_sum
            inflow = month_inflow_total * share_of_month * rng.uniform(0.85, 1.15)
            outflow = inflow * ratio * rng.uniform(0.85, 1.15)
            txn_count = max(1, round((inflow + outflow) / avg_ticket * rng.uniform(0.8, 1.2)))
            daily.append({
                "date": date(y, m, d).isoformat(),
                "txn_count": txn_count,
                "inflow_amount": round(inflow, 2),
                "outflow_amount": round(outflow, 2),
                "merchant_category": meta["merchant_category"],
            })

    monthly_summary = []
    for y, m in MONTHS:
        prefix = month_str(y, m)
        rows = [d for d in daily if d["date"].startswith(prefix)]
        monthly_summary.append({
            "month": prefix,
            "txn_count": sum(r["txn_count"] for r in rows),
            "inflow_amount": round(sum(r["inflow_amount"] for r in rows), 2),
            "outflow_amount": round(sum(r["outflow_amount"] for r in rows), 2),
        })

    return {
        "merchant_category": meta["merchant_category"],
        "daily_transactions": daily,
        "monthly_summary": monthly_summary,
    }


def bounce_probability(spec: BusinessSpec, month_idx: int) -> float:
    n = NUM_MONTHS
    if spec.archetype == "declining_on_paper":
        if month_idx < n - 4:
            return 0.0
        recency = (month_idx - (n - 4) + 1) / 4
        return 0.03 + 0.12 * recency
    return {
        "thin_file_strong_cashflow": 0.001,
        "growing": 0.005,
        "stable": 0.005,
        "volatile_seasonal": 0.015,
    }[spec.archetype]


def buffer_ratio(spec: BusinessSpec, month_idx: int) -> float:
    n = NUM_MONTHS
    if spec.archetype == "declining_on_paper":
        if month_idx < n - 4:
            return 0.35
        recency = (month_idx - (n - 4) + 1) / 4
        return 0.35 - 0.24 * recency
    return {
        "thin_file_strong_cashflow": 0.45,
        "growing": 0.30,
        "stable": 0.32,
        "volatile_seasonal": 0.25,
    }[spec.archetype]


def generate_bank(spec: BusinessSpec, rng: random.Random, monthly_turnover: list[float]) -> dict:
    daily_balances = []
    bounced_events = []
    balance = monthly_turnover[0] * buffer_ratio(spec, 0) * rng.uniform(0.9, 1.1)

    for i, (y, m) in enumerate(MONTHS):
        target_balance = monthly_turnover[i] * buffer_ratio(spec, i)
        bounce_p = bounce_probability(spec, i)
        days_in_month = calendar.monthrange(y, m)[1]

        for d in range(1, days_in_month + 1):
            balance += (target_balance - balance) * 0.08 + rng.gauss(0, monthly_turnover[i] * 0.01)
            if rng.random() < bounce_p:
                bounce_amount = round(rng.uniform(0.02, 0.08) * monthly_turnover[i], 2)
                balance -= bounce_amount * 0.3
                bounced_events.append({
                    "date": date(y, m, d).isoformat(),
                    "amount": bounce_amount,
                    "reason": rng.choice([
                        "insufficient_funds", "insufficient_funds", "cheque_return", "auto_debit_failed",
                    ]),
                })
            daily_balances.append({"date": date(y, m, d).isoformat(), "closing_balance": round(balance, 2)})

    monthly_summary = []
    for y, m in MONTHS:
        prefix = month_str(y, m)
        rows = [b for b in daily_balances if b["date"].startswith(prefix)]
        month_bounces = [e for e in bounced_events if e["date"].startswith(prefix)]
        monthly_summary.append({
            "month": prefix,
            "closing_balance": rows[-1]["closing_balance"],
            "average_balance": round(sum(r["closing_balance"] for r in rows) / len(rows), 2),
            "bounced_payments_count": len(month_bounces),
        })

    return {
        "daily_balances": daily_balances,
        "monthly_summary": monthly_summary,
        "bounced_events": bounced_events,
    }


def epfo_status(spec: BusinessSpec, month_idx: int, rng: random.Random) -> str:
    n = NUM_MONTHS
    if spec.archetype == "declining_on_paper" and month_idx >= n - 4:
        recency = (month_idx - (n - 4) + 1) / 4
        missed_p = 0.10 + 0.25 * recency
        delayed_p = 0.30
        r = rng.random()
        if r < missed_p:
            return "missed"
        if r < missed_p + delayed_p:
            return "delayed"
        return "on_time"
    r = rng.random()
    if r < 0.03:
        return "missed"
    if r < 0.10:
        return "delayed"
    return "on_time"


def generate_epfo(spec: BusinessSpec, rng: random.Random) -> dict:
    if not spec.has_epfo:
        return {"epfo_registered": False, "employee_count": 0, "monthly_contributions": []}

    avg_wage = SECTOR_META[spec.sector]["avg_wage"]
    employees = spec.base_employee_count
    records = []

    for i, (y, m) in enumerate(MONTHS):
        if spec.archetype == "declining_on_paper" and i >= NUM_MONTHS - 4 and employees > 1:
            if rng.random() < 0.3:
                employees -= 1
        elif spec.archetype == "growing" and i > 0 and i % 4 == 0:
            employees += rng.choice([0, 1])

        status = epfo_status(spec, i, rng)
        expected = round(employees * avg_wage * EPF_CONTRIBUTION_RATE * rng.uniform(0.97, 1.03), 2)
        paid = 0.0 if status == "missed" else expected

        records.append({
            "month": month_str(y, m),
            "employee_count": employees,
            "expected_contribution": expected,
            "contribution_paid": paid,
            "status": status,
        })

    return {"epfo_registered": True, "employee_count": employees, "monthly_contributions": records}


def build_business_record(spec: BusinessSpec, rng: random.Random) -> dict:
    monthly_turnover = build_monthly_turnover(spec, rng)
    return {
        "business_id": spec.business_id,
        "name": spec.name,
        "sector": spec.sector,
        "archetype": spec.archetype,
        "registration_type": spec.registration_type,
        "period": {
            "start": month_str(*MONTHS[0]),
            "end": month_str(*MONTHS[-1]),
            "months": [month_str(y, m) for y, m in MONTHS],
        },
        "gst": generate_gst(spec, rng, monthly_turnover),
        "upi": generate_upi(spec, rng, monthly_turnover),
        "bank": generate_bank(spec, rng, monthly_turnover),
        "epfo": generate_epfo(spec, rng),
    }


def main() -> None:
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    index = []

    for spec in BUSINESS_SPECS:
        rng = random.Random(f"{SEED}:{spec.business_id}")
        record = build_business_record(spec, rng)

        out_path = SYNTHETIC_DIR / f"{spec.business_id}.json"
        with out_path.open("w") as f:
            json.dump(record, f, indent=2)

        index.append({
            "business_id": spec.business_id,
            "name": spec.name,
            "sector": spec.sector,
            "archetype": spec.archetype,
            "registration_type": spec.registration_type,
        })

    with (SYNTHETIC_DIR / "businesses_index.json").open("w") as f:
        json.dump(index, f, indent=2)

    print(f"Generated {len(index)} businesses -> {SYNTHETIC_DIR}")


if __name__ == "__main__":
    main()
