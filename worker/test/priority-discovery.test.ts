import { describe, expect, it, vi } from "vitest";
import { pollGmailHistory } from "../src/scheduled/gmail-poller";
import {
  handlePriorityDiscoveryCustomerReply,
  startPriorityDiscoveryDelivery,
} from "../src/workflows/priority-discovery";

describe("priority discovery orchestration", () => {
  it("starts paid discovery by creating a Gmail draft and persisting the thread", async () => {
    const repository = {
      startDelivery: vi.fn(async () => undefined),
      saveDiscoveryState: vi.fn(async () => undefined),
    };
    const gmail = {
      createDiscoveryThread: vi.fn(async () => ({
        draftId: "draft_1",
        messageId: "msg_1",
        threadId: "thread_1",
      })),
    };

    const result = await startPriorityDiscoveryDelivery(
      {
        caseId: "case_1",
        workflowId: "workflow_1",
        email: "ada@example.com",
        name: "Ada",
      },
      { repository, gmail },
    );

    expect(result).toEqual({
      draftId: "draft_1",
      threadId: "thread_1",
      heldForReview: true,
    });
    expect(gmail.createDiscoveryThread).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_1",
        to: "ada@example.com",
      }),
    );
    expect(repository.startDelivery).toHaveBeenCalledWith(
      "case_1",
      "thread_1",
      "workflow_1",
    );
    expect(repository.saveDiscoveryState).toHaveBeenCalledWith(
      "case_1",
      expect.objectContaining({
        status: "delivery_draft_ready",
        gmailThreadId: "thread_1",
        workflowId: "workflow_1",
        mandatoryReview: expect.objectContaining({
          held: true,
          draftId: "draft_1",
        }),
      }),
    );
  });

  it("dedupes Gmail history before sending workflow events and advances cursor after durable sends", async () => {
    const gmail = {
      listLabeledHistory: vi.fn(async () => ({
        messageIds: ["msg_1", "msg_1", "msg_2"],
        historyId: "99",
      })),
    };
    const state = {
      getHistoryCursor: vi.fn(async () => "42"),
      hasProcessedMessage: vi.fn(async (messageId: string) => messageId === "msg_1"),
      recordProcessedMessage: vi.fn(async () => undefined),
      setHistoryCursor: vi.fn(async () => undefined),
    };
    const workflow = {
      sendEvent: vi.fn(async () => undefined),
    };

    await pollGmailHistory({ gmail, state, workflow });

    expect(workflow.sendEvent).toHaveBeenCalledTimes(1);
    expect(workflow.sendEvent).toHaveBeenCalledWith("customer-reply", {
      messageId: "msg_2",
    });
    expect(state.recordProcessedMessage).toHaveBeenCalledWith("msg_2");
    expect(state.setHistoryCursor).toHaveBeenCalledWith("99");
  });

  it("does not advance Gmail cursor when workflow event delivery fails", async () => {
    const gmail = {
      listLabeledHistory: vi.fn(async () => ({
        messageIds: ["msg_3"],
        historyId: "100",
      })),
    };
    const state = {
      getHistoryCursor: vi.fn(async () => "99"),
      hasProcessedMessage: vi.fn(async () => false),
      recordProcessedMessage: vi.fn(async () => undefined),
      setHistoryCursor: vi.fn(async () => undefined),
    };
    const workflow = {
      sendEvent: vi.fn(async () => {
        throw new Error("workflow unavailable");
      }),
    };

    await expect(pollGmailHistory({ gmail, state, workflow })).rejects.toThrow(
      "workflow unavailable",
    );
    expect(state.recordProcessedMessage).not.toHaveBeenCalled();
    expect(state.setHistoryCursor).not.toHaveBeenCalled();
  });

  it("handles routine customer replies by sending the next agent question", async () => {
    const repository = {
      getDiscoveryAgentContext: vi.fn(async () => ({
        caseId: "case_1",
        email: "ada@example.com",
        contextType: "professional" as const,
        workshopCategory: "ai_business_operations" as const,
        problem:
          "I need help prioritizing a messy intake workflow across several teams.",
        desiredOutcome: "A simple automation blueprint and session agenda.",
        priorAttempts: "We tried a spreadsheet but ownership is unclear.",
        sanitizedLinks: [],
        launchReviewRequired: false,
        state: {
          status: "waiting_for_customer",
          knownFacts: ["The workflow starts with a shared inbox."],
          openQuestions: ["What happens first?"],
        },
      })),
      startDelivery: vi.fn(async () => undefined),
      saveDiscoveryState: vi.fn(async () => undefined),
      saveArtifact: vi.fn(async () => 1),
      holdForReview: vi.fn(async () => undefined),
      transition: vi.fn(async () => undefined),
    };
    const gmail = {
      getThreadMessages: vi.fn(async () => [
        { messageId: "msg_2", text: "A request arrives in the shared inbox." },
      ]),
      createReplyDraft: vi.fn(async () => ({
        draftId: "draft_2",
        messageId: "draft_msg_2",
      })),
      sendDraft: vi.fn(async () => undefined),
    };
    const agent = {
      decide: vi.fn(async () => ({
        kind: "question" as const,
        topic: "handoff",
        message: "Who owns the first handoff after the shared inbox?",
      })),
    };

    const result = await handlePriorityDiscoveryCustomerReply(
      {
        caseId: "case_1",
        workflowId: "workflow_1",
        gmailThreadId: "thread_1",
        messageId: "msg_2",
      },
      { repository, gmail, agent },
    );

    expect(result).toEqual({
      kind: "question",
      waitingForCustomer: true,
      complete: false,
    });
    expect(gmail.createReplyDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_1",
        to: "ada@example.com",
        threadId: "thread_1",
        bodyText: "Who owns the first handoff after the shared inbox?",
      }),
    );
    expect(gmail.sendDraft).toHaveBeenCalledWith("draft_2");
    expect(repository.holdForReview).not.toHaveBeenCalled();
  });

  it("passes durable launch-review requirement into the discovery agent", async () => {
    const repository = {
      getDiscoveryAgentContext: vi.fn(async () => ({
        caseId: "case_1",
        email: "ada@example.com",
        contextType: "professional" as const,
        workshopCategory: "ai_business_operations" as const,
        problem:
          "I need help prioritizing a messy intake workflow across several teams.",
        desiredOutcome: "A simple automation blueprint and session agenda.",
        priorAttempts: "We tried a spreadsheet but ownership is unclear.",
        sanitizedLinks: [],
        launchReviewRequired: true,
        state: {
          status: "waiting_for_customer",
          knownFacts: ["The workflow starts with a shared inbox."],
          openQuestions: [],
        },
      })),
      startDelivery: vi.fn(async () => undefined),
      saveDiscoveryState: vi.fn(async () => undefined),
      saveArtifact: vi.fn(async () => 1),
      holdForReview: vi.fn(async () => undefined),
      transition: vi.fn(async () => undefined),
    };
    const gmail = {
      getThreadMessages: vi.fn(async () => [
        { messageId: "msg_2", text: "Yes, that summary is accurate." },
      ]),
      createReplyDraft: vi.fn(async () => ({
        draftId: "draft_hold",
        messageId: "draft_msg_hold",
      })),
      sendDraft: vi.fn(async () => undefined),
    };
    const agent = {
      decide: vi.fn(async () => ({
        kind: "hold" as const,
        reasons: ["launch_review_required"],
        draft: "This checkpoint needs review.",
      })),
    };

    await handlePriorityDiscoveryCustomerReply(
      {
        caseId: "case_1",
        workflowId: "workflow_1",
        gmailThreadId: "thread_1",
        messageId: "msg_2",
      },
      { repository, gmail, agent },
    );

    expect(agent.decide).toHaveBeenCalledWith(
      expect.objectContaining({ launchReviewRequired: true }),
    );
    expect(repository.holdForReview).toHaveBeenCalledWith(
      "case_1",
      ["launch_review_required"],
      "draft_hold",
    );
  });

  it("marks a sent blueprint as delivered so private quote approval can follow", async () => {
    const repository = {
      getDiscoveryAgentContext: vi.fn(async () => ({
        caseId: "case_1",
        email: "ada@example.com",
        contextType: "professional" as const,
        workshopCategory: "ai_business_operations" as const,
        problem:
          "I need help prioritizing a messy intake workflow across several teams.",
        desiredOutcome: "A simple automation blueprint and session agenda.",
        priorAttempts: "We tried a spreadsheet but ownership is unclear.",
        sanitizedLinks: [],
        launchReviewRequired: false,
        state: {
          status: "waiting_for_customer",
          confirmedUnderstanding: true,
          knownFacts: ["The workflow starts with a shared inbox."],
          openQuestions: [],
        },
      })),
      startDelivery: vi.fn(async () => undefined),
      saveDiscoveryState: vi.fn(async () => undefined),
      saveArtifact: vi.fn(async () => 2),
      holdForReview: vi.fn(async () => undefined),
      transition: vi.fn(async () => undefined),
    };
    const gmail = {
      getThreadMessages: vi.fn(async () => [
        { messageId: "msg_3", text: "Confirmed. Please draft the blueprint." },
      ]),
      createReplyDraft: vi.fn(async () => ({
        draftId: "draft_blueprint",
        messageId: "draft_msg_blueprint",
      })),
      sendDraft: vi.fn(async () => undefined),
    };
    const agent = {
      decide: vi.fn(async () => ({
        kind: "blueprint" as const,
        blueprint: {
          summary: "A practical blueprint for the messy intake workflow.",
          workflow: ["Capture request", "Triage owner", "Schedule next step"],
          automationOpportunities: ["Route routine requests from the inbox"],
          sessionAgenda: ["Confirm boundaries", "Select first automation slice"],
          recommendedSessionLengthMinutes: 90,
        },
      })),
    };

    const result = await handlePriorityDiscoveryCustomerReply(
      {
        caseId: "case_1",
        workflowId: "workflow_1",
        gmailThreadId: "thread_1",
        messageId: "msg_3",
      },
      { repository, gmail, agent },
    );

    expect(result).toEqual({
      kind: "blueprint",
      waitingForCustomer: false,
      complete: true,
    });
    expect(repository.transition).toHaveBeenCalledWith(
      "case_1",
      "discovery_active",
      "blueprint_delivered",
      "blueprint_delivered",
    );
  });

  it("holds risky customer replies as Gmail drafts for review", async () => {
    const repository = {
      getDiscoveryAgentContext: vi.fn(async () => ({
        caseId: "case_1",
        email: "ada@example.com",
        contextType: "professional" as const,
        workshopCategory: "ai_business_operations" as const,
        problem:
          "I need help prioritizing a messy intake workflow across several teams.",
        desiredOutcome: "A simple automation blueprint and session agenda.",
        priorAttempts: "We tried a spreadsheet but ownership is unclear.",
        sanitizedLinks: [],
        launchReviewRequired: false,
        state: { status: "waiting_for_customer" },
      })),
      startDelivery: vi.fn(async () => undefined),
      saveDiscoveryState: vi.fn(async () => undefined),
      saveArtifact: vi.fn(async () => 1),
      holdForReview: vi.fn(async () => undefined),
      transition: vi.fn(async () => undefined),
    };
    const gmail = {
      getThreadMessages: vi.fn(async () => [
        { messageId: "msg_3", text: "Can you use this API token?" },
      ]),
      createReplyDraft: vi.fn(async () => ({
        draftId: "draft_hold",
        messageId: "draft_msg_hold",
      })),
      sendDraft: vi.fn(async () => undefined),
    };
    const agent = {
      decide: vi.fn(async () => ({
        kind: "hold" as const,
        reasons: ["credentials_or_secrets"],
        draft: "This needs personal review.",
      })),
    };

    const result = await handlePriorityDiscoveryCustomerReply(
      {
        caseId: "case_1",
        workflowId: "workflow_1",
        gmailThreadId: "thread_1",
        messageId: "msg_3",
      },
      { repository, gmail, agent },
    );

    expect(result).toEqual({
      kind: "hold",
      waitingForCustomer: false,
      complete: false,
    });
    expect(repository.holdForReview).toHaveBeenCalledWith(
      "case_1",
      ["credentials_or_secrets"],
      "draft_hold",
    );
    expect(gmail.sendDraft).not.toHaveBeenCalled();
  });
});
