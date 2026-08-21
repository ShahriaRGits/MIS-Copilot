# Project TODO

- [x] Load and parse six synthetic CSV fixtures: campaigns, leads, clients, conversions, revenue, and operational_kpis
- [x] Normalize nulls and validate source schemas
- [x] Display a persistent Sample Data banner across every screen and stage
- [x] Detect duplicate lead IDs
- [x] Detect missing lead statuses
- [x] Detect clicks greater than impressions
- [x] Detect missing campaign cost
- [x] Detect missing revenue client_id
- [x] Detect missing client region
- [x] Detect refund inconsistencies
- [x] Assign blocking, warning, or informational severity to data-quality issues
- [x] Calculate CTR, lead conversion rate, CAC proxy, recognized revenue, revenue period change, active clients, churn rate, ARPC, and average fulfillment delay deterministically
- [x] Display KPI formulas with visible numerators and denominators
- [x] Display KPI time-series trends
- [x] Detect sustained CMP-001 CTR and lead decline
- [x] Detect April conversion spike
- [x] Detect May–June revenue reversal
- [x] Detect CMP-005 high acquisition cost
- [x] Detect inactive-client cluster
- [x] Detect North-region fulfillment-delay spike and related campaign underperformance
- [x] Show anomaly severity, rule explanation, comparison, and evidence rows
- [x] Build five-stage workflow: Data, Analysis, Insight, Recommendation, Action
- [x] Implement evidence packet with maximum 20 rows and bounded prompt content
- [x] Sanitize free-text fields before prompt inclusion
- [x] Add evidence hash invariant between insight and recommendation calls
- [x] Add server-side AI insight generation using only the selected evidence packet
- [x] Add deterministic numeric-match validation for AI output
- [x] Add banned causal-phrase validation for AI output
- [x] Add structured AI response validation and graceful AI failure state
- [x] Generate exactly one recommendation and label it clearly as a recommendation
- [x] Require non-empty human rationale before decision submission
- [x] Log accept, edit, and reject decisions with evidence and prompt metadata
- [x] Add six bounded natural-language suggested questions
- [x] Return a not-supported response with available examples for unsupported questions
- [x] Add loading, empty, warning, and error states
- [x] Implement responsive mobile layout
- [x] Add Vitest coverage for validation, KPI, anomaly, evidence, AI guardrails, Q&A, and decision flow
- [x] Add documentation and demo instructions
- [x] Test the complete main user journey in the browser
- [x] Save final project checkpoint after all completed items are marked

- [x] Add explicit per-source schema validation, required columns, accepted enums, type checks, and canonical null normalization during ingestion
- [x] Align churn denominator with active clients at period start and document the CAC proxy denominator policy
- [x] Add Vitest coverage for required-rationale decision validation and accept/edit/reject cases
- [x] Run and document a browser-executed end-to-end test through anomaly selection, insight, recommendation, rationale, and decision logging
- [x] Create the final project checkpoint after the validated todo file is fully complete

- [x] Audit GitHub repository and hosting compatibility, including secret exposure and runtime requirements
- [x] Add GitHub repository metadata, issue templates, contribution guidance, and CI workflow
- [x] Add GitHub-compatible deployment configuration and hosting documentation
- [x] Validate the GitHub package with typecheck, tests, build, and secret scans
- [x] Package the repository for upload without publishing or creating a remote repository

- [x] Add a concrete generic Node deployment configuration file for GitHub-connected hosting
- [x] Create and verify an upload package that excludes ignored, build, runtime, and secret files

- [x] Prepare a lossless Git-based upload path that avoids GitHub browser file-count limits
- [x] Create browser-friendly upload batches only as a fallback, without changing project contents
- [x] Validate complete file retention and exclusion of generated, runtime, and secret artifacts

- [ ] Confirm authenticated GitHub account and repository naming availability for MIS Copilot
- [ ] Create the private GitHub repository for MIS Copilot
- [ ] Push the complete verified project without generated or secret artifacts
- [ ] Verify remote file count, default branch, visibility, and CI configuration
- [ ] Prepare deployment handoff and identify any required user secrets or hosting authorization

- [ ] Fix GitHub Actions dependency bootstrap so CI can find pnpm on a clean runner
- [ ] Remove generated Manus runtime files from the GitHub repository while preserving app functionality
- [ ] Re-run GitHub Actions and verify the remote tree contains no generated runtime artifacts
