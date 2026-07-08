"""Simple SQLite cache for agent pipeline results, keyed by business_id.

Kept deliberately separate from the main SQLAlchemy models -- this is a cheap
memoization layer (avoid re-triggering LLM calls on every dashboard reload
during a demo), not application data.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

CACHE_DB_PATH = Path(__file__).resolve().parent / "analysis_cache.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(CACHE_DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS analysis_cache (
            business_id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    return conn


def get_cached_analysis(business_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT payload FROM analysis_cache WHERE business_id = ?", (business_id,)
        ).fetchone()
    return json.loads(row[0]) if row else None


def set_cached_analysis(business_id: str, payload: dict) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO analysis_cache (business_id, payload, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(business_id) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at
            """,
            (business_id, json.dumps(payload), datetime.now(timezone.utc).isoformat()),
        )


def clear_cached_analysis(business_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM analysis_cache WHERE business_id = ?", (business_id,))
