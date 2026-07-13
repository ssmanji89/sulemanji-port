import {
  AgentDecision,
  type AgentInput,
  type AgentProvider,
} from "../agent/contracts";
import { DISCOVERY_SYSTEM_PROMPT } from "../agent/prompts";
import { evaluateRisk } from "../domain/risk";

export type AgentFetch = typeof fetch;

export interface OpenAIAgentConfig {
  apiKey: string;
  model: string;
}

export const createOpenAIAgentProvider = (
  config: OpenAIAgentConfig,
  agentFetch: AgentFetch = fetch,
): AgentProvider => ({
  async decide(input) {
    const risk = evaluateRisk(input);
    if (risk.hold) {
      return {
        kind: "hold",
        reasons: risk.reasons,
        draft: "This case requires personal review before the next reply.",
      };
    }

    let lastFailure: "schema_validation_failed" | "grounding_validation_failed" =
      "schema_validation_failed";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await agentFetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          reasoning: { effort: "low" },
          input: [
            { role: "system", content: DISCOVERY_SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify(sanitizeAgentInputForModel(input)),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "agent_decision",
              strict: true,
              schema: agentDecisionJsonSchema,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Responses request failed: ${response.status}`);
      }

      const decision = parseDecision(await response.json());
      if (!decision) {
        lastFailure = "schema_validation_failed";
        continue;
      }

      if (!isGroundedDecision(decision, input)) {
        lastFailure = "grounding_validation_failed";
        continue;
      }

      if (decision.kind === "blueprint" && input.confirmedUnderstanding !== true) {
        return { kind: "hold", reasons: ["understanding_not_confirmed"] };
      }

      if (
        input.launchReviewRequired === true &&
        (decision.kind === "checkpoint" || decision.kind === "blueprint")
      ) {
        return {
          kind: "hold",
          reasons: ["launch_review_required"],
          draft:
            decision.kind === "blueprint"
              ? JSON.stringify(decision.blueprint)
              : JSON.stringify(decision.summary),
        };
      }

      return decision;
    }

    return {
      kind: "hold",
      reasons: [lastFailure],
      draft: "The model response did not match the approved schema.",
    };
  },
});

const parseDecision = (body: unknown): AgentDecision | null => {
  const text = extractOutputText(body);
  if (!text) return null;

  try {
    return AgentDecision.parse(JSON.parse(text));
  } catch {
    return null;
  }
};

const extractOutputText = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const output = (body as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const candidate = part as { type?: unknown; text?: unknown };
      if (
        candidate.type === "output_text" &&
        typeof candidate.text === "string"
      ) {
        return candidate.text;
      }
    }
  }

  return null;
};

const isGroundedDecision = (
  decision: AgentDecision,
  input: AgentInput,
): boolean => {
  if (decision.kind !== "question") return true;
  if ((decision.message.match(/\?/g) ?? []).length !== 1) return false;

  const sourceText = [
    input.intake.problem,
    input.intake.desiredOutcome,
    input.intake.priorAttempts,
    ...input.state.knownFacts,
    ...input.state.openQuestions,
  ].join(" ");
  const sourceTerms = significantTerms(sourceText);
  const questionTerms = significantTerms(`${decision.topic} ${decision.message}`);
  return questionTerms.some((term) => sourceTerms.includes(term));
};

const significantTerms = (value: string): string[] =>
  value
    .toLowerCase()
    .match(/[a-z0-9]{5,}/g)
    ?.filter((term) => !stopTerms.has(term)) ?? [];

const stopTerms = new Set([
  "about",
  "after",
  "before",
  "color",
  "could",
  "first",
  "their",
  "there",
  "these",
  "what",
  "where",
  "which",
  "would",
]);

export const sanitizeAgentInputForModel = (input: AgentInput): AgentInput => ({
  caseId: input.caseId,
  launchReviewRequired: input.launchReviewRequired,
  confirmedUnderstanding: input.confirmedUnderstanding,
  topicExpansionDetected: input.topicExpansionDetected,
  lowConfidenceThreadMapping: input.lowConfidenceThreadMapping,
  intake: {
    contextType: input.intake.contextType,
    problem: redactSensitiveText(input.intake.problem),
    desiredOutcome: redactSensitiveText(input.intake.desiredOutcome),
    priorAttempts: redactSensitiveText(input.intake.priorAttempts),
    sanitizedLinks: input.intake.sanitizedLinks.slice(0, 5),
  },
  state: {
    knownFacts: input.state.knownFacts.map(redactSensitiveText),
    openQuestions: input.state.openQuestions.map(redactSensitiveText),
  },
  latestMessage: redactSensitiveText(input.latestMessage ?? ""),
});

const redactSensitiveText = (value: string): string => {
  if (!value) return value;
  const secretPattern =
    /\b(password|api key|key|token|secret)\s+([^\s,.;]+)|\b(sk-[a-z0-9_-]{8,})\b|secret-value/gi;
  if (secretPattern.test(value)) {
    return "[redacted]";
  }
  return value;
};

const agentDecisionJsonSchema = {
  type: "object",
  oneOf: [
    {
      properties: {
        kind: { const: "question" },
        topic: { type: "string" },
        message: { type: "string" },
      },
      required: ["kind", "topic", "message"],
      additionalProperties: false,
    },
    {
      properties: {
        kind: { const: "hold" },
        reasons: { type: "array", items: { type: "string" }, minItems: 1 },
        draft: { type: "string" },
      },
      required: ["kind", "reasons"],
      additionalProperties: false,
    },
    {
      properties: {
        kind: { const: "checkpoint" },
        summary: {
          type: "object",
          properties: {
            summary: { type: "string" },
            knownFacts: { type: "array", items: { type: "string" } },
            openQuestions: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "knownFacts", "openQuestions"],
          additionalProperties: false,
        },
      },
      required: ["kind", "summary"],
      additionalProperties: false,
    },
    {
      properties: {
        kind: { const: "blueprint" },
        blueprint: {
          type: "object",
          properties: {
            summary: { type: "string" },
            workflow: { type: "array", items: { type: "string" }, minItems: 1 },
            automationOpportunities: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
            sessionAgenda: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
            recommendedSessionLengthMinutes: { type: "integer", minimum: 1 },
          },
          required: [
            "summary",
            "workflow",
            "automationOpportunities",
            "sessionAgenda",
            "recommendedSessionLengthMinutes",
          ],
          additionalProperties: false,
        },
      },
      required: ["kind", "blueprint"],
      additionalProperties: false,
    },
  ],
};
