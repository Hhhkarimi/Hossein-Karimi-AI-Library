# Synthetic reviewer request and manuscript excerpt

I own this synthetic draft and authorize its processing in this environment. No external services are authorized. Please use SPRE for a focused methods audit in English, including the implications for the central performance claim. This is not a request for a whole-manuscript editorial recommendation. Journal unknown.

Title: Predicting one-year readmission from repeated clinic visits.
Field/design: clinical machine learning, retrospective prediction model.

## Methods — Cohort
The dataset contains 6,000 clinic visits from 1,200 adults. Each adult contributes five visits, each with the same one-year outcome label measured after that adult's final visit. Patient identifiers are omitted from model features. The intended use is prediction for adults not previously encountered by the model.

## Methods — Validation
We randomly assigned the 6,000 visit records, independently of patient identity, to 80% training and 20% test partitions. Thus a patient may contribute records to both partitions. Standardization and feature selection were fit in the training partition. Hyperparameters were chosen by cross-validation within training records. We performed no patient-grouped evaluation. Code and raw records are not supplied with this excerpt.

## Results — Performance
The visit-level test AUC was 0.94. The manuscript provides no participant-level confidence interval. The methods and results above are the complete available validation description for this focused audit.

## Conclusion
The model generalizes accurately to previously unseen patients and is ready for clinical implementation across hospitals.
