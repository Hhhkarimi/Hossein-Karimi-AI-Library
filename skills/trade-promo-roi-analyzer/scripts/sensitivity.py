"""Point sensitivity scenarios from a completed run; these are NOT intervals."""
import argparse
import json
from pathlib import Path

import pandas as pd
import numpy as np

from analyze import AuditError, csv_safe, numeric, require


def calculate(run_dir, baseline_factors, extra_costs):
    run_dir = Path(run_dir)
    manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    require(manifest["config"]["financial_mode"], "Financial mode required for profit sensitivity")
    require(all(0 < f <= 3 for f in baseline_factors), "Baseline factors must be > 0 and <= 3")
    require(all(np.isfinite(c) and c >= 0 for c in extra_costs),
            "Additional unresolved costs must be finite and non-negative")
    rows = []
    for r in manifest["results"]:
        for factor in baseline_factors:
            for extra in extra_costs:
                profit = (r["actual_contribution_before_external_costs"]
                          - factor * r["baseline_contribution"]
                          - r["external_costs_deducted"] - extra)
                investment = r["investment"] + extra
                rows.append({
                    "campaign_id": r["campaign_id"], "series_id": r["series_id"],
                    "baseline_factor": factor, "additional_external_cost": extra,
                    "incremental_contribution": profit,
                    "roi": profit / investment if investment > 0 else None,
                    "interpretation": "assumed_scenario_not_confidence_interval",
                    "cost_assumption": "extra amount also included in agreed investment",
                })
    return pd.DataFrame(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", required=True)
    parser.add_argument("--baseline-factors", type=float, nargs="+", required=True)
    parser.add_argument("--extra-costs", type=float, nargs="+", default=[0])
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    path = Path(args.output)
    require(not path.exists(), "Preserve existing sensitivity output")
    csv_safe(calculate(args.run, args.baseline_factors, args.extra_costs)).to_csv(
        path, index=False, encoding="utf-8-sig")
