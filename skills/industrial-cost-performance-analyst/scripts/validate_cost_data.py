#!/usr/bin/env python3
import argparse
import json
import pandas as pd

RECOMMENDED_COLUMNS = [
    "period", "product", "cost_center", "cost_category", "actual_cost",
    "production_qty", "unit"
]


def main():
    p = argparse.ArgumentParser(description="Validate normalized industrial cost CSV data")
    p.add_argument("csv")
    args = p.parse_args()

    df = pd.read_csv(args.csv)
    issues = []

    missing_cols = [c for c in RECOMMENDED_COLUMNS if c not in df.columns]
    if missing_cols:
        issues.append({"type": "missing_columns", "columns": missing_cols})

    for col in ["actual_cost", "production_qty", "budget_cost", "prior_cost"]:
        if col in df.columns:
            parsed = pd.to_numeric(df[col], errors="coerce")
            bad = int(parsed.isna().sum() - df[col].isna().sum())
            if bad > 0:
                issues.append({"type": "invalid_numeric", "column": col, "rows": bad})

    key_cols = [c for c in ["period", "product", "cost_center", "cost_category"] if c in df.columns]
    if key_cols:
        dup_count = int(df.duplicated(key_cols, keep=False).sum())
        if dup_count:
            issues.append({"type": "possible_duplicate_grain", "key": key_cols, "rows": dup_count})

    if "unit" in df.columns:
        units = sorted([str(x) for x in df["unit"].dropna().unique()])
        if len(units) > 1:
            issues.append({"type": "mixed_units", "values": units})

    if "currency" in df.columns:
        currencies = sorted([str(x) for x in df["currency"].dropna().unique()])
        if len(currencies) > 1:
            issues.append({"type": "mixed_currencies", "values": currencies})

    if "production_qty" in df.columns and "actual_cost" in df.columns:
        q = pd.to_numeric(df["production_qty"], errors="coerce")
        c = pd.to_numeric(df["actual_cost"], errors="coerce")
        z = int(((q == 0) & (c != 0) & c.notna()).sum())
        if z:
            issues.append({"type": "cost_with_zero_production", "rows": z})
        negq = int((q < 0).sum())
        if negq:
            issues.append({"type": "negative_production", "rows": negq})

    status = "Ready" if not issues else "Ready with caveats"
    if missing_cols and ("actual_cost" in missing_cols or "production_qty" in missing_cols):
        status = "Not sufficient for requested metric"

    print(json.dumps({
        "rows": len(df),
        "columns": list(df.columns),
        "status": status,
        "issues": issues,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
