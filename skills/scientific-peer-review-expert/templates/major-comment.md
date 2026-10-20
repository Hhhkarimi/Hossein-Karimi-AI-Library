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
