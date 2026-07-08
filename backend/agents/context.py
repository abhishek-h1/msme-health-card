"""Builds the compact, LLM-ready summary each agent is prompted with.

Agents never see the full raw dataset (365 days of UPI/bank records, every GST
filing). Instead we pass the scoring engine's already-condensed sub-scores plus
a 12-month-per-source financial summary -- enough concrete numbers for the LLM
to reason about trends and anomalies without blowing up prompt size.
"""

from __future__ import annotations


def build_agent_context(raw: dict, score_result: dict) -> dict:
    gst = raw["gst"]
    epfo = raw["epfo"]

    return {
        "business_id": raw["business_id"],
        "name": raw["name"],
        "sector": raw["sector"],
        "archetype": raw["archetype"],
        "registration_type": raw["registration_type"],
        "overall_score": score_result["overall_score"],
        "sub_scores": score_result["sub_scores"],
        "monthly_trend": score_result["monthly_trend"],
        "data_completeness": score_result["data_completeness"],
        "monthly_financials": {
            "gst_filings": [
                {"month": f["month"], "turnover_reported": f["turnover_reported"], "status": f["status"]}
                for f in gst["filings"]
            ],
            "upi_monthly": raw["upi"]["monthly_summary"],
            "bank_monthly": raw["bank"]["monthly_summary"],
            "epfo_monthly": epfo["monthly_contributions"] if epfo["epfo_registered"] else [],
            "recent_bounced_events": raw["bank"]["bounced_events"][-5:],
        },
    }
