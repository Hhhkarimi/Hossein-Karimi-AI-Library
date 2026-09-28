# Logistics KPI Dictionary

These are default definitions, not universal truth. Confirm local business rules before publishing.

## Service

### On-Time Delivery (OTD)
`delivered_on_time_orders / eligible_delivered_orders`

Define:
- promised timestamp source;
- early-delivery rule;
- grace window;
- canceled/returned order treatment;
- order vs shipment grain.

### OTIF
`orders_on_time_and_in_full / eligible_orders`

"In full" may mean all ordered lines, all confirmed lines, or a quantity threshold. State the rule.

### Fill Rate
Possible variants:
- unit fill rate = shipped units / requested units;
- line fill rate = fully filled lines / requested lines;
- order fill rate = fully filled orders / requested orders.

Never report "fill rate" without naming the variant.

### Perfect Order Rate
Share of orders simultaneously meeting required criteria such as on-time, complete, damage-free, and documentation-correct.

## Time

### Order Cycle Time
`delivery_time - order_creation_time`

May include customer-requested waiting time; consider alternate operational cycle time starting from release/confirmation.

### Warehouse Processing Time
`dispatch_time - warehouse_release_time`

Decompose into queue, pick, pack, stage, and handoff when events exist.

### Supplier Lead Time
`receipt_time - purchase_order_release_time`

Separate planned and actual lead time. Track mean, median, P90/P95, and variability.

## Inventory

### Inventory Turnover
Typical annualized form:
`COGS / average_inventory_value`

Do not mix units and value bases. State valuation method and averaging method.

### Days of Inventory / Days on Hand
Common form:
`average_inventory / average_daily_demand_or_COGS`

State whether denominator is units, COGS, or forecast demand.

### Stockout Rate
Possible denominator: SKU-location-days, demand lines, orders, or demand units. State it.

### Inventory Accuracy
Compare system quantity to physical/cycle count at a defined grain and tolerance.

## Transportation

### Cost per Shipment
`eligible_transport_cost / shipment_count`

Control for mode, distance, weight/volume, service, and accessorial mix before comparison.

### Cost per kg / pallet / order
Useful only with a consistent numerator and denominator and with mix context.

### Vehicle/Trailer Utilization
Can be weight-, cube-, pallet-, or stop-capacity based. Report the binding dimension where possible.

### Empty Miles Ratio
`empty_distance / total_distance`

Requires trustworthy loaded/empty status or equivalent inferred state.

### First-Attempt Delivery Success
`successful_first_attempt_deliveries / eligible_delivery_stops`

Define exceptions and customer-caused failures.

## Warehouse

### Pick Rate
`picked_units_or_lines / labor_hours`

State unit (units, lines, cases) and direct vs paid labor time.

### Dock-to-Stock Time
`inventory_available_time - receipt_arrival_time`

### Space Utilization
Use a defined capacity basis: pallet positions, cubic volume, or usable locations. Avoid crude floor-area ratios if storage is vertical.

## Forecasting

### MAE
Mean absolute error. Easy to interpret in target units.

### RMSE
Penalizes large errors more strongly; sensitive to outliers.

### WAPE
`sum(abs(actual - forecast)) / sum(abs(actual))`

Useful at aggregated levels but can still behave poorly when total actual approaches zero.

### MASE
Scaled against a naive benchmark; useful across series of different scales.

### Bias
Track signed error. A low absolute error with persistent underforecasting can still be operationally harmful.

## KPI reporting rules

For every KPI publish:
- name and business definition;
- formula;
- grain;
- time window;
- exclusions;
- denominator count;
- target/SLA if applicable;
- owner/source system;
- refresh cadence;
- known data limitations.
