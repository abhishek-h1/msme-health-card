"""Turns the risk agent's findings into concrete, actionable recommendations.

Runs as its own LLM call, isolated from risk_agent and narrative_agent -- see
api/synthetic.py for failure handling across the pipeline.
"""

from __future__ import annotations

import json

from pydantic import BaseModel

from agents.llm_client import MODEL, get_client

SYSTEM_PROMPT = """You are a credit advisor turning a risk analysis into recommendations \
for the business owner. You will be given the strengths, risks, and anomalies already \
identified for one MSME.

Generate 3-4 concrete, actionable recommendations. Each recommendation must:
- Be specific and doable, not generic advice ("diversify your top UPI counterparties so \
no single one exceeds ~20% of volume", not "improve customer relationships").
- Reference the actual figures from the risks/anomalies where possible (e.g. "average \
collection delay is currently X days").
- Come with a one-sentence rationale explaining why it matters for this business.

Prioritize recommendations that address the highest-impact risks first."""


class Recommendation(BaseModel):
    recommendation: str
    rationale: str


class RecommendationList(BaseModel):
    recommendations: list[Recommendation]


def generate_recommendations(risk_output: dict) -> list[dict]:
    client = get_client()

    response = client.messages.parse(
        model=MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        messages=[
            {
                "role": "user",
                "content": (
                    "Here is the risk analysis for this business:\n\n"
                    f"{json.dumps(risk_output, indent=2)}"
                ),
            }
        ],
        output_format=RecommendationList,
    )

    return [r.model_dump() for r in response.parsed_output.recommendations]
