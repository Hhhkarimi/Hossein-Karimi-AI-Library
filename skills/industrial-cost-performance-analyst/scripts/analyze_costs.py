#!/usr/bin/env python3
import argparse
import json
import math
import pandas as pd


def safe_pct(num, den):
    if den is None or pd.isna(den) or den == 0:
        return None
    return num / den * 100.0


def main():
    p = argparse.ArgumentParser(description="Analyze normalized industrial cost CSV data")
    p.add_argument("csv")
    p.add_argument("--period", required=True)
    p.add_argument("--prior-period")
    p.add_argument("--product")
    args = p.parse_args()

    df = pd.read_csv(args.csv)
    df["actual_cost"] = pd.to_numeric(df["actual_cost"], errors="coerce")
    df["production_qty"] = pd.to_numeric(df["production_qty"], errors="coerce")
    if "budget_cost" in df.columns:
        df["budget_cost"] = pd.to_numeric(df["budget_cost"], errors="coerce")

    cur = df[df["period"].astype(str) == str(args.period)].copy()
    if args.product and "product" in cur.columns:
        cur = cur[cur["product"].astype(str) == str(args.product)]

    if cur.empty:
        raise SystemExit("No rows found for requested period/product")

    # Avoid double-counting repeated production quantity at line-item level.
    # Prefer a unique period/product production quantity if consistent.
    qty_values = cur["production_qty"].dropna().unique()
    if len(qty_values) == 1:
        qty = float(qty_values[0])
    else:
        # If multiple quantities exist, sum once per product if possible.
        if "product" in cur.columns:
            qty = float(cur[["product", "production_qty"]].drop_duplicates()["production_qty"].sum())
        else:
            qty = float(cur["production_qty"].sum())

    total = float(cur["actual_cost"].sum())
    unit_cost = total / qty if qty else None

    group_col = "cost_center" if "cost_center" in cur.columns else "cost_category"
    centers = cur.groupby(group_col, dropna=False)["actual_cost"].sum().reset_index()
    centers["share_pct"] = centers["actual_cost"].apply(lambda x: safe_pct(x, total))
    centers["cost_per_unit"] = centers["actual_cost"].apply(lambda x: x / qty if qty else None)

    budget_total = None
    budget_var = None
    budget_var_pct = None
    if "budget_cost" in cur.columns:
        budget_total = float(cur["budget_cost"].sum())
        budget_var = total - budget_total
        budget_var_pct = safe_pct(budget_var, budget_total)

    prior = None
    if args.prior_period:
        pr = df[df["period"].astype(str) == str(args.prior_period)].copy()
        if args.product and "product" in pr.columns:
            pr = pr[pr["product"].astype(str) == str(args.product)]
        if not pr.empty:
            prior_total = float(pd.to_numeric(pr["actual_cost"], errors="coerce").sum())
            pqty_vals = pd.to_numeric(pr["production_qty"], errors="coerce").dropna().unique()
            if len(pqty_vals) == 1:
                pqty = float(pqty_vals[0])
            elif "product" in pr.columns:
                pqty = float(pr[["product", "production_qty"]].drop_duplicates()["production_qty"].sum())
            else:
                pqty = float(pd.to_numeric(pr["production_qty"], errors="coerce").sum())
            prior_unit = prior_total / pqty if pqty else None
            prior = {
                "period": args.prior_period,
                "total_cost": prior_total,
                "production_qty": pqty,
                "unit_cost": prior_unit,
                "total_cost_change": total - prior_total,
                "total_cost_change_pct": safe_pct(total - prior_total, prior_total),
                "unit_cost_change": (unit_cost - prior_unit) if unit_cost is not None and prior_unit is not None else None,
                "unit_cost_change_pct": safe_pct(unit_cost - prior_unit, prior_unit) if unit_cost is not None and prior_unit is not None else None,
            }

    result = {
        "period": args.period,
        "product": args.product,
        "production_qty": qty,
        "actual_total_cost": total,
        "actual_unit_cost": unit_cost,
        "budget_total_cost": budget_total,
        "budget_variance": budget_var,
        "budget_variance_pct": budget_var_pct,
        "prior_comparison": prior,
        "cost_centers": centers.where(pd.notna(centers), None).to_dict(orient="records"),
        "reconciliation": {
            "cost_center_sum": float(centers["actual_cost"].sum()),
            "difference_vs_total": float(centers["actual_cost"].sum() - total),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
