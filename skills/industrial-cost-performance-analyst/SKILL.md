---
name: industrial-cost-performance-analyst
description: Analyze industrial/manufacturing cost data to calculate cost per kg or other production unit, allocate costs across cost centers, compare actuals with budget/initial appropriations, compare with prior periods, explain variances, and produce management-ready reports. Use when the user provides factory, production, cost-center, budget, standard-cost, or prior-year data and needs industrial cost accounting, manufacturing finance analysis, variance analysis, or a cost-performance report.
---

# Industrial Cost & Performance Analyst

Use this skill to perform repeatable, auditable industrial cost analysis from raw operational and financial data.

## Primary objectives

For every applicable task, determine whether the available data supports these analyses:

1. Calculate production cost per kg (or per requested production unit).
2. Calculate each cost center's contribution to total production cost and unit cost.
3. Compare actual cost with budget, approved appropriation, standard cost, or baseline.
4. Compare the current period with the comparable prior period, especially the same period of the previous year.
5. Explain material variances with quantified drivers instead of merely reporting percentage changes.
6. Produce a management-ready conclusion with traceable calculations and explicit assumptions.

## Operating principles

- Treat source data as authoritative only after validating its grain, units, period, currency, completeness, and reconciliation.
- Never silently fill missing financial values with zero.
- Never mix quantities with different units without conversion.
- Never compare periods with different scopes without clearly normalizing or flagging the issue.
- Separate facts, calculations, assumptions, and interpretations.
- Preserve traceability: every headline number must be reconstructable from source fields and formulas.
- Prefer exact deterministic calculations using Python, SQL, spreadsheet formulas, or other available calculation tools over mental arithmetic.
- Round only for presentation; use unrounded values for intermediate calculations.
- If the user supplies an existing costing methodology, chart of accounts, cost-center allocation rule, BOM, routing, or standard-cost policy, follow it unless it is mathematically inconsistent. Flag inconsistencies rather than silently replacing the methodology.

## Required input model

Accept spreadsheets, CSVs, database extracts, ERP exports, PDFs/tables, or user-provided values. Map available fields into the following conceptual model.

### A. Production data

Minimum useful fields:
- period
- product / product family
- actual production quantity
- production unit (kg, ton, unit, etc.)

Preferred fields:
- good output
- gross output
- scrap / waste
- rework
- production hours
- machine hours
- capacity
- downtime
- batch count

### B. Cost data

Minimum useful fields:
- period
- cost center
- account / cost element
- actual cost

Preferred classification:
- direct material
- direct labor
- utilities / energy
- maintenance
- depreciation
- quality
- production overhead
- indirect labor
- logistics/internal handling
- other manufacturing cost

### C. Baseline / budget data

When available:
- budget / approved appropriation
- standard cost
- forecast
- prior-year actual
- prior-period actual
- planned production volume

### D. Allocation metadata

When shared service or support cost centers exist, use explicit allocation drivers when available, such as:
- machine hours
- labor hours
- headcount
- floor area
- metered energy use
- maintenance work orders
- production volume
- batch count
- service tickets

Do not invent a precise allocation driver if none is available. If an allocation must be estimated, label it as an assumption and show sensitivity where material.

## Workflow

### Step 1 — Clarify the analytical scope from available evidence

Determine:
- target period
- comparison period
- product scope
- plant/site scope
- cost scope
- production quantity denominator
- currency
- unit of measure
- whether the user wants actual, absorbed, standard, or full cost

Do not ask a question if the answer can be inferred safely from the supplied data. If essential information is unavailable, continue with the maximal valid subset of the analysis and list the missing items that prevent the remaining calculations.

### Step 2 — Validate input data before analysis

Run the checks in `references/data-quality-checks.md`.

At minimum check:
- duplicate records
- missing period/product/cost-center identifiers
- missing or invalid numeric values
- mixed currencies
- mixed units
- negative quantities/costs that require explanation
- zero production with nonzero cost
- total cost reconciliation
- production quantity reconciliation
- period completeness
- comparable-scope consistency between current and comparison periods

Assign a data-quality status:
- **Ready**: suitable for analysis.
- **Ready with caveats**: analysis possible with disclosed limitations.
- **Not sufficient for requested metric**: do not fabricate the missing result.

### Step 3 — Normalize and classify costs

Create a normalized cost table with, where possible:
- period
- plant
- product/product family
- cost center
- cost-center type: production / service / administrative / other
- cost element
- cost category
- actual cost
- budget/baseline cost
- prior-year cost
- allocation driver
- allocation basis

Exclude non-manufacturing costs from manufacturing cost per unit unless the user's costing policy explicitly includes them.

### Step 4 — Allocate support cost centers

If support/service centers must be absorbed by production centers:

1. Identify the allocation pool.
2. Identify the documented allocation driver.
3. Compute each receiving center's driver share.
4. Allocate the pool proportionally.
5. Reconcile allocated amount back to the original pool.
6. Retain both pre-allocation and post-allocation views.

Formula:

`allocated_cost_i = support_cost_pool × driver_i / sum(driver_all_receivers)`

If reciprocal service-center allocations exist and are material, use a reciprocal/simultaneous-equation method when data permits; otherwise describe the chosen simplified method.

### Step 5 — Calculate total manufacturing cost

Default formulation:

`Total Manufacturing Cost = Direct Material + Direct Labor + Allocated Manufacturing Overhead + Other Included Manufacturing Costs`

Explicitly state inclusions and exclusions.

If inventory/WIP movements materially affect cost of production, distinguish:
- manufacturing cost incurred
- cost of goods manufactured
- cost of goods sold

Do not conflate them.

### Step 6 — Calculate cost per kg or requested unit

Default:

`Unit Cost = Total Included Manufacturing Cost / Valid Production Quantity`

Use good output as denominator when the business definition requires sellable production. Use gross production only if that is the defined company policy.

Also calculate, when data permits:

`Cost Center Unit Contribution_i = Allocated or Direct Cost of Center_i / Production Quantity`

`Cost Center Share %_i = Cost of Center_i / Total Manufacturing Cost × 100`

Reconcile cost-center shares to approximately 100%, allowing only rounding differences.

### Step 7 — Budget / appropriation variance analysis

For each relevant level (total, category, cost center, product):

`Absolute Variance = Actual - Budget`

`Variance % = (Actual - Budget) / Budget × 100`

Use "favorable/unfavorable" only after defining the sign convention. For cost metrics, higher actual cost than budget is normally unfavorable, but do not assume this where the business uses a different convention.

Where volume differs materially, separate at least:
- total spending variance
- volume effect
- unit-cost/rate effect

Preferred decomposition when data supports it:

`Actual Total Cost - Budget Total Cost`

into:
- production-volume effect
- material price effect
- material usage/yield effect
- labor rate effect
- labor efficiency effect
- overhead spending effect
- overhead volume/absorption effect

Do not claim causal drivers that cannot be supported by data.

### Step 8 — Prior-year / prior-period comparison

At minimum calculate:

`YoY Absolute Change = Current - Prior`

`YoY % Change = (Current - Prior) / Prior × 100`

Compare:
- production quantity
- total manufacturing cost
- unit cost
- cost category mix
- cost-center contribution
- waste/scrap where available
- energy per unit where available
- labor hours per unit where available

Avoid misleading comparisons when product mix, inflation, exchange rates, plant scope, accounting policy, or production volume changed materially. Quantify or flag these structural effects.

### Step 9 — Driver analysis and bridge

When data permits, build a variance bridge from baseline/prior period to actual/current period. Attribute changes in this order when relevant:

1. scope/accounting changes
2. production volume
3. product mix
4. purchase/material price
5. material usage/yield/scrap
6. labor rate
7. labor efficiency
8. energy rate
9. energy consumption efficiency
10. maintenance
11. depreciation/fixed overhead absorption
12. other residual

Residual must be shown explicitly rather than hidden.

### Step 10 — Materiality prioritization

Do not overwhelm the report with immaterial movements.

Rank drivers by absolute impact on total variance. Default reporting threshold:
- show all drivers representing at least 5% of absolute total variance, OR
- the top 5 drivers,
whichever yields more useful coverage.

If the user has a company materiality threshold, use that instead.

### Step 11 — Produce management-ready output

Follow `assets/report-template.md` unless the user requests another format.

Every report should include:

1. **Executive summary** — 3 to 7 concise findings with numbers.
2. **Data scope and quality** — period, plant/product scope, sources, caveats.
3. **Production summary** — volume and key operational denominator.
4. **Cost per unit** — current, budget/baseline, prior year.
5. **Cost-center contribution** — amount, share %, cost per kg.
6. **Budget variance** — absolute and percentage variance.
7. **Year-over-year comparison** — absolute and percentage change.
8. **Variance drivers** — quantified explanation.
9. **Management implications** — factual operational/financial observations, not unsupported prescriptions.
10. **Appendix / calculation logic** — formulas, allocation rules, assumptions, reconciliations.

## Output standards

### Tables

At minimum create these tables when data supports them:

#### Table A — KPI summary
Columns:
- KPI
- Current
- Budget/Baseline
- Variance
- Variance %
- Prior Year
- YoY Change
- YoY %

#### Table B — Cost center contribution
Columns:
- Cost Center
- Actual Cost
- Share of Total %
- Cost per kg
- Budget
- Budget Variance
- Prior Year
- YoY Change

#### Table C — Cost category analysis
Columns:
- Cost Category
- Actual
- Budget
- Variance
- Prior Year
- YoY Change
- Share of Total %

### Visuals

When charts are appropriate, prefer:
- waterfall chart for variance bridge
- stacked bar for cost composition
- line chart for unit-cost trend
- bar chart for cost-center contribution
- budget vs actual variance chart

Never use decorative charts that obscure numerical interpretation.

## Analytical interpretation rules

Use disciplined language:
- "The data shows..." for direct observations.
- "The variance is associated with..." when supported by decomposition.
- "A possible contributor is..." when evidence is suggestive but not sufficient.
- "Cannot be determined from the available data" when causal evidence is absent.

Do not equate correlation with cause.

### Examples

Good:
> Unit cost increased 8.4% YoY. Approximately 5.1 percentage points of the increase are explained by higher material cost per kg and 2.0 points by lower production volume/fixed-overhead absorption; the remaining 1.3 points are not separable with the available data.

Bad:
> Unit cost increased because the production team was inefficient.

## Edge cases

### Zero or near-zero baseline
If budget or prior-year value is zero, do not calculate a conventional percentage variance. Report absolute change and mark percentage as N/M (not meaningful).

### Negative costs
Investigate credits, reversals, rebates, scrap recovery, or accounting reclassifications before aggregation.

### Multiple products
Do not divide aggregate mixed-product cost by total kilograms if products have materially different costing structures unless the user explicitly wants a blended average. Prefer product-level unit cost plus a weighted consolidated view.

### By-products / co-products
If joint production exists, use the organization's documented joint-cost allocation method (physical measure, sales value, NRV, etc.). Do not invent one silently.

### Inflation / FX
For multi-year comparisons with high inflation or material FX exposure, distinguish nominal change from operational/real change when appropriate data is available.

### Inventory and WIP
If opening/closing WIP or inventory movements are significant, explain whether the requested metric is production cost, COGM, or COGS.

## Verification checklist

Before finalizing, verify all applicable items:

- [ ] Total cost reconciles to source total.
- [ ] Allocated support-center cost reconciles to allocation pools.
- [ ] Cost-center shares sum to ~100%.
- [ ] Unit-cost numerator and denominator refer to the same scope and period.
- [ ] Budget comparison uses comparable scope and units.
- [ ] Prior-year comparison uses comparable period and scope.
- [ ] Percentage variances handle zero baselines safely.
- [ ] No missing values were silently treated as zero.
- [ ] All assumptions are disclosed.
- [ ] Top variance drivers are quantified.
- [ ] Residual/unexplained variance is visible.
- [ ] Rounding does not create material reconciliation errors.
- [ ] Management summary agrees with detailed tables.

## Tool usage guidance

If tabular data files are available:
- inspect schema and row counts first;
- validate grain before joining tables;
- use deterministic code for calculations;
- preserve original input files;
- write transformed data to new outputs;
- include a calculation/reconciliation sheet or table when producing a spreadsheet.

If PDFs are the only source:
- extract tables carefully;
- verify totals and labels against the visible document;
- flag OCR/extraction uncertainty if applicable.

If a database or ERP connector is available:
- retrieve the narrowest necessary data;
- document filters, periods, plants, products, and cost-center selections;
- avoid changing source systems unless explicitly requested.

## Optional scripts

Use `scripts/analyze_costs.py` when the input can be normalized to CSV and the standard fields are available. The script computes unit cost, cost-center shares, budget variance, and prior-period variance with zero-baseline safeguards.

Use `scripts/validate_cost_data.py` before analysis to identify missing fields, duplicates, invalid numerics, mixed units, and suspicious zero-production periods.

## Completion rule

A successful run produces an analysis that is:
- mathematically correct,
- reconciled,
- transparent about assumptions,
- comparable across periods,
- traceable to source data,
- useful to industrial/financial management.
