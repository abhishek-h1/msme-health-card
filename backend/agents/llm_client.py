import os

import anthropic
from dotenv import load_dotenv

load_dotenv()

MODEL = "claude-opus-4-8"


def get_client() -> anthropic.Anthropic:
    # The SDK reads ANTHROPIC_API_KEY natively; LLM_API_KEY is this project's
    # own .env convention (set up before any provider was chosen), so accept
    # either.
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("LLM_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        raise RuntimeError(
            "No Anthropic API key configured. Set ANTHROPIC_API_KEY (or LLM_API_KEY) "
            "in backend/.env."
        )
    return anthropic.Anthropic(api_key=api_key)
