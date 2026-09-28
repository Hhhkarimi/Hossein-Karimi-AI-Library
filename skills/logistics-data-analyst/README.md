# Logistics Data Analyst Skill for Codex

A production-oriented Agent Skill for logistics and supply-chain analytics.

## What it covers

- logistics data quality and reconciliation;
- KPI design and governance;
- OTIF, OTD, fill rate, lead time, inventory and transport cost;
- root-cause analysis;
- demand/volume forecasting;
- carrier, warehouse, lane and supplier analysis;
- inventory diagnostics;
- routing/optimization problem framing;
- decision-ready reporting;
- SQL/Python/spreadsheet analytical discipline.

## Standalone installation

Place the `logistics-data-analyst` directory in a Codex/Agent Skills location supported by your environment, or upload the folder/ZIP as a skill where supported.

The required file is `SKILL.md`. Supporting references, assets and scripts are optional but included for better reliability.

## Recommended invocation

Ask Codex to use the `logistics-data-analyst` skill explicitly for a task when you want deterministic use, for example:

`Use the logistics-data-analyst skill to investigate the 8-point OTIF decline in the attached shipment data.`

## Design notes

The skill keeps `SKILL.md` focused on workflow and decision rules while moving deep reference material into `references/`. This reduces context bloat and lets the agent load only the relevant domain guidance.
