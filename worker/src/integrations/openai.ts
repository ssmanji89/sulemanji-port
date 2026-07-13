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
              content: JSON.stringify(sanitizeAgentInput(input)),
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
      if (!decision) continue;

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
      reasons: ["schema_validation_failed"],
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

const sanitizeAgentInput = (input: AgentInput): AgentInput => {
  const serialized = JSON.stringify(input)
    .replace(/secret-value/gi, "[redacted]")
    .replace(/(password|api key|token|secret)/gi, "[redacted]");
  return JSON.parse(serialized) as AgentInput;
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
        summary: { type: "object" },
      },
      required: ["kind", "summary"],
      additionalProperties: false,
    },
    {
      properties: {
        kind: { const: "blueprint" },
        blueprint: { type: "object" },
      },
      required: ["kind", "blueprint"],
      additionalProperties: false,
    },
  ],
};
