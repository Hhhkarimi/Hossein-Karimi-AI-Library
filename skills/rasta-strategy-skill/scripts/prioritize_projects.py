#!/usr/bin/env python3
"""Rank ten supplied AI project candidates; no network or optional dependencies.

This checks arithmetic and input structure, not evidence truth or project safety.
Print JSON to stdout. Scores and assumptions must be supplied by the analyst.
"""
import argparse
import json
import sys
from fractions import Fraction
from pathlib import Path

DEFAULT_WEIGHTS = {
    "value": 25, "strategic_fit": 20, "feasibility": 15,
    "capability": 15, "time_to_value": 10, "optionality": 10,
    "evidence_quality": 5,
}


def number(value, label, minimum, maximum):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label}: expected a finite number")
    try:
        result = Fraction(str(value))
    except (ValueError, OverflowError) as exc:
        raise ValueError(f"{label}: expected a finite number") from exc
    if not minimum <= result <= maximum:
        raise ValueError(f"{label}: expected {minimum}..{maximum}")
    return result


def rank_projects(payload):
    if not isinstance(payload, dict):
        raise ValueError("Input must be an object")
    projects = payload.get("projects")
    if not isinstance(projects, list) or len(projects) != 10:
        raise ValueError("Supply exactly ten eligible, distinct AI projects")
    weights = payload.get("weights", DEFAULT_WEIGHTS)
    if not isinstance(weights, dict) or set(weights) != set(DEFAULT_WEIGHTS):
        raise ValueError("Weights must contain exactly the seven criterion keys")
    parsed_weights = {k: number(v, k, 0, 100) for k, v in weights.items()}
    if sum(parsed_weights.values()) != 100:
        raise ValueError("Criterion weights must sum to 100")

    rows, ids, titles = [], set(), set()
    for project in projects:
        if not isinstance(project, dict):
            raise ValueError("Each project must be an object")
        for field in ("id", "title", "problem", "ai_use", "kpi", "owner",
                      "next_step", "evidence_note", "priority_reason"):
            if not isinstance(project.get(field), str) or not project[field].strip():
                raise ValueError(f"Project requires nonempty {field}")
        project_id = project["id"].strip()
        title = project["title"].strip().casefold()
        if project_id in ids or title in titles:
            raise ValueError("Project IDs and titles must be unique")
        ids.add(project_id)
        titles.add(title)
        if project.get("gate") not in ("PROCEED", "CONDITIONAL"):
            raise ValueError(f"{project_id}: exclude blocked/unreviewed candidates")
        conditions = project.get("conditions", [])
        if not isinstance(conditions, list) or any(
            not isinstance(c, str) or not c.strip() for c in conditions
        ):
            raise ValueError(f"{project_id}: conditions must be nonempty strings")
        if project["gate"] == "CONDITIONAL" and not conditions:
            raise ValueError(f"{project_id}: conditional project needs conditions")
        if project.get("evidence") not in ("confirmed", "mixed", "hypothesis"):
            raise ValueError(f"{project_id}: declare evidence status")
        if project.get("confidence") not in ("low", "medium", "high"):
            raise ValueError(f"{project_id}: confidence must be low/medium/high")
        assumptions = project.get("assumptions", [])
        if not isinstance(assumptions, list) or any(
            not isinstance(a, str) or not a.strip() for a in assumptions
        ):
            raise ValueError(f"{project_id}: assumptions must be nonempty strings")
        if project["evidence"] != "confirmed" and not assumptions:
            raise ValueError(f"{project_id}: uncertain scores need explicit assumptions")
        scores = project.get("scores")
        if not isinstance(scores, dict) or set(scores) != set(DEFAULT_WEIGHTS):
            raise ValueError(f"{project_id}: supply all seven scores; no imputation")
        parsed = {k: number(v, f"{project_id}/{k}", 1, 5) for k, v in scores.items()}
        score = sum(parsed_weights[k] * parsed[k] for k in parsed) / 100
        rows.append((dict(project, id=project_id), score))

    rows.sort(key=lambda item: (-item[1], item[0]["id"]))
    total = sum(score for _, score in rows)
    shares = [100 * score / total for _, score in rows]
    percentages = [share.numerator // share.denominator for share in shares]
    remainder_order = sorted(range(10), key=lambda i: (-(shares[i] - percentages[i]), i))
    for i in remainder_order[:100 - sum(percentages)]:
        percentages[i] += 1
    preliminary = any(p["gate"] == "CONDITIONAL" or p["evidence"] != "confirmed"
                      or p.get("assumptions") for p, _ in rows)
    return {
        "status": "preliminary" if preliminary else "evidence_based",
        "meaning": "Relative priority share in this portfolio; not ROI, probability or budget",
        "method": "Weighted 1..5 scores; largest-remainder integer percentages; ties by ID",
        "weights": weights,
        "projects": [dict(p, rank=i + 1, weighted_score=float(score),
                          importance_percent=percentages[i])
                     for i, (p, score) in enumerate(rows)],
        "total_importance_percent": sum(percentages),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="JSON file containing ten projects and optional weights")
    args = parser.parse_args()
    try:
        result = rank_projects(json.loads(args.input.read_text(encoding="utf-8")))
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
