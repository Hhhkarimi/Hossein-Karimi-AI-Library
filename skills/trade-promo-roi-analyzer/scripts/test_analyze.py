"""Behavioral regression checks; synthetic fixtures stay in temporary folders."""
import copy
import json
import shutil
import unittest
import uuid
from pathlib import Path

import numpy as np
import pandas as pd

from analyze import (AuditError, analyze_one, csv_safe, read_inputs, render_report,
                     run, validate)
from make_demo import create_demo
from sensitivity import calculate


class AuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tests_root = (Path.cwd() / "work" / "trade-promo-tests").resolve()
        cls.root = cls.tests_root / uuid.uuid4().hex
        cls.root.mkdir(parents=True)
        cls.config = create_demo(cls.root / "inputs")
        cfg = json.loads(cls.config.read_text(encoding="utf-8"))
        cfg["bootstrap_samples"] = 100
        cls.config.write_text(json.dumps(cfg), encoding="utf-8")
        cls.s, cls.c, cls.k, cls.cfg, _ = read_inputs(cls.config)
        cls.manifest = run(cls.config, cls.root / "run")
        cls.by_series = {r["series_id"]: r for r in cls.manifest["results"]}

    @classmethod
    def tearDownClass(cls):
        resolved = cls.root.resolve()
        if resolved.is_relative_to(cls.tests_root) and resolved != cls.tests_root:
            shutil.rmtree(resolved)

    def inputs(self):
        return self.s.copy(), self.c.copy(), self.k.copy(), copy.deepcopy(self.cfg)

    def one(self, s, c, k, cfg, series="profitable"):
        row = next(c[c.series_id == series].itertuples())
        return analyze_one(s, c, k, row, cfg, np.random.default_rng(42))

    def test_known_synthetic_effects_and_profit_signs(self):
        truths = pd.read_csv(self.root / "inputs" / "known_synthetic_truth.csv")
        for row in truths.itertuples():
            result = self.by_series[row.series_id]
            self.assertAlmostEqual(result["incremental_units_total"],
                                   row.known_incremental_units, delta=20)
            self.assertAlmostEqual(result["incremental_contribution"],
                                   row.known_incremental_contribution, delta=800)
        self.assertGreater(self.by_series["profitable"]["roi"], 0)
        self.assertLess(self.by_series["volume_but_loss"]["roi"], 0)
        self.assertGreater(self.by_series["volume_but_loss"]["incremental_units_during"], 0)
        forward = self.by_series["forward_signature"]
        self.assertLess(abs(forward["incremental_units_total"]), 20)
        self.assertGreater(forward["post_offset_ratio_proxy"], 0.95)
        self.assertLess(forward["incremental_contribution"], 0)

    def test_accounting_example_no_double_deduction(self):
        s, c, k, cfg = self.inputs()
        target = s.series_id == "profitable"
        s.loc[target, ["units", "normal_unit_price", "normal_unit_cost"]] = [100, 10, 6]
        s.loc[target, ["net_revenue", "variable_cost"]] = [1000, 600]
        row = next(c[c.series_id == "profitable"].itertuples())
        event = target & (s.date >= row.start)
        during = event & (s.date <= row.end)
        s.loc[during, ["units", "net_revenue", "variable_cost"]] = [120, 1080, 720]
        # Fourteen copies of the independent 100/120-unit accounting example.
        cost_rows = k.series_id == "profitable"
        k.loc[cost_rows & (k.category == "discount"), "amount"] = 120 * 14
        k.loc[cost_rows & (k.category == "display"), "amount"] = 20 * 14
        result, _, _ = self.one(s, c, k, cfg)
        self.assertAlmostEqual(result["incremental_contribution"], -60 * 14, places=6)
        self.assertAlmostEqual(result["investment"], 140 * 14)
        self.assertAlmostEqual(result["roi"], -60 / 140, places=6)

    def test_embedded_flag_changes_profit_once(self):
        s, c, k, cfg = self.inputs()
        before, _, _ = self.one(s, c, k, cfg)
        mask = (k.series_id == "profitable") & (k.category == "display")
        k.loc[mask, "embedded_in_actuals"] = True
        after, _, _ = self.one(s, c, k, cfg)
        self.assertAlmostEqual(after["incremental_contribution"] - before["incremental_contribution"], 1000)
        self.assertEqual(after["investment"], before["investment"])

    def test_future_actuals_do_not_change_baseline(self):
        s, c, k, cfg = self.inputs()
        a, detail_a, _ = self.one(s, c, k, cfg)
        s.loc[(s.series_id == "profitable") & (s.date >= c.start.min()), "units"] += 500
        b, detail_b, _ = self.one(s, c, k, cfg)
        np.testing.assert_allclose(detail_a.baseline_units, detail_b.baseline_units)
        self.assertEqual(a["model"], b["model"])
        self.assertGreater(b["incremental_units_total"], a["incremental_units_total"])

    def test_seed_reproducible_and_bounds_ordered(self):
        s, c, k, cfg = self.inputs()
        a, da, _ = self.one(s, c, k, cfg)
        b, db, _ = self.one(s, c, k, cfg)
        self.assertEqual(a, b)
        self.assertTrue((da.baseline_p025 <= da.baseline_p975).all())
        self.assertTrue((db.cumulative_increment_p025 <= db.cumulative_increment_p975).all())

    def test_volume_only_has_no_financial_claim(self):
        s, c, k, cfg = self.inputs()
        cfg["financial_mode"] = False
        s = s.drop(columns=["net_revenue", "variable_cost", "normal_unit_price", "normal_unit_cost"])
        result, _, _ = self.one(s, c, k, cfg)
        self.assertIsNone(result["roi"])
        self.assertIsNone(result["incremental_contribution"])
        self.assertEqual(result["decision"], "volume_only")

    def test_zero_investment_roi_unavailable(self):
        s, c, k, cfg = self.inputs()
        k["include_in_investment"] = False
        result, _, _ = self.one(s, c, k, cfg)
        self.assertIsNone(result["roi"])
        self.assertIsNotNone(result["incremental_contribution"])

    def test_free_goods_cost_already_in_actuals(self):
        s, c, k, cfg = self.inputs()
        target = s.series_id == "profitable"
        s.loc[target, ["units", "normal_unit_price", "normal_unit_cost"]] = [100, 10, 6]
        s.loc[target, ["net_revenue", "variable_cost"]] = [1000, 600]
        row = next(c[c.series_id == "profitable"].itertuples())
        during = target & (s.date >= row.start) & (s.date <= row.end)
        s.loc[during, ["units", "net_revenue", "variable_cost"]] = [110, 1000, 660]
        k = k[k.series_id != "profitable"].copy()
        gift = pd.DataFrame([{
            "cost_id": "gift", "campaign_id": row.campaign_id, "series_id": row.series_id,
            "category": "free_goods", "amount": 60 * 14,
            "embedded_in_actuals": True, "include_in_investment": True,
        }])
        result, _, _ = self.one(s, c, pd.concat([k, gift]), cfg)
        self.assertAlmostEqual(result["incremental_units_during"], 140, places=6)
        self.assertAlmostEqual(result["incremental_contribution"], -840, places=6)
        self.assertAlmostEqual(result["roi"], -1, places=6)

    def test_weekly_and_monthly_grids(self):
        for frequency in ["W-MON", "MS"]:
            dates = pd.date_range("2020-01-06" if frequency == "W-MON" else "2020-01-01",
                                  periods=84, freq=frequency)
            y = 40 + 0.5 * np.arange(84)
            y[72:76] += 5
            s = pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "series_id": "one",
                              "units": y, "stockout": False, "other_promo": False})
            c = pd.DataFrame([{
                "campaign_id": "test", "series_id": "one", "start": dates[72].strftime("%Y-%m-%d"),
                "end": dates[75].strftime("%Y-%m-%d"), "post_periods": 8, "lookback_periods": 72,
            }])
            cfg = dict(self.cfg, financial_mode=False, frequency=frequency,
                       min_pre_periods=26 if frequency == "W-MON" else 12, block_length=3)
            k = self.k.iloc[:0].copy()
            validate(s, c, k, cfg)
            result, _, _ = self.one(s, c, k, cfg, series="one")
            self.assertAlmostEqual(result["incremental_units_total"], 20, places=6)

    def test_negative_investment_roi_unavailable(self):
        s, c, k, cfg = self.inputs()
        k["amount"] = -100
        result, _, _ = self.one(s, c, k, cfg)
        self.assertIsNone(result["roi"])

    def test_confounded_window_is_flagged(self):
        s, c, k, cfg = self.inputs()
        s.loc[(s.series_id == "profitable") & (s.date >= c.start.min()), "other_promo"] = True
        result, _, _ = self.one(s, c, k, cfg)
        self.assertIn("other_promo_during_effect_window", result["evidence_flags"])
        self.assertEqual(result["decision"], "review_design_or_inputs")

    def test_reject_duplicate_sales(self):
        s, c, k, cfg = self.inputs()
        with self.assertRaises(AuditError):
            validate(pd.concat([s, s.iloc[:1]]), c, k, cfg)

    def test_reject_missing_period(self):
        s, c, k, cfg = self.inputs()
        with self.assertRaises(AuditError):
            validate(s.drop(s.index[20]), c, k, cfg)

    def test_reject_incomplete_post(self):
        s, c, k, cfg = self.inputs()
        with self.assertRaises(AuditError):
            validate(s[s.date < s.date.max()], c, k, cfg)

    def test_reject_duplicate_or_orphan_cost(self):
        for mode in ["duplicate", "orphan"]:
            s, c, k, cfg = self.inputs()
            if mode == "duplicate":
                k = pd.concat([k, k.iloc[:1]])
            else:
                k.loc[k.index[0], "campaign_id"] = "unknown"
            with self.assertRaises(AuditError):
                validate(s, c, k, cfg)

    def test_reject_overlapping_effect_horizons(self):
        s, c, k, cfg = self.inputs()
        other = c.iloc[:1].copy()
        other["campaign_id"] = "overlap"
        c = pd.concat([c, other])
        with self.assertRaises(AuditError):
            validate(s, c, k, cfg)

    def test_reject_unknown_flags_and_nonfinite(self):
        for column, value in [("stockout", ""), ("units", float("inf"))]:
            s, c, k, cfg = self.inputs()
            s[column] = s[column].astype(object)
            s.loc[s.index[0], column] = value
            with self.assertRaises(AuditError):
                validate(s, c, k, cfg)

    def test_reject_unconfirmed_finance_coverage(self):
        cfg = dict(self.cfg, cost_coverage_confirmed=False)
        path = self.root / "inputs" / "bad_coverage.json"
        path.write_text(json.dumps(cfg), encoding="utf-8")
        with self.assertRaises(AuditError):
            read_inputs(path)

    def test_preserve_previous_run(self):
        with self.assertRaises(AuditError):
            run(self.config, self.root / "run")

    def test_sensitivity_baseline_reproduces_profit(self):
        frame = calculate(self.root / "run", [1], [0])
        for row in frame.itertuples():
            self.assertAlmostEqual(row.incremental_contribution,
                                   self.by_series[row.series_id]["incremental_contribution"])
        increased = calculate(self.root / "run", [1], [1000])
        for row in increased.itertuples():
            self.assertAlmostEqual(row.incremental_contribution,
                                   self.by_series[row.series_id]["incremental_contribution"] - 1000)

    def test_html_and_csv_text_are_safe(self):
        cfg = dict(self.cfg, currency="<script>alert(1)</script>")
        report = render_report([], [], cfg)
        self.assertNotIn("<script>", report)
        safe = csv_safe(pd.DataFrame({"identifier": ["=1+1", " @SUM(A1)", "normal"]}))
        self.assertEqual(safe.identifier.iloc[0], "'=1+1")
        self.assertEqual(safe.identifier.iloc[1], "' @SUM(A1)")
        self.assertEqual(safe.identifier.iloc[2], "normal")


if __name__ == "__main__":
    unittest.main()
