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

      if (decision.kind === "blueprint" && input.confirmedUnderstanding !== true) {
        return { kind: "hold", reasons: ["understanding_not_confirmed"] };
      }

      if (!isGroundedDecision(decision, input)) {
        lastFailure = "grounding_validation_failed";
        continue;
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
    return AgentDecision.parse(normalizeDecisionPayload(JSON.parse(text)));
  } catch {
    return null;
  }
};

const normalizeDecisionPayload = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  const candidate = value as Record<string, unknown>;
  switch (candidate.kind) {
    case "question":
      return {
        kind: "question",
        topic: candidate.topic,
        message: candidate.message,
      };
    case "hold":
      return {
        kind: "hold",
        reasons: candidate.reasons,
        draft: typeof candidate.draft === "string" ? candidate.draft : undefined,
      };
    case "checkpoint":
      return { kind: "checkpoint", summary: candidate.summary };
    case "blueprint":
      return { kind: "blueprint", blueprint: candidate.blueprint };
    default:
      return value;
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
  const sourceText = [
    input.intake.problem,
    input.intake.desiredOutcome,
    input.intake.priorAttempts,
    input.latestMessage ?? "",
    ...input.state.knownFacts,
    ...input.state.openQuestions,
  ].join(" ");
  const sourceTerms = significantTerms(sourceText);
  const decisionTerms = significantTerms(decisionText(decision));

  if (decision.kind === "question") {
    if ((decision.message.match(/\?/g) ?? []).length !== 1) return false;
    if (/\b(and|also)\b/i.test(decision.message)) return false;
  }

  const overlap = decisionTerms.filter((term) => sourceTerms.includes(term));
  return overlap.length >= 1 && overlap.some((term) => !genericGroundingTerms.has(term));
};

const decisionText = (decision: AgentDecision): string => {
  switch (decision.kind) {
    case "question":
      return `${decision.topic} ${decision.message}`;
    case "checkpoint":
      return [
        decision.summary.summary,
        ...decision.summary.knownFacts,
        ...decision.summary.openQuestions,
      ].join(" ");
    case "blueprint":
      return [
        decision.blueprint.summary,
        ...decision.blueprint.workflow,
        ...decision.blueprint.automationOpportunities,
        ...decision.blueprint.sessionAgenda,
      ].join(" ");
    case "hold":
      return [...decision.reasons, decision.draft ?? ""].join(" ");
  }
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

const genericGroundingTerms = new Set([
  "customer",
  "customers",
  "intake",
  "process",
  "session",
  "workflow",
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
  latestMessage: redactLatestMessage(input.latestMessage ?? ""),
});

const redactSensitiveText = (value: string): string => {
  if (!value) return value;
  return value
    .replace(
      /\b(password|api[_ -]?key|token|secret|credential|key)\s*[:=]\s*[^\s,.;]+/gi,
      "$1: [redacted]",
    )
    .replace(
      /\b(password|api[_ -]?key|token|secret|credential|key)\s+[^\s,.;]+/gi,
      "$1 [redacted]",
    )
    .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, "[redacted]")
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[redacted]")
    .replace(/https?:\/\/[^/\s:@]+:[^@\s/]+@/gi, "https://[redacted]@")
    .replace(/secret-value/gi, "[redacted]");
};

const redactLatestMessage = (value: string): string => {
  if (!value) return value;
  return containsSecretLikeValue(value) ? "[redacted]" : redactSensitiveText(value);
};

const containsSecretLikeValue = (value: string): boolean =>
  /\b(password|api[_ -]?key|token|secret|credential|key)\s*[:= ]\s*[^\s,.;]+|\bsk-[a-z0-9_-]{8,}\b|https?:\/\/[^/\s:@]+:[^@\s/]+@|secret-value/i.test(value);

const agentDecisionJsonSchema = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["question", "checkpoint", "blueprint", "hold"],
    },
    topic: { type: ["string", "null"] },
    message: { type: ["string", "null"] },
    summary: {
      type: ["object", "null"],
      properties: {
        summary: { type: "string" },
        knownFacts: { type: "array", items: { type: "string" } },
        openQuestions: { type: "array", items: { type: "string" } },
      },
      required: ["summary", "knownFacts", "openQuestions"],
      additionalProperties: false,
    },
    blueprint: {
      type: ["object", "null"],
      properties: {
        summary: { type: "string" },
        workflow: { type: "array", items: { type: "string" } },
        automationOpportunities: {
          type: "array",
          items: { type: "string" },
        },
        sessionAgenda: {
          type: "array",
          items: { type: "string" },
        },
        recommendedSessionLengthMinutes: { type: "integer" },
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
    reasons: { type: "array", items: { type: "string" } },
    draft: { type: ["string", "null"] },
  },
  required: [
    "kind",
    "topic",
    "message",
    "summary",
    "blueprint",
    "reasons",
    "draft",
  ],
  additionalProperties: false,
};
