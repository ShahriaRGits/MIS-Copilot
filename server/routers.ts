import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { answerQuestion, generateInsight, generateRecommendation, getEvidence, getSnapshot, listDecisions, saveDecision } from "./mis";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  mis: router({
    snapshot: publicProcedure.query(() => {
      const snapshot = getSnapshot();
      return {
        sourceSummary: snapshot.sourceSummary,
        period: snapshot.period,
        issues: snapshot.issues,
        anomalies: snapshot.anomalies.map(anomaly => ({ ...anomaly, evidence: anomaly.evidence.slice(0, 20) })),
        kpis: snapshot.kpis,
        decisions: listDecisions(),
      };
    }),
    insight: publicProcedure.input(z.object({ anomalyId: z.string() })).mutation(async ({ input }) => {
      const anomaly = getSnapshot().anomalies.find(item => item.id === input.anomalyId);
      if (!anomaly) throw new Error("Anomaly not found");
      return generateInsight(anomaly);
    }),
    recommendation: publicProcedure.input(z.object({ anomalyId: z.string(), insight: z.object({ diagnosis: z.string(), likelyReason: z.string(), supportingEvidence: z.array(z.string()), dataToConfirm: z.array(z.string()), limitations: z.array(z.string()), model: z.string(), promptVersion: z.string(), evidenceHash: z.string(), fallback: z.boolean(), validation: z.string().optional() }) })).mutation(async ({ input }) => {
      const anomaly = getSnapshot().anomalies.find(item => item.id === input.anomalyId);
      if (!anomaly) throw new Error("Anomaly not found");
      return generateRecommendation(anomaly, input.insight);
    }),
    evidence: publicProcedure.input(z.object({ anomalyId: z.string() })).query(({ input }) => {
      const anomaly = getSnapshot().anomalies.find(item => item.id === input.anomalyId);
      if (!anomaly) throw new Error("Anomaly not found");
      return getEvidence(anomaly);
    }),
    question: publicProcedure.input(z.object({ question: z.string().min(1) })).mutation(({ input }) => answerQuestion(input.question, getSnapshot().dataset)),
    decision: publicProcedure.input(z.object({ anomalyId: z.string(), decision: z.enum(["accepted", "edited", "rejected"]), recommendation: z.string().min(1), rationale: z.string().trim().min(1, "Rationale is required"), evidenceHash: z.string(), promptVersion: z.string() })).mutation(({ input }) => saveDecision(input)),
    history: publicProcedure.query(() => listDecisions()),
  }),
});

export type AppRouter = typeof appRouter;
