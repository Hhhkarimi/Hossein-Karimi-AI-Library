# AIMPACT — Stage Gates, Portfolio Design, Financial Logic and Operating Model

## Seven-stage decision map

### A — ALIGN: Executive mandate

**Determine:** company scope, 1–3 outcome theses, strategic fit, sponsor, accountable program executive, risk appetite, source-of-truth for KPI and executive AI-literacy gap.

**Actions:** focused executive briefing; agree where AI must create value; set governance and ownership; agree pilot decision boundaries.

**Evidence:** board/CEO sponsorship, strategic KPIs, stakeholder agreement.

**Exit gate:** sponsor and owners named; objective(s) clear; acceptable boundaries and decision rights established.

**Don't confuse** executives learning to write prompts with executive strategic competence.

### I — INSPECT: Current state and readiness

**Determine:** how the current process runs; bottlenecks; current metric baseline; variation by site/channel/SKU; data accessibility/quality; existing systems; talent; vendors; risk exposure; ongoing AI projects.

**Assessment lenses** (1–5 with explicit evidence): strategy, governance, data, systems integration, people/culture, measurement, change capacity, cyber/privacy. Report unknowns separately; no synthetic overall maturity score unless enough evidence to justify it.

**Exit gate:** material constraints and baseline discovery plan known; no hidden critical data dependency.

### M — MAP: Strategy and portfolio

**Determine:** value pools, portfolio, constraints, AI level (predictive/generative/workflow/agentic), build-buy-partner, operating model, outcome ownership, shared components.

**Actions:** use-case mapping, scorecard, finance co-design, risk review, portfolio balancing; specify data/people/technology streams in parallel.

**Exit gate:** prioritized candidates with assumptions, owners, KPI and go/no-go controls.

### P — PROVE: Validated experiment

**Design:** hypothesis, baseline, comparison (randomized/control if appropriate; otherwise matched/pre-post with seasonality/confounders disclosed), test sample, metrics, thresholds, operating permissions, rollback, stakeholder and safety approval.

**Evaluate:** outcome, quality, false positives/negatives, human effort, latency, security, incremental cost, adoption, drift and risks. Financial benefits should be validated by finance, not solely vendor claims.

**Exit gate:** explicit Go / Revise / Stop based on pre-agreed criteria. Never extrapolate pilot uplift to all sites without adjustments.

### A — ACTIVATE: Reliable operation

**Actions:** redefine SOP and workflow; role-based training; maintainers/operators and incident response; integration/API access; evaluation, logging and access control; performance monitoring; knowledge transfer; vendor SLAs.

**Exit gate:** stable outcomes across realistic cases, documented operations owner, validated controls, acceptable user adoption and cost.

### C — CASCADE: Repeat and reuse

**Determine:** which sites/subsidiaries have truly comparable processes, data, permissions, products and risk constraints.

**Actions:** replicate tested patterns, adapt models, shared registry of components, internal champions, central procurement where justified, local outcome accountability.

**Exit gate:** replicated evidence, not just successful installation; no unauthorized cross-company data pooling.

### T — TRANSFORM: Work redesign and strategic reinvention

**Actions:** redesign multi-function processes around outcomes, define human–agent boundaries and authority, develop skills/career pathways, reconsider service/economic models, revisit strategy and operating model.

**Exit gate:** sustainable economic uplift and accountability, not an autonomous-agent count or a new organogram alone.

## Across all stages: continuous streams

1. **People:** executive literacy → owner training → frontline training → coaching → professional development.
2. **Data/technology:** minimal viable quality/access → monitored integration → reusable governance components → target architecture.
3. **Risk and evidence:** policy → impact assessment → safe experiments → monitoring → independent reviews where required.
4. **Finance:** case hypothesis → measured baseline → incremental impact → net realized benefits → portfolio reallocation.

## Portfolio scorecard (illustrative defaults)

| Criterion | Weight | Anchors for score 1 vs 5 |
|---|---:|---|
| Business value | 30 | 1 = small/unmeasured improvement; 5 = large, measurable driver of P&L or service |
| Data readiness | 20 | 1 = no accessible reliable data; 5 = approved, clean, timely, labeled where needed |
| Speed/ease to test | 15 | 1 = high integration/approval complexity; 5 = safe bounded test possible |
| Risk manageability | 15 | 1 = severe unresolved risk; 5 = well-bounded with controls/rollback |
| Reusability | 10 | 1 = bespoke one-off; 5 = common across many similar sites |
| Owner commitment | 10 | 1 = no owner; 5 = sponsor/resources/process owner committed |

`score = Σ(weight × rating / 5)`; inspectable range 20–100 when all scores are 1–5. **Use total as a conversation aid, not a substitute for judgment.** Unknowns invalidate precision. Business safety may veto regardless of score. Never label an estimated score as audited.

Example **illustrative only**:
- Demand-forecast improvement: value 5, data 2, feasibility 3, risk 4, reuse 5, owner 4 → score 75; value may be high but data work may gate pilot.
- FAQ copilot for public/internal approved policy: value 2, data 5, feasibility 5, risk 4, reuse 5, owner 4 → score 75; easier but may not be a transformation priority.

## Business case / financial measurement

Define a **benefit tree** by type:

- Cost: `(baseline unit cost − post unit cost) × comparable activity volume`, net of substitution and quality penalties.
- Capacity: `(baseline processing time − post time) × valid task volume × eligible capture rate`; count cash saving only if labor/contract cost actually changes. Otherwise report *capacity freed*, not bankable savings.
- Revenue: attributable incremental gross margin, not gross incremental sales; account for cannibalization, discounts and campaign effects.
- Inventory: reduction in average working capital and carrying costs; do not call inventory reduction equivalent to profit.
- Quality: avoided scrap/rework/customer returns net of added inspection/false-positive cost.
- Benefit-cost: annual or task-cycle benefits minus compute, vendor, integration, operation, training, quality assurance, security and opportunity costs.

When measurements are available:

`ROI = (attributable benefits − total attributable costs) / total attributable costs`

State period, currency, population, whether prices are real/nominal, and baseline. Never provide a payback interval if user requested no time-based roadmap; financial reporting periods can be used only when needed to define KPIs and calculations, not as a forced implementation schedule.

Avoid double counting (e.g., reduced labor time AND FTE costs when no FTE reduction); separate labor redeployment from cash savings.

## Evaluation designs by AI modality

- **Predictive:** compare against simple naive/statistical baseline; time-series backtesting, leakage checks, MAE/WAPE/forecast bias; translate accuracy to service and inventory economic effect.
- **Vision/quality:** precision, recall, false positives and false negatives by product/line/shift; no untested control to change hazardous equipment settings.
- **Generative knowledge assistant:** grounded-answer accuracy, unsupported claims, citation quality, secure retrieval, privacy and human escalation.
- **Agentic workflow:** end-to-end task success, unsafe-action rate, recovery/rollback, tool-call error, cost per completed task, human interventions, auditability.
- **Retail/personalization:** uplift against control, basket profitability, stockouts, customer privacy, protected-category issues.

## Organizational decision rights (RACI draft)

| Workstream | Accountable | Responsible | Consulted/Control |
|---|---|---|---|
| Group AI principles | Group CEO / AI council | AI transformation lead | Risk, Legal, IT, HR |
| Company business outcome | Subsidiary CEO / business executive | Process owner | Finance, site teams |
| Model/data integration | Technology or AI delivery lead | Engineers, data stewards | Cybersecurity, Data Owner |
| Value measurement | CFO/Finance sponsor | Finance + process analyst | Internal Audit as needed |
| Safety-critical deployment | Authorized operations leadership | Qualified engineering/EHS team | Cybersecurity, quality and legal |
| Change and workforce | Business executive | HR + line managers | Employee representatives where applicable |

Tailor RACI to actual legal entity and governance. Avoid pretending a group CEO can authorize data sharing across unrelated legal entities by default.

## Operating-model options

- **Centralized:** beneficial when standards/risk/budget fragmented; may become bottleneck.
- **Decentralized:** beneficial for autonomous businesses with very different processes; increases duplicate cost, inconsistent risk control.
- **Federated:** group-wide governance + shared components + local business owners; good hypothesis for heterogeneous multi-company groups, but requires clarity about budget, architecture, performance ownership and lawful data-sharing.

## Sourcing choices

| Buy | Build | Partner | Hybrid |
|---|---|---|---|
| Standard/common task, quick deployment | Differentiating proprietary workflow/data and sufficient in-house capacity | Sector-specific expertise or integration challenge | Approved foundational platform + unique domain logic |

Stress-test with security, model portability, provider exit, pricing, data custody, local infrastructure reliability, skills, vendor viability and contract terms.

## Decision rules / stage gates

Gate decisions must document: **decision**, accountable signer, evidence, open assumptions, conditions, alternative, stop/rollback rule and next required information. At every stage distinguish **reversible experimentation** from **irreversible operational changes**.
