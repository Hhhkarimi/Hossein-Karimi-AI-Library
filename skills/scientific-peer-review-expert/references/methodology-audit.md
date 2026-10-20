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
