"""Identifies strengths, risks, and anomalies from a business's scoring output.

This is the first stage of the analysis pipeline (risk -> recommendation ->
narrative). It runs as its own isolated LLM call so a failure here (or
downstream) doesn't take out the other stages -- see api/synthetic.py for how
the three are composed and how failures are caught independently.
"""

from __future__ import annotations

import json

from pydantic import BaseModel

from agents.context import build_agent_context
from agents.llm_client import MODEL, get_client

SYSTEM_PROMPT = """You are a credit risk analyst reviewing an MSME (micro/small/medium \
enterprise) financial health profile built from GST, UPI, bank (Account Aggregator), \
and EPFO data. You will be given the business's computed sub-scores (0-100), a 6-month \
score trend, data completeness flags, and a 12-month-per-source financial summary.

Identify:
- 2-3 key strengths: concrete, specific to this business's actual numbers (cite the \
metric, e.g. "UPI inflow/outflow ratio averaged 2.0x with low month-to-month variance").
- 2-3 key risks: concrete weaknesses grounded in the data, not generic warnings.
- anomalies: sudden or discontinuous events worth flagging (e.g. a sharp balance drop, \
a GST filing gap, a burst of bounced payments, an EPFO contribution lapse). Return an \
empty list if nothing anomalous stands out -- do not invent one.

A missing data source (e.g. no EPFO because the business has no employees) is not \
itself a risk or an anomaly -- it is normal for a sole proprietorship. Only flag it if \
the business scale suggests it should have registered."""


class RiskAnalysis(BaseModel):
    strengths: list[str]
    risks: list[str]
    anomalies: list[str]


def analyze_risk(raw: dict, score_result: dict) -> dict:
    context = build_agent_context(raw, score_result)
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
                    "Here is the business's scoring data:\n\n"
                    f"{json.dumps(context, indent=2)}"
                ),
            }
        ],
        output_format=RiskAnalysis,
    )

    return response.parsed_output.model_dump()
