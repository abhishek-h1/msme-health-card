"""Writes a short natural-language summary of the business's financial health.

Runs as its own LLM call, isolated from risk_agent and recommendation_agent --
see api/synthetic.py for failure handling across the pipeline. Only needs the
scoring output (not the raw dataset); the risk analysis is optional context
used to make the narrative more concrete when available.
"""

from __future__ import annotations

import json
from typing import Optional

from agents.llm_client import MODEL, get_client

SYSTEM_PROMPT = """You are a credit analyst explaining an MSME's financial health to a \
loan officer who has not seen the underlying data. Write 4-6 sentences of plain-English \
narrative.

Do not just state the overall score. Give concrete reasoning: reference the actual \
sub-scores, trends, and specific numbers (e.g. "revenue has declined roughly 40% over \
the last four months" or "UPI cash flow shows a healthy 2x inflow-to-outflow ratio with \
low volatility"). Explain what's driving the overall picture -- what's strong, what's \
weak, and whether the trend is improving or deteriorating. Write as continuous prose, \
not a bulleted list, and do not repeat the raw score dictionary back verbatim."""


def generate_narrative(score_result: dict, risk_output: Optional[dict] = None) -> str:
    client = get_client()

    user_content = (
        "Here is the business's scoring data:\n\n"
        f"{json.dumps({k: score_result[k] for k in ('business_id', 'name', 'overall_score', 'sub_scores', 'monthly_trend', 'data_completeness')}, indent=2)}"
    )
    if risk_output:
        user_content += f"\n\nHere is a risk analysis already prepared for this business:\n\n{json.dumps(risk_output, indent=2)}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        messages=[{"role": "user", "content": user_content}],
    )

    return next(block.text for block in response.content if block.type == "text")
