"""Arithmetic and rejection cases; does not evaluate agent strategy quality."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("prioritize", ROOT / "scripts/prioritize_projects.py")
prioritize = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prioritize)


class PrioritizationTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads((ROOT / "examples/04-top-ten-projects.json").read_text(encoding="utf-8"))

    def test_ten_projects_ranked_and_relative_shares_total_100(self):
        result = prioritize.rank_projects(self.payload)
        projects = result["projects"]
        self.assertEqual([p["rank"] for p in projects], list(range(1, 11)))
        self.assertEqual(sum(p["importance_percent"] for p in projects), 100)
        self.assertEqual(result["status"], "preliminary")
        scores = [p["weighted_score"] for p in projects]
        self.assertEqual(scores, sorted(scores, reverse=True))
        for p in projects:
            ideal_share = 100 * p["weighted_score"] / sum(scores)
            self.assertLess(abs(p["importance_percent"] - ideal_share), 1)

    def test_weighted_score_uses_supplied_weights(self):
        self.payload["weights"] = dict.fromkeys(prioritize.DEFAULT_WEIGHTS, 0)
        self.payload["weights"]["value"] = 100
        result = prioritize.rank_projects(self.payload)
        for p in result["projects"]:
            self.assertEqual(p["weighted_score"], p["scores"]["value"])

    def test_largest_remainder_known_answer_and_id_tiebreak(self):
        for i, p in enumerate(self.payload["projects"]):
            p["scores"] = dict.fromkeys(prioritize.DEFAULT_WEIGHTS, 3 if i == 0 else 1)
        result = prioritize.rank_projects(self.payload)
        self.assertEqual([p["importance_percent"] for p in result["projects"]], [25] + [9] * 3 + [8] * 6)
        self.assertEqual(result["projects"][1]["id"], "AI-02")

    def test_equal_scores_are_equal_shares_with_stable_order(self):
        for p in self.payload["projects"]:
            p["scores"] = dict.fromkeys(prioritize.DEFAULT_WEIGHTS, 3)
        forward = prioritize.rank_projects(self.payload)
        self.payload["projects"].reverse()
        self.assertEqual(forward, prioritize.rank_projects(self.payload))
        self.assertEqual([p["importance_percent"] for p in forward["projects"]], [10] * 10)

    def test_invalid_weight_contract(self):
        for weights in ({}, {**prioritize.DEFAULT_WEIGHTS, "value": 24},
                        {**prioritize.DEFAULT_WEIGHTS, "value": -1},
                        {**prioritize.DEFAULT_WEIGHTS, "value": True}):
            with self.subTest(weights=weights), self.assertRaises(ValueError):
                prioritize.rank_projects(dict(self.payload, weights=weights))

    def test_unknown_nonfinite_and_out_of_range_scores_rejected(self):
        for score in (None, "UNKNOWN", True, float("nan"), float("inf"), 0, 6):
            candidate = copy.deepcopy(self.payload)
            candidate["projects"][0]["scores"]["value"] = score
            with self.subTest(score=score), self.assertRaises(ValueError):
                prioritize.rank_projects(candidate)

    def test_blocked_or_unreviewed_gate_rejected(self):
        for gate in ("STOP", "REDESIGN", "LEGAL_REVIEW", "UNKNOWN", None):
            self.payload["projects"][0]["gate"] = gate
            with self.subTest(gate=gate), self.assertRaises(ValueError):
                prioritize.rank_projects(self.payload)

    def test_uncertain_evidence_requires_explicit_assumptions(self):
        self.payload["projects"][0]["assumptions"] = []
        with self.assertRaises(ValueError):
            prioritize.rank_projects(self.payload)

    def test_conditional_gate_requires_conditions(self):
        self.payload["projects"][0]["conditions"] = []
        with self.assertRaises(ValueError):
            prioritize.rank_projects(self.payload)

    def test_count_duplicate_and_missing_fields_rejected(self):
        candidates = []
        candidates.append(dict(self.payload, projects=self.payload["projects"][:9]))
        duplicate_id = copy.deepcopy(self.payload)
        duplicate_id["projects"][1]["id"] = duplicate_id["projects"][0]["id"]
        candidates.append(duplicate_id)
        duplicate_title = copy.deepcopy(self.payload)
        duplicate_title["projects"][1]["title"] = duplicate_title["projects"][0]["title"]
        candidates.append(duplicate_title)
        missing = copy.deepcopy(self.payload)
        del missing["projects"][0]["scores"]["value"]
        candidates.append(missing)
        for candidate in candidates:
            with self.subTest(candidate=candidate), self.assertRaises(ValueError):
                prioritize.rank_projects(candidate)

    def test_confirmed_ready_inputs_report_evidence_based(self):
        for p in self.payload["projects"]:
            p.update(gate="PROCEED", evidence="confirmed", assumptions=[], conditions=[])
        self.assertEqual(prioritize.rank_projects(self.payload)["status"], "evidence_based")

    def test_does_not_mutate_input(self):
        original = copy.deepcopy(self.payload)
        prioritize.rank_projects(self.payload)
        self.assertEqual(self.payload, original)


if __name__ == "__main__":
    unittest.main()
