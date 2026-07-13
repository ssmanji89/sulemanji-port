import { z } from "zod";

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

export interface AgentInput {
  caseId: string;
  launchReviewRequired?: boolean;
  confirmedUnderstanding?: boolean;
  topicExpansionDetected?: boolean;
  lowConfidenceThreadMapping?: boolean;
  intake: {
    contextType: "personal" | "professional";
    problem: string;
    desiredOutcome: string;
    priorAttempts: string;
    sanitizedLinks: string[];
  };
  state: {
    knownFacts: string[];
    openQuestions: string[];
  };
  latestMessage?: string;
}

export interface AgentProvider {
  decide(input: AgentInput): Promise<AgentDecision>;
}
