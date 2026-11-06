#!/usr/bin/env python3
"""Transparent, dependency-free AIMPACT candidate ranking.

Usage: python scripts/score_portfolio.py assets/EXAMPLE_PORTFOLIO.json
This is a decision aid, not a clinical, safety or financial approval engine.
Unknown scores yield 'needs evidence' rather than invented precision.
"""

import json
import sys
from pathlib import Path

WEIGHTS = {
    "business_value": 30,
    "data_readiness": 20,
    "test_feasibility": 15,
    "risk_manageability": 15,
    "reusability": 10,
    "owner_commitment": 10,
}
GATES = ("accountable_owner", "lawful_data_access", "risk_review_passed")


def evaluate(project):
    """Validate project and return a labeled, inspection-ready evaluation."""
    name = project.get("name", "بدون نام")
    gates = project.get("gates", {})
    if not isinstance(gates, dict):
        raise ValueError(f"{name}: 'gates' must be an object")
    missed = [key for key in GATES if gates.get(key) is not True]
    scores = project.get("scores", {})
    if not isinstance(scores, dict):
        raise ValueError(f"{name}: 'scores' must be an object")
    missing = [key for key in WEIGHTS if scores.get(key) is None]
    invalid = [key for key in WEIGHTS if key not in missing and (
        isinstance(scores[key], bool) or not isinstance(scores[key], (int, float))
        or not 1 <= scores[key] <= 5
    )]
    if invalid:
        raise ValueError(f"{name}: invalid scores 1-5: {', '.join(invalid)}")
    numeric_score = (round(sum(WEIGHTS[k] * scores[k] / 5 for k in WEIGHTS), 1)
                     if not missing else None)
    if missed:
        status = "BLOCKED_HARD_GATE"
    elif missing:
        status = "NEEDS_EVIDENCE"
    else:
        status = "REVIEW_ELIGIBLE"  # NOT automatically approved
    return {
        "name": name,
        "status": status,
        "weighted_score_out_of_100": numeric_score,
        "missing_score_fields": missing,
        "hard_gates_not_passed": missed,
        "score_notes": project.get("evidence_notes", ""),
        "interpretation": (
            "Hard gate unresolved: no operational deployment" if missed else
            "Missing evidence: do not rank numerically" if missing else
            "Eligible for human prioritization; score is not approval"
        ),
    }


def main(path):
    input_path = Path(path)
    with input_path.open(encoding="utf-8") as file:
        payload = json.load(file)
    if not isinstance(payload, dict) or not isinstance(payload.get("projects"), list):
        raise ValueError("Input must be a JSON object with a 'projects' array")
    result = [evaluate(p) for p in payload["projects"]]
    result.sort(key=lambda x: (
        x["status"] != "REVIEW_ELIGIBLE",
        -(x["weighted_score_out_of_100"] or 0),
        x["name"],
    ))
    print(json.dumps({
        "framework": "AIMPACT illustrative scoring - not external standard",
        "weights": WEIGHTS,
        "projects": result,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/score_portfolio.py path/to/portfolio.json")
    try:
        main(sys.argv[1])
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"ERROR: {exc}") from exc
