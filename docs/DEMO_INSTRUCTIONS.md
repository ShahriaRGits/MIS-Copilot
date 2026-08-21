# MIS Copilot Demo Instructions

## Purpose

This demo shows one complete decision-support path: **data → validation → KPI analysis → anomaly → evidence → AI insight → one recommendation → human decision**. The dataset is synthetic and frozen, so every result is reproducible.

## Recommended walkthrough

1. Open the app and point out the persistent **Sample Data** banner. Explain that the six CSV files simulate MIS exports and that the source is not live.
2. In **Data**, review the six loaded tables and expand the quality report. Show that the deliberately injected duplicate ID, missing status, impossible click count, missing cost, missing client link, missing region, and refund review are detected with visible severity.
3. Continue to **Analysis**. Pick the `CMP-001` decline flag and show a KPI card with its formula, numerator, denominator, and monthly trend. Emphasize that these values are calculated by deterministic code.
4. In **Insight**, show the exact evidence rows for `CMP-001`. Generate the insight and point out the evidence hash, validation status, supporting evidence, confirmation data, and limitations.
5. Continue to **Recommendation**. Confirm that the same evidence hash is reused, that there is exactly one editable recommendation, and that no action executes automatically.
6. In **Action**, select Accept, Edit & accept, or Reject. Enter a rationale. The form intentionally refuses submission while the rationale is empty.
7. Open **Decision history** to show the logged decision, evidence hash, prompt version, recommendation, and rationale.
8. At the bottom, ask one suggested Q&A question, then enter an unsupported question to show the explicit not-supported response and the list of supported examples.

## Suggested questions

- What happened to revenue in the last two months?
- Why did CMP-001's performance decline?
- Which campaign has the highest acquisition cost?
- What caused the jump in conversions in April?
- Which clients have gone inactive, and when?
- Is there anything unusual in the North region this quarter?

## Scope labels

| Label | Meaning |
|---|---|
| Implemented | Real code runs in this MVP against the supplied fixture data. |
| Simulated | The data stands in for a live source and is intentionally frozen. |
| Proposed for production | A future capability such as live connectors, authentication, forecasting, notifications, NL-to-SQL, or autonomous execution. |

## Talking point

> The AI never discovers or calculates a number. Deterministic code computes and selects the evidence, and the model only interprets the evidence packet it is handed. A numerical-match gate, causal-language filter, and human decision step keep the workflow accountable.
