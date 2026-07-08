"""Orchestrates the risk -> recommendation -> narrative agent pipeline.

Each stage is its own LLM call and is caught independently: a failure in one
stage does not prevent the others from returning their results. Successful
runs are cached (see agents/cache.py) so repeated dashboard loads don't
re-trigger LLM calls.
"""

from __future__ import annotations

from agents.cache import get_cached_analysis, set_cached_analysis
from agents.narrative_agent import generate_narrative
from agents.recommendation_agent import generate_recommendations
from agents.risk_agent import analyze_risk


def run_analysis_pipeline(raw: dict, score_result: dict, use_cache: bool = True) -> dict:
    business_id = raw["business_id"]

    if use_cache:
        cached = get_cached_analysis(business_id)
        if cached is not None:
            return {**cached, "cached": True}

    errors: dict[str, str] = {}

    # Each stage is deliberately wrapped in its own broad try/except: this is
    # an isolation boundary, not sloppy error handling -- an LLM call failing
    # (rate limit, timeout, refusal, bad API key) must not take down the
    # stages that don't depend on it.
    risk_output = None
    try:
        risk_output = analyze_risk(raw, score_result)
    except Exception as exc:
        errors["risk_agent"] = str(exc)

    recommendations = None
    if risk_output is not None:
        try:
            recommendations = generate_recommendations(risk_output)
        except Exception as exc:
            errors["recommendation_agent"] = str(exc)
    else:
        errors["recommendation_agent"] = "skipped: risk_agent output unavailable"

    narrative = None
    try:
        narrative = generate_narrative(score_result, risk_output)
    except Exception as exc:
        errors["narrative_agent"] = str(exc)

    result = {
        "business_id": business_id,
        "name": raw["name"],
        "narrative": narrative,
        "strengths": risk_output["strengths"] if risk_output else None,
        "risks": risk_output["risks"] if risk_output else None,
        "anomalies": risk_output["anomalies"] if risk_output else None,
        "recommendations": recommendations,
        "errors": errors,
    }

    if not errors:
        set_cached_analysis(business_id, result)

    return {**result, "cached": False}
