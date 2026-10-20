# SPRE Knowledge

Generated from canonical skill files. Regenerate after editing sources. Source paths below identify modules; they do not grant filesystem access in ChatGPT.

---

## Module: references/scientific-review-principles.md

# Scientific review principles and rubrics

Review the strongest defensible interpretation of the actual manuscript, with consequences tied to its claims. Distinguish evidence, inference and preference. A competing approach being possible does not show the selected approach is invalid. Replication, negative findings and careful incremental work may be valuable; novelty expectations depend on documented journal context.

## Two independent finding axes

| Axis | Value | Meaning |
|---|---|---|
| Severity | Major | Material effect on validity, interpretation, support, contribution or reproducibility of central conclusions |
| Severity | Minor | Local clarity, precision, presentation or documentation issue without material effect on central findings |
| Evidence | A — Confirmed issue | Direct, reliable manuscript evidence or actual verification establishes the specific issue |
| Evidence | B — Well-supported concern | Evidence gives a defensible concern, but relevant alternatives remain |
| Evidence | C — Clarification required | A consequential uncertainty requiring an author answer; no established defect yet |
| Evidence | D — External verification unavailable | An assertion cannot presently be independently checked; not itself an author error |

Use D in a limitation/verification record unless a separate traceable scientific problem warrants a comment. Severity does not measure confidence. Optional internal impact labels (critical, major, moderate, minor) may aid triage; the report uses Major/Minor consistently. A “critical” label still requires evidence and remediability assessment.

## Qualitative evaluation rubric

For each applicable dimension choose supported / concern / insufficient information / not applicable and attach evidence. These are descriptive judgments, not points to sum.

| Dimension | Supported when | Concern when |
|---|---|---|
| Question/concepts | Objectives and constructs are coherent and suited to the tradition | Ambiguity changes the scientific interpretation or hides a logical dependency |
| Methods | Design and implementation can answer the stated question within justified assumptions | A concrete design/measurement/identification defect compromises the question |
| Evidence | Data, analysis, proof or sources support the central claims within uncertainty | Evidence and inference diverge in a consequential way |
| Contribution | A defensible advance or useful replication is contextualized appropriately | Contribution is overstated against specific accessible evidence |
| Transparency | A qualified reader can evaluate consequential choices | Missing detail blocks an actual validity check rather than only a preferred format |
| Integrity | Applicable ethics/disclosures are addressed and no substantiated contradictory evidence is present | Specific indicators require human editorial investigation; absence of indicators does not certify integrity |
| Presentation | Readers can recover the scientific meaning and trace evidence | Ambiguity or display errors materially impede interpretation |

## Proportional criticism

For each proposed demand ask: Which central claim requires it? What uncertainty would it resolve? Could clarification, corrected calculation, sensitivity analysis or narrower wording suffice? Is the requested effort proportionate? Label genuinely optional extensions separately and exclude them from acceptance conditions.

Comment on scientific meaning before grammar. Preserve disciplinary epistemologies; a qualitative interpretation can be rigorous without p-values. Assess source coverage rather than demanding citations from particular countries, institutions, the reviewer or a favored journal. Respectful disagreement and favorable evaluation are both valid outcomes.

---

## Module: references/methodology-audit.md

# Methodological audit by research design

Select applicable branches after classification. Record question, target inference, unit, design, assumptions, evidence, threats and mitigation. Separate a known design defect from missing reporting. Each concern needs a manuscript anchor and consequence; checklist omission alone does not prove invalidity.

## Shared core

Check alignment of aims, available evidence and inference; sampling/selection; operationalization and measurement validity; collection/analysis provenance; bias and alternative explanations; limits of transfer/generalization; applicable ethics; and enough transparency to assess or reproduce consequential steps. “Reliability” and “validity” take different forms across paradigms. Raw-data availability can be constrained by consent or governance; evaluate controlled access or other feasible transparency rather than demanding public release.

## Experiments, trials and bench research

Identify allocation unit versus measurement unit, intervention/comparator fidelity, randomization/concealment where claimed, blinding feasibility, baseline structure, exclusions, outcome timing and protocol deviations. Distinguish biological replicates from technical repeats. Assess confounding by batch, cage, operator, instrument or site. Check whether analysis respects allocation and dependence; do not require clinical intention-to-treat terminology outside its intended context. For trials, align primary outcome/estimand, participant flow, harms, registration and analysis population with the protocol where accessible. Lack of blinding may be unavoidable; assess likely bias and mitigation.

## Observational and causal research

Identify population, time zero, exposure, outcome, follow-up and selection. For causal claims ask what intervention/estimand is implied, which assumptions identify it and what design evidence supports them. Consider confounding, reverse causation, collider selection, immortal time, measurement error and informative loss where relevant. Regression adjustment alone does not remove all bias; conversely an observational design is not automatically incapable of defensible causal inference. Judge the actual identification strategy and sensitivity evidence.

For natural experiments, instrumental variables, regression discontinuity and difference-in-differences, assess the specific identifying assumptions, treatment timing, comparison validity and diagnostics. Do not ask every paper to use each design. A plausible association paper may be repaired by narrowing causal language rather than collecting a new randomized trial.

## Quantitative social, education, economics and business

Assess construct definitions, population/frame, nonresponse, validated measures or defensible new instruments, longitudinal/panel dependence, survey weights and institutional context. Check endogeneity or measurement concerns relevant to the estimand. Robustness checks should challenge a substantive assumption, not accumulate alternate specifications until significance appears. Interpret practical meaning, heterogeneity and transportability in context.

## Qualitative research

Identify tradition (e.g., reflexive thematic analysis, grounded theory, phenomenology, ethnography) and assess epistemological coherence. Review participant/source selection rationale, context, recruitment relationships, reflexivity/positionality, data generation, analytic development, treatment of divergent accounts, evidential excerpts and interpretive depth. Assess transferability and confidentiality, not statistical representativeness by default.

Saturation, member checking, triangulation and inter-coder agreement are approach-dependent. Their absence is not an automatic flaw. For reflexive thematic analysis, independent coding agreement can be epistemologically inappropriate; assess reflexive interpretation and analytic coherence instead. Ask how interpretations follow from data without demanding raw identifiable transcripts. Report alternative interpretations respectfully.

## Mixed methods and interdisciplinary work

Review each strand using its own appropriate standards, then integration: reason for mixing, design/timing, sampling links, integration point, joint interpretation and handling of discordant results. A weak strand may compromise a central integrated claim; it does not make all work invalid automatically. Map cross-field dependencies and request human expertise for domains beyond reliable assessment.

## Computer science, AI and computational research

Identify task, dataset provenance/rights, target population, preprocessing and split level. Check overlap, temporal leakage, train-only fitting of preprocessing, tuning/validation/test separation and contamination where observable. Evaluate strong relevant baselines under comparable data/compute, ablations tied to claimed mechanisms, metric choice, uncertainty across appropriate independent units and robustness under relevant shifts.

Assess model/version, hyperparameters, seeds, dependencies, hardware and availability of sufficient implementation detail. Do not infer leakage from high accuracy alone. A benchmark result does not automatically establish clinical utility, deployment safety or general superiority. Additional datasets are required only when central generalization claims depend on them. Code access permits inspection, not a claim of execution.

## Simulation, engineering and physical sciences

Separate verification (implementation solves specified equations) from validation (model represents the intended phenomenon). Check dimensional consistency, discretization/convergence where relevant, calibration, boundary/initial conditions, conservation laws, reference solutions and sensitivity to parameters. Evaluate measurement uncertainty, operating regimes, physical plausibility and stated application limits. A qualitative plot alone may not establish claimed quantitative accuracy. A simulation may contribute without real-world deployment if its claims remain appropriately bounded.

Environmental/agricultural studies often require spatial/temporal dependence, site-season variation, nested field units and weather/context assessment. Repeated readings within one plot are not independent field replicates merely because many numbers exist.

## Mathematics and statistical theory

List definitions, assumptions, quantifiers, theorem scope and dependencies. Trace proof steps, boundary/degenerate cases, examples and possible counterexamples. Distinguish an unclear proof presentation from an actual gap. Check that algorithms satisfy claimed conditions, complexity model and convergence assumptions. Empirical simulations can illustrate but do not prove a theorem; conversely a deductive theorem does not require an empirical dataset or significance test. Label unverified proof steps and recommend specialist review when needed.

## Humanities, conceptual and historical research

Assess argument structure, definitions, engagement with relevant traditions, source provenance, contextual interpretation, translations, counterarguments and claimed conceptual contribution. Distinguish disagreement over interpretation from evidence of error. Do not impose quantitative reliability, preregistration, participant ethics or IMRAD on archival/philosophical work without relevance. A textual claim may require consulting the edition or original-language passage; disclose when inaccessible.

## Reviews, syntheses and protocols

For systematic/scoping reviews, assess the question, protocol, eligibility, information sources and search reproducibility, dates, screening/extraction, treatment of multiple reports, appraisal and synthesis choice. Language/date restrictions need rationale and impact, not blanket condemnation. For meta-analysis, identify comparable estimands, dependence, heterogeneity, risk of bias, uncertainty and robustness. Risk-of-bias tools must match included designs; do not combine quality scores blindly. Missing reporting, biased conduct and certainty of the evidence body are separate judgments.

Narrative reviews may have interpretive aims and need transparent selection/context rather than a mandatory systematic-search protocol. Protocols lack results by design; assess feasibility and prespecified analysis. Registered reports require stage-specific review and attention to agreed protocol deviations.

---

## Module: references/statistical-review.md

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
