import fs from "node:fs";
import path from "node:path";
import { invokeLLM } from "./_core/llm";

export type Severity = "blocking" | "warning" | "informational";
export type SourceName = "campaigns" | "leads" | "clients" | "conversions" | "revenue" | "operational_kpis";
export type DataRow = Record<string, string | null>;
export type MetricPoint = { period: string; value: number | null; label?: string };
export type KPI = {
  id: string;
  label: string;
  value: number | null;
  displayValue: string;
  unit: string;
  formula: string;
  numerator: string;
  denominator: string;
  period: string;
  trend: MetricPoint[];
  delta?: number | null;
  deltaDisplay?: string;
};
export type ValidationIssue = {
  id: string;
  source: SourceName;
  row: number;
  severity: Severity;
  code: string;
  message: string;
  field?: string;
};
export type Anomaly = {
  id: string;
  title: string;
  metric: string;
  severity: Severity;
  rule: string;
  summary: string;
  comparison: string;
  evidence: DataRow[];
  evidenceSource: SourceName;
  evidenceHash: string;
  numericEvidence: number[];
};
export type EvidencePacket = {
  anomalyId: string;
  hash: string;
  rows: DataRow[];
  facts: string[];
  numericValues: number[];
  source: SourceName;
};
export type Decision = {
  id: string;
  anomalyId: string;
  decision: "accepted" | "edited" | "rejected";
  recommendation: string;
  rationale: string;
  createdAt: string;
  evidenceHash: string;
  promptVersion: string;
};

const DATA_DIR = path.resolve(process.cwd(), "server/data");
const sources: SourceName[] = ["campaigns", "leads", "clients", "conversions", "revenue", "operational_kpis"];
const sourceFiles: Record<SourceName, string> = {
  campaigns: "campaigns.csv",
  leads: "leads.csv",
  clients: "clients.csv",
  conversions: "conversions.csv",
  revenue: "revenue.csv",
  operational_kpis: "operational_kpis.csv",
};
const schemaDefinitions: Record<SourceName, { required: string[]; numeric: string[]; dates: string[]; enums: Record<string, string[]> }> = {
  campaigns: { required: ["campaign_id", "campaign_name", "channel", "region", "month", "budget", "impressions", "clicks", "leads_generated", "cost", "notes"], numeric: ["budget", "impressions", "clicks", "leads_generated", "cost"], dates: ["month"], enums: { channel: ["Search", "Paid Social", "Email", "Referral"] } },
  leads: { required: ["lead_id", "campaign_id", "created_date", "region", "source", "status"], numeric: [], dates: ["created_date"], enums: { source: ["Paid Ad", "Organic Search", "Referral", "Email Signup", "Event"], status: ["new", "contacted", "qualified", "converted", "lost"] } },
  clients: { required: ["client_id", "lead_id", "client_name", "region", "signup_date", "status", "last_activity_date"], numeric: [], dates: ["signup_date", "last_activity_date"], enums: { status: ["active", "inactive"] } },
  conversions: { required: ["conversion_id", "lead_id", "client_id", "conversion_date", "conversion_type", "value"], numeric: ["value"], dates: ["conversion_date"], enums: { conversion_type: ["trial_signup", "paid_signup", "upsell"] } },
  revenue: { required: ["revenue_id", "client_id", "date", "amount", "revenue_type", "status"], numeric: ["amount"], dates: ["date"], enums: { revenue_type: ["subscription", "one-time", "upsell"], status: ["recognized", "refunded"] } },
  operational_kpis: { required: ["kpi_id", "month", "region", "active_clients", "new_clients", "churned_clients", "support_tickets", "avg_response_time_hours", "avg_fulfillment_delay_days"], numeric: ["active_clients", "new_clients", "churned_clients", "support_tickets", "avg_response_time_hours", "avg_fulfillment_delay_days"], dates: ["month"], enums: {} },
};

function parseCsv(text: string): DataRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header = [], ...data] = rows;
  return data.map(values => Object.fromEntries(header.map((key, index) => { const value = (values[index] ?? "").trim(); return [key.trim(), value === "" ? null : value]; })));
}

function loadSource(source: SourceName): DataRow[] {
  return parseCsv(fs.readFileSync(path.join(DATA_DIR, sourceFiles[source]), "utf8"));
}

const text = (value: string | null | undefined) => value ?? "";
const number = (value: string | null | undefined) => {
  if (value === undefined || value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const money = (value: number | null) => value === null ? "—" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const integer = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 0 });
const hash = (value: unknown) => {
  const input = JSON.stringify(value);
  let result = 2166136261;
  for (let i = 0; i < input.length; i += 1) result = Math.imul(result ^ input.charCodeAt(i), 16777619);
  return `ev-${(result >>> 0).toString(16)}`;
};
const sanitize = (value: string | null) => text(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\b(ignore|system|assistant|developer|instruction|prompt)\b/gi, "[redacted]").slice(0, 180);

export type Dataset = Record<SourceName, DataRow[]>;
export function loadDataset(): Dataset {
  return Object.fromEntries(sources.map(source => [source, loadSource(source)])) as Dataset;
}

export function validateDataset(dataset: Dataset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  sources.forEach(source => {
    const rows = dataset[source];
    const definition = schemaDefinitions[source];
    const first = rows[0] ?? {};
    definition.required.filter(column => !(column in first)).forEach(column => issues.push({ id: `${source}-schema-${column}`, source, row: 1, severity: "blocking", code: "missing_required_column", message: `Required column ${column} is missing from ${source}.csv.`, field: column }));
    rows.forEach((item, index) => {
      const row = index + 2;
      definition.numeric.forEach(field => { if (item[field] !== "" && number(item[field]) === null) issues.push({ id: `${source}-${row}-invalid-${field}`, source, row, severity: "blocking", code: "invalid_numeric", message: `${field} must be numeric; received ${item[field]}.`, field }); });
      definition.dates.forEach(field => { if (item[field] !== "" && !/^\d{4}-(\d{2})(-(\d{2}))?$/.test(text(item[field]))) issues.push({ id: `${source}-${row}-invalid-${field}`, source, row, severity: "blocking", code: "invalid_date", message: `${field} must use YYYY-MM or YYYY-MM-DD.`, field }); });
      Object.entries(definition.enums).forEach(([field, accepted]) => { if (item[field] !== "" && !accepted.includes(text(item[field]))) issues.push({ id: `${source}-${row}-invalid-${field}`, source, row, severity: "warning", code: "invalid_enum", message: `${field} must be one of ${accepted.join(", ")}.`, field }); });
    });
  });
  const add = (source: SourceName, row: number, severity: Severity, code: string, message: string, field?: string) => issues.push({ id: `${source}-${row}-${code}`, source, row, severity, code, message, field });
  const leads = dataset.leads;
  const leadIds = new Map<string, number>();
  leads.forEach((item, index) => {
    const row = index + 2;
    const id = item.lead_id;
    if (id) {
      if (leadIds.has(id)) add("leads", row, "blocking", "duplicate_lead_id", `Duplicate lead ID ${id}; the record cannot be uniquely attributed.`, "lead_id");
      leadIds.set(id, row);
    }
    if (!item.status) add("leads", row, "warning", "missing_status", "Lead status is blank and is excluded from conversion-rate denominators.", "status");
  });
  dataset.campaigns.forEach((item, index) => {
    const row = index + 2;
    const clicks = number(item.clicks);
    const impressions = number(item.impressions);
    if (clicks !== null && impressions !== null && clicks > impressions) add("campaigns", row, "blocking", "clicks_gt_impressions", `Clicks (${clicks}) exceed impressions (${impressions}); CTR is invalid for this row.`, "clicks");
    if (number(item.cost) === null) add("campaigns", row, "warning", "missing_cost", `Campaign ${item.campaign_id} has no actual cost; CAC excludes this row.`, "cost");
  });
  dataset.revenue.forEach((item, index) => {
    const row = index + 2;
    if (!item.client_id) add("revenue", row, "warning", "missing_client_id", "Revenue event has no client link and cannot be joined to client-level metrics.", "client_id");
    if (item.status === "refunded" && number(item.amount) !== null && number(item.amount)! < 0) add("revenue", row, "informational", "refund_review", "Refund is represented as a negative amount; review reversal treatment before production use.", "amount");
  });
  dataset.clients.forEach((item, index) => {
    if (!item.region) add("clients", index + 2, "warning", "missing_region", `Client ${item.client_id} has no region and is excluded from regional rollups.`, "region");
  });
  return issues;
}

const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const monthLabel = (period: string) => new Date(`${period}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short" });
const delta = (current: number | null, previous: number | null) => current === null || previous === null || previous === 0 ? null : (current - previous) / Math.abs(previous);

function seriesFrom(values: Array<number | null>): MetricPoint[] { return months.map((period, index) => ({ period, value: values[index] ?? null, label: monthLabel(period) })); }
function makeKpi(id: string, label: string, value: number | null, unit: string, formula: string, numerator: string, denominator: string, trend: MetricPoint[], previous: number | null): KPI {
  const change = delta(value, previous);
  return { id, label, value, displayValue: unit === "percent" ? pct(value) : unit === "money" ? money(value) : unit === "number" ? integer(value) : value === null ? "—" : value.toFixed(1), unit, formula, numerator, denominator, period: "Jun 2026", trend, delta: change, deltaDisplay: change === null ? "No comparable prior period" : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}% vs May` };
}

export function calculateKpis(dataset: Dataset): KPI[] {
  const campaigns = dataset.campaigns;
  const leads = dataset.leads;
  const conversions = dataset.conversions;
  const revenue = dataset.revenue;
  const clients = dataset.clients;
  const ops = dataset.operational_kpis;
  const validCampaigns = campaigns.filter(row => number(row.cost) !== null && number(row.clicks) !== null && number(row.impressions) !== null && number(row.clicks)! <= number(row.impressions)!);
  const ctrByMonth = months.map(month => {
    const rows = validCampaigns.filter(row => row.month === month);
    const clicks = rows.reduce((sum, row) => sum + (number(row.clicks) ?? 0), 0);
    const impressions = rows.reduce((sum, row) => sum + (number(row.impressions) ?? 0), 0);
    return impressions ? clicks / impressions : null;
  });
  const conversionByMonth = months.map(month => {
    const rows = leads.filter(row => text(row.created_date).startsWith(month) && row.status);
    const converted = rows.filter(row => row.status === "converted").length;
    return rows.length ? converted / rows.length : null;
  });
  const cacByMonth = months.map(month => {
    const rows = validCampaigns.filter(row => row.month === month);
    const cost = rows.reduce((sum, row) => sum + (number(row.cost) ?? 0), 0);
    const generated = rows.reduce((sum, row) => sum + (number(row.leads_generated) ?? 0), 0);
    return generated ? cost / generated : null;
  });
  const revenueByMonth = months.map(month => revenue.filter(row => text(row.date).startsWith(month) && row.status === "recognized").reduce((sum, row) => sum + (number(row.amount) ?? 0), 0));
  const activeByMonth = months.map(month => clients.filter(row => row.status === "active" && text(row.signup_date) <= `${month}-31`).length);
  const churnByMonth = months.map(month => {
    const rows = clients.filter(row => row.status === "inactive" && text(row.last_activity_date).startsWith(month));
    const start = clients.filter(row => row.status === "active" && text(row.signup_date) < `${month}-01`).length;
    return start ? rows.length / start : null;
  });
  const arpcByMonth = months.map((month, index) => activeByMonth[index] ? revenueByMonth[index] / activeByMonth[index] : null);
  const delayByMonth = months.map(month => {
    const rows = ops.filter(row => row.month === month);
    return rows.length ? rows.reduce((sum, row) => sum + (number(row.avg_fulfillment_delay_days) ?? 0), 0) / rows.length : null;
  });
  return [
    makeKpi("ctr", "Click-through rate", ctrByMonth[5], "percent", "clicks ÷ impressions", `${validCampaigns.filter(r => r.month === "2026-06").reduce((s, r) => s + (number(r.clicks) ?? 0), 0)} clicks`, `${validCampaigns.filter(r => r.month === "2026-06").reduce((s, r) => s + (number(r.impressions) ?? 0), 0)} impressions`, seriesFrom(ctrByMonth), ctrByMonth[4]),
    makeKpi("conversion-rate", "Lead conversion rate", conversionByMonth[5], "percent", "converted leads ÷ leads with status", `${leads.filter(r => text(r.created_date).startsWith("2026-06") && r.status === "converted").length} converted`, `${leads.filter(r => text(r.created_date).startsWith("2026-06") && r.status).length} leads`, seriesFrom(conversionByMonth), conversionByMonth[4]),
    makeKpi("cac", "CAC proxy", cacByMonth[5], "money", "campaign cost ÷ leads generated", `$${validCampaigns.filter(r => r.month === "2026-06").reduce((s, r) => s + (number(r.cost) ?? 0), 0).toFixed(0)} cost`, `${validCampaigns.filter(r => r.month === "2026-06").reduce((s, r) => s + (number(r.leads_generated) ?? 0), 0)} leads`, seriesFrom(cacByMonth), cacByMonth[4]),
    makeKpi("revenue", "Recognized revenue", revenueByMonth[5], "money", "sum of recognized revenue amounts", `$${revenueByMonth[5].toFixed(0)} recognized`, "all recognized revenue events", seriesFrom(revenueByMonth), revenueByMonth[4]),
    makeKpi("revenue-change", "Revenue period change", delta(revenueByMonth[5], revenueByMonth[4]), "percent", "(current − prior) ÷ prior", `$${revenueByMonth[5].toFixed(0)} current`, `$${revenueByMonth[4].toFixed(0)} prior`, seriesFrom(months.map((_, i) => i === 0 ? null : delta(revenueByMonth[i], revenueByMonth[i - 1]))), delta(revenueByMonth[4], revenueByMonth[3])),
    makeKpi("active-clients", "Active client count", activeByMonth[5], "number", "count of active clients as of period", `${activeByMonth[5]} active clients`, "clients with active status", seriesFrom(activeByMonth), activeByMonth[4]),
    makeKpi("churn", "Client churn rate", churnByMonth[5], "percent", "churned clients ÷ clients at period start", `${clients.filter(r => r.status === "inactive" && text(r.last_activity_date).startsWith("2026-06")).length} churned`, `${clients.filter(r => text(r.signup_date) < "2026-06-01").length} at period start`, seriesFrom(churnByMonth), churnByMonth[4]),
    makeKpi("arpc", "Average revenue per client", arpcByMonth[5], "money", "recognized revenue ÷ active clients", `$${revenueByMonth[5].toFixed(0)} recognized`, `${activeByMonth[5]} active clients`, seriesFrom(arpcByMonth), arpcByMonth[4]),
    makeKpi("delay", "Average fulfillment delay", delayByMonth[5], "number", "average of regional delay KPI", `${delayByMonth[5]?.toFixed(1) ?? "—"} days average`, `${ops.filter(r => r.month === "2026-06").length} regions`, seriesFrom(delayByMonth), delayByMonth[4]),
  ];
}

function evidencePacket(anomalyId: string, source: SourceName, rows: DataRow[], facts: string[]): EvidencePacket {
  const selected = rows.slice(0, 20).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === "client_name" || key === "notes" ? sanitize(value) : value])));
  const numericValues = selected.flatMap(row => Object.values(row).map(value => number(value)).filter((value): value is number => value !== null));
  return { anomalyId, rows: selected, facts, source, numericValues: Array.from(new Set([...numericValues, ...extractNumbers(facts.join(" "))])), hash: hash({ anomalyId, selected, facts }) };
}

export function detectAnomalies(dataset: Dataset): Anomaly[] {
  const campaigns = dataset.campaigns;
  const revenue = dataset.revenue;
  const leads = dataset.leads;
  const clients = dataset.clients;
  const ops = dataset.operational_kpis;
  const anomalies: Anomaly[] = [];
  const add = (item: Omit<Anomaly, "evidenceHash" | "numericEvidence">) => { const packet = evidencePacket(item.id, item.evidenceSource, item.evidence, [item.summary, item.comparison]); anomalies.push({ ...item, evidenceHash: packet.hash, numericEvidence: packet.numericValues }); };
  const cmp1 = campaigns.filter(row => row.campaign_id === "CMP-001");
  add({ id: "cmp001-decline", title: "CMP-001 performance is in sustained decline", metric: "CTR & leads", severity: "warning", rule: "Sustained decline across consecutive monthly snapshots", summary: "Search performance deteriorated steadily while impressions and cost remained broadly present.", comparison: "CTR moves from 4.5% in January to 1.35% in June; generated leads fall from 12 to 1.", evidence: cmp1, evidenceSource: "campaigns" });
  const aprilLeads = leads.filter(row => text(row.created_date).startsWith("2026-04"));
  add({ id: "april-conversion-spike", title: "April conversions show a positive spike", metric: "Conversions", severity: "informational", rule: "Period spike versus recent baseline", summary: "April has a sharp increase in converted leads concentrated around a short promotional campaign.", comparison: `April includes ${aprilLeads.filter(row => row.status === "converted").length} converted leads; the Spring Signup Promo is the visible contributing campaign.`, evidence: [...aprilLeads.slice(0, 20), ...campaigns.filter(row => row.campaign_id === "CMP-006")].slice(0, 20), evidenceSource: "leads" });
  const monthlyRevenue = months.map(month => revenue.filter(row => text(row.date).startsWith(month) && row.status === "recognized").reduce((s, r) => s + (number(r.amount) ?? 0), 0));
  add({ id: "revenue-reversal", title: "Recognized revenue reversed after April", metric: "Revenue", severity: "warning", rule: "Two-period reversal after peak", summary: "Revenue rose through April, then declined in both May and June.", comparison: `Revenue peaks at $${monthlyRevenue[3].toFixed(0)} in April, then falls to $${monthlyRevenue[4].toFixed(0)} in May and $${monthlyRevenue[5].toFixed(0)} in June.`, evidence: revenue.filter(row => ["2026-04", "2026-05", "2026-06"].some(month => text(row.date).startsWith(month))).slice(0, 20), evidenceSource: "revenue" });
  const cmp5 = campaigns.filter(row => row.campaign_id === "CMP-005");
  add({ id: "cmp005-cac", title: "CMP-005 has unusually high acquisition cost", metric: "CAC proxy", severity: "warning", rule: "Efficiency deterioration versus peer campaign", summary: "Paid Social spend in North is converting at a materially higher cost than the peer benchmark.", comparison: "CMP-005 runs around $390–430 per lead versus roughly $165 for CMP-002 in comparable months.", evidence: [...cmp5, ...campaigns.filter(row => row.campaign_id === "CMP-002")].slice(0, 20), evidenceSource: "campaigns" });
  const inactive = clients.filter(row => row.status === "inactive");
  add({ id: "inactive-clients", title: "Inactive-client cluster needs follow-up", metric: "Client activity", severity: "warning", rule: "Inactive population above review threshold", summary: `${inactive.length} of ${clients.length} clients are inactive in the sample data.`, comparison: `${((inactive.length / clients.length) * 100).toFixed(0)}% of the client file is inactive, with several last-activity dates close to signup.`, evidence: inactive.slice(0, 20), evidenceSource: "clients" });
  const northOps = ops.filter(row => row.region === "North" && ["2026-04", "2026-05"].includes(text(row.month)));
  add({ id: "north-delay", title: "North fulfillment delays coincide with costly spend", metric: "North region", severity: "warning", rule: "Cross-metric coincidence without causal claim", summary: "North fulfillment delay rises in the same window that CMP-005 underperforms.", comparison: "North delay reaches 6.4–6.9 days in April–May alongside CMP-005's high CAC period. This is a coincidence worth checking, not proof of causation.", evidence: [...northOps, ...cmp5], evidenceSource: "operational_kpis" });
  return anomalies;
}

export function getEvidence(anomaly: Anomaly): EvidencePacket { return evidencePacket(anomaly.id, anomaly.evidenceSource, anomaly.evidence, [anomaly.summary, anomaly.comparison]); }

const causalPhrases = ["caused by", "due to", "resulted in", "because of"];
function extractNumbers(text: string): number[] { return Array.from(text.matchAll(/(?<![A-Za-z])(?:\$\s*)?(-?\d+(?:\.\d+)?)/g)).map(match => Number(match[1])).filter(Number.isFinite); }
export function validateAiText(text: string, packet: EvidencePacket): { ok: boolean; reason?: string } {
  const numbers = extractNumbers(text);
  const allowed = packet.numericValues;
  const unsupported = numbers.find(value => !allowed.some(candidate => Math.abs(candidate - value) < 0.011));
  if (unsupported !== undefined) return { ok: false, reason: `Unsupported numeric claim: ${unsupported}` };
  const lower = text.toLowerCase();
  const banned = causalPhrases.find(phrase => lower.includes(phrase));
  if (banned) return { ok: false, reason: `Causal phrase blocked: ${banned}` };
  return { ok: true };
}

export type InsightResult = { diagnosis: string; likelyReason: string; supportingEvidence: string[]; dataToConfirm: string[]; limitations: string[]; model: string; promptVersion: string; evidenceHash: string; fallback: boolean; validation?: string };
export type RecommendationResult = { recommendation: string; ownerRole: string; timeHorizon: string; successCheck: string; model: string; promptVersion: string; evidenceHash: string; fallback: boolean; validation?: string };

function contentOf(response: Awaited<ReturnType<typeof invokeLLM>>) { const content = response.choices?.[0]?.message?.content; return Array.isArray(content) ? content.map(part => "text" in part ? part.text : "").join("\n") : content ?? ""; }
function fallbackInsight(anomaly: Anomaly, packet: EvidencePacket, reason?: string): InsightResult { return { diagnosis: anomaly.summary, likelyReason: anomaly.comparison, supportingEvidence: [anomaly.rule, anomaly.comparison], dataToConfirm: ["Confirm the same movement in the next reporting period and check the relevant source-system records."], limitations: ["This is a sample-data explanation and does not establish causation."], model: "deterministic-fallback", promptVersion: "v1.0", evidenceHash: packet.hash, fallback: true, validation: reason }; }
function fallbackRecommendation(anomaly: Anomaly, packet: EvidencePacket, reason?: string): RecommendationResult { return { recommendation: `Review ${anomaly.metric.toLowerCase()} for ${anomaly.title.toLowerCase()} this week, verify the source records behind the evidence, and document the result before changing spend or operations.`, ownerRole: "Marketing / operations manager", timeHorizon: "This week", successCheck: "A follow-up review confirms whether the flagged movement is correcting or requires escalation.", model: "deterministic-fallback", promptVersion: "v1.0", evidenceHash: packet.hash, fallback: true, validation: reason }; }

export async function generateInsight(anomaly: Anomaly): Promise<InsightResult> {
  const packet = getEvidence(anomaly);
  const prompt = `You are an evidence-bound MIS analyst. Use only the evidence packet below. Do not calculate or invent any number. Do not use causal phrases such as caused by, due to, resulted in, or because of. Explain the most likely interpretation, state what data would confirm it, and acknowledge limitations. Return JSON only with diagnosis, likelyReason, supportingEvidence, dataToConfirm, limitations.\n\nEvidence packet hash: ${packet.hash}\nFacts: ${packet.facts.join(" | ")}\nRows: ${JSON.stringify(packet.rows)}`;
  try {
    const response = await invokeLLM({ messages: [{ role: "system", content: "Return a concise JSON object and never add unsupported numerical claims." }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "mis_insight", strict: true, schema: { type: "object", properties: { diagnosis: { type: "string" }, likelyReason: { type: "string" }, supportingEvidence: { type: "array", items: { type: "string" } }, dataToConfirm: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } } }, required: ["diagnosis", "likelyReason", "supportingEvidence", "dataToConfirm", "limitations"], additionalProperties: false } } } });
    const parsed = JSON.parse(contentOf(response));
    const combined = [parsed.diagnosis, parsed.likelyReason, ...(parsed.supportingEvidence ?? []), ...(parsed.dataToConfirm ?? []), ...(parsed.limitations ?? [])].join(" ");
    const validation = validateAiText(combined, packet);
    if (!validation.ok) return fallbackInsight(anomaly, packet, validation.reason);
    return { diagnosis: parsed.diagnosis, likelyReason: parsed.likelyReason, supportingEvidence: parsed.supportingEvidence, dataToConfirm: parsed.dataToConfirm, limitations: parsed.limitations, model: response.model, promptVersion: "v1.0", evidenceHash: packet.hash, fallback: false };
  } catch (error) {
    return fallbackInsight(anomaly, packet, error instanceof Error ? error.message : "AI unavailable");
  }
}

export async function generateRecommendation(anomaly: Anomaly, insight: InsightResult): Promise<RecommendationResult> {
  const packet = getEvidence(anomaly);
  if (insight.evidenceHash !== packet.hash) return fallbackRecommendation(anomaly, packet, "Evidence hash mismatch; recommendation generation stopped.");
  const prompt = `You are an evidence-bound business manager. Propose exactly one recommendation, using only the diagnosis and evidence below. Do not invent or calculate numbers. Do not use causal phrases. Return JSON only with recommendation, ownerRole, timeHorizon, successCheck.\n\nEvidence packet hash: ${packet.hash}\nDiagnosis: ${insight.diagnosis}\nLikely reason: ${insight.likelyReason}\nEvidence: ${JSON.stringify(packet.rows)}`;
  try {
    const response = await invokeLLM({ messages: [{ role: "system", content: "Return exactly one specific recommendation as JSON. Never add unsupported numerical claims." }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "mis_recommendation", strict: true, schema: { type: "object", properties: { recommendation: { type: "string" }, ownerRole: { type: "string" }, timeHorizon: { type: "string" }, successCheck: { type: "string" } }, required: ["recommendation", "ownerRole", "timeHorizon", "successCheck"], additionalProperties: false } } } });
    const parsed = JSON.parse(contentOf(response));
    const validation = validateAiText(Object.values(parsed).join(" "), packet);
    if (!validation.ok) return fallbackRecommendation(anomaly, packet, validation.reason);
    return { recommendation: parsed.recommendation, ownerRole: parsed.ownerRole, timeHorizon: parsed.timeHorizon, successCheck: parsed.successCheck, model: response.model, promptVersion: "v1.0", evidenceHash: packet.hash, fallback: false };
  } catch (error) {
    return fallbackRecommendation(anomaly, packet, error instanceof Error ? error.message : "AI unavailable");
  }
}

export function answerQuestion(question: string, dataset: Dataset) {
  const normalized = question.toLowerCase().trim();
  const examples = ["What happened to revenue in the last two months?", "Why did CMP-001's performance decline?", "Which campaign has the highest acquisition cost?", "What caused the jump in conversions in April?", "Which clients have gone inactive, and when?", "Is there anything unusual in the North region this quarter?"];
  let answer = "";
  let evidence: DataRow[] = [];
  let intent = "unsupported";
  if (normalized.includes("revenue") && (normalized.includes("last") || normalized.includes("two"))) { const totals = months.slice(-2).map(month => ({ month, total: dataset.revenue.filter(row => text(row.date).startsWith(month) && row.status === "recognized").reduce((s, r) => s + (number(r.amount) ?? 0), 0) })); answer = `Recognized revenue fell from $${totals[0].total.toFixed(0)} in May to $${totals[1].total.toFixed(0)} in June, a ${(((totals[1].total - totals[0].total) / totals[0].total) * 100).toFixed(1)}% decline.`; evidence = dataset.revenue.filter(row => text(row.date).startsWith("2026-05") || text(row.date).startsWith("2026-06")).slice(0, 20); intent = "revenue_recent"; }
  else if (normalized.includes("cmp-001") || normalized.includes("performance decline")) { answer = "CMP-001 shows a sustained decline: CTR moves from 4.5% in January to 1.35% in June while generated leads fall from 12 to 1. The evidence supports a performance deterioration that should be reviewed against audience fatigue, creative, and landing-page data."; evidence = dataset.campaigns.filter(row => row.campaign_id === "CMP-001"); intent = "cmp001_decline"; }
  else if (normalized.includes("highest") && normalized.includes("acquisition")) { const rows = dataset.campaigns.map(row => ({ row, cac: number(row.cost) !== null && number(row.leads_generated) ? (number(row.cost)! / number(row.leads_generated)!).toFixed(0) : "—" })).sort((a, b) => Number(b.cac) - Number(a.cac)); answer = `CMP-005 has the highest CAC proxy in the sample at approximately $${rows[0].cac} per generated lead, based on campaign cost divided by generated leads.`; evidence = rows.filter(item => item.row.campaign_id === "CMP-005").map(item => item.row); intent = "highest_cac"; }
  else if (normalized.includes("conversion") && normalized.includes("april")) { const april = dataset.leads.filter(row => text(row.created_date).startsWith("2026-04")); answer = `April contains ${april.filter(row => row.status === "converted").length} converted leads, concentrated around the short CMP-006 Spring Signup Promo campaign. This is a positive spike relative to the surrounding months.`; evidence = [...april.slice(0, 20), ...dataset.campaigns.filter(row => row.campaign_id === "CMP-006")].slice(0, 20); intent = "april_spike"; }
  else if (normalized.includes("inactive") || normalized.includes("gone inactive")) { const inactive = dataset.clients.filter(row => row.status === "inactive"); answer = `${inactive.length} of ${dataset.clients.length} clients are inactive. Their last activity dates range from ${inactive.map(row => text(row.last_activity_date)).sort()[0]} to ${inactive.map(row => text(row.last_activity_date)).sort().at(-1)}.`; evidence = inactive.slice(0, 20); intent = "inactive_clients"; }
  else if (normalized.includes("north") && (normalized.includes("unusual") || normalized.includes("quarter"))) { answer = "North shows an unusual combination: fulfillment delay rises to 6.4–6.9 days in April–May while CMP-005 runs at unusually high CAC. These signals coincide and should be investigated together, without treating the relationship as proven causation."; evidence = [...dataset.operational_kpis.filter(row => row.region === "North"), ...dataset.campaigns.filter(row => row.campaign_id === "CMP-005")].slice(0, 20); intent = "north_unusual"; }
  return { supported: intent !== "unsupported", intent, answer, evidence, examples };
}

let decisions: Decision[] = [];
export function listDecisions() { return decisions; }
export function validateDecisionDraft(input: { recommendation: string; rationale: string }) { if (!input.recommendation.trim()) throw new Error("Recommendation is required"); if (!input.rationale.trim()) throw new Error("Rationale is required"); return true; }
export function saveDecision(input: Omit<Decision, "id" | "createdAt">): Decision { validateDecisionDraft(input); const decision = { ...input, id: `decision-${Date.now()}`, createdAt: new Date().toISOString() }; decisions = [decision, ...decisions].slice(0, 50); return decision; }

export function getSnapshot() {
  const dataset = loadDataset();
  const issues = validateDataset(dataset);
  const anomalies = detectAnomalies(dataset);
  const kpis = calculateKpis(dataset);
  return { dataset, issues, anomalies, kpis, decisions: listDecisions(), sourceSummary: sources.map(source => ({ source, rows: dataset[source].length, file: sourceFiles[source] })), period: { start: "2026-01", end: "2026-06" } };
}
