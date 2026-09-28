# Evaluation Rubric for Logistics Analytics Outputs

Score each dimension 0-10. A production-ready analysis should target at least 90/100 and must not score below 7 on Data Integrity, KPI Semantics, or Evidence.

1. **Decision framing** — Is the operational decision explicit?
2. **Data integrity** — Were grain, joins, missingness, chronology, and reconciliation checked?
3. **KPI semantics** — Are formulas, denominator, exclusions, and time rules explicit?
4. **Statistical correctness** — Are methods appropriate and uncertainty handled?
5. **Temporal validity** — Are forecasting/evaluation methods time-aware?
6. **Domain depth** — Are logistics mechanisms and constraints represented correctly?
7. **Root-cause discipline** — Are drivers decomposed rather than merely correlated?
8. **Actionability** — Are recommendations operational, owned, and measurable?
9. **Reproducibility** — Could another analyst reproduce the result?
10. **Communication** — Is the answer concise, traceable, and decision-ready?

## Automatic critical failures

Any of these prevents a top score:
- inventing data;
- hiding a material data-quality issue;
- using a many-to-many join without controlling duplication;
- reporting a KPI without a reconstructable denominator;
- random train/test split for ordinary time-series forecasting;
- declaring causation from correlation alone;
- calling a heuristic result "optimal" without evidence;
- ranking carriers or warehouses without noting material mix/volume differences;
- summing inventory snapshots across time as though they were additive.
