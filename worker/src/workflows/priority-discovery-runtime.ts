import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Env } from "../env";
import { AgentDecision, type AgentDecision as AgentDecisionPayload } from "../agent/contracts";
import { createGmailClient } from "../integrations/gmail";
import { createOpenAIAgentProvider } from "../integrations/openai";
import { D1CaseRepository } from "../repositories/cases";
import {
  applyPriorityDiscoveryAgentDecision,
  handlePriorityDiscoveryCustomerReply,
  persistPriorityDiscoveryDelivery,
  preparePriorityDiscoveryAgentTurn,
  type PriorityDiscoveryDraft,
} from "./priority-discovery";

export class PriorityDiscoveryWorkflow extends WorkflowEntrypoint<
  Env,
  { caseId: string }
> {
  async run(
    event: Readonly<WorkflowEvent<{ caseId: string }>>,
    step: WorkflowStep,
  ): Promise<void> {
    const repository = new D1CaseRepository(this.env.DB);
    const discoveryCase = await repository.getPriorityDiscoveryCase(
      event.payload.caseId,
    );
    if (!discoveryCase) {
      throw new Error("Priority discovery case is not ready to start");
    }

    const draft = await step.do(
      "create-reviewed-gmail-discovery-draft",
      async (): Promise<PriorityDiscoveryDraft> =>
        createGmailClient({
          clientId: this.env.GMAIL_CLIENT_ID,
          clientSecret: this.env.GMAIL_CLIENT_SECRET,
          refreshToken: this.env.GMAIL_REFRESH_TOKEN,
          sender: this.env.GMAIL_SENDER,
          labelId: this.env.GMAIL_CLINIC_LABEL,
        }).createDiscoveryThread({
          caseId: discoveryCase.caseId,
          to: discoveryCase.email,
          subject: "AI Workflow Discovery",
          bodyText: `Hi ${discoveryCase.name},\n\nI am starting your AI workflow discovery thread. What is the first manual step that happens after this messy work enters your queue?`,
        }),
    );

    await step.do("persist-reviewed-gmail-discovery-draft", async () => {
      await persistPriorityDiscoveryDelivery(
        {
          ...discoveryCase,
          workflowId: event.instanceId,
        },
        draft,
        repository,
      );

      if (discoveryCase.status === "paid_pending_start") {
        await repository.transition(
          discoveryCase.caseId,
          "paid_pending_start",
          "discovery_active",
          "priority_discovery_delivery_started",
        );
      }
    });

    for (let turn = 1; turn <= 20; turn += 1) {
      const reply = await step.waitForEvent<{
        caseId: string;
        messageId: string;
        threadId: string;
      }>(`wait-for-customer-reply-${turn}`, {
        type: "customer-reply",
        timeout: "30 days",
      });

      const replyEvent = {
        caseId: reply.payload.caseId,
        workflowId: event.instanceId,
        gmailThreadId: reply.payload.threadId,
        messageId: reply.payload.messageId,
      };
      const gmail = createGmailClient({
        clientId: this.env.GMAIL_CLIENT_ID,
        clientSecret: this.env.GMAIL_CLIENT_SECRET,
        refreshToken: this.env.GMAIL_REFRESH_TOKEN,
        sender: this.env.GMAIL_SENDER,
        labelId: this.env.GMAIL_CLINIC_LABEL,
      });

      const result =
        this.env.AGENT_EXECUTION_MODE === "local_queue"
          ? await handleLocalQueuedAgentTurn(
              replyEvent,
              repository,
              gmail,
              step,
              turn,
            )
          : await step.do(`handle-customer-reply-${turn}`, async () =>
              handlePriorityDiscoveryCustomerReply(replyEvent, {
                repository,
                gmail,
                agent: createOpenAIAgentProvider({
                  apiKey: this.env.OPENAI_API_KEY,
                  model: this.env.AGENT_MODEL,
                }),
              }),
            );

      if (result.complete || !result.waitingForCustomer) {
        break;
      }
    }
  }
}

const handleLocalQueuedAgentTurn = async (
  replyEvent: {
    caseId: string;
    workflowId: string;
    gmailThreadId: string;
    messageId: string;
  },
  repository: D1CaseRepository,
  gmail: ReturnType<typeof createGmailClient>,
  step: WorkflowStep,
  turn: number,
) => {
  const queued = await step.do(`prepare-local-agent-job-${turn}`, async () => {
    const prepared = await preparePriorityDiscoveryAgentTurn(replyEvent, {
      repository,
      gmail,
    });
    const job = await repository.enqueueAgentDecisionJob({
      caseId: replyEvent.caseId,
      workflowId: replyEvent.workflowId,
      sourceMessageId: replyEvent.messageId,
      input: prepared.agentInput,
    });

    return {
      caseId: replyEvent.caseId,
      messageId: replyEvent.messageId,
      jobId: job.id,
    };
  });

  const completed = await step.waitForEvent<{
    caseId: string;
    messageId: string;
    jobId: string;
    decision: AgentDecisionPayload;
  }>(`wait-for-local-agent-decision-${turn}`, {
    type: "agent-decision",
    timeout: "30 days",
  });

  if (
    completed.payload.caseId !== replyEvent.caseId ||
    completed.payload.messageId !== replyEvent.messageId ||
    completed.payload.jobId !== queued.jobId
  ) {
    throw new Error("Local agent decision did not match the active discovery turn");
  }

  return step.do(`apply-local-agent-decision-${turn}`, async () => {
    const context = await repository.getDiscoveryAgentContext(replyEvent.caseId);
    if (!context) {
      throw new Error("Priority discovery context not found");
    }

    return applyPriorityDiscoveryAgentDecision(
      replyEvent,
      context,
      AgentDecision.parse(completed.payload.decision),
      {
        repository,
        gmail,
      },
    );
  });
};
