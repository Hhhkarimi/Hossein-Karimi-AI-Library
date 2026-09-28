# Logistics Analysis Patterns

## Pattern 1: OTIF deterioration

1. Verify promise-date source and eligibility rules.
2. Reconcile total eligible orders.
3. Split failure into late-only, incomplete-only, and both.
4. Decompose late orders by warehouse release, carrier pickup, transit, and exception stages.
5. Rank segments by contribution to missed orders, not only failure rate.
6. Use confidence intervals for small-volume segments.
7. Adjust carrier comparisons for lane/service mix where feasible.
8. Recommend operational actions with expected recovered OTIF points and dependencies.

## Pattern 2: Lead-time increase

1. Confirm start/end events.
2. Plot median and P90/P95 over time.
3. Decompose total lead time into process stages.
4. Identify change points and volume/mix shifts.
5. Segment by warehouse, carrier, lane, SKU family, and service class.
6. Quantify contribution: volume share x lead-time delta.
7. Test whether observed shifts persist after relevant controls.

## Pattern 3: Transportation-cost increase

Build a bridge:

`cost change = volume effect + distance/mix effect + rate effect + mode/service effect + accessorial effect + exception/expedite effect + residual`

Do not attribute a rising average cost per shipment to carrier rates before controlling for shipment mix.

## Pattern 4: Stockout investigation

1. Establish true demand definition.
2. Identify stockout windows at SKU-location grain.
3. Compare demand variability, forecast bias, lead-time variability, safety stock, reorder policy, MOQ, and inventory-record accuracy.
4. Separate forecast failure from replenishment failure.
5. Estimate lost sales/service impact and working-capital trade-off.
6. Scenario-test policy changes before recommending more inventory.

## Pattern 5: Inventory reduction

Do not optimize only for lower stock.

Segment inventory into:
- cycle stock;
- safety stock;
- pipeline inventory;
- seasonal/build stock;
- excess/obsolete stock.

Use service-level guardrails and quantify expected stockout risk.

## Pattern 6: Demand forecasting

1. Define forecast decision horizon and aggregation level.
2. Create naive seasonal and non-seasonal baselines.
3. Correct/flag censored demand due to stockouts where feasible.
4. Use rolling-origin or expanding-window validation.
5. Report error by SKU class and horizon, not only global aggregate.
6. Measure signed bias.
7. Prefer simple model if accuracy is comparable and operational maintenance is lower.

## Pattern 7: Carrier performance

Avoid league tables based only on raw OTD.

At minimum account for:
- lane mix;
- service class;
- shipment weight/size;
- pickup-day effects;
- distance;
- peak periods;
- volume and confidence interval.

Report both raw and adjusted views if adjustment is modeled.

## Pattern 8: Warehouse productivity

Separate:
- demand mix;
- labor hours;
- shift effects;
- congestion;
- travel distance;
- slotting;
- order profile;
- equipment/system downtime.

Productivity improvements that degrade accuracy, safety, or SLA are not unqualified gains.

## Pattern 9: Network/scenario analysis

For warehouse-location, allocation, or lane-design questions:
- state objective;
- state fixed and variable costs;
- define capacities;
- define service constraints;
- define demand scenarios;
- compare current baseline to each scenario;
- run sensitivity on uncertain inputs.

## Pattern 10: Executive logistics brief

A useful brief answers:
- What changed?
- How large is the impact?
- Where is it concentrated?
- What evidence supports the diagnosis?
- What should operations do next?
- What trade-off or uncertainty remains?
- What KPI will confirm improvement?
