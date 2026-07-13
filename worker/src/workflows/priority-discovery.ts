import type { DiscoveryState } from "../repositories/cases";
import type {
  AgentDecision,
  AgentInput,
  AgentProvider,
} from "../agent/contracts";
import type { ArtifactType, DiscoveryAgentContext } from "../repositories/cases";

export interface PriorityDiscoveryCase {
  caseId: string;
  workflowId: string;
  email: string;
  name: string;
}

export interface PriorityDiscoveryRepository {
  startDelivery(
    caseId: string,
    gmailThreadId: string,
    workflowId: string,
  ): Promise<void>;
  saveDiscoveryState(caseId: string, state: DiscoveryState): Promise<void>;
}

export interface PriorityDiscoveryReplyRepository
  extends PriorityDiscoveryRepository {
  getDiscoveryAgentContext(
    caseId: string,
  ): Promise<DiscoveryAgentContext | null>;
  saveArtifact(caseId: string, type: ArtifactType, body: unknown): Promise<number>;
  holdForReview(caseId: string, reasons: string[], draftId: string): Promise<void>;
  transition?(
    id: string,
    expected: string,
    next: string,
    event: string,
  ): Promise<void>;
}

export interface PriorityDiscoveryGmail {
  createDiscoveryThread(input: {
    caseId: string;
    to: string;
    subject: string;
    bodyText: string;
  }): Promise<{ draftId: string; messageId: string; threadId: string }>;
}

export interface PriorityDiscoveryReplyGmail {
  getThreadMessages(
    threadId: string,
  ): Promise<Array<{ messageId: string; text: string }>>;
  createReplyDraft(input: {
    caseId: string;
    to: string;
    subject: string;
    bodyText: string;
    threadId: string;
  }): Promise<{ draftId: string; messageId: string }>;
  sendDraft(draftId: string): Promise<void>;
}

export interface PriorityDiscoveryDependencies {
  repository: PriorityDiscoveryRepository;
  gmail: PriorityDiscoveryGmail;
}

export interface PriorityDiscoveryDraft {
  draftId: string;
  messageId: string;
  threadId: string;
}

export interface PriorityDiscoveryReplyEvent {
  caseId: string;
  workflowId: string;
  gmailThreadId: string;
  messageId: string;
}

export interface PriorityDiscoveryReplyDependencies {
  repository: PriorityDiscoveryReplyRepository;
  gmail: PriorityDiscoveryReplyGmail;
  agent: AgentProvider;
}

export interface PriorityDiscoveryReplyResult {
  kind: AgentDecision["kind"];
  waitingForCustomer: boolean;
  complete: boolean;
}

export const startPriorityDiscoveryDelivery = async (
  discoveryCase: PriorityDiscoveryCase,
  dependencies: PriorityDiscoveryDependencies,
): Promise<{ draftId: string; threadId: string; heldForReview: boolean }> => {
  const draft = await dependencies.gmail.createDiscoveryThread({
    caseId: discoveryCase.caseId,
    to: discoveryCase.email,
    subject: "AI Workflow Discovery",
    bodyText: `Hi ${discoveryCase.name},\n\nI am starting your AI workflow discovery thread. What is the first manual step that happens after this messy work enters your queue?`,
  });

  return persistPriorityDiscoveryDelivery(
    discoveryCase,
    draft,
    dependencies.repository,
  );
};

export const persistPriorityDiscoveryDelivery = async (
  discoveryCase: PriorityDiscoveryCase,
  draft: PriorityDiscoveryDraft,
  repository: PriorityDiscoveryRepository,
): Promise<{ draftId: string; threadId: string; heldForReview: boolean }> => {
  await repository.startDelivery(
    discoveryCase.caseId,
    draft.threadId,
    discoveryCase.workflowId,
  );

  await repository.saveDiscoveryState(discoveryCase.caseId, {
    status: "delivery_draft_ready",
    workflowId: discoveryCase.workflowId,
    gmailThreadId: draft.threadId,
    mandatoryReview: {
      held: true,
      reasons: ["launch_review_required"],
      draftId: draft.draftId,
      heldAt: new Date().toISOString(),
    },
  });

  return {
    draftId: draft.draftId,
    threadId: draft.threadId,
    heldForReview: true,
  };
};

export const handlePriorityDiscoveryCustomerReply = async (
  event: PriorityDiscoveryReplyEvent,
  dependencies: PriorityDiscoveryReplyDependencies,
): Promise<PriorityDiscoveryReplyResult> => {
  const context = await dependencies.repository.getDiscoveryAgentContext(
    event.caseId,
  );
  if (!context) {
    throw new Error("Priority discovery context not found");
  }

  await safeTransition(
    dependencies.repository,
    event.caseId,
    "waiting_for_customer",
    "discovery_active",
    "customer_replied",
  );

  const messages = await dependencies.gmail.getThreadMessages(event.gmailThreadId);
  const latestMessage =
    messages.find((message) => message.messageId === event.messageId)?.text ??
    messages.at(-1)?.text ??
    "";
  const knownFacts = stringArrayFromState(context.state, "knownFacts");
  const openQuestions = stringArrayFromState(context.state, "openQuestions");

  const decision = await dependencies.agent.decide({
    caseId: event.caseId,
    launchReviewRequired: context.launchReviewRequired,
    confirmedUnderstanding: context.state?.confirmedUnderstanding === true,
    intake: {
      contextType: context.contextType,
      problem: context.problem,
      desiredOutcome: context.desiredOutcome,
      priorAttempts: context.priorAttempts,
      sanitizedLinks: context.sanitizedLinks,
    },
    state: { knownFacts, openQuestions },
    latestMessage,
  } satisfies AgentInput);

  return applyAgentDecision(event, context, decision, dependencies);
};

const applyAgentDecision = async (
  event: PriorityDiscoveryReplyEvent,
  context: DiscoveryAgentContext,
  decision: AgentDecision,
  dependencies: PriorityDiscoveryReplyDependencies,
): Promise<PriorityDiscoveryReplyResult> => {
  if (decision.kind === "hold") {
    const draft = await dependencies.gmail.createReplyDraft({
      caseId: event.caseId,
      to: context.email,
      subject: "Re: AI Workflow Discovery",
      bodyText: decision.draft ?? "This reply needs personal review before sending.",
      threadId: event.gmailThreadId,
    });
    await dependencies.repository.holdForReview(
      event.caseId,
      decision.reasons,
      draft.draftId,
    );
    return { kind: "hold", waitingForCustomer: false, complete: false };
  }

  if (decision.kind === "question") {
    await sendRoutineReply(event, context.email, decision.message, dependencies);
    await dependencies.repository.saveDiscoveryState(event.caseId, {
      status: "waiting_for_customer",
      workflowId: event.workflowId,
      gmailThreadId: event.gmailThreadId,
      knownFacts: stringArrayFromState(context.state, "knownFacts"),
      openQuestions: [decision.message],
      mandatoryReview: { held: false, reasons: [] },
    });
    await safeTransition(
      dependencies.repository,
      event.caseId,
      "discovery_active",
      "waiting_for_customer",
      "agent_question_sent",
    );
    return { kind: "question", waitingForCustomer: true, complete: false };
  }

  if (decision.kind === "checkpoint") {
    await dependencies.repository.saveArtifact(
      event.caseId,
      "checkpoint",
      decision.summary,
    );
    await sendRoutineReply(
      event,
      context.email,
      checkpointMessage(decision),
      dependencies,
    );
    await dependencies.repository.saveDiscoveryState(event.caseId, {
      status: "waiting_for_customer",
      workflowId: event.workflowId,
      gmailThreadId: event.gmailThreadId,
      knownFacts: decision.summary.knownFacts,
      openQuestions: decision.summary.openQuestions,
      confirmedUnderstanding: false,
      mandatoryReview: { held: false, reasons: [] },
    });
    await safeTransition(
      dependencies.repository,
      event.caseId,
      "discovery_active",
      "waiting_for_customer",
      "understanding_checkpoint_sent",
    );
    return { kind: "checkpoint", waitingForCustomer: true, complete: false };
  }

  await dependencies.repository.saveArtifact(
    event.caseId,
    "blueprint",
    decision.blueprint,
  );
  await sendRoutineReply(
    event,
    context.email,
    blueprintMessage(decision),
    dependencies,
  );
  await dependencies.repository.saveDiscoveryState(event.caseId, {
    status: "blueprint_delivered",
    workflowId: event.workflowId,
    gmailThreadId: event.gmailThreadId,
    mandatoryReview: { held: false, reasons: [] },
  });
  await safeTransition(
    dependencies.repository,
    event.caseId,
    "discovery_active",
    "blueprint_delivered",
    "blueprint_delivered",
  );
  return { kind: "blueprint", waitingForCustomer: false, complete: true };
};

const sendRoutineReply = async (
  event: PriorityDiscoveryReplyEvent,
  to: string,
  bodyText: string,
  dependencies: PriorityDiscoveryReplyDependencies,
): Promise<void> => {
  const draft = await dependencies.gmail.createReplyDraft({
    caseId: event.caseId,
    to,
    subject: "Re: AI Workflow Discovery",
    bodyText,
    threadId: event.gmailThreadId,
  });
  await dependencies.gmail.sendDraft(draft.draftId);
};

const checkpointMessage = (
  decision: Extract<AgentDecision, { kind: "checkpoint" }>,
): string =>
  [
    decision.summary.summary,
    "",
    "Known facts:",
    ...decision.summary.knownFacts.map((fact) => `- ${fact}`),
    "",
    "Open questions:",
    ...decision.summary.openQuestions.map((question) => `- ${question}`),
    "",
    "Does this accurately reflect the problem before I turn it into a blueprint?",
  ].join("\n");

const blueprintMessage = (
  decision: Extract<AgentDecision, { kind: "blueprint" }>,
): string =>
  [
    decision.blueprint.summary,
    "",
    "Workflow:",
    ...decision.blueprint.workflow.map((step) => `- ${step}`),
    "",
    "Automation opportunities:",
    ...decision.blueprint.automationOpportunities.map((item) => `- ${item}`),
    "",
    "Session agenda:",
    ...decision.blueprint.sessionAgenda.map((item) => `- ${item}`),
    "",
    `Recommended session length: ${decision.blueprint.recommendedSessionLengthMinutes} minutes`,
  ].join("\n");

const stringArrayFromState = (
  state: DiscoveryState | null,
  key: string,
): string[] => {
  const value = state?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

const safeTransition = async (
  repository: PriorityDiscoveryReplyRepository,
  caseId: string,
  expected: string,
  next: string,
  event: string,
): Promise<void> => {
  try {
    await repository.transition?.(caseId, expected, next, event);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Case transition failed")) {
      throw error;
    }
  }
};
