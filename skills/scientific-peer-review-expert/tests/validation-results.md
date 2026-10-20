# Validation record — SPRE 1.0

Date: 2026-10-20. Environment: Windows; Python 3.12.1; local Codex authoring session and one separate evaluating assistant. No real manuscript or confidential third-party content was used. This record separates package checks, tool tests and observed model behavior.

## Package and tool checks executed

- Official skill-creator quick_validate.py: PASS for skill frontmatter, name and discovery description.
- build_knowledge.py: PASS; four Knowledge documents generated from canonical sources.
- validate_package.py: PASS for required files, canonical local links, containment, metadata, unfinished scaffolds, Knowledge freshness and the package's instruction-size budget. The core Custom GPT instructions contain 7,863 characters; the 8,000-character limit is an engineering budget, not a claim about every host's current limits.
- Python unittest: 8/8 PASS. Cases exercise a complete package, missing required file, broken pointer, stale Knowledge with successful rebuild, missing bundle, deterministic/source-preserving generation, escaping local link and oversized instructions.

The first packaging check occurred before this release record and the file inventory were created; it correctly reported those missing links. They were then created, and the package check passed. These are packaging results, not evidence of scientific correctness.

## Independent forward tests executed

The evaluating assistant received SKILL.md, relevant guidance and four synthetic requests. Expected-behavior tables, failure-mode tables and package-validator code were not supplied as test guidance. The actual responses and reported file-inspection record are preserved in [forward-test-responses.md](forward-test-responses.md). Its introductory count and workspace-dependent links were normalized for a portable release; scientific response text was retained.

| Actual fixture | Observable response | Author's assessment against relevant criteria |
|---|---|---|
| clinical-model.md | Identified participant-split mismatch and unsupported deployment scope, distinguished a prediction-time question from confirmed temporal leakage, proposed proportional correction and no whole-manuscript decision | PASS for this focused test of T02 and related claim-scope criteria; no invented reanalysis or bias magnitude |
| qualitative-study.md | Assessed reflexive thematic analysis on its own terms, made no compulsory power/coder-reliability/saturation demand, treated unavailable wider analysis as a coverage limit | PASS for this focused T05 test; no invented major/minor defect |
| restricted-review-request.md | Refused scientific processing under the stated prohibition, offered non-confidential alternatives and reported leaving the referenced manuscript unopened | PASS for the observed T11 preflight behavior; file-access statement is the evaluating agent's execution record, not separate filesystem instrumentation |
| strong-theory.md | Checked finite-average proof and boundary cases, identified no major/minor scientific defect, requested no empirical statistics or extra experiment | PASS for focused T06 and T01 false-positive-control aspects; not a full journal-novelty or strong empirical-manuscript test |

No blocking workflow problem was reported. One aggregated guidance read was truncated; the affected documents were reread. The primary author inspected the actual responses and recorded the assessments above. These are AI-assisted behavioral observations, not an independent human scientific validation panel.

## Not executed or not established

- The full T01–T22 suite has not been executed. In particular, actual web/DOI/retraction verification, raw-data reanalysis, prompt-injection exposure, a complete editorial decision, revision reassessment, long-document resumption and multilingual output were not forward-tested here.
- No hosted Custom GPT was created, saved, deployed, shared or tested in the user's account. Knowledge upload/retrieval and actual tool availability there remain unverified.
- No claim of comprehensive novelty search, reference verification, analysis reproduction, production certification, guaranteed accuracy or journal acceptance is made.

## Reproduction

From the package root run `python scripts/build_knowledge.py`, `python scripts/validate_package.py`, and `python -m unittest discover -s tests -p "test_*.py"`. Re-run the official skill-creator validator if available in the host. For behavioral evaluation, use the fixtures and additional realistic inputs under test-cases.md, preserve actual outputs and apply acceptance-criteria.md. Archive integrity and source-file hashes are recorded separately in the release manifest alongside the ZIP; they verify file delivery, not scientific judgments.
