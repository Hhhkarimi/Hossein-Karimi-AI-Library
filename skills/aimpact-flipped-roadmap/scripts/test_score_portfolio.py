#!/usr/bin/env python3
import unittest
from score_portfolio import evaluate, WEIGHTS


class PortfolioScoringTests(unittest.TestCase):
    def base(self):
        return {
            "name": "Test",
            "scores": {key: 5 for key in WEIGHTS},
            "gates": {
                "accountable_owner": True,
                "lawful_data_access": True,
                "risk_review_passed": True,
            }
        }

    def test_perfect_score(self):
        p = self.base()
        self.assertEqual(evaluate(p)["weighted_score_out_of_100"], 100)
        self.assertEqual(evaluate(p)["status"], "REVIEW_ELIGIBLE")

    def test_hard_gate_blocks_perfect_score(self):
        p = self.base()
        p["gates"]["lawful_data_access"] = False
        self.assertEqual(evaluate(p)["status"], "BLOCKED_HARD_GATE")

    def test_missing_score_not_fabricated(self):
        p = self.base()
        p["scores"]["data_readiness"] = None
        self.assertIsNone(evaluate(p)["weighted_score_out_of_100"])
        self.assertEqual(evaluate(p)["status"], "NEEDS_EVIDENCE")

    def test_invalid_score_rejected(self):
        p = self.base()
        p["scores"]["business_value"] = 6
        with self.assertRaises(ValueError):
            evaluate(p)


if __name__ == "__main__":
    unittest.main()
