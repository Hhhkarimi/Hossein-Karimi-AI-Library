# Data Quality Checks for Industrial Cost Analysis

## 1. Grain and uniqueness
Determine the intended grain of every input table, for example:
- one row per period × product
- one row per period × cost center × cost element
- one row per period × product × cost center

Test duplicates using the expected business key. Do not aggregate blindly before understanding duplicates.

## 2. Completeness
Check missing values in:
- period
- plant/site
- product/product family
- production quantity
- cost center
- cost element
- actual cost
- budget/baseline when requested
- prior-year value when requested

Differentiate "missing" from a valid zero.

## 3. Numeric validity
Flag:
- nonnumeric cost or quantity values
- NaN/infinite values
- negative production quantity
- negative cost requiring classification
- extreme outliers

## 4. Units
Identify and normalize:
- kg vs ton
- pieces vs kg
- kWh vs MWh
- local currency vs reporting currency

Document every conversion factor.

## 5. Period alignment
Ensure:
- cost period matches production period
- budget period matches actual period
- prior-year period has the same duration and seasonality where possible
- partial months are not compared with full months without disclosure

## 6. Scope alignment
Check whether current and comparator include the same:
- plants
- products
- cost centers
- accounts
- allocation policy
- capitalization policy

## 7. Reconciliation
Whenever source control totals exist:
- sum normalized costs and compare with ledger/control total
- sum production quantity and compare with production report
- sum allocation pools before and after allocation

Report reconciliation differences explicitly.

## 8. Suspicious patterns
Flag:
- cost with zero production
- production with zero manufacturing cost
- sudden disappearance/appearance of a cost center
- large account reclassification
- unit cost changes caused mainly by denominator collapse
- cost center share >100% or negative without explanation

## 9. Data-quality conclusion
Use one of:
- Ready
- Ready with caveats
- Not sufficient for requested metric

List caveats by likely impact on conclusions.
