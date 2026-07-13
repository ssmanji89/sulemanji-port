import { describe, expect, it } from "vitest";
import {
  AttachmentRejectedError,
  createGmailClient,
  decodeMime,
  type GmailFetch,
} from "../src/integrations/gmail";

const config = {
  clientId: "gmail-client",
  clientSecret: "gmail-secret",
  refreshToken: "gmail-refresh",
  sender: "ssmanji89@gmail.com",
  labelId: "Label_Clinic",
};

describe("Gmail adapter", () => {
  it("refreshes OAuth and creates deterministic discovery messages with case headers", async () => {
    const transport = new RecordingGmailFetch([
      jsonResponse({ access_token: "access_1", expires_in: 3600 }),
      jsonResponse({ id: "msg_1", threadId: "thread_1" }),
    ]);
    const gmail = createGmailClient(config, transport.fetch);

    const result = await gmail.createDiscoveryThread({
      caseId: "case_123",
      to: "ada@example.com",
      subject: "AI Workflow Discovery",
      bodyText: "Let's start with one focused question.",
    });

    expect(result).toEqual({ messageId: "msg_1", threadId: "thread_1" });
    expect(transport.requests[0]?.url).toBe(
      "https://oauth2.googleapis.com/token",
    );
    expect(transport.requests[1]?.url).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    expect(transport.requests[1]?.authorization).toBe("Bearer access_1");

    const raw = JSON.parse(String(transport.requests[1]?.body)).raw;
    expect(decodeMime(raw)).toContain("X-Sulemanji-Case: case_123");
    expect(decodeMime(raw)).toContain("From: ssmanji89@gmail.com");
    expect(decodeMime(raw)).toContain("To: ada@example.com");
  });

  it("lists only dedicated label history instead of scanning the mailbox", async () => {
    const transport = new RecordingGmailFetch([
      jsonResponse({ access_token: "access_1", expires_in: 3600 }),
      jsonResponse({
        history: [{ messagesAdded: [{ message: { id: "msg_2" } }] }],
        historyId: "98",
      }),
    ]);
    const gmail = createGmailClient(config, transport.fetch);

    const history = await gmail.listLabeledHistory("42");

    expect(history).toEqual({ messageIds: ["msg_2"], historyId: "98" });
    const historyUrl = new URL(String(transport.requests[1]?.url));
    expect(historyUrl.pathname).toBe("/gmail/v1/users/me/history");
    expect(historyUrl.searchParams.get("labelId")).toBe("Label_Clinic");
    expect(historyUrl.searchParams.get("startHistoryId")).toBe("42");
    expect(historyUrl.searchParams.get("historyTypes")).toBe("messageAdded");
  });

  it("creates reply drafts with the existing thread id and does not send them", async () => {
    const transport = new RecordingGmailFetch([
      jsonResponse({ access_token: "access_1", expires_in: 3600 }),
      jsonResponse({ id: "draft_1", message: { id: "msg_draft" } }),
    ]);
    const gmail = createGmailClient(config, transport.fetch);

    const draft = await gmail.createReplyDraft({
      caseId: "case_123",
      threadId: "thread_1",
      to: "ada@example.com",
      subject: "Re: AI Workflow Discovery",
      bodyText: "Here is the next single question.",
    });

    expect(draft).toEqual({ draftId: "draft_1", messageId: "msg_draft" });
    expect(transport.requests[1]?.url).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    );
    const requestBody = JSON.parse(String(transport.requests[1]?.body));
    expect(requestBody.message.threadId).toBe("thread_1");
  });

  it("rejects attachments before decoding message bodies", async () => {
    const transport = new RecordingGmailFetch([
      jsonResponse({ access_token: "access_1", expires_in: 3600 }),
      jsonResponse({
        id: "thread_1",
        messages: [
          {
            id: "msg_with_attachment",
            payload: {
              parts: [
                {
                  filename: "private.pdf",
                  mimeType: "application/pdf",
                  body: { attachmentId: "att_1" },
                },
                {
                  mimeType: "text/plain",
                  body: { data: "%%%not-valid-base64%%%" },
                },
              ],
            },
          },
        ],
      }),
    ]);
    const gmail = createGmailClient(config, transport.fetch);

    await expect(gmail.getThreadMessages("thread_1")).rejects.toBeInstanceOf(
      AttachmentRejectedError,
    );
  });

  it("applies case labels, sends approved drafts, and can delete a case thread", async () => {
    const transport = new RecordingGmailFetch([
      jsonResponse({ access_token: "access_1", expires_in: 3600 }),
      jsonResponse({ id: "msg_1" }),
      jsonResponse({ id: "draft_1" }),
      new Response(null, { status: 204 }),
    ]);
    const gmail = createGmailClient(config, transport.fetch);

    await gmail.applyCaseLabels("msg_1");
    await gmail.sendDraft("draft_1");
    await gmail.deleteThread("thread_1");

    expect(transport.requests.map((request) => request.url).slice(1)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/msg_1/modify",
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts/send",
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread_1",
    ]);
  });
});

class RecordingGmailFetch {
  readonly requests: Array<{
    url: string;
    method: string;
    authorization: string | null;
    body: BodyInit | null | undefined;
  }> = [];
  private cursor = 0;

  constructor(private readonly responses: Response[]) {}

  fetch: GmailFetch = async (input, init = {}) => {
    this.requests.push({
      url: String(input),
      method: init.method ?? "GET",
      authorization: new Headers(init.headers).get("authorization"),
      body: init.body,
    });
    const response = this.responses[this.cursor];
    this.cursor += 1;
    if (!response) throw new Error("Unexpected Gmail request");
    return response;
  };
}

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
