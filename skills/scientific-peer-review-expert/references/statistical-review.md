# Statistical and numerical audit

Audit the inference intended by the authors, using available information. For every issue identify the estimand/question, affected result and consequence. A checklist item becomes a comment only when scientifically relevant.

## Before tests and models

Identify independent units, nesting, repeated measures, time/spatial structure, sampling weights, outcomes/exposures, analysis population and denominators. Check sample-size rationale against design and precision needs; a universal minimum n is inappropriate. Avoid observed post-hoc power as a substitute for the effect estimate and uncertainty. Distinguish planned/registered, exploratory and altered analyses.

## Model choice and assumptions

Does the method target the question and data structure? Consider dependence, distribution/link, nonlinearity, heteroskedasticity, separation, sparse cells, censoring/competing risks, time-varying factors and identifiability as relevant. Assess diagnostics and sensitivity to consequential assumptions. Normality of raw data is not a universal prerequisite; assess the actual model/errors or estimator. A nonsignificant normality test is not proof of assumptions.

For Bayesian analyses assess likelihood, prior justification, sensitivity, computation diagnostics and interpretation of posterior intervals. Do not import frequentist p-value thresholds. For prediction distinguish discrimination, calibration, decision utility and external validity; causal effect estimation has different requirements.

## Estimates and interpretation

Seek interpretable effect sizes, uncertainty intervals, denominators and outcome scale. Distinguish statistical from practical significance. A nonsignificant result does not prove equivalence or no effect; a significant result does not prove causality or importance. Compare subgroup effects through a relevant interaction/contrast; “significant here, nonsignificant there” alone does not establish a difference. Check multiplicity for the family of consequential claims, without mechanically demanding a correction for every descriptive comparison.

## Missingness and selective analysis

Check amount/pattern of missing data, reasons when known, analysis exclusions and handling assumptions. Complete-case analysis, imputation and weighting have different vulnerabilities; an analysis choice is not invalid solely because another exists. Consider sensitivity to plausible missing-not-at-random mechanisms when the central inference depends on them. Compare specified and reported outcomes where protocols are available; a discrepancy is an indicator to clarify before alleging selective reporting.

## Numerical consistency

Check totals, group denominators, percentages, scale direction, units, sample counts across sections, effect/interval/sign/p-value compatibility and figure-table agreement. Allow rounding and differing populations/two-sided versus one-sided/adjusted methods before declaring contradiction. A Wald interval is not interchangeable with profile likelihood or an exact interval. Avoid recovering exact p-values from rounded summaries without adequate inputs.

Illustrative arithmetic check with sufficient stated inputs: if a table says 12 of 40 participants, the proportion is 30%; an incompatible 45% needs denominator/entry clarification. Log actual calculation if a tool is used; do not claim reanalysis of patient data from this check. For a computational audit record input provenance, formulas/code, software version if material, actual output and limitations.

## Overfitting and leakage

Assess effective sample/information size, model complexity, tuning choices, regularization and validation design. Splitting observations that share people, hospitals, documents or time information may violate the intended independent test. Data transformation and feature selection fitted on all data can contaminate evaluation. Demonstrate the actual path from the methods to leakage rather than alleging it from strong results. Check confidence intervals respect clustering and repeated evaluation units.

## Meta-analysis specifics

Inspect effect measure conversions, shared controls, multiple outcomes/estimates per study, within-study versus between-study variation, heterogeneity assumptions, small-study effects and sensitivity. Do not treat I-squared as a universal decision rule or a funnel-plot asymmetry test as proof of publication bias, especially with few studies. Assess certainty at the evidence-body level using an appropriate framework if requested and supported; do not invent a formal rating from incomplete information.

## Available-information boundary

Without raw data, assess reported design, assumptions, numerical coherence and interpretation; do not claim residual diagnostics, exact missingness mechanisms or replication. Without code, distinguish implementation reporting from implementation correctness. Unavailable checks belong in limitations unless authors make a central, checkable transparency claim contradicted by evidence. Route qualitative/theoretical work to methodology-audit instead of inventing statistical defects.
