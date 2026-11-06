# Evidence Standards, Sources and Safeguards

## Claim-label system (use in deliverables)

- `[I]` **Internal user statement**: provided by executive; not independently verified.
- `[V]` **Verified external**: link, title, source date, precise population and metric definition.
- `[E]` **Estimate**: user estimate or explicitly calculated approximation with assumptions.
- `[H]` **Hypothesis**: conditional recommendation requiring discovery/test.
- `[U]` **Unknown**: not supplied; must not be silently inferred.

An AIMPACT stage, a 6-factor score or a suggested 7-step roadmap is the **skill author's framework**, not a proprietary formula or official recommendation from any cited consultancy.

## Source hierarchy

1. Standards and primary official source (NIST, ISO, national authorities), peer-reviewed research.
2. Original consultancy studies with report date, respondent/sample and definitions.
3. Audited company results / formal annual report.
4. Dated company case study and technical documentation, labeled self-reported.
5. Credible independent news with dates and original quotations.
6. Marketing vendor case studies: treat financial impact as claimed until independently validated.

For claims like “BCG says X”, read X from a specific, dated report; don't rely on the user's memory of a prior slide. Search recent updates when available. Use exact page/section links where possible. Do not use arbitrary external ROI benchmarks as a substitute for company baseline data.

## Authoritative anchor references (verify revisions when using)

- **Agent Skills specification:** https://agentskills.io/specification — folder, `SKILL.md` frontmatter and supporting references; a format reference, not a management framework.
- **NIST AI RMF 1.0:** https://www.nist.gov/itl/ai-risk-management-framework — Govern, Map, Measure, Manage; voluntary framework; complement with organization-specific risk assessment.
- **NIST AI RMF Playbook:** https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook — implementation guidance (verify link currentness).
- **ISO/IEC 42001:2023:** https://www.iso.org/standard/42001 — AI management systems; don't claim certification or legal requirement without evidence.
- **McKinsey (Oct 2026):** https://www.mckinsey.com/capabilities/people-and-organization/our-insights/ai-is-changing-work-now-it-has-to-change-the-organization — workflow redesign, authority, people, organizational capabilities.
- **McKinsey (Sept 2026):** https://www.mckinsey.com/industries/industrials/our-insights/cutting-the-coordination-tax-how-agentic-ai-can-reshape-workflows — coordination and workflow value.
- **McKinsey (2026):** https://www.mckinsey.com/capabilities/people-and-organization/our-insights/from-adoption-to-impact-three-horizons-of-ai-transformation — enablement, adoption, reinvention. Verify date and wording.
- **BCG:** https://www.bcg.com/ — search original articles for 10/20/70, workforce readiness, scaling and economics rather than asserting one universal time/order.
- **Gartner:** https://www.gartner.com/ — distinguish forward-looking forecasts from measured outcomes; use source date and assumptions.
- **Microsoft Learn:** https://learn.microsoft.com/ — operating-model and technology architecture references; distinguish vendor recommendations from neutral standards.

## Industrial / enterprise safeguards

### Risk buckets

1. **Operational safety:** worker injury, unsafe movement, quality-release control, product contamination, critical process setpoint.
2. **Cyber / OT:** credential misuse, lateral movement into factory control networks, unauthorized writes, lack of rollback.
3. **Privacy / legal:** employee/customer data, contractual data sharing, regulated information, retention, sensitive outputs.
4. **Financial / procurement:** binding orders, credit limits, payments, pricing, financial misstatement, fraud.
5. **Model/agent reliability:** hallucination, prompt injection, error compounding, tool misuse, brittle behavior and drift.
6. **Workforce and ethics:** fairness, job changes, labor and skills, transparent employee communication.
7. **Supplier/availability:** service interruptions, provider dependency, data residency, access constraints, disaster recovery.

### Agent-specific operating gates

- Start with **read-only / recommendation mode** for unproven agentic use cases.
- Restrict permissions per tool, action, dataset and legal entity; rotate/revoke credentials.
- Require human authorization for purchases, contractual changes, HR actions, sensitive finance, safety-critical changes and irreversible actions.
- Log input context, model/version, tool calls, approvals and resulting actions; protect audit logs.
- Test prompt-injection and malicious retrieval/tool responses; set spend, action and token limits.
- Set emergency stop, rollback, incident owner, monitoring, evaluation and escalation.
- Document expected failure modes and acceptance criteria before operational use.
- Never encourage autonomous adjustments to industrial control systems without qualified engineering, EHS and cybersecurity safety validation.

## Missing-evidence behavior

- If unavailable KPI: no numeric impact or ROI promise; give metric definition and baseline-discovery task.
- If no approval for cross-company data: model separate pilots or privacy-preserving summary flows; cross-company integration stays blocked.
- If no user license / provider access: avoid naming a tool as a confirmed available choice; compare capabilities abstractly.
- If high harm / regulatory uncertainty: recommend safety/compliance review before testing live actions.
- If external study provides one company's results: label as exemplar, not achievable target or baseline for another company.

## External evidence registry template

| Claim | Source/URL | Publish date | Population/scope | Type (study/forecast/self-report) | Caveat | Relevance |
|---|---|---|---|---|---|---|

Never put unverifiable source titles in final roadmap. When evidence is sparse, state that the company-specific recommendation is a reasoned hypothesis.
