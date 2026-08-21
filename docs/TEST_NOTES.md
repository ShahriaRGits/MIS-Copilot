# MVP Test Notes

## Automated checks

| Check | Result |
|---|---|
| TypeScript check (`pnpm check`) | Passed |
| Vitest suite (`pnpm test`) | Passed: 3 test files, 9 tests |
| Production build (`pnpm build`) | Passed |
| Snapshot API smoke test | Passed: six source summaries and validation issues returned |
| Bounded Q&A API smoke test | Passed: supported revenue question returned deterministic answer |
| AI insight smoke test | Passed: structured diagnosis, evidence hash, and fallback/AI status returned |

## Browser end-to-end run

The live browser walkthrough used the refreshed preview on 2026-08-21 and followed the main journey:

1. **Data:** Confirmed the persistent Sample Data banner, six source cards, 12 intentional validation issues, and distinct Blocking/Warning/Informational severity labels.
2. **Analysis:** Clicked Continue to analysis. Confirmed nine KPI cards with formulas, visible numerators and denominators, monthly trend bars, and six anomaly flags.
3. **Insight:** Selected the default CMP-001 anomaly and clicked Investigate selected flag. Confirmed the evidence table was shown, the evidence packet was bounded, and the live AI response displayed `AI CHECKED` with evidence hash `ev-584e7900`.
4. **Recommendation:** Clicked Continue to recommendation. Confirmed exactly one editable recommendation, owner, time horizon, success check, and matching evidence-hash invariant.
5. **Action:** Clicked Review human decision. Confirmed the decision form initially showed the required-rationale warning and disabled submission state. Entered a rationale and submitted Accept.
6. **History:** Opened Human decision history. Confirmed an `ACCEPTED` entry with the recommendation text, entered rationale, evidence hash `ev-584e7900`, and prompt version `v1.0`.

The browser run completed without a visible client error. The recommendation was not auto-executed; only the human decision was logged.
