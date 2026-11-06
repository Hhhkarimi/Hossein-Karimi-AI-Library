# AIMPACT — Flipped Interaction AI Roadmap Skill

A reusable Persian-first Agent Skill that interviews executives *one adaptive question at a time* and builds an evidence-based, stage-gated AI transformation roadmap for industrial companies, holding companies, manufacturing, distribution, retail and shared services.

## Install / use

1. Place this entire `aimpact-flipped-roadmap` folder (rename the folder from the archive name if needed) in a supported Agent Skills directory and load its `SKILL.md`. Follow your platform's own skill installation steps.
2. If the platform cannot load skills, paste the contents of `SKILL.md` as assistant instructions, and supply reference files as supplementary context if possible.
3. Start a new chat and say: **«با اسکیل AIMPACT برای شرکت [نام شرکت] مصاحبه را شروع کن و با Flipped Interaction نقشه راه اختصاصی AI بساز.»**
4. The assistant should ask **one question**, wait for the answer, adapt, and gradually assemble evidence and roadmap decisions.

## Files

- `SKILL.md`: core instructions, seven stages, delivery and quality rules.
- `references/INTERVIEW_PROTOCOL.md`: state machine, adaptive interview routing and sample dialogues.
- `references/AIMPACT_FRAMEWORK.md`: stage gates, finance, scoring, governance/RACI and implementation controls.
- `references/SECTOR_PLAYBOOKS.md`: questions and use cases across FMCG, manufacturing, retail, distribution, logistics, pharmaceuticals, shared services.
- `references/EVIDENCE_AND_RISK.md`: source hierarchy, caveats, safety/industrial controls and governance.
- `references/TOOL_PROCUREMENT.md`: tool shortlists, official buying channels, eligibility and vendor trials.
- `references/INTERNAL_DELIVERY_TCO.md`: internal design, staffing, acceptance and comparable lifecycle costs.
- `assets/ROADMAP_TEMPLATE.md`: decision-ready final roadmap template, with NO preset timeline.
- `assets/CASE_RECORD.yaml`: structured working case record schema.
- `scripts/score_portfolio.py`: optional offline opportunity scoring with safety hard gates.

## Important

AIMPACT is a custom methodology prepared for this project. It is **not** an official McKinsey, BCG, ISO or Gartner framework. Citation to their studies supports selected ideas, not the exact acronym or seven-stage sequence. No company-specific maturity or ROI is asserted without company evidence. Never send confidential company data unless permitted by company policy.
