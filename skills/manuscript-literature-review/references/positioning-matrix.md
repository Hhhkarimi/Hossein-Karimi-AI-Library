# Building a study-positioning matrix

The table should let a reader inspect the precise distinction claimed for the present paper. Cover every close precedent and the foundational, transitional, and recent works that support meaningful comparison. For a corpus of 20 or more, aim for **15–20 comparable prior works plus the present paper**. Include additional relevant rows when necessary to represent the main streams or closest alternatives. Use a smaller matrix if fewer works are comparable and give the basis for the selection. A contextual source may belong in the prose even when it offers no meaningful matrix comparison. Use one cited work per row and place the present study last.

## Design columns before assigning marks

Break the contribution into independently checkable criteria. Aim for **10–16 substantive yes/no columns** in a full matrix when the contribution supports that level of granularity. Derive them from relevant dimensions such as the exact objective, theory or assumptions, data or setting, method components, baselines, test design, outcome measurement, robustness, and reproducibility. For each criterion write a compact header, a one-sentence decision rule, and the evidence needed to mark it. Apply the same rule to every row. Include dimensions on which prior studies have strengths. Separate criteria that could produce different answers and omit columns that duplicate a decision or serve no meaningful comparison.

For example, a study claiming transfer across clinical sites and calibration under temporal shift might need these separate columns:

| Column | Evidence that qualifies |
|---|---|
| Unseen hospital at test | At least one evaluation hospital contributed no development records. |
| Future-period test | Every test record in the specified evaluation follows the training cutoff. |
| Calibration slope | The study reports a calibration slope on the specified test set. |
| Calibration interval | The study reports an uncertainty interval for that slope. |
| Site-level results | The evaluation reports the outcome separately for each test hospital. |

These are examples for one contribution. Derive different columns for a theoretical paper, such as assumptions about observability, the specific proposition proved, and the boundary condition under which the proof holds. Split a wide matrix into labeled panels, each with the same study labels and order. Provide the complete panels, criterion definitions, and evidence notes with the review. Avoid generic headings such as “advanced method,” “real data,” and “validation.”

## Code what the evidence shows

Fill every criterion cell and use **✓** for a documented match or **✗** for a documented mismatch wherever possible. A cross can follow from an explicit statement, an incompatible design, or a complete and clearly scoped account that establishes the feature was absent. An explicitly internal-only test can justify a cross for the unseen-hospital criterion. A silent abstract cannot. Use **—** for unresolved or inapplicable cells, with a note explaining each case. Check the relevant methods, results, appendices, supplements, or repository artifacts before assigning an unresolved mark. Define all symbols in the caption. Aim for high coverage through verification and well-defined criteria, never through guessed marks.

Keep an evidence note for each decision, such as a Methods subsection, numbered table, proposition, or the author's manuscript passage. Put row-level locators in a final “Evidence” column or keyed notes below the table. Identify the source and relevant cells if a row draws on multiple locations. Distinguish missing reporting from nonapplicability in those notes.

Apply the same evidence threshold to the present study. When only a proposal is available, label the row “Present study (planned)” and explain in the caption that its ticks denote explicit design commitments. If the paper mixes planned and completed elements, use separate labeled rows or cell-specific status notes. A promise to run a benchmark cannot support a tick for a criterion requiring a reported result.

Before delivery, confirm that all comparable close precedents appear, every panel uses the same row order, each mark has a traceable basis, and the present-paper row reflects the actual study status. After the table, explain the most important overlap and the narrowest supported difference. A column of crosses establishes a pattern among the studies compared. Claims about the entire field require a broader evidential basis.
