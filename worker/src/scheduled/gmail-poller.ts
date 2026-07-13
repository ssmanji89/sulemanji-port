import type { Env } from "../env";
import { createGmailClient } from "../integrations/gmail";

export interface GmailHistoryClient {
  listLabeledHistory(
    startHistoryId: string,
  ): Promise<{ messageIds: string[]; historyId: string | null }>;
}

export interface GmailPollState {
  getHistoryCursor(): Promise<string>;
  hasProcessedMessage(messageId: string): Promise<boolean>;
  recordProcessedMessage(messageId: string): Promise<void>;
  setHistoryCursor(historyId: string): Promise<void>;
}

export interface GmailWorkflowSink {
  sendEvent(name: "customer-reply", payload: { messageId: string }): Promise<void>;
}

export interface GmailPollDependencies {
  gmail: GmailHistoryClient;
  state: GmailPollState;
  workflow: GmailWorkflowSink;
}

export const pollGmailHistory = async ({
  gmail,
  state,
  workflow,
}: GmailPollDependencies): Promise<void> => {
  const cursor = await state.getHistoryCursor();
  const history = await gmail.listLabeledHistory(cursor);
  const uniqueMessageIds = [...new Set(history.messageIds)];

  for (const messageId of uniqueMessageIds) {
    if (await state.hasProcessedMessage(messageId)) continue;
    await workflow.sendEvent("customer-reply", { messageId });
    await state.recordProcessedMessage(messageId);
  }

  if (history.historyId) {
    await state.setHistoryCursor(history.historyId);
  }
};

export const runGmailPoller = async (env: Env): Promise<void> => {
  const gmail = createGmailClient({
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    sender: env.GMAIL_SENDER,
    labelId: env.GMAIL_CLINIC_LABEL,
  });

  await pollGmailHistory({
    gmail,
    state: new D1GmailPollState(env.DB, env.GMAIL_HISTORY_START_ID),
    workflow: new PriorityDiscoveryWorkflowSink(env, gmail),
  });
};

class D1GmailPollState implements GmailPollState {
  constructor(
    private readonly db: D1Database,
    private readonly initialHistoryId?: string,
  ) {}

  async getHistoryCursor(): Promise<string> {
    const row = await this.db
      .prepare(
        `SELECT value_text
        FROM automation_state
        WHERE state_key = ?`,
      )
      .bind("gmail_history_cursor")
      .first<{ value_text: string }>();

    if (row) return row.value_text;
    if (this.initialHistoryId) {
      await this.setHistoryCursor(this.initialHistoryId);
      return this.initialHistoryId;
    }
    throw new Error("Gmail history cursor is not initialized");
  }

  async hasProcessedMessage(messageId: string): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT 1
        FROM workflow_events
        WHERE workflow_id IN (?, ?) AND event_type IN (?, ?)
        LIMIT 1`,
      )
      .bind(
        `gmail-message-${messageId}`,
        `gmail-message-route-${messageId}`,
        "gmail_message_processed",
        "gmail_message_routed",
      )
      .first();
    return !!row;
  }

  async recordProcessedMessage(messageId: string): Promise<void> {
    const routed = await caseByMessageId(this.db, messageId);
    await this.db
      .prepare(
        `INSERT INTO workflow_events (
          id, case_id, workflow_id, event_type, data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        routed.caseId,
        `gmail-message-${messageId}`,
        "gmail_message_processed",
        JSON.stringify({ messageId }),
        new Date().toISOString(),
      )
      .run();
  }

  async setHistoryCursor(historyId: string): Promise<void> {
    if (!/^\d+$/.test(historyId)) {
      throw new Error("Invalid Gmail history cursor");
    }

    await this.db
      .prepare(
        `INSERT INTO automation_state (state_key, value_text, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(state_key) DO UPDATE SET
          value_text = excluded.value_text,
          updated_at = excluded.updated_at`,
      )
      .bind("gmail_history_cursor", historyId, new Date().toISOString())
      .run();
  }
}

class PriorityDiscoveryWorkflowSink implements GmailWorkflowSink {
  constructor(
    private readonly env: Env,
    private readonly gmail: { getMessageThreadId(messageId: string): Promise<string> },
  ) {}

  async sendEvent(
    name: "customer-reply",
    payload: { messageId: string },
  ): Promise<void> {
    const threadId = await this.gmail.getMessageThreadId(payload.messageId);
    const routed = await workflowByThreadId(this.env.DB, threadId);
    if (!routed.workflowId) {
      throw new Error("Gmail thread is not linked to an active discovery workflow");
    }

    await recordMessageRoute(this.env.DB, {
      caseId: routed.caseId,
      messageId: payload.messageId,
      threadId,
      workflowId: routed.workflowId,
    });

    try {
      const instance = await this.env.PRIORITY_DISCOVERY.get(routed.workflowId);
      await instance.sendEvent({
        type: name,
        payload: {
          messageId: payload.messageId,
          caseId: routed.caseId,
          threadId,
        },
      });
    } catch (error) {
      await deleteMessageRoute(this.env.DB, payload.messageId);
      throw error;
    }
  }
}

const recordMessageRoute = async (
  db: D1Database,
  route: {
    caseId: string;
    messageId: string;
    threadId: string;
    workflowId: string;
  },
): Promise<void> => {
  try {
    await db
      .prepare(
        `INSERT INTO workflow_events (
          id, case_id, workflow_id, event_type, data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        route.caseId,
        `gmail-message-route-${route.messageId}`,
        "gmail_message_routed",
        JSON.stringify({
          messageId: route.messageId,
          threadId: route.threadId,
          workflowId: route.workflowId,
        }),
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
};

const caseByMessageId = async (
  db: D1Database,
  messageId: string,
): Promise<{ caseId: string }> => {
  const row = await db
    .prepare(
      `SELECT case_id
      FROM workflow_events
      WHERE workflow_id = ? AND event_type = ?
      LIMIT 1`,
    )
    .bind(`gmail-message-route-${messageId}`, "gmail_message_routed")
    .first<{ case_id: string }>();
  if (!row) {
    throw new Error("Gmail message route was not recorded");
  }
  return { caseId: row.case_id };
};

const deleteMessageRoute = async (
  db: D1Database,
  messageId: string,
): Promise<void> => {
  await db
    .prepare(
      `DELETE FROM workflow_events
      WHERE workflow_id = ? AND event_type = ?`,
    )
    .bind(`gmail-message-route-${messageId}`, "gmail_message_routed")
    .run();
};

const workflowByThreadId = async (
  db: D1Database,
  threadId: string,
): Promise<{ caseId: string; workflowId: string | null }> => {
  const row = await db
    .prepare(
      `SELECT gmail_threads.case_id, discovery_state.workflow_id
      FROM gmail_threads
      LEFT JOIN discovery_state
        ON discovery_state.case_id = gmail_threads.case_id
      WHERE gmail_threads.gmail_thread_id = ?
      LIMIT 1`,
    )
    .bind(threadId)
    .first<{ case_id: string; workflow_id: string | null }>();

  if (!row) {
    throw new Error("Gmail thread is not linked to a discovery case");
  }
  return { caseId: row.case_id, workflowId: row.workflow_id };
};

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Error &&
  /unique constraint|constraint failed/i.test(error.message);
