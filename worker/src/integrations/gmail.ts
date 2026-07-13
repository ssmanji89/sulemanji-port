export type GmailFetch = typeof fetch;

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sender: string;
  labelId: string;
}

export interface DiscoveryMessageRequest {
  caseId: string;
  to: string;
  subject: string;
  bodyText: string;
}

export interface DraftReplyRequest extends DiscoveryMessageRequest {
  threadId: string;
}

export class AttachmentRejectedError extends Error {
  constructor() {
    super("Gmail message attachments are not accepted for launch intake");
    this.name = "AttachmentRejectedError";
  }
}

export const createGmailClient = (
  config: GmailConfig,
  gmailFetch: GmailFetch = fetch,
) => new GmailClient(config, gmailFetch);

class GmailClient {
  private accessToken: string | null = null;
  private expiresAt = 0;

  constructor(
    private readonly config: GmailConfig,
    private readonly gmailFetch: GmailFetch,
  ) {}

  async createDiscoveryThread(
    request: DiscoveryMessageRequest,
  ): Promise<{ messageId: string; threadId: string }> {
    const response = await this.gmailJson<{ id: string; threadId: string }>(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        body: JSON.stringify({
          raw: encodeMime(this.messageMime(request)),
        }),
      },
    );

    return { messageId: response.id, threadId: response.threadId };
  }

  async listLabeledHistory(
    startHistoryId: string,
  ): Promise<{ messageIds: string[]; historyId: string | null }> {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    url.searchParams.set("startHistoryId", startHistoryId);
    url.searchParams.set("labelId", this.config.labelId);
    url.searchParams.set("historyTypes", "messageAdded");

    const response = await this.gmailJson<{
      history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }>;
      historyId?: string;
    }>(url.toString());

    const messageIds =
      response.history?.flatMap(
        (entry) =>
          entry.messagesAdded
            ?.map((added) => added.message?.id)
            .filter((id): id is string => !!id) ?? [],
      ) ?? [];

    return { messageIds, historyId: response.historyId ?? null };
  }

  async getThreadMessages(
    threadId: string,
  ): Promise<Array<{ messageId: string; text: string }>> {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
    );
    url.searchParams.set("format", "full");

    const response = await this.gmailJson<{
      messages?: Array<{ id: string; payload?: GmailPayload }>;
    }>(url.toString());

    const messages = response.messages ?? [];
    for (const message of messages) {
      if (message.payload && hasAttachment(message.payload)) {
        throw new AttachmentRejectedError();
      }
    }

    return messages.map((message) => ({
      messageId: message.id,
      text: message.payload ? extractText(message.payload) : "",
    }));
  }

  async createReplyDraft(
    request: DraftReplyRequest,
  ): Promise<{ draftId: string; messageId: string }> {
    const response = await this.gmailJson<{
      id: string;
      message?: { id?: string };
    }>("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      body: JSON.stringify({
        message: {
          threadId: request.threadId,
          raw: encodeMime(this.messageMime(request)),
        },
      }),
    });

    return { draftId: response.id, messageId: response.message?.id ?? "" };
  }

  async sendDraft(draftId: string): Promise<void> {
    await this.gmailJson("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
      method: "POST",
      body: JSON.stringify({ id: draftId }),
    });
  }

  async applyCaseLabels(messageId: string): Promise<void> {
    await this.gmailJson(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: "POST",
        body: JSON.stringify({ addLabelIds: [this.config.labelId] }),
      },
    );
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.gmailJson(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
      { method: "DELETE" },
    );
  }

  private async gmailJson<T = unknown>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.token();
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (init.body) headers.set("content-type", "application/json");

    const response = await this.gmailFetch(url, { ...init, headers });
    if (!response.ok) {
      throw new Error(`Gmail request failed: ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json<T>();
  }

  private async token(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }

    const response = await this.gmailFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) throw new Error(`Gmail token refresh failed: ${response.status}`);

    const body = await response.json<{ access_token: string; expires_in?: number }>();
    this.accessToken = body.access_token;
    this.expiresAt = Date.now() + ((body.expires_in ?? 3600) - 60) * 1000;
    return this.accessToken;
  }

  private messageMime(request: DiscoveryMessageRequest): string {
    return [
      `From: ${this.config.sender}`,
      `To: ${request.to}`,
      `Subject: ${request.subject}`,
      `X-Sulemanji-Case: ${request.caseId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      request.bodyText,
    ].join("\r\n");
  }
}

interface GmailPayload {
  filename?: string;
  mimeType?: string;
  body?: { data?: string; attachmentId?: string };
  parts?: GmailPayload[];
}

const hasAttachment = (payload: GmailPayload): boolean =>
  !!payload.filename ||
  !!payload.body?.attachmentId ||
  payload.parts?.some((part) => hasAttachment(part)) === true;

const extractText = (payload: GmailPayload): string => {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeMime(payload.body.data);
  }
  return payload.parts?.map(extractText).join("\n").trim() ?? "";
};

const encodeMime = (value: string): string =>
  btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const decodeMime = (value: string): string => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  return atob(`${padded}${padding}`);
};
