import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/businesses", tags=["synthetic-data"])

SYNTHETIC_DIR = Path(__file__).resolve().parent.parent / "data" / "synthetic"
INDEX_FILE = SYNTHETIC_DIR / "businesses_index.json"


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
    file_path = SYNTHETIC_DIR / f"{business_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"No synthetic data found for '{business_id}'")
    with file_path.open() as f:
        return json.load(f)
