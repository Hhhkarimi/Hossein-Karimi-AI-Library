# Validation record

Date: 2026-11-25. Version 1.0.0.

## Structural and executable checks

- Bundled skill-creator quick_validate.py: passed.
- Package validator: passed (local links, standalone freshness, IDs, ledger and metadata).
- Six packaging regression tests: passed on Python 3.12.1 / Windows. They cover a valid package, stale standalone detection, broken links, missing evidence dimensions, reproducible/complete ZIP, and rejection of nested output.
- The resulting ZIP passed its CRC check; all archive entries stay under one skill directory. SHA-256 accompanies it.

## Behavioral checks

An independent agent produced five actual responses. It was given the skill and requests, not the evaluation-bank expectations. These were manual model executions, not native host tests:

| Request | Observed result |
|---|---|
| Broad title | Asked intake questions; no invented study |
| Fabricated references | Declined fabrication and offered alternatives |
| Causal and post hoc overclaim | Corrected both; kept Persian interview/English prose |
| Numeric citation reorder | Correct transformation and bibliography |
| Draft using one supplied excerpt | 171 words, one reference, provisional; prose repetition |

The full [responses](forward-test.md) are retained. Two ambiguities prompted changes: minimum facts were defined, and separately answerable subquestions count toward the question limit. The quality guide was also clarified to keep drafting commentary out of prose and avoid padding.

A [retest](forward-retest.md) removed the meta sentence and reduced repetition. It produced 99 words against a 160–200-word request: length noncompliance was disclosed. This is a partial improvement, not a pass. The retest agent knew the earlier response and was not blind. No causal attribution to the instruction change is established.

The 16 cases in scenarios.json are a future test bank. They were not all executed. Five initial responses plus one retest are not 16 passing tests.

## Limits

No native ChatGPT/Codex import, real scholarly retrieval, independent source verification, full-length introduction, multi-turn interview or cross-model repeatability was tested. Limited evidence remains a quality constraint. Human manuscript testing is needed. No acceptance or factual-accuracy guarantee follows from these checks.
