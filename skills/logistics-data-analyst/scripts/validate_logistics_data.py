#!/usr/bin/env python3
"""Generic CSV audit for logistics datasets.

Usage:
    python validate_logistics_data.py data.csv --key shipment_id --date-cols order_ts ship_ts delivery_ts

The script is intentionally generic. It does not infer business semantics; it surfaces
structural issues for an analyst to review.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


def audit(path: Path, key: str | None, date_cols: list[str]) -> dict:
    df = pd.read_csv(path)
    result: dict = {
        "file": str(path),
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "duplicate_full_rows": int(df.duplicated().sum()),
        "missing_by_column": {c: int(v) for c, v in df.isna().sum().items()},
    }

    if key:
        if key not in df.columns:
            result["key_error"] = f"Key column '{key}' not found"
        else:
            result["key_nulls"] = int(df[key].isna().sum())
            result["key_duplicates"] = int(df[key].duplicated(keep=False).sum())
            result["distinct_keys"] = int(df[key].nunique(dropna=True))

    parsed_dates: dict[str, pd.Series] = {}
    for col in date_cols:
        if col not in df.columns:
            result.setdefault("date_errors", {})[col] = "column not found"
            continue
        parsed = pd.to_datetime(df[col], errors="coerce", utc=True)
        parsed_dates[col] = parsed
        result.setdefault("date_parse", {})[col] = {
            "non_null_input": int(df[col].notna().sum()),
            "parsed": int(parsed.notna().sum()),
            "unparsed_non_null": int((df[col].notna() & parsed.isna()).sum()),
            "min": parsed.min().isoformat() if parsed.notna().any() else None,
            "max": parsed.max().isoformat() if parsed.notna().any() else None,
        }

    # Chronology checks only for the supplied ordered date columns.
    chronology = {}
    ordered = [c for c in date_cols if c in parsed_dates]
    for left, right in zip(ordered, ordered[1:]):
        valid = parsed_dates[left].notna() & parsed_dates[right].notna()
        violations = valid & (parsed_dates[right] < parsed_dates[left])
        chronology[f"{left}<={right}"] = {
            "comparable_rows": int(valid.sum()),
            "violations": int(violations.sum()),
        }
    if chronology:
        result["chronology"] = chronology

    numeric = df.select_dtypes(include="number")
    if not numeric.empty:
        result["numeric_summary"] = {
            col: {
                "min": None if pd.isna(s.min()) else float(s.min()),
                "median": None if pd.isna(s.median()) else float(s.median()),
                "max": None if pd.isna(s.max()) else float(s.max()),
                "zeros": int((s == 0).sum()),
                "negative": int((s < 0).sum()),
            }
            for col, s in numeric.items()
        }
    return result


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("csv", type=Path)
    p.add_argument("--key")
    p.add_argument("--date-cols", nargs="*", default=[])
    p.add_argument("--output", type=Path)
    args = p.parse_args()

    result = audit(args.csv, args.key, args.date_cols)
    text = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
