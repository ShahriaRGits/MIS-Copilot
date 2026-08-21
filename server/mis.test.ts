import { describe, expect, it } from "vitest";
import { answerQuestion, calculateKpis, detectAnomalies, getEvidence, loadDataset, saveDecision, validateAiText, validateDataset, validateDecisionDraft } from "./mis";

describe("MIS Copilot deterministic pipeline", () => {
  it("loads all six fixtures with expected source sizes", () => {
    const dataset = loadDataset();
    expect(dataset.campaigns.length).toBe(27);
    expect(dataset.leads.length).toBe(303);
    expect(dataset.clients.length).toBe(96);
    expect(dataset.conversions.length).toBe(90);
    expect(dataset.revenue.length).toBe(157);
    expect(dataset.operational_kpis.length).toBe(24);
  });

  it("normalizes blank nullable CSV fields to null while preserving source rows", () => {
    const dataset = loadDataset();
    expect(dataset.leads.some(row => row.status === null)).toBe(true);
    expect(dataset.leads.some(row => row.campaign_id === null)).toBe(true);
    expect(dataset.campaigns.some(row => row.cost === null)).toBe(true);
  });

  it("detects deliberately injected data-quality issues with severity", () => {
    const issues = validateDataset(loadDataset());
    expect(issues.some(issue => issue.code === "duplicate_lead_id" && issue.severity === "blocking")).toBe(true);
    expect(issues.some(issue => issue.code === "missing_status" && issue.severity === "warning")).toBe(true);
    expect(issues.some(issue => issue.code === "clicks_gt_impressions" && issue.severity === "blocking")).toBe(true);
    expect(issues.some(issue => issue.code === "missing_cost" && issue.severity === "warning")).toBe(true);
    expect(issues.some(issue => issue.code === "missing_client_id" && issue.severity === "warning")).toBe(true);
    expect(issues.some(issue => issue.code === "missing_region" && issue.severity === "warning")).toBe(true);
    expect(issues.some(issue => issue.code === "refund_review" && issue.severity === "informational")).toBe(true);
  });

  it("calculates visible deterministic KPI values and trends", () => {
    const kpis = calculateKpis(loadDataset());
    expect(kpis.map(kpi => kpi.id)).toEqual(["ctr", "conversion-rate", "cac", "revenue", "revenue-change", "active-clients", "churn", "arpc", "delay"]);
    expect(kpis.find(kpi => kpi.id === "revenue")?.value).toBeCloseTo(9308.67, 2);
    expect(kpis.find(kpi => kpi.id === "revenue")?.trend).toHaveLength(6);
    expect(kpis.find(kpi => kpi.id === "churn")?.formula).toContain("clients at period start");
    expect(kpis.find(kpi => kpi.id === "cac")?.formula).toContain("leads generated");
    expect(kpis.every(kpi => kpi.formula && kpi.numerator && kpi.denominator)).toBe(true);
  });

  it("creates all expected anomaly flags with capped evidence", () => {
    const anomalies = detectAnomalies(loadDataset());
    expect(anomalies.map(anomaly => anomaly.id)).toEqual(["cmp001-decline", "april-conversion-spike", "revenue-reversal", "cmp005-cac", "inactive-clients", "north-delay"]);
    expect(anomalies.every(anomaly => anomaly.evidence.length <= 20 && anomaly.evidenceHash.startsWith("ev-") && anomaly.numericEvidence.length > 0)).toBe(true);
    expect(getEvidence(anomalies[0]).hash).toBe(anomalies[0].evidenceHash);
  });

  it("rejects unsupported numeric claims and causal language", () => {
    const anomaly = detectAnomalies(loadDataset())[0];
    const packet = getEvidence(anomaly);
    expect(validateAiText("CTR moved from 4.5% to 1.35%.", packet).ok).toBe(true);
    expect(validateAiText("The metric moved to 999.0%.", packet).ok).toBe(false);
    expect(validateAiText("This was caused by a hidden issue.", packet).ok).toBe(false);
  });

  it("requires rationale and logs accept, edit, and reject decisions", () => {
    expect(() => validateDecisionDraft({ recommendation: "Review campaign", rationale: "   " })).toThrow("Rationale is required");
    const common = { anomalyId: "cmp001-decline", recommendation: "Review campaign", rationale: "The evidence supports a review.", evidenceHash: "ev-test", promptVersion: "v1.0" };
    expect(saveDecision({ ...common, decision: "accepted" }).decision).toBe("accepted");
    expect(saveDecision({ ...common, decision: "edited" }).decision).toBe("edited");
    expect(saveDecision({ ...common, decision: "rejected" }).decision).toBe("rejected");
  });

  it("answers supported questions deterministically and refuses unsupported questions", () => {
    const dataset = loadDataset();
    const supported = answerQuestion("What happened to revenue in the last two months?", dataset);
    expect(supported.supported).toBe(true);
    expect(supported.evidence.length).toBeGreaterThan(0);
    const unsupported = answerQuestion("Build me a forecast for next quarter", dataset);
    expect(unsupported.supported).toBe(false);
    expect(unsupported.examples).toHaveLength(6);
  });
});
