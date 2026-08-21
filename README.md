# MIS Copilot

MIS Copilot is a focused, single-user demonstration of an evidence-driven marketing analytics workflow. It loads six synthetic CSV fixtures, validates the data, calculates KPIs deterministically, identifies rule-based anomalies, sends only a bounded evidence packet to the server-side LLM, and requires a human decision before logging a recommendation.

## What is implemented

The MVP includes fixture ingestion for `campaigns`, `leads`, `clients`, `conversions`, `revenue`, and `operational_kpis`; schema and business-rule validation; visible severity levels; deterministic KPI cards with formulas, numerators, denominators, and trends; six expected anomaly flags; evidence tables capped at 20 rows; evidence-bounded AI insight and recommendation calls; numeric-match and banned-causal-phrase guardrails; six bounded natural-language questions; required decision rationale; and a decision-history drawer with evidence hash and prompt metadata.

The application labels the source as **Sample Data** and distinguishes **Implemented**, **Simulated**, and **Proposed for production** concepts in the UI. No live Google Analytics, Facebook, Odoo, CRM, notification, forecasting, NL-to-SQL, or autonomous execution integration is included.

## Run locally

Use the project’s standard commands:

```bash
pnpm install
pnpm dev
```

The application runs through the managed project server. The built-in server environment provides the server-side LLM credential; no API key should be placed in source code or browser code.

## Quality checks

```bash
pnpm check
pnpm test
pnpm build
```

The tests cover fixture loading, deliberate data-quality issues, KPI values and trends, expected anomaly flags, evidence caps and hashes, unsupported-number rejection, causal-language rejection, and bounded Q&A behavior.

## Architecture summary

```text
CSV fixtures → validation → deterministic KPIs → rule-based anomalies
     → capped evidence packet → server-side LLM insight
     → guardrails → one recommendation → required human decision log
```

The AI is an interpreter, not a calculator. Deterministic code owns all numerical values. If the model is unavailable or a response fails guardrails, the application returns a clearly labelled deterministic fallback rather than displaying unchecked text.

## KPI policy notes

Blank CSV cells are normalized to canonical `null` values during ingestion. The MVP excludes blocking records from affected calculations and keeps warnings visible with their caveat. Churn uses an explicit MVP snapshot policy: the denominator is the number of clients whose status is active and whose signup date precedes the reporting period. CAC is labelled a **proxy** because the supplied campaign table does not provide a complete conversion-to-campaign attribution key; the MVP uses campaign cost divided by campaign `leads_generated` and displays that denominator directly.
