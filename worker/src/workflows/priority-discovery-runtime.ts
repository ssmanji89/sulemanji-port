import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Env } from "../env";
import { createGmailClient } from "../integrations/gmail";
import { createOpenAIAgentProvider } from "../integrations/openai";
import { D1CaseRepository } from "../repositories/cases";
import {
  handlePriorityDiscoveryCustomerReply,
  persistPriorityDiscoveryDelivery,
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

      const result = await step.do(`handle-customer-reply-${turn}`, async () =>
        handlePriorityDiscoveryCustomerReply(
          {
            caseId: reply.payload.caseId,
            workflowId: event.instanceId,
            gmailThreadId: reply.payload.threadId,
            messageId: reply.payload.messageId,
          },
          {
            repository,
            gmail: createGmailClient({
              clientId: this.env.GMAIL_CLIENT_ID,
              clientSecret: this.env.GMAIL_CLIENT_SECRET,
              refreshToken: this.env.GMAIL_REFRESH_TOKEN,
              sender: this.env.GMAIL_SENDER,
              labelId: this.env.GMAIL_CLINIC_LABEL,
            }),
            agent: createOpenAIAgentProvider({
              apiKey: this.env.OPENAI_API_KEY,
              model: this.env.AGENT_MODEL,
            }),
          },
        ),
      );

      if (result.complete || !result.waitingForCustomer) {
        break;
      }
    }
  }
}
