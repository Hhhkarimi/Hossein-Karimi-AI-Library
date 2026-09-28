# Logistics Data Quality Playbook

Use this checklist before trusting operational conclusions.

## 1. Grain and keys

Document the grain of every table. Common grains include order, order line, shipment, shipment leg, stop, SKU-location-day, receipt line, inventory snapshot, carrier invoice line, and supplier PO line.

For every join, state expected cardinality: 1:1, 1:N, N:1, or N:N. Treat unexplained N:N joins as blocking until proven intentional.

Recommended checks:
- uniqueness of natural/business keys;
- uniqueness of surrogate keys;
- orphan foreign keys;
- row-count change before/after joins;
- aggregate reconciliation before/after joins.

## 2. Time integrity

Logistics analysis is event-driven. Validate chronology such as:

`order_created <= released <= picked <= packed <= dispatched <= delivered`

Not every process contains every event, but negative or impossible elapsed times must be explained.

Check:
- timezone normalization;
- daylight-saving effects;
- local vs UTC timestamps;
- planned vs actual timestamps;
- event overwrite behavior;
- late-arriving events;
- timestamp precision;
- business-day vs calendar-day logic.

## 3. Missingness

Do not treat all nulls alike. Classify each null as:
- structurally not applicable;
- not yet observed;
- capture failure;
- integration failure;
- unknown business state.

Report missingness by important segment and over time. A low global missing rate can hide a broken warehouse or carrier feed.

## 4. Duplicates

Distinguish:
- exact duplicated records;
- repeated business events;
- legitimate split shipments;
- reprocessed messages;
- multiple status updates for the same entity.

Deduplication logic must preserve the event model. "Drop duplicates" is rarely an adequate logistics rule.

## 5. Units and master data

Validate:
- kg vs lb;
- km vs miles;
- pallet/case/unit conversions;
- dimensional vs actual weight;
- local vs reporting currency;
- gross vs net cost;
- SKU remapping;
- warehouse/carrier code changes;
- postal/geo master quality.

## 6. Inventory data

Inventory snapshots are semi-additive across time. Summing daily on-hand over a month is usually meaningless.

Check:
- snapshot timestamp consistency;
- negative inventory;
- reserved vs available vs on-hand;
- in-transit inventory treatment;
- unit-of-measure conversions;
- cycle-count adjustments;
- backdated transactions.

## 7. Demand data

Observed sales may be censored by stockouts, allocation, or ordering constraints. Distinguish:
- unconstrained demand;
- ordered demand;
- confirmed demand;
- shipped demand;
- delivered demand.

Do not train demand forecasts on fulfilled volume alone without acknowledging lost-sales bias.

## 8. Transportation data

Check:
- multi-leg shipments;
- shipment consolidations;
- split deliveries;
- reschedules;
- failed delivery attempts;
- accessorial charges;
- canceled shipments;
- planned vs actual route identifiers;
- distance source and version.

## 9. Statistical outliers vs operational exceptions

An outlier can be a real exception worth investigating. Do not automatically delete it.

Classify outliers into:
- data error;
- rare but valid event;
- special service/process;
- unresolved.

Run sensitivity both with and without material valid extremes where appropriate.

## 10. Data-quality scorecard

For each critical field track:
- completeness;
- validity;
- uniqueness;
- consistency;
- timeliness;
- reconciliation status.

Always state affected row/share counts and whether the issue is blocking, material, or minor.
