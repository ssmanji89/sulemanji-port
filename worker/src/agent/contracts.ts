import { z } from "zod";
import { WorkshopCategory } from "../domain/case";

export const UnderstandingSchema = z
  .object({
    summary: z.string().min(20),
    knownFacts: z.array(z.string()).default([]),
    openQuestions: z.array(z.string()).default([]),
  })
  .strict();

export const BlueprintSchema = z
  .object({
    summary: z.string().min(10),
    workflow: z.array(z.string().min(1)).min(1),
    automationOpportunities: z.array(z.string().min(1)).min(1),
    sessionAgenda: z.array(z.string().min(1)).min(1),
    recommendedSessionLengthMinutes: z.number().int().positive(),
  })
  .strict();

export const AgentDecision = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("question"),
      topic: z.string().min(2),
      message: z.string().min(10),
    })
    .strict(),
  z
    .object({
      kind: z.literal("checkpoint"),
      summary: UnderstandingSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("blueprint"),
      blueprint: BlueprintSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("hold"),
      reasons: z.array(z.string().min(1)).min(1),
      draft: z.string().optional(),
    })
    .strict(),
]);

export type AgentDecision = z.infer<typeof AgentDecision>;

export const AgentInputSchema = z
  .object({
    caseId: z.string().min(1),
    launchReviewRequired: z.boolean().optional(),
    confirmedUnderstanding: z.boolean().optional(),
    topicExpansionDetected: z.boolean().optional(),
    lowConfidenceThreadMapping: z.boolean().optional(),
    intake: z
      .object({
        contextType: z.enum(["personal", "professional"]),
        workshopCategory: WorkshopCategory,
        problem: z.string(),
        desiredOutcome: z.string(),
        priorAttempts: z.string(),
        sanitizedLinks: z.array(z.string().url()).max(5),
      })
      .strict(),
    state: z
      .object({
        knownFacts: z.array(z.string()),
        openQuestions: z.array(z.string()),
      })
      .strict(),
    latestMessage: z.string().optional(),
  })
  .strict();

export type AgentInput = z.infer<typeof AgentInputSchema>;

export interface AgentProvider {
  decide(input: AgentInput): Promise<AgentDecision>;
}
