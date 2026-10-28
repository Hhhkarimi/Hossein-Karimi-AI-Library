#!/usr/bin/env python3
"""Compare actual model responses with the bundled behavioral fixtures.

This program does not edit Persian and does not call a model. Standard library only.
"""

import argparse
import json
import sys
from pathlib import Path


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def first_difference(expected, actual):
    for i in range(max(len(expected), len(actual))):
        left = expected[i] if i < len(expected) else None
        right = actual[i] if i < len(actual) else None
        if left != right:
            return {
                "index": i,
                "expected": left,
                "actual": right,
                "expected_codepoint": f"U+{ord(left):04X}" if left is not None else None,
                "actual_codepoint": f"U+{ord(right):04X}" if right is not None else None,
            }
    return None


def evaluate(cases, responses, allow_subset=False, require_second=False):
    if not isinstance(responses, list):
        raise ValueError("Responses must be a JSON list of objects.")
    case_by_id = {case["id"]: case for case in cases}
    seen = set()
    checks = []
    for response in responses:
        if not isinstance(response, dict):
            raise ValueError("Every response must be an object.")
        case_id = response.get("id")
        if not isinstance(case_id, str) or case_id not in case_by_id:
            raise ValueError(f"Unknown or invalid case id: {case_id!r}")
        if case_id in seen:
            raise ValueError(f"Duplicate case id: {case_id}")
        seen.add(case_id)
        output = response.get("output")
        if not isinstance(output, str):
            raise ValueError(f"output must be a string: {case_id}")
        second = response.get("second_output")
        if "second_output" in response and not isinstance(second, str):
            raise ValueError(f"second_output must be a string: {case_id}")
        accepted = case_by_id[case_id]["accepted"]
        match = output in accepted
        stable = second == output if second is not None else None
        passed = match and stable is not False and (not require_second or stable is True)
        checks.append({
            "id": case_id,
            "passed": passed,
            "matches_reference": match,
            "idempotence": stable,
            "first_difference": None if match else first_difference(accepted[0], output),
        })
    missing = [case["id"] for case in cases if case["id"] not in seen]
    passed = sum(check["passed"] for check in checks)
    return {
        "fixture_count": len(cases),
        "executed": len(checks),
        "passed": passed,
        "failed": len(checks) - passed,
        "missing": missing,
        "full_coverage": not missing,
        "idempotence_checked": sum(check["idempotence"] is not None for check in checks),
        "success": bool(checks) and passed == len(checks) and (allow_subset or not missing),
        "checks": checks,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("responses", type=Path, help="JSON containing actual model responses")
    parser.add_argument("--report", type=Path, help="Optional report path; existing file is replaced")
    parser.add_argument("--allow-subset", action="store_true")
    parser.add_argument("--require-second-output", action="store_true")
    args = parser.parse_args()
    fixture = Path(__file__).resolve().parents[1] / "evals" / "cases.json"
    try:
        result = evaluate(load_json(fixture), load_json(args.responses),
                          args.allow_subset, args.require_second_output)
        rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(rendered, encoding="utf-8")
        print(json.dumps({key: value for key, value in result.items() if key != "checks"},
                         ensure_ascii=False))
        return 0 if result["success"] else 1
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Invalid evaluation input: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
