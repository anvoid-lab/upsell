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
});
