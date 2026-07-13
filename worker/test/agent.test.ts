import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/discovery-cases.json";
import {
  AgentDecision,
  type AgentInput,
} from "../src/agent/contracts";
import { evaluateRisk } from "../src/domain/risk";
import {
  createOpenAIAgentProvider,
  sanitizeAgentInputForModel,
  type AgentFetch,
} from "../src/integrations/openai";

describe("agent contracts and risk policy", () => {
  it("accepts exactly one grounded question decision", () => {
    expect(
      AgentDecision.parse({
        kind: "question",
        topic: "current workflow",
        message: "What currently happens immediately after a customer submits the form?",
      }),
    ).toEqual({
      kind: "question",
      topic: "current workflow",
      message: "What currently happens immediately after a customer submits the form?",
    });

    expect(() =>
      AgentDecision.parse({
        kind: "question",
        topic: "current workflow",
        message: "Question one?",
        followUp: "Question two?",
      }),
    ).toThrow();
  });

  it("holds regulated, surveillance, credential, third-party-sensitive, destructive, and topic-expansion cases before model calls", () => {
    const riskyCases = fixtures.filter((fixture) => fixture.expectedHold);

    expect(riskyCases.map((fixture) => fixture.name)).toContain("regulated advice");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("employee surveillance");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("credential handling");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("third party sensitive data");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("destructive action");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("topic expansion");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("high impact decision");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("unclear authorization");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("unsupported claims");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("contradiction");
    expect(riskyCases.map((fixture) => fixture.name)).toContain("low confidence thread mapping");

    for (const fixture of riskyCases) {
      expect(evaluateRisk(fixture.input as AgentInput)).toMatchObject({
        hold: true,
      });
    }
  });

  it("forces launch-review checkpoints and blueprints into human review", async () => {
    const transport = new RecordingAgentFetch([
      responsePayload({
        kind: "blueprint",
        blueprint: {
          summary: "A concise summary of the understood messy workflow.",
          workflow: ["Collect intake", "Draft triage", "Schedule reviewed session"],
          automationOpportunities: ["Use a dedicated labeled Gmail thread"],
          sessionAgenda: ["Confirm scope", "Choose next automation slice"],
          recommendedSessionLengthMinutes: 90,
        },
      }),
    ]);
    const provider = createOpenAIAgentProvider(
      { apiKey: "sk-test", model: "gpt-test" },
      transport.fetch,
    );

    const decision = await provider.decide({
      ...(fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput),
      launchReviewRequired: true,
      confirmedUnderstanding: true,
    });

    expect(decision.kind).toBe("hold");
    if (decision.kind !== "hold") throw new Error("expected hold decision");
    expect(decision.reasons).toContain("launch_review_required");
    expect(transport.requests).toHaveLength(1);
  });

  it("requires explicit understanding confirmation before a blueprint can be returned", async () => {
    const transport = new RecordingAgentFetch([
      responsePayload({
        kind: "blueprint",
        blueprint: {
          summary: "A premature blueprint.",
          workflow: ["Guess at workflow"],
          automationOpportunities: ["Automate something"],
          sessionAgenda: ["Discuss assumptions"],
          recommendedSessionLengthMinutes: 60,
        },
      }),
    ]);
    const provider = createOpenAIAgentProvider(
      { apiKey: "sk-test", model: "gpt-test" },
      transport.fetch,
    );

    const decision = await provider.decide({
      ...(fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput),
      confirmedUnderstanding: false,
    });

    expect(decision).toMatchObject({
      kind: "hold",
      reasons: ["understanding_not_confirmed"],
    });
  });

  it("retries one schema failure and then escalates as a hold", async () => {
    const transport = new RecordingAgentFetch([
      responsePayload({ kind: "question", topic: "missing message" }),
      responsePayload({ kind: "not-a-valid-decision" }),
    ]);
    const provider = createOpenAIAgentProvider(
      { apiKey: "sk-test", model: "gpt-test" },
      transport.fetch,
    );

    const decision = await provider.decide(
      fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput,
    );

    expect(decision).toMatchObject({
      kind: "hold",
      reasons: ["schema_validation_failed"],
    });
    expect(transport.requests).toHaveLength(2);
  });

  it("retries one grounding failure before accepting a grounded single question", async () => {
    const transport = new RecordingAgentFetch([
      responsePayload({
        kind: "question",
        topic: "unrelated",
        message: "What is your favorite color?",
      }),
      responsePayload({
        kind: "question",
        topic: "current queue",
        message: "What is the first manual step after the intake arrives?",
      }),
    ]);
    const provider = createOpenAIAgentProvider(
      { apiKey: "sk-test", model: "gpt-test" },
      transport.fetch,
    );

    const decision = await provider.decide(
      fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput,
    );

    expect(decision).toMatchObject({
      kind: "question",
      topic: "current queue",
    });
    expect(transport.requests).toHaveLength(2);
  });

  it("holds after repeated multi-question or ungrounded model output", async () => {
    const transport = new RecordingAgentFetch([
      responsePayload({
        kind: "question",
        topic: "current queue",
        message: "What is the first manual step? Who owns it?",
      }),
      responsePayload({
        kind: "question",
        topic: "unrelated",
        message: "What is your favorite color?",
      }),
    ]);
    const provider = createOpenAIAgentProvider(
      { apiKey: "sk-test", model: "gpt-test" },
      transport.fetch,
    );

    const decision = await provider.decide(
      fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput,
    );

    expect(decision).toMatchObject({
      kind: "hold",
      reasons: ["grounding_validation_failed"],
    });
    expect(transport.requests).toHaveLength(2);
  });

  it("minimizes and redacts sensitive values before model submission", () => {
    const sanitized = sanitizeAgentInputForModel({
      ...(fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput),
      latestMessage:
        "Use password hunter2 and key sk-proj-1234567890abcdef for the private document.",
    });
    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("sk-proj-1234567890abcdef");
    expect(serialized).not.toContain("private document");
    expect(serialized).toContain("[redacted]");
    expect(Object.keys(sanitized.intake)).toEqual([
      "contextType",
      "problem",
      "desiredOutcome",
      "priorAttempts",
      "sanitizedLinks",
    ]);
  });

  it("posts sanitized structured state to the Responses API and parses structured output", async () => {
    const transport = new RecordingAgentFetch([
      responsePayload({
        kind: "question",
        topic: "current queue",
        message: "What is the first manual step after the intake arrives?",
      }),
    ]);
    const provider = createOpenAIAgentProvider(
      { apiKey: "sk-test", model: "gpt-test" },
      transport.fetch,
    );

    const decision = await provider.decide(
      fixtures.find((fixture) => fixture.name === "safe routine")!
        .input as AgentInput,
    );

    expect(decision).toEqual({
      kind: "question",
      topic: "current queue",
      message: "What is the first manual step after the intake arrives?",
    });
    const request = JSON.parse(String(transport.requests[0]?.body));
    expect(transport.requests[0]?.url).toBe("https://api.openai.com/v1/responses");
    expect(transport.requests[0]?.authorization).toBe("Bearer sk-test");
    expect(request.model).toBe("gpt-test");
    expect(request.reasoning).toEqual({ effort: "low" });
    expect(JSON.stringify(request)).not.toContain("secret-value");
    expect(JSON.stringify(request)).toContain("sanitizedLinks");
  });
});

class RecordingAgentFetch {
  readonly requests: Array<{
    url: string;
    authorization: string | null;
    body: BodyInit | null | undefined;
  }> = [];
  private cursor = 0;

  constructor(private readonly responses: Response[]) {}

  fetch: AgentFetch = async (input, init = {}) => {
    this.requests.push({
      url: String(input),
      authorization: new Headers(init.headers).get("authorization"),
      body: init.body,
    });
    const response = this.responses[this.cursor];
    this.cursor += 1;
    if (!response) throw new Error("Unexpected OpenAI request");
    return response;
  };
}

const responsePayload = (decision: unknown): Response =>
  new Response(
    JSON.stringify({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify(decision),
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
