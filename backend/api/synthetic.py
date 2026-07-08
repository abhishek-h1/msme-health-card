import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from agents.pipeline import run_analysis_pipeline
from engine.scoring import score_business

router = APIRouter(prefix="/api/businesses", tags=["synthetic-data"])

SYNTHETIC_DIR = Path(__file__).resolve().parent.parent / "data" / "synthetic"
INDEX_FILE = SYNTHETIC_DIR / "businesses_index.json"


def _load_raw(business_id: str) -> dict:
    file_path = SYNTHETIC_DIR / f"{business_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"No synthetic data found for '{business_id}'")
    with file_path.open() as f:
        return json.load(f)


@router.get("")
def list_businesses():
    if not INDEX_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Synthetic dataset not found. Run `python data/generator.py` from /backend.",
        )
    with INDEX_FILE.open() as f:
        return json.load(f)


@router.get("/{business_id}/raw")
def get_business_raw(business_id: str):
    return _load_raw(business_id)


@router.get("/{business_id}/score")
def get_business_score(business_id: str):
    raw = _load_raw(business_id)
    return score_business(raw)


@router.get("/{business_id}/analysis")
def get_business_analysis(business_id: str, force_refresh: bool = False):
    raw = _load_raw(business_id)
    score_result = score_business(raw)
    return run_analysis_pipeline(raw, score_result, use_cache=not force_refresh)
