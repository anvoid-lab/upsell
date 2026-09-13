import { describe, expect, it } from "vitest";
import { MessageContract } from "../../core/contracts/message.contract";

const base = {
  id: "msg-1",
  conversation_id: "conv-1",
  content: "olá",
  direction: "in" as const,
  read: true,
};

describe("MessageContract.entitySchema", () => {
  it("coerces an ISO string timestamp to a Date", () => {
    const result = MessageContract.entitySchema.parse({
      ...base,
      timestamp: "2026-08-14T16:21:12.735Z",
    });
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp.toISOString()).toBe("2026-08-14T16:21:12.735Z");
  });

  it("passes a Date instance through unchanged", () => {
    const date = new Date();
    const result = MessageContract.entitySchema.parse({ ...base, timestamp: date });
    expect(result.timestamp).toEqual(date);
  });

  it("rejects a display-formatted string — the exact shape migration 002 replaced", () => {
    const result = MessageContract.entitySchema.safeParse({ ...base, timestamp: "23:24" });
    expect(result.success).toBe(false);
  });

  it("accepts persisted outbound delivery state", () => {
    const result = MessageContract.entitySchema.parse({
      ...base,
      direction: "out",
      timestamp: new Date(),
      client_message_id: "22222222-2222-4222-8222-222222222222",
      delivery_status: "failed",
      delivery_error: "Instagram rate limit reached.",
      delivery_updated_at: "2026-09-12T15:00:00Z",
    });
    expect(result.delivery_status).toBe("failed");
    expect(result.delivery_updated_at).toBeInstanceOf(Date);
  });

  it("rejects an invalid client id for a send request", () => {
    const result = MessageContract.sendRequestSchema.safeParse({
      conversation_id: "42",
      content: "Hello",
      client_message_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a media-only send request", () => {
    const result = MessageContract.sendRequestSchema.safeParse({
      conversation_id: "42",
      content: "",
      client_message_id: "22222222-2222-4222-8222-222222222222",
      attachment_count: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a message without text or attachments", () => {
    const result = MessageContract.sendRequestSchema.safeParse({
      conversation_id: "42",
      content: "",
      client_message_id: "22222222-2222-4222-8222-222222222222",
      attachment_count: 0,
    });
    expect(result.success).toBe(false);
  });
});
