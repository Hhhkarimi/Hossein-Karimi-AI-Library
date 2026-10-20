# SPRE Knowledge

Generated from canonical skill files. Regenerate after editing sources. Source paths below identify modules; they do not grant filesystem access in ChatGPT.

---

## Module: templates/evidence-register.md

# Evidence and issue register

Create review-specific records in an approved workspace or compact in-chat tables. Use stable IDs such as M-001 material, C-001 claim, F-001 finding, R-001 reference, V-001 verification and N-001 numerical check. These are structured evidence summaries, not a request to reveal private reasoning. Empty categories can be recorded as none; do not create fictitious findings to fill a template.

## Run and coverage

Record review ID, manuscript title/version, mode, languages, discipline/design, journal/form, authorization state/basis and exposure restrictions, tool availability, unresolved essentials and timestamp.

| Material ID/version | Section/file/item | Available? | Examined? | Extraction/visual limits | Central dependency |
|---|---|---|---|---|---|

Examined means actually assessed, not uploaded/indexed. Distinguish unavailable, available-unread, partially examined, examined and not applicable. Central dependencies flag material necessary before making the corresponding conclusion.

## Claims

| Claim ID | Exact available anchor and faithful paraphrase | Evidence anchors | Support: supported/partial/unsupported/not assessable | Limitation/alternative | Linked finding IDs |
|---|---|---|---|---|---|

## Findings

| ID | Severity | A/B/C/D status | Source/version + anchor | Observation and evidence | Scientific rationale + consequence | Action + remediability | Counterevidence/uncertainty | State |
|---|---|---|---|---|---|---|---|---|

State: open, resolved, merged (name surviving ID), withdrawn (reason), or not assessable. Preserve changes rather than silently converting a question into a fact. A consequential critique without evidence is removed or converted to a clearly bounded clarification/limitation.

## Verification and numerical work

| V ID | Claim/R ID | Purpose | Actual query/check and service/tool | Date | Opened source / inspected material | Evidence and outcome | Limits |
|---|---|---|---|---|---|---|---|

Reference records additionally separate existence, metadata, relevance, exact-claim support and publication status; apply reference-verification labels. Numerical records additionally retain input provenance, units, assumptions, formula/code and actual result. Searches that failed belong in the log, not in an assertion of nonexistence.

## Synthesis and checkpoint

Record stage completion/N/A, root issue merges, contradictions resolved, decisive finding IDs, repairability, recommendation or withheld reason, QA result, next unread unit and pending questions. Resume against the same version; if changed, revalidate anchors and affected findings.

## Revision reassessment

| Prior finding ID | Author response claim | Revised evidence/anchor | Resolved/partial/unresolved/not assessable | Remaining necessary action |
|---|---|---|---|---|

Store only what the permitted task requires. This register does not authorize permanent storage or external distribution.

---

## Module: templates/major-comment.md

# Major comment record

Use one record per root scientific issue. Fill factual fields from available evidence, or explicitly record unavailable information. The field labels guide composition; remove drafting instructions from delivered reports.

- ID: stable F identifier.
- Severity: Major.
- Evidence status: A confirmed issue / B well-supported concern / C clarification required; D belongs in limitations unless a distinct issue is evidenced.
- Section and exact available anchor: actual page/line when known, otherwise heading/table/figure/equation and identifiable passage. Include source/version ID.
- Observation: the specific scientific problem or question.
- Manuscript evidence: accurate paraphrase or minimal necessary quotation with anchor; separate external evidence.
- Scientific rationale: relevant design/inference principle and any actually verified supporting source.
- Consequence: which central claim is affected and how.
- Required action: smallest adequate clarification, correction, analysis or claim qualification; explain essential additional data if unavoidable.
- Alternative/counterevidence: what could resolve or weaken the concern.
- Verification/uncertainty: performed checks and inaccessible evidence.
- Remediability: clarification / existing-data reanalysis / scope qualification / new essential evidence / unresolved.

## Filled synthetic example

**F-001 — Major — A confirmed issue**

**Location:** synthetic manuscript v1, Methods “Validation,” and Results “Performance.” The methods state that multiple visits from the same participant were randomly assigned by visit to training and test sets; the conclusion claims performance on previously unseen participants.

**Concern and basis:** the evaluation permits the same participant to contribute to training and test data. This does not assess the stated new-participant target and can yield optimistic performance through participant-specific information. The available text establishes split overlap as a design issue; the magnitude of bias has not been measured.

**Action:** repeat preprocessing, tuning and evaluation with participant-separated splits, fitting transformations within training data, then update estimates and uncertainty. If no such evaluation can be supplied, narrow claims to the setting actually evaluated and explain its scientific utility. No code execution or raw-data reanalysis was performed for this comment.

---

## Module: templates/minor-comment.md

# Minor comment record

Record ID, Minor severity, A/B/C evidence status, source/version and exact available anchor, observation, manuscript evidence, rationale, limited consequence, specific correction and uncertainty. Use a concise sentence or paragraph in the report; the underlying evidence record still contains all fields. A local typo does not require a full page of criticism.

## Filled synthetic example

**F-002 — Minor — A confirmed issue.** In synthetic manuscript v1, Table 1 column “Concentration,” units are not given, while Methods “Assay” reports measurements in mmol/L. Add the correct unit to the table heading so readers can interpret values consistently; confirm that every entry uses that scale. This is a display-documentation issue and does not establish a calculation error.

If an apparently missing unit changes central calculations or interpretation, assess severity from that consequence rather than mechanically retaining Minor.

---

## Module: templates/decision-summary.md

# Decision summary

Record:

1. Scope and completeness: what central material was assessed, what remains unassessed, and whether essentials are sufficient.
2. Recommendation state: Accept / Minor Revision / Major Revision / Reject, or Withheld with exact essential gap. For focused audits, state that no whole-manuscript editorial recommendation is made unless supported by full scope.
3. Decisive finding IDs and evidence statuses: link only surviving, nonduplicated findings.
4. Consequences for central claims: supported contribution and material limits.
5. Remediability: what can reasonably fix the concerns; why narrower claims, clarification or existing-data reanalysis do or do not suffice.
6. Journal fit: actual supplied/opened criteria and source, or unknown. Q1/Q2 by itself is insufficient.
7. Verification limits and specialist questions: what humans need to check before submission.

Sanity checks: a finding's severity and evidence status are different; uncertainty alone does not establish a fatal defect; many minor comments do not mechanically become Major Revision; a fundamental unfixable defect is not repaired by polished prose. Recommendation must be consistent with the final report, not an earlier abandoned finding.

---

## Module: templates/reviewer-report.md

# REVIEWER REPORT

Adapt headings to the journal form when provided. Use the requested report language; Persian equivalents are supplied here as aids. Replace field instructions with actual evidence and remove inapplicable drafting text. A report is a human-reviewer draft until the human verifies and submits it.

## A. Manuscript Information / اطلاعات مقاله

Title; subject/subfield and research tradition; article type/design; target journal if known; manuscript version; report language; materials actually reviewed; mode and scope. State missing essentials early if they prevent a full assessment.

## B. Overall Assessment / ارزیابی کلی

Balanced scientific assessment of question, contribution, methods, evidence and main limitations. Distinguish the manuscript's claims from verified facts. Do not make an adverse judgment merely to populate the report.

## C. Summary of the Manuscript / خلاصهٔ مقاله

Briefly and faithfully describe objective, approach, principal findings and claimed contribution. Attribute findings to the manuscript where independently unverified.

## D. Principal Strengths / نقاط قوت اصلی

Identify genuine strengths with evidence/anchors where useful. If limited material prevents this assessment, say so; no compulsory praise.

## E. Major Comments / نکات اساسی

Use stable IDs and the major-comment record. Include observation, location/evidence, scientific rationale, consequence, action and calibrated uncertainty. If none are justified, say “No major scientific issues identified within the scope reviewed.” This is not a guarantee of correctness.

## F. Minor Comments / نکات جزئی

Use stable IDs and concise actionable minor-comment records. State none when appropriate. Avoid mass copyediting unless specifically requested.

## G. Methodological and Statistical Assessment / ارزیابی روش‌شناسی و آماری

Summarize consequential design/analysis findings by reference to IDs rather than duplicating comments. For qualitative, theoretical or conceptual manuscripts use the appropriate rigor assessment; explain non-applicability of statistics.

## H. Novelty and Literature Assessment / نوآوری و جایگاه در ادبیات

Describe contribution and actual comparison scope. State whether literature-compared, manuscript-supported only or not verifiable. Name actual searches/sources or limitations, never claim an exhaustive review without a defensible scope.

## I. Research Integrity and Reporting Considerations / اخلاق، سلامت پژوهش و گزارش‌دهی

Identify relevant reporting requirements, approvals/disclosures and cautiously worded indicators supported by evidence. Distinguish missing information from a confirmed breach. Keep editor-only observations outside this artifact.

## J. Overall Recommendation / پیشنهاد نهایی

State a single supported recommendation and concise evidence/remediability rationale, or “Recommendation withheld” with the essential reason. This is advisory to a qualified human reviewer and editor. If the journal requires the recommendation only in its confidential form, place it there and note the separate field in the internal handoff.

## K. Review Limitations / محدودیت‌های داوری

Identify unavailable/unread material, extraction/visual uncertainty, unverified sources, actual checked-reference denominator, tool/data restrictions and specialist limits. State actual computational checks and their scope. Include required truthful AI-use disclosure or a human-completion note as applicable.

## L. Optional Confidential Comments to the Editor / یادداشت محرمانه برای سردبیر

This section is a separate output only if explicitly requested and appropriate. Remove it from the author-facing artifact. It may summarize requested editorial concerns, evidence and uncertainty; it must not imply misconduct from unsupported indicators or contradict the scientific report.
