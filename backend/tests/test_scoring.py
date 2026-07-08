import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from engine.scoring import score_business

SYNTHETIC_DIR = BACKEND_DIR / "data" / "synthetic"


def _load(business_id: str) -> dict:
    path = SYNTHETIC_DIR / f"{business_id}.json"
    assert path.exists(), f"{path} not found -- run `python data/generator.py` from /backend first"
    with path.open() as f:
        return json.load(f)


def _all_business_ids() -> list[str]:
    index = json.loads((SYNTHETIC_DIR / "businesses_index.json").read_text())
    return [b["business_id"] for b in index]


def test_missing_epfo_does_not_crash_or_tank_score():
    # MSME-001 (Rekha Fashions) is a thin-file sole proprietor: no GST
    # registration and no EPFO (no employees). Both compliance inputs are
    # absent, so the sub-score should come back unavailable rather than crash,
    # and the overall score should still reflect its genuinely strong UPI/bank
    # activity instead of being dragged down by a sub-score with no data.
    raw = _load("MSME-001")
    result = score_business(raw)

    assert result["data_completeness"]["gst"] is False
    assert result["data_completeness"]["epfo"] is False

    compliance = result["sub_scores"]["compliance"]
    assert compliance["available"] is False
    assert compliance["score"] is None

    # "compliance" must be excluded from the weights actually used, not zeroed.
    assert "compliance" not in result["weights_used"]
    # allow for rounding of individual weights to 4 decimal places
    assert abs(sum(result["weights_used"].values()) - 1.0) < 1e-3

    # Credit-invisible-but-healthy story: strong UPI cash flow should still
    # carry the overall score to a respectable level despite zero formal footprint.
    assert result["overall_score"] >= 60


def test_declining_business_scores_lower_than_stable_business():
    declining = score_business(_load("MSME-005"))  # declining_on_paper
    stable = score_business(_load("MSME-017"))  # stable

    assert declining["overall_score"] < stable["overall_score"]
    assert (
        declining["sub_scores"]["invoice_collection"]["score"]
        < stable["sub_scores"]["invoice_collection"]["score"]
    )
    assert (
        declining["sub_scores"]["compliance"]["score"]
        < stable["sub_scores"]["compliance"]["score"]
    )

    # The trend line should visibly slope down for the declining business and
    # stay roughly flat for the stable one.
    declining_trend = [p["overall_score"] for p in declining["monthly_trend"]]
    stable_trend = [p["overall_score"] for p in stable["monthly_trend"]]
    assert declining_trend[-1] < declining_trend[0] - 10
    assert abs(stable_trend[-1] - stable_trend[0]) < 10


def test_sub_scores_and_overall_always_within_0_100():
    for business_id in _all_business_ids():
        result = score_business(_load(business_id))

        assert 0 <= result["overall_score"] <= 100

        for key, sub in result["sub_scores"].items():
            if sub["score"] is None:
                assert sub["available"] is False
                continue
            assert 0 <= sub["score"] <= 100, f"{business_id} {key} out of range: {sub['score']}"

        for point in result["monthly_trend"]:
            assert 0 <= point["overall_score"] <= 100
