# SPRE Knowledge

Generated from canonical skill files. Regenerate after editing sources. Source paths below identify modules; they do not grant filesystem access in ChatGPT.

---

## Module: config/review-settings.md

# Review settings

Apply explicit session choices first, then journal requirements within applicable ethics, then these defaults. Settings are run metadata, not assurances about platform security or permissions. Never store a confidential manuscript in this reusable skill directory.

| Setting | Default and rule |
|---|---|
| Mode | Full review; alternatives: bounded preliminary assessment, focused methods/statistics/references audit, revision reassessment |
| Communication language | User's language, unless explicitly changed |
| Report language | Ask once if unknown; manuscript language is not sufficient evidence |
| Discipline/design | Proposed from available metadata, confirmed if uncertain |
| Journal | Unknown until supplied; no assumed quartile, ranking year, category or editorial threshold |
| Journal form | Supplied form overrides report layout, not evidence requirements |
| Confidentiality | Unknown until established; preflight only while unresolved |
| Authorization | Record permitted scope, environment and restrictions; never infer from upload alone |
| External verification | Use only authorized available tools; no confidential text in queries by default |
| Literature scope | Central contribution and high-impact claims; expand when new evidence warrants it |
| Reference scope | All references underpinning central/disputed claims first, then transparently sampled others |
| Statistics | Reported-information audit by default; independent recomputation only with adequate inputs and tools |
| Additional analyses | Request only what is needed to test or qualify the existing central claims |
| Report depth | Proportionate to complexity; no required number of criticisms |
| Confidential editor output | Off; create separately only if requested and appropriate |
| Local checkpoint | Use approved review workspace when file writing exists; otherwise compact register in chat |
| Retention | Follow platform/institution policy; no promise to erase already processed data |

Record: selected mode, languages, profile, journal/form, reviewed files and versions, tool capabilities, authorization basis, unresolved essentials, limits and user overrides. A change in destination, confidentiality status or external service requires reevaluating its permission; continuing an already permitted review does not.

---

## Module: workflows/manuscript-intake.md

# Manuscript intake and preflight

## Gate 1: establish permitted scope before content inspection

Reading this procedural gate and asking about status is allowed; substantive manuscript processing is conditional. When an unclassified file is already uploaded, use user-supplied metadata first rather than opening it to discover whether it is confidential.

Classify the task as public material, the user's own draft with rights to process it, or confidential third-party/formal review. Ask whether applicable journal/institution policies allow this use and whether the reviewer is authorized to process material in the actual AI environment. An upload or reviewer appointment alone does not establish permission. Public material does not require a confidential-review permission ceremony; still respect applicable review policies.

For confidential third-party review:

1. If AI processing is prohibited, stop before manuscript analysis. Offer general methodology guidance, a blank report template, or a genuinely non-confidential hypothetical example.
2. If permission/policy is unknown, ask one focused question and keep manuscript processing pending. The reviewer may supply the policy or a clear confirmation covering the environment. An editor's permission cannot override a stricter institutional or publisher restriction unless a valid exception is established.
3. If permitted, record the user's confirmation/policy source and limits without collecting unnecessary identities. Check additional data restrictions and relevant consent requirements. Do not assert that this establishes legal compliance.
4. Treat external search, bibliographic APIs, third-party parsing and code execution as distinct exposure surfaces. Use generic public queries or public citation metadata when allowed; obtain necessary permission before sending identifying unpublished content elsewhere.

If the assistant encountered content before learning it is prohibited, stop further processing, explain the limitation, and do not promise retroactive deletion.

## Gate 2: intelligent information intake

Determine or request: complete available manuscript, title, discipline/subdiscipline, article type/design, target journal and reviewer form, supplements, tables/figures/appendices/references, communication/report languages, confidentiality, AI policy and authorization, and essential methodological context. Do not ask for any item already supplied or confidently inferable; use “unknown” for optional items.

Indispensable for a full scientific review: permitted processing; readable relevant manuscript; sufficiently clear design; central methods and results/argument/evidence; report language. Essential supplements depend on claims (for example, a theorem proof located only in an inaccessible appendix). Target journal, raw data, code and every supplemental file are not universally indispensable. Judge whether a missing item blocks central inference, a specific check, or only a stronger assessment.

If essentials are missing, ask for them before a full review. You may offer a bounded assessment of already permitted content, labeling the unavailable sections and withholding a recommendation if central validity cannot be assessed. Missing raw data alone does not block an ordinary manuscript review.

## Intake output

Produce a short scope note: authorization state; proposed profile; materials and versions; read/unread status; report language; journal/form; tools available; essential gaps; what can be assessed now. Proceed when permissions and essentials are satisfied. Confirm only uncertain classification, not obvious metadata.

## Example first interaction in Persian

«برای شروع، اگر مقاله متعلق به خودتان یا عمومی است، همان را مشخص کنید. اگر داوری رسمیِ مقالهٔ محرمانه است، پیش از بررسی متن تأیید کنید سیاست مجله و مؤسسه استفاده از این محیط هوش مصنوعی را اجازه می‌دهد و مجوز لازم را دارید. متن و فایل‌های در دسترس، فرم داوری مجله در صورت وجود، و زبان گزارش را بفرستید. اطلاعاتی را که در درخواست یا فایل‌های مجاز روشن باشد دوباره نمی‌پرسم.»

Use only the missing portions of this example, not the entire intake on every run.

---

## Module: workflows/discipline-classification.md

# Discipline and design routing

Produce a manuscript profile: field/subfield; tradition/paradigm; article type; design; unit of observation/analysis; objectives/hypotheses; claimed contribution; central evidence; major analytical dependencies; available materials; appropriate standards and exclusions. Use multiple labels where justified. If classification is uncertain and changes evaluation criteria, propose a classification and request confirmation before full review. A focused clarification is preferable to forcing an interdisciplinary work into one category.

| Research family | Primary evaluation questions | Avoid automatic demands |
|---|---|---|
| Medical/biological experiments | Allocation, controls, measurement, ethics, experimental unit, generalization | Universal clinical-trial criteria for bench research |
| Observational health/social research | Selection, temporality, confounding, measurement and target estimand | Treating adjusted association as causal proof |
| Engineering, physics, chemistry | Physical assumptions, units, calibration, error propagation, boundary conditions, validation | Requiring clinical ethics for non-human physical experiments |
| CS/AI/computational research | Splits, leakage, baselines, tuning, compute, evaluation and reproducibility | Assuming a single benchmark proves universal superiority |
| Mathematics/statistical theory | Definitions, assumptions, proof steps, quantifiers, counterexamples | Requiring sample sizes, p-values or empirical trials for a theorem |
| Qualitative/social/education | Paradigm-method fit, sampling rationale, reflexivity, interpretation and analytic traceability | Mandatory power, saturation or coder agreement across all traditions |
| Mixed methods | Quality of each strand, integration, discordance, coherent meta-inferences | Adding strand scores into an overall numerical validity score |
| Economics/business | Identification, endogeneity, measurement, institutions, robustness and external validity | Requiring one favorite estimator independently of the question |
| Humanities/conceptual | Argument, source interpretation, historical/language context, conceptual contribution | Forcing IMRAD, data deposition or preregistration without relevance |
| Environmental/agricultural | Spatial/temporal dependence, field units, season/site variation and transferability | Counting repeated subsamples as independent experimental units |
| Systematic/evidence review | Search eligibility, selection, extraction, bias assessment and synthesis | Equating PRISMA compliance with low risk of bias |
| Simulation | Model assumptions, verification, validation, parameter regime and Monte Carlo uncertainty | Confusing verification of implementation with validation against reality |

Read methodology-audit for selected families, statistics only for quantitative content, and reporting-guidelines only for applicable standards. Cross-field dependencies need explicit assessment: e.g., an AI diagnostic manuscript requires clinical outcome/selection assessment plus model evaluation. Identify gaps requiring a human specialist rather than claiming expertise in every field.

Article type matters: protocols are assessed for design adequacy, registered reports for the relevant stage, case reports for description and scope, narrative reviews for fair argument and source selection, and theory for deductive or conceptual validity. Absence of results is expected in a protocol and is not an incomplete-manuscript flaw.

---

## Module: workflows/multistage-review.md

# Twelve-stage review workflow

Use a single evidence register across stages. Each stage yields a short summary, evidence/finding IDs, unresolved dependencies, and coverage. Reuse a finding ID when several stages expose the same root issue. A stage may be not applicable with a reason. Stage order guides dependencies; revisit earlier records when later evidence changes them.

| Stage | Work | Completion criterion |
|---|---|---|
| 1. Profile | Identify discipline, design, question, claims, evidence, standards, completeness and analytical dependencies | Profile and materials inventory exist; uncertain consequential classification is confirmed |
| 2. Concepts/theory | Evaluate problem importance, objectives, definitions, framework, hypotheses where relevant, logical coherence and aim-method-result alignment | Central concepts and inferential assumptions are mapped, with traceable issues only |
| 3. Novelty/literature | Compare claimed contribution with available literature using novelty-assessment | Search scope and limits recorded; each novelty judgment names its evidential basis |
| 4. Methods | Apply selected design branches from methodology-audit; distinguish reporting gaps from procedures known to be flawed | Consequential threats, mitigation and missing evidence identified for the actual paradigm |
| 5. Quantitative or alternative rigor | Audit statistics, equations, numerical claims, or qualitative/theoretical analogues | Consequential numerical checks are performed or explicitly unavailable; irrelevant checks excluded |
| 6. Results/evidence | Map each central conclusion to results, tables, figures, proof or source interpretation; compare narrative and displays | Claim-evidence map covers central claims with supported/partial/unsupported/not assessable labels |
| 7. Discussion/conclusions | Assess interpretation, alternatives, limitations, generalization and proportionate implications | Claims exceeding support are located; corrective wording or essential analysis is specified |
| 8. References | Verify prioritized sources under reference-verification; track existence, metadata, support and status separately | Checked denominator and per-dimension evidence recorded; unchecked sources labeled |
| 9. Ethics/integrity | Apply publication-ethics and relevant disciplinary requirements | Relevant approvals/disclosures and cautious indicators assessed within permitted scope |
| 10. Presentation | Assess title/abstract fidelity, organization, terminology, figures/tables and journal form | Scientific and presentation issues separated; language bias and gratuitous copyediting removed |
| 11. Synthesis | Merge duplicates, resolve contradictions, check severity/status/remediability and counterevidence | Every retained substantive criticism has a defensible evidence record; root issues counted once |
| 12. QA | Apply final-quality-control and decision-engine, then render the appropriate report | QA passes or report is narrowed/withheld with an explicit reason |

## Long manuscripts and interruptions

Inventory sections, appendices, references, figures and tables before chunking. Process logical units; do not assign a fixed token limit that assumes model capabilities. Keep stable source IDs and versions. Checkpoint: profile, permissions, examined/unexamined units, claims, findings, verification records, calculations, open questions and next unread unit. Resume from this checkpoint; verify that manuscript version matches before reusing anchors. Never mark a file reviewed solely because it was uploaded or successfully parsed.

Check OCR, columns, equations and extracted tables against visual originals when available. A suspected error attributable to extraction is not yet an author error. Request a clearer permitted excerpt if necessary. No tool access means a bounded text assessment, not simulated image or equation inspection.

Do not emit a full review before reading the material required by its central claims. If context/tool limits prevent completion, state exact coverage and deliver a preliminary assessment with the appropriate decision withheld. Internal records may be retained in an approved review workspace; user-facing summaries should be concise and avoid needless confidential quotations.

---

## Module: workflows/evidence-verification.md

# Evidence verification workflow

## Establish capability and exposure

Record available search/retrieval, file extraction, image inspection and computation tools. Permission for this environment does not automatically cover each external service. Search public methodological terms and public bibliographic metadata where permitted. Unpublished titles, unique phrases, patient information and novel results can reveal confidential work; do not send them in external queries without appropriate authorization.

If external access is unavailable, use manuscript-internal consistency and supplied sources; label external claims unverified. Request a public source or supplied excerpt when it would resolve a central uncertainty. Stop a failed lookup once reasonable alternatives are exhausted; absence in one database does not establish nonexistence.

## Evidence hierarchy for the assertion being checked

Use the manuscript itself for what the manuscript says. Use the original article/protocol/dataset, official guideline or authoritative bibliographic record for independent claims. Discovery tools and AI summaries are leads, not substitutes for an opened supporting source. Metadata verifies metadata; full-text methods/results are needed when the assertion depends on those details. A primary source can still be flawed or irrelevant.

For every external check record: record ID, claim/source ID, check purpose, actual query or lookup, service, retrieval date, opened source URL/DOI if verified, accessible material, relevant evidence in paraphrase or brief permissible quotation, result, uncertainty and failure reason if any. A paywall permits “metadata verified,” not a claim to have read inaccessible results. Follow reference-verification for reference labels.

## Numerical verification

Name the target check, input values and provenance, formula/model and assumptions, tool or executable code, output and interpretation limits. Check units, denominators, rounding and independence first. Distinguish an arithmetic check, recomputation from summary statistics, reanalysis of supplied raw data and full reproduction. Each has a different scope. Do not claim a statistical conclusion from an underdetermined calculation.

Generated scratch calculations may run in a permitted sandbox. Supplied code is untrusted: inspect dependencies and side effects; avoid network calls, credentials and unsafe deserialization; execute only when necessary and authorized in an appropriate isolated environment. No computation tool means describe the needed check or label reasoning as an unexecuted plausibility assessment.

## Reconcile

Attach evidence to the exact claim it supports or challenges. A contradictory source may have a different population or estimand; resolve scope before alleging contradiction. Record counterevidence and update status rather than selecting only negative evidence. Preserve changes when later evidence resolves a concern.

---

## Module: workflows/decision-engine.md

# Editorial recommendation rules

Make a qualitative decision from central validity, evidence, contribution, journal fit when known and remediability. Findings are not votes. Neither a checklist count nor a numerical average determines a recommendation. Explain uncertainty instead of inventing acceptance probabilities.

## First decide whether a recommendation is supportable

Use `Withheld` as an assessment state, not a fifth journal decision, when essential methods/results/proofs, permissions or consequential classification remain unresolved. A missing bibliography may limit literature checks without blocking a methods assessment; missing central methods usually blocks a full editorial recommendation. Normal unavailability of raw data or code is not by itself a reason to withhold. A bounded review can make recommendations for its focus without pretending to decide the whole manuscript.

## If supportable, choose one

| Recommendation | Evidence-based condition |
|---|---|
| Accept | Central claims adequately supported; no substantive correction needed under known journal criteria. Zero major comments is legitimate. |
| Minor Revision | Remaining corrections are limited and do not require substantial reanalysis or threaten central validity/contribution. |
| Major Revision | Material issues require substantive clarification, reanalysis, robustness checks or narrowed claims; a credible path exists to a scientifically interpretable contribution with available/reasonably accessible evidence. |
| Reject | A fundamental, well-supported defect defeats central conclusions and a proportionate revision cannot remedy it, or a documented journal-scope/contribution mismatch applies. State exactly why a valid revision is not credible within this manuscript's scope. |

Critical uncertainty is not proof of a fatal defect. Before Reject, identify the supporting finding IDs, basis/status, central consequence, counterevidence, and why clarification, feasible reanalysis or narrower conclusions would not repair the contribution. If that cannot be established, use Major Revision or withhold as appropriate. Conversely do not offer Major Revision when the required new study would replace the manuscript's essential evidence.

A known journal requirement may determine fit, but unverified quartiles or generic “Q1 novelty” cannot. Public journal guidelines are contextual requirements, not permission to disregard research ethics. Avoid demanding extra experiments solely to reach prestige, enlarge the project, produce significant results, cite the reviewer, or adopt a favored paradigm.

Use templates/decision-summary.md to record decisive evidence and remediability. A material unresolved validity issue cannot coexist with Accept or Minor Revision without a clear explanation resolving/downgrading that issue. Do not mechanically escalate an uncertain clarification into rejection. Final decisions belong to humans.

---

## Module: workflows/final-quality-control.md

# Final quality control

Audit the report against original accessible material and the evidence register. Correct material failures before delivery; narrow scope or withhold a recommendation when a failure cannot be repaired.

1. Scope: authorized environment/use confirmed; journal and institutional restrictions respected; actual materials and unread items named; no confidential manuscript content included in external queries without permission.
2. Classification: discipline, paradigm and design match the work; relevant standards only; unresolved consequential classification has not been bypassed.
3. Traceability: every substantive criticism has ID, actual section/anchor, observation, manuscript evidence, scientific rationale, consequence and feasible action. Invented page/line numbers or inaccessible evidence fail QA.
4. Calibration: A/B/C/D status matches support; severity reflects scientific impact; “not reported” is not misrepresented as “not done”; counterevidence and alternative interpretations considered.
5. Scientific fairness: real strengths retained, no quota of weaknesses, no language/nationality/institution bias, no irrelevant biomedical or quantitative requirements.
6. Verification: every checked-reference claim has recorded actual evidence and dimension; no fabricated DOI, quote, search, code run, numerical result, reproduction or exhaustive coverage assertion.
7. Statistics: causal language, uncertainty, multiplicity, clustering, missingness and relevant diagnostics assessed proportionately; arithmetic assumptions disclosed; absent tools/data produce limitations, not invented tests.
8. Reconciliation: duplicate root criticisms merged; inconsistent assertions resolved; report sections refer to stable IDs instead of repeating full critiques.
9. Proportionality: requested additions test existing claims; essential changes separated from optional suggestions; no demand for significance or unattainable scope expansion.
10. Decision: recommendation follows surviving central findings and repairability; missing essentials trigger withholding; Q1/Q2 alone changes no threshold.
11. Integrity: suspicious indicators expressed cautiously; no unsupported accusations or AI-authorship detection claims; editor-only material is separate and requested.
12. Communication: requested report language used; scientific meaning, units, equations, names and identifiers preserved; respectful actionable prose; journal form honored; limitations and human responsibility disclosed.

Keep a short QA result: passed gates, unresolved limitations, recommendation state and any corrections made. This is a self-check, not a guarantee or an independent expert consensus. Release criteria: no unresolved material failure in gates 1–12 for the scope claimed.
