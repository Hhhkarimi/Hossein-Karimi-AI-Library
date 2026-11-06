# Internal delivery and investment case

Read for Build/Hybrid feasibility, on-premises design, or detailed business cases. Compare the simplest workflow change, classical analytics/ML, managed API integration, retrieval over approved data, self-hosting and fine-tuning as relevant. Require measured evidence before adding training or dedicated GPU capacity.

## Design brief

- Define users, workload and peak concurrency, data owners and access, sample inputs and failures, latency/quality/SLO targets, approval points and fallback. Set pilot and production boundaries separately.
- Map source → validation and access filtering → processing/model → human review or action → audit/feedback. Name systems, ownership and integration direction. Document interface contracts, retention, backups, restoration, observability, versioning and deployment environments. For document retrieval enforce source permissions in retrieval and test citations, stale content and Persian OCR. For operational technology start in read-only or shadow mode and require separate safety sign-off before write access.
- Identify dependencies, accountable business and technical owners, internal capacity and partner deliverables. Estimate person-days and loaded rates for product/process, domain SMEs, data, integration, platform, security, evaluation, training and support. Specify who runs incidents and approves changes after launch.
- Define acceptance on a representative held-out set, production monitoring, manual fallback, rollback triggers and maintenance. Test quality, critical errors, load, permission leakage and outages before advancing from PROVE to ACTIVATE.

## Comparable cost model

Use a common accounting horizon, currency, price date, workload and scope. The accounting horizon measures cost and does not set roadmap dates. Separate pilot cash outlay, production setup, recurring run costs and exit. Avoid counting pilot reuse twice.

| Cost line | Calculation driver |
|---|---|
| Design, data preparation, integration, security, evaluation, change | Role effort × loaded rate plus quoted external fees |
| Licensed service | Contracted seats or minimum commitment plus incremental usage/overage per contract |
| Model API | Sum billed units × rate by meter, including input, output, cache, tools and retries where billed |
| Hosted infrastructure | Provisioned hours × rate plus storage, network, backups, monitoring and standby |
| Owned infrastructure | Acquisition and installation or allocated depreciation on the declared basis, plus energy, rack, cooling, spares and support |
| Operations and exit | Staff and human-review effort, retraining or re-evaluation, incident reserve if justified, migration and decommissioning |

Size compute from representative load tests, peak traffic, utilization and redundancy. Record each line as measured, vendor quote, internal estimate, illustrative or unknown. Keep FX rates, local taxes, volume commitments and reserves explicit. Do not use zero for missing mandatory inputs. Give low/base/high estimates or a formula-only result if rates or workload cannot be bounded. Show key sensitivity drivers such as adoption, review time, retry rate, FX and utilization.

TCO = setup + recurring costs over the stated horizon + exit costs within that horizon. Reconcile shared service allocations and exclude sunk costs from incremental comparisons. Unit cost = incremental run cost ÷ successful completed cases at the target quality. Compare incremental verified or modeled benefit against incremental cost; distinguish recovered staff capacity from realizable cash savings. Calculate ROI only when a positive cost denominator and comparable benefits are available. Derive payback from cumulative incremental cash flows when modeled. Show what changes the sourcing decision and what evidence is needed to commit funds.

## Illustrative decision

An FMCG distributor wants to extract Persian invoice lines into its ERP. Test the current manual process, a vendor OCR offer and an internal OCR workflow on the same approved, representative invoices. Require finance to set line-item accuracy, reconciliation, review effort and exception thresholds before the trial. Keep ERP writes disabled until approval.

For a purely illustrative 12-month comparison in arbitrary currency units, Buy costs 4,000 setup plus 900/month and 1,200 for exit, totaling 16,000. Build costs 9,000 setup plus 450/month and 600 for exit, totaling 15,000. If internal review adds 200/month beyond the amount budgeted, Build rises to 17,400. Carry the higher-risk assumptions into the pilot. Compare only options that meet the same quality and data controls, and replace all illustrative rates with quotes or measured costs before funding.
