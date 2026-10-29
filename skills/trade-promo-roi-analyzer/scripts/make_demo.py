"""Create fully synthetic audit fixtures. No company/customer data is used."""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd


def create_demo(output):
    output = Path(output)
    if output.exists() and any(output.iterdir()):
        raise ValueError("Use a new or empty demo directory")
    output.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(1301)
    dates = pd.date_range("2025-01-06", periods=252, freq="D")
    t = np.arange(len(dates))
    base = 100 + 0.08 * t + np.array([0, 7, 9, 12, 15, -8, -12])[dates.dayofweek]
    sales, campaigns, costs, truths = [], [], [], []
    for name, during, after, discount in [
        ("profitable", 40.0, 0.0, 2.0),
        ("volume_but_loss", 8.0, 0.0, 20.0),
        ("forward_signature", 35.0, -17.5, 10.0),
    ]:
        baseline = base + rng.normal(0, 0.5, len(dates))
        treatment = np.zeros(len(dates))
        treatment[210:224] = during
        treatment[224:] = after
        units = baseline + treatment
        price = np.full(len(dates), 100.0)
        price[210:224] -= discount
        frame = pd.DataFrame({
            "date": dates.strftime("%Y-%m-%d"), "series_id": name,
            "units": units, "stockout": False, "other_promo": False,
            "net_revenue": units * price, "variable_cost": units * 60,
            "normal_unit_price": 100.0, "normal_unit_cost": 60.0,
        })
        sales.append(frame)
        campaign = "SYNTH_" + name
        campaigns.append({
            "campaign_id": campaign, "series_id": name,
            "start": dates[210].strftime("%Y-%m-%d"), "end": dates[223].strftime("%Y-%m-%d"),
            "post_periods": 28, "lookback_periods": 210,
        })
        price_concession = float((units[210:224] * discount).sum())
        costs.extend([
            {"cost_id": name + "_discount", "campaign_id": campaign, "series_id": name,
             "category": "discount", "amount": price_concession,
             "embedded_in_actuals": True, "include_in_investment": True},
            {"cost_id": name + "_display", "campaign_id": campaign, "series_id": name,
             "category": "display", "amount": 1000,
             "embedded_in_actuals": False, "include_in_investment": True},
        ])
        truths.append({
            "series_id": name, "known_incremental_units": float(treatment.sum()),
            "known_incremental_contribution": float(treatment.sum() * 40 - price_concession - 1000),
            "synthetic_only": True,
        })
    pd.concat(sales).to_csv(output / "sales.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(campaigns).to_csv(output / "campaigns.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(costs).to_csv(output / "costs.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(truths).to_csv(output / "known_synthetic_truth.csv", index=False, encoding="utf-8-sig")
    cfg = {
        "sales": {"path": "sales.csv"}, "campaigns": {"path": "campaigns.csv"},
        "costs": {"path": "costs.csv"}, "frequency": "D", "financial_mode": True,
        "currency": "تومان؛ داده ساختگی", "volume_unit": "واحد فرضی", "entity_level": "شرکت فرضی",
        "cost_coverage_confirmed": True, "roi_hurdle": 0.15, "min_pre_periods": 56,
        "bootstrap_samples": 500, "block_length": 7, "seed": 42,
        "max_validation_wape": 0.30, "is_synthetic": True,
        "context_notes": "Completely synthetic; three non-overlapping fictional series; no control group.",
    }
    (output / "config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    return output / "config.json"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    print(create_demo(args.output))
