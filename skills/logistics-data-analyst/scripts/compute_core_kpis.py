#!/usr/bin/env python3
"""Reference implementations for common logistics KPI calculations.

Import these functions into analysis code after adapting business definitions.
"""

from __future__ import annotations

import pandas as pd


def safe_rate(numerator: pd.Series, denominator: pd.Series | None = None) -> float | None:
    """Return a boolean/0-1 event rate, or numerator sum / denominator sum."""
    if denominator is None:
        s = numerator.dropna()
        return None if len(s) == 0 else float(s.astype(float).mean())
    den = float(denominator.sum())
    return None if den == 0 else float(numerator.sum() / den)


def otif_rate(df: pd.DataFrame, on_time_col: str, in_full_col: str, eligible_col: str | None = None) -> float | None:
    eligible = pd.Series(True, index=df.index) if eligible_col is None else df[eligible_col].fillna(False).astype(bool)
    subset = df.loc[eligible, [on_time_col, in_full_col]].dropna()
    if subset.empty:
        return None
    return float((subset[on_time_col].astype(bool) & subset[in_full_col].astype(bool)).mean())


def lead_time_hours(df: pd.DataFrame, start_col: str, end_col: str) -> pd.Series:
    start = pd.to_datetime(df[start_col], errors="coerce", utc=True)
    end = pd.to_datetime(df[end_col], errors="coerce", utc=True)
    hours = (end - start).dt.total_seconds() / 3600
    return hours.where(hours >= 0)


def weighted_absolute_percentage_error(actual: pd.Series, forecast: pd.Series) -> float | None:
    actual = pd.to_numeric(actual, errors="coerce")
    forecast = pd.to_numeric(forecast, errors="coerce")
    valid = actual.notna() & forecast.notna()
    denom = actual[valid].abs().sum()
    if denom == 0:
        return None
    return float((actual[valid] - forecast[valid]).abs().sum() / denom)


def forecast_bias(actual: pd.Series, forecast: pd.Series) -> float | None:
    actual = pd.to_numeric(actual, errors="coerce")
    forecast = pd.to_numeric(forecast, errors="coerce")
    valid = actual.notna() & forecast.notna()
    if not valid.any():
        return None
    # Positive means overforecast under forecast-actual convention.
    return float((forecast[valid] - actual[valid]).mean())
