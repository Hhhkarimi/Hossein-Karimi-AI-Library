"""Forecast-based promotion audit, not a causal identification engine.

CLI: python scripts/analyze.py --config path/to/config.json --output path/to/run
Dependencies: numpy, pandas, openpyxl (xlsx only). No network access.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import platform
from pathlib import Path
from importlib.metadata import version

import numpy as np
import pandas as pd

VERSION = "1.0.0"
FREQS = {"D": (7, 56), "W-MON": (52, 26), "MS": (12, 12)}
FINANCE = ["net_revenue", "variable_cost", "normal_unit_price", "normal_unit_cost"]
SALES = ["date", "series_id", "units", "stockout", "other_promo"]
CAMPAIGNS = ["campaign_id", "series_id", "start", "end", "post_periods", "lookback_periods"]
COSTS = ["cost_id", "campaign_id", "series_id", "category", "amount",
         "embedded_in_actuals", "include_in_investment"]
CONFIG_KEYS = {
    "sales", "campaigns", "costs", "frequency", "financial_mode", "currency",
    "volume_unit", "entity_level", "cost_coverage_confirmed", "roi_hurdle",
    "min_pre_periods", "bootstrap_samples", "block_length", "seed",
    "max_validation_wape", "is_synthetic", "context_notes",
}


class AuditError(ValueError):
    """An input or design condition requiring an explicit analyst decision."""


def require(condition, message):
    if not condition:
        raise AuditError(message)


def boolean(value):
    if str(value).strip().lower() in {"true", "1", "1.0"}:
        return True
    if str(value).strip().lower() in {"false", "0", "0.0"}:
        return False
    raise AuditError(f"Expected explicit true/false or 0/1, received {value!r}")


def integer(value, minimum, name):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise AuditError(f"{name}: expected an integer")
    require(np.isfinite(number) and number == int(number) and number >= minimum,
            f"{name}: expected integer >= {minimum}")
    return int(number)


def numeric(frame, cols, label):
    for col in cols:
        try:
            frame[col] = pd.to_numeric(frame[col], errors="raise")
        except (ValueError, TypeError):
            raise AuditError(f"{label}.{col}: invalid number")
        require(np.isfinite(frame[col].to_numpy(dtype=float)).all(),
                f"{label}.{col}: missing/non-finite number")


def dates(frame, cols, label):
    for col in cols:
        # Normalization is explicit upstream; never infer ambiguous locale dates.
        strings = frame[col].astype(str)
        require(strings.str.fullmatch(r"\d{4}-\d{2}-\d{2}").all(),
                f"{label}.{col}: use Gregorian ISO YYYY-MM-DD")
        try:
            frame[col] = pd.to_datetime(strings, format="%Y-%m-%d", errors="raise")
        except ValueError:
            raise AuditError(f"{label}.{col}: invalid calendar date")


def load_table(spec, base, required, name):
    require(isinstance(spec, dict) and "path" in spec, f"{name}: path required")
    require(not (set(spec) - {"path", "sheet", "column_map", "encoding", "separator"}),
            f"{name}: unknown input settings")
    path = (base / spec["path"]).resolve()
    require(path.is_file(), f"{name}: file not found: {path}")
    suffix = path.suffix.lower()
    if suffix == ".csv":
        frame = pd.read_csv(path, dtype=str, keep_default_na=False,
                            encoding=spec.get("encoding", "utf-8-sig"),
                            sep=spec.get("separator", ","))
    elif suffix in {".xlsx", ".xls"}:
        frame = pd.read_excel(path, sheet_name=spec.get("sheet", 0),
                              dtype=str, keep_default_na=False)
        # Excel datetimes read as strings may carry a midnight component.
        for col in ["date", "start", "end"]:
            source = spec.get("column_map", {}).get(col, col)
            if source in frame:
                frame[source] = frame[source].str.replace(" 00:00:00", "", regex=False)
    else:
        raise AuditError(f"{name}: expected .csv, .xlsx or .xls")
    mapping = spec.get("column_map", {})
    require(isinstance(mapping, dict), f"{name}: column_map must be an object")
    require(len(set(mapping.values())) == len(mapping), f"{name}: ambiguous column_map")
    require(set(mapping.values()) <= set(frame.columns), f"{name}: mapped column absent")
    frame = frame.rename(columns={source: target for target, source in mapping.items()})
    require(frame.columns.is_unique, f"{name}: column mapping creates duplicate names")
    require(set(required) <= set(frame.columns),
            f"{name}: missing columns {sorted(set(required) - set(frame.columns))}")
    for col in ["series_id", "campaign_id", "cost_id", "category"]:
        if col in frame:
            frame[col] = frame[col].astype(str).str.strip()
            require(frame[col].ne("").all(), f"{name}.{col}: blank identifier")
    return frame, {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                   "rows": len(frame)}


def read_inputs(config_path):
    config_path = Path(config_path).resolve()
    cfg = json.loads(config_path.read_text(encoding="utf-8-sig"))
    require(isinstance(cfg, dict), "Config must be a JSON object")
    require(not (set(cfg) - CONFIG_KEYS), f"Unknown settings: {set(cfg) - CONFIG_KEYS}")
    for key in ["frequency", "financial_mode", "currency", "volume_unit", "entity_level"]:
        require(key in cfg, f"Missing setting: {key}")
    require(cfg["frequency"] in FREQS, "frequency must be D, W-MON or MS")
    for key in ["financial_mode", "cost_coverage_confirmed", "is_synthetic"]:
        if key in cfg:
            require(isinstance(cfg[key], bool), f"{key}: JSON boolean required")
    for key in ["currency", "volume_unit", "entity_level"]:
        require(isinstance(cfg[key], str) and bool(cfg[key].strip()), f"{key}: text required")
    for key, default in [("roi_hurdle", 0.0), ("max_validation_wape", 0.30)]:
        cfg.setdefault(key, default)
        require(isinstance(cfg[key], (int, float)) and np.isfinite(cfg[key]),
                f"{key}: finite number required")
    require(cfg["max_validation_wape"] > 0, "max_validation_wape must be positive")
    cfg["min_pre_periods"] = integer(cfg.get("min_pre_periods", FREQS[cfg["frequency"]][1]),
                                    8, "min_pre_periods")
    cfg["bootstrap_samples"] = integer(cfg.get("bootstrap_samples", 500), 100, "bootstrap_samples")
    cfg["block_length"] = integer(cfg.get("block_length", 7 if cfg["frequency"] == "D" else 3),
                                  1, "block_length")
    cfg["seed"] = integer(cfg.get("seed", 42), 0, "seed")
    if cfg["financial_mode"]:
        require(cfg.get("cost_coverage_confirmed") is True,
                "Financial mode requires confirmed full cost coverage; use volume-only otherwise")
    s, sp = load_table(cfg.get("sales"), config_path.parent,
                       SALES + (FINANCE if cfg["financial_mode"] else []), "sales")
    c, cp = load_table(cfg.get("campaigns"), config_path.parent, CAMPAIGNS, "campaigns")
    if cfg["financial_mode"]:
        k, kp = load_table(cfg.get("costs"), config_path.parent, COSTS, "costs")
    else:
        k, kp = pd.DataFrame(columns=COSTS), None
    validate(s, c, k, cfg)
    return s, c, k, cfg, [p for p in [sp, cp, kp] if p]


def horizon(row, freq):
    promo = pd.date_range(row.start, row.end, freq=freq)
    post = pd.date_range(row.end, periods=int(row.post_periods) + 1, freq=freq)[1:]
    return promo, post


def validate(s, c, k, cfg):
    require(len(s) > 0 and len(c) > 0, "sales and campaigns must have rows")
    require(not s.duplicated(["series_id", "date"]).any(), "Duplicate sales series/date")
    require(not c.duplicated(["campaign_id", "series_id"]).any(), "Duplicate campaign/series")
    dates(s, ["date"], "sales")
    dates(c, ["start", "end"], "campaigns")
    numeric(s, ["units"] + (FINANCE if cfg["financial_mode"] else []), "sales")
    for col in ["stockout", "other_promo"]:
        s[col] = s[col].map(boolean)
    for col in ["post_periods", "lookback_periods"]:
        c[col] = c[col].map(lambda v: integer(v, 1, col))
    require((c.end >= c.start).all(), "Campaign end before start")
    require(set(c.series_id) <= set(s.series_id), "Campaign refers to unknown series")
    for _, group in c.groupby("campaign_id"):
        require(len(group[["start", "end", "post_periods"]].drop_duplicates()) == 1,
                "One campaign has inconsistent horizons across series")
    freq = cfg["frequency"]
    for _, group in s.groupby("series_id"):
        expected = pd.date_range(group.date.min(), group.date.max(), freq=freq)
        require(len(expected) == len(group) and set(expected) == set(group.date),
                "Missing or off-grid sales periods; missing is not zero")
    for series, group in c.groupby("series_id"):
        occupied = set()
        for row in group.itertuples():
            require(row.start in set(s.loc[s.series_id == series, "date"])
                    and row.end in set(s.loc[s.series_id == series, "date"]),
                    "Campaign endpoints absent or off-grid")
            promo, post = horizon(row, freq)
            current = set(promo) | set(post)
            require(not occupied.intersection(current),
                    f"Overlapping campaign effects in series {series}; use a joint model")
            occupied.update(current)
            available = set(s.loc[s.series_id == series, "date"])
            require(current <= available, "Incomplete campaign/post horizon; report provisional separately")
    if cfg["financial_mode"]:
        require((s.normal_unit_price >= 0).all() and (s.normal_unit_cost >= 0).all(),
                "Counterfactual unit price/cost must be non-negative")
        require(not k.cost_id.duplicated().any(), "Duplicate cost_id")
        numeric(k, ["amount"], "costs")
        for col in ["embedded_in_actuals", "include_in_investment"]:
            k[col] = k[col].map(boolean).astype(bool)
        pairs = set(zip(c.campaign_id, c.series_id))
        require(set(zip(k.campaign_id, k.series_id)) <= pairs, "Orphan cost campaign/series")


def design(t, dates_index, frequency, model):
    if model == "mean":
        return np.ones((len(t), 1))
    scale = {"D": 365.25, "W-MON": 52.18, "MS": 12}[frequency]
    cols = [np.ones(len(t)), np.asarray(t) / scale]
    if frequency == "D":
        cols.extend([(dates_index.dayofweek == d).astype(float) for d in range(1, 7)])
    return np.column_stack(cols)


def fit_predict(x, y, future_x):
    require(len(y) >= x.shape[1] + 4 and np.linalg.matrix_rank(x) == x.shape[1],
            "Insufficient observations or rank-deficient regression")
    coef = np.linalg.lstsq(x, y, rcond=None)[0]
    raw = future_x @ coef
    return np.maximum(0, raw), x @ coef, coef, int((raw < 0).sum())


def select_model(pre, clean, min_pre, eval_len, frequency):
    # Three expanding-origin folds entirely before treatment. Validation targets
    # contaminated by other campaigns/stockouts are excluded and counted.
    n = len(pre)
    h = min(eval_len, max(1, (n - min_pre) // 3))
    require(n - 3 * h >= min_pre, "Need extra prehistory for three temporal validation folds")
    scores, rows = {}, []
    for model in ["mean", "trend_calendar_ols"]:
        errors, truths = [], []
        valid = True
        x = design(pre.t.to_numpy(), pd.DatetimeIndex(pre.date), frequency, model)
        for fold, cut in enumerate([n - 3 * h, n - 2 * h, n - h], 1):
            train = clean[:cut]
            test = clean[cut:cut + h]
            if train.sum() < min_pre or test.sum() < max(1, h // 2):
                valid = False
                break
            try:
                pred, _, _, _ = fit_predict(x[:cut][train], pre.units.to_numpy()[:cut][train],
                                            x[cut:cut + h][test])
            except AuditError:
                valid = False
                break
            truth = pre.units.to_numpy()[cut:cut + h][test]
            errors.extend(abs(truth - pred))
            truths.extend(abs(truth))
            denom = float(abs(truth).sum())
            rows.append({"model": model, "fold": fold, "train_periods": int(train.sum()),
                         "validation_periods": int(test.sum()), "horizon": h,
                         "mae": float(np.mean(abs(truth - pred))),
                         "wape": float(np.sum(abs(truth - pred)) / denom) if denom else None})
        if valid:
            scores[model] = float(np.mean(errors))
    require(scores, "No model has three valid pre-treatment validation folds")
    chosen = min(scores, key=scores.get)
    chosen_rows = [r for r in rows if r["model"] == chosen]
    return chosen, rows, h, scores


def block_sample(residuals, time_positions, length, block, rng):
    # Only contiguous clean-history blocks qualify. Never bridge excluded gaps.
    block = min(block, len(residuals))
    starts = [i for i in range(len(residuals) - block + 1)
              if block == 1 or np.all(np.diff(time_positions[i:i + block]) == 1)]
    require(starts, "No contiguous residual block available; review block length or exclusions")
    chunks = [residuals[rng.choice(starts):][:block] for _ in range((length + block - 1) // block)]
    return np.concatenate(chunks)[:length]


def interval(values):
    lo, hi = np.quantile(values, [0.025, 0.975])
    return [float(lo), float(hi)]


def analyze_one(s, c, k, row, cfg, rng):
    freq = cfg["frequency"]
    series = s[s.series_id == row.series_id].sort_values("date").copy()
    series["t"] = np.arange(len(series), dtype=float)
    promo_dates, post_dates = horizon(row, freq)
    eval_dates = promo_dates.append(post_dates)
    evaluation = series[series.date.isin(eval_dates)].copy()
    pre = series[series.date < row.start].tail(int(row.lookback_periods)).copy()
    require(len(pre) == row.lookback_periods, "Requested lookback history is incomplete")
    clean = ~(pre.stockout | pre.other_promo).to_numpy()
    for other in c[c.series_id == row.series_id].itertuples():
        a, b = horizon(other, freq)
        clean &= ~pre.date.isin(a.append(b)).to_numpy()
    require((pre.units.to_numpy()[clean] >= 0).all(),
            "Negative net units in training: review returns and aggregation")
    require(clean.sum() >= cfg["min_pre_periods"], "Insufficient clean prehistory")
    model, cv, cv_h, scores = select_model(pre, clean, cfg["min_pre_periods"],
                                          len(evaluation), freq)
    xp = design(pre.t.to_numpy(), pd.DatetimeIndex(pre.date), freq, model)
    xe = design(evaluation.t.to_numpy(), pd.DatetimeIndex(evaluation.date), freq, model)
    xt, yt = xp[clean], pre.units.to_numpy()[clean]
    point, fitted, coef, clipped = fit_predict(xt, yt, xe)
    residuals = yt - fitted
    residuals -= residuals.mean()
    positions = pre.t.to_numpy()[clean]
    paths = []
    for _ in range(cfg["bootstrap_samples"]):
        pseudo_y = fitted + block_sample(residuals, positions, len(yt),
                                          cfg["block_length"], rng)
        p, _, _, _ = fit_predict(xt, pseudo_y, xe)
        future_errors = block_sample(residuals, positions, len(point),
                                     cfg["block_length"], rng)
        paths.append(np.maximum(0, p + future_errors))
    paths = np.asarray(paths)
    actual = evaluation.units.to_numpy()
    delta_paths = actual[None, :] - paths
    evaluation["phase"] = np.where(evaluation.date <= row.end, "campaign", "post")
    evaluation["campaign_id"] = row.campaign_id
    evaluation["baseline_units"] = point
    evaluation["incremental_units"] = actual - point
    evaluation["cumulative_incremental_units"] = (actual - point).cumsum()
    evaluation["baseline_p025"], evaluation["baseline_p975"] = np.quantile(paths, [0.025, 0.975], axis=0)
    evaluation["cumulative_increment_p025"], evaluation["cumulative_increment_p975"] = np.quantile(
        np.cumsum(delta_paths, axis=1), [0.025, 0.975], axis=0)
    promo_mask = (evaluation.phase == "campaign").to_numpy()
    during = float((actual - point)[promo_mask].sum())
    after = float((actual - point)[~promo_mask].sum())
    offset = min(max(-after, 0), max(during, 0))
    evidence_flags = []
    if evaluation.stockout.any():
        evidence_flags.append("stockout_during_effect_window")
    if evaluation.other_promo.any():
        evidence_flags.append("other_promo_during_effect_window")
    if clipped:
        evidence_flags.append("negative_baseline_predictions_clipped")
    chosen_cv = [z for z in cv if z["model"] == model]
    wapes = [z["wape"] for z in chosen_cv if z["wape"] is not None]
    if not wapes or max(wapes) > cfg["max_validation_wape"]:
        evidence_flags.append("validation_error_above_review_threshold_or_undefined")
    if cv_h < len(evaluation):
        evidence_flags.append("validation_horizon_shorter_than_effect_window")
    if cfg["frequency"] != "D":
        evidence_flags.append("helper_has_no_annual_or_holiday_seasonality")
    result = {
        "campaign_id": row.campaign_id, "series_id": row.series_id,
        "model": model, "model_mae": scores, "validation_horizon": cv_h,
        "clean_pre_periods": int(clean.sum()), "excluded_pre_periods": int((~clean).sum()),
        "actual_units": float(actual.sum()), "baseline_units": float(point.sum()),
        "incremental_units_during": during, "incremental_units_post": after,
        "incremental_units_total": during + after,
        "incremental_units_95_model_interval": interval(delta_paths.sum(axis=1)),
        "lift_during": during / float(point[promo_mask].sum()) if point[promo_mask].sum() > 0 else None,
        "post_offset_units_proxy": offset,
        "post_offset_ratio_proxy": offset / during if during > 0 else None,
        "forward_buying_interpretation": "descriptive_signature_only_not_proof",
        "method_scope": "forecast_based_conditional_on_stability_not_causal",
        "evidence_flags": evidence_flags, "coefficients": [float(z) for z in coef],
        "incremental_contribution": None, "investment": None, "roi": None,
        "decision": "volume_only",
    }
    if cfg["financial_mode"]:
        costs = k[(k.campaign_id == row.campaign_id) & (k.series_id == row.series_id)]
        extra = float(costs.loc[~costs.embedded_in_actuals, "amount"].sum())
        investment = float(costs.loc[costs.include_in_investment, "amount"].sum())
        margin = (evaluation.normal_unit_price - evaluation.normal_unit_cost).to_numpy()
        actual_cm = (evaluation.net_revenue - evaluation.variable_cost).to_numpy()
        evaluation["actual_contribution"] = actual_cm
        evaluation["baseline_contribution"] = point * margin
        evaluation["incremental_contribution_before_external_costs"] = actual_cm - point * margin
        delta_profit = float((actual_cm - point * margin).sum() - extra)
        profit_paths = actual_cm.sum() - paths @ margin - extra
        profit_ci = interval(profit_paths)
        result.update({
            "actual_contribution_before_external_costs": float(actual_cm.sum()),
            "baseline_contribution": float((point * margin).sum()),
            "external_costs_deducted": extra,
            "embedded_costs_not_deducted_twice": float(costs.loc[costs.embedded_in_actuals, "amount"].sum()),
            "incremental_contribution": delta_profit, "investment": investment,
            "incremental_contribution_95_model_interval": profit_ci,
            "roi": delta_profit / investment if investment > 0 else None,
            "roi_95_model_interval": interval(profit_paths / investment) if investment > 0 else None,
            "roi_definition": "incremental_contribution_net_of_all_campaign_costs / agreed_investment",
        })
        threshold_profit = max(0.0, cfg["roi_hurdle"] * investment)
        if evidence_flags or investment <= 0:
            decision = "review_design_or_inputs"
        elif profit_ci[0] > threshold_profit:
            decision = "candidate_for_repeat_subject_to_design_review"
        elif profit_ci[1] < threshold_profit:
            decision = "candidate_for_stop_or_redesign_subject_to_design_review"
        else:
            decision = "uncertain_test_or_redesign"
        result["decision"] = decision
    for z in cv:
        z.update(campaign_id=row.campaign_id, series_id=row.series_id)
    return result, evaluation, cv


def chart_svg(frame, cumulative=False):
    width, height, pad = 800, 240, 35
    if cumulative:
        arrays = [frame.cumulative_incremental_units.to_numpy()]
    else:
        arrays = [frame.units.to_numpy(), frame.baseline_units.to_numpy()]
    low = min(0, min(float(a.min()) for a in arrays))
    high = max(1, max(float(a.max()) for a in arrays))
    def points(a):
        return " ".join(f"{pad + i * (width - 2 * pad) / max(1, len(a) - 1):.1f},"
                        f"{height - pad - (v - low) * (height - 2 * pad) / (high - low):.1f}"
                        for i, v in enumerate(a))
    paths = "".join(f'<polyline points="{points(a)}" fill="none" stroke="{color}" stroke-width="2"/>'
                    for a, color in zip(arrays, ["#14624d", "#b36a16"]))
    zero = height - pad - (0 - low) * (height - 2 * pad) / (high - low)
    first, last = frame.date.iloc[0].strftime("%Y-%m-%d"), frame.date.iloc[-1].strftime("%Y-%m-%d")
    label = "اثر تجمعی؛ سبز" if cumulative else "فروش واقعی: سبز؛ خط پایه: نارنجی"
    event_count = int((frame.phase == "campaign").sum())
    boundary_x = pad + (event_count - 0.5) * (width - 2 * pad) / max(1, len(frame) - 1)
    boundary = (f'<line x1="{boundary_x}" x2="{boundary_x}" y1="20" y2="{height-pad}" '
                f'stroke="#777" stroke-dasharray="5 4"/><text x="{boundary_x+5}" y="17" '
                'font-size="12">پایان اجرا</text>')
    return (f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="{label}">'
            f'<title>{label}</title><line x1="{pad}" x2="{width-pad}" y1="{zero}" y2="{zero}" stroke="#aaa"/>'
            f'{boundary}{paths}<g font-size="12" fill="#333"><text x="2" y="18">{high:,.0f}</text>'
            f'<text x="2" y="{height-pad}">{low:,.0f}</text><text x="{pad}" y="{height-5}">{first}</text>'
            f'<text x="{width-120}" y="{height-5}">{last}</text></g></svg><p>{label}</p>')


def render_report(results, details, cfg):
    esc = lambda x: html.escape(str(x))
    def number(value):
        return "قابل محاسبه نیست" if value is None else f"{value:,.2f}"
    def bounds(values):
        return ("محاسبه نشده" if values is None else
                f'<bdi dir="ltr">{number(values[0])}</bdi> تا <bdi dir="ltr">{number(values[1])}</bdi>')
    sections = []
    labels = {
        "volume_only": "تحلیل حجم؛ سود محاسبه نشده",
        "review_design_or_inputs": "نیازمند بررسی طراحی یا ورودی",
        "candidate_for_repeat_subject_to_design_review": "نامزد تکرار، مشروط به بررسی طراحی اثر",
        "candidate_for_stop_or_redesign_subject_to_design_review": "نامزد توقف یا اصلاح، مشروط به بررسی طراحی اثر",
        "uncertain_test_or_redesign": "نتیجه نامطمئن؛ آزمایش یا اصلاح",
    }
    for r, frame in zip(results, details):
        metrics = [("فروش افزایشی کل", r["incremental_units_total"]),
                   ("اثر حین کمپین", r["incremental_units_during"]),
                   ("اثر پس‌دوره", r["incremental_units_post"]),
                   ("سود مشارکت افزایشی", r["incremental_contribution"]),
                   ("سرمایه‌گذاری توافق‌شده", r["investment"]),
                   ("ROI به درصد", r["roi"] * 100 if r["roi"] is not None else None)]
        rows = "".join(f"<tr><th>{label}</th><td>{number(v)}</td></tr>" for label, v in metrics)
        sections.append(f'<section><h2>{esc(r["campaign_id"])} / {esc(r["series_id"])}</h2>'
                        f'<p>{esc(labels[r["decision"]])}</p><table>{rows}</table>'
                        f'<p>بازه ۹۵٪ مدل برای حجم افزایشی: {bounds(r["incremental_units_95_model_interval"])}</p>'
                        f'<p>بازه ۹۵٪ مدل برای سود: {bounds(r.get("incremental_contribution_95_model_interval"))}</p>'
                        f'<p>موارد نیازمند بررسی: {esc(", ".join(r["evidence_flags"]) or "پرچمی از کنترل‌های محدود موتور ثبت نشد")}</p>'
                        f'{chart_svg(frame)}{chart_svg(frame, True)}</section>')
    synthetic = "<p class='notice'>نمونه کاملاً ساختگی؛ یافته واقعی شرکت نیست.</p>" if cfg.get("is_synthetic") else ""
    return ('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>حسابرسی پروموشن</title><style>'
            'body{font:16px Tahoma,Arial,sans-serif;line-height:1.9;background:#f3f5f4;color:#172c25;max-width:1000px;margin:auto;padding:24px}'
            'section{background:white;margin:24px 0;padding:24px;border:1px solid #ccd6d0;border-radius:8px}'
            'table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;text-align:right;padding:8px}'
            'td{direction:ltr;text-align:left}.notice{background:#fff0cf;padding:16px}svg{width:100%;direction:ltr}'
            'h1,h2,p{overflow-wrap:anywhere}th{width:58%}@media(max-width:600px){body{padding:12px}section{padding:14px}h1{font-size:26px}h2{font-size:19px}}'
            '</style><body><h1>حسابرسی اثربخشی پروموشن</h1>' + synthetic +
            f'<p>سطح: {esc(cfg["entity_level"])}؛ پول: {esc(cfg["currency"])}؛ حجم: {esc(cfg["volume_unit"])}</p>'
            '<p class="notice">اثر برآوردشده بر اساس خط پایه پیش‌بینی و فرض ثبات است. بازه‌ها مشروط به مدل‌اند؛ '
            'اثر علّی، ریسک مخدوش‌گری و هزینه نامعلوم را پوشش نمی‌دهند. افت پس‌دوره به‌تنهایی اثبات خرید جلوتر از موعد نیست. '
            'مقایسه سود در این گزارش سود مشارکت است.</p>' + "".join(sections) +
            '<p>جزئیات محاسبات، هزینه‌های خارج از actuals، اعتبارسنجی و منشأ فایل‌ها در CSV و manifest همین پوشه ثبت شده‌اند. '
            'گزارش موتور جای گزارش نهایی تحلیلگر و بررسی سبد/کانال را نمی‌گیرد. نمودارها برآورد نقطه‌ای‌اند؛ بازه‌ها در داده جزئیات موجودند.</p></body></html>')


def csv_safe(frame):
    # Prevent spreadsheet formula execution when text outputs are opened in Excel.
    out = frame.copy()
    for col in out.select_dtypes(include=["object", "string"]).columns:
        out[col] = out[col].map(lambda x: "'" + x if isinstance(x, str)
                               and x.lstrip().startswith(("=", "+", "-", "@")) else x)
    return out


def run(config_path, output):
    s, c, k, cfg, sources = read_inputs(config_path)
    output = Path(output).resolve()
    require(not output.exists() or not any(output.iterdir()),
            "Output directory must be new or empty; existing runs are preserved")
    rng = np.random.default_rng(cfg["seed"])
    results, details, validations = [], [], []
    for row in c.sort_values(["campaign_id", "series_id"]).itertuples():
        result, detail, cv = analyze_one(s, c, k, row, cfg, rng)
        results.append(result)
        details.append(detail)
        validations.extend(cv)
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "engine_version": VERSION, "python": platform.python_version(),
        "libraries": {name: version(name) for name in ["numpy", "pandas"]},
        "config": cfg, "config_sha256": hashlib.sha256(Path(config_path).read_bytes()).hexdigest(),
        "sources": sources, "results": results,
        "interval_scope": "95% residual moving-block predictive bootstrap, conditional on selected model; not causal confidence",
        "aggregation": "No portfolio sum is emitted: analyst must establish non-overlap and dependence",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2,
                                                    allow_nan=False), encoding="utf-8")
    summary = pd.json_normalize(results)
    csv_safe(summary).to_csv(output / "campaign_summary.csv", index=False, encoding="utf-8-sig")
    csv_safe(pd.concat(details)).to_csv(output / "period_details.csv", index=False, encoding="utf-8-sig")
    csv_safe(pd.DataFrame(validations)).to_csv(output / "validation.csv", index=False, encoding="utf-8-sig")
    csv_safe(k).to_csv(output / "cost_ledger.csv", index=False, encoding="utf-8-sig")
    (output / "report.html").write_text(render_report(results, details, cfg), encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        result = run(args.config, args.output)
    except (AuditError, OSError, json.JSONDecodeError, ImportError) as exc:
        parser.exit(2, f"Audit stopped: {exc}\n")
    print(f"Completed {len(result['results'])} campaign-series audits. See {Path(args.output).resolve()}")


if __name__ == "__main__":
    main()
