import { describe, expect, it } from "vitest";
import { ConversationNoteContract } from "@core/contracts";

describe("ConversationNoteContract", () => {
  it("normalizes a valid persisted note", () => {
    const note = ConversationNoteContract.entitySchema.parse({
      id: 12,
      conversation_id: 42,
      author_id: "33333333-3333-4333-8333-333333333333",
      content: "Private context",
      created_at: "2026-09-12T15:00:00.000Z",
    });

    expect(note.id).toBe("12");
    expect(note.conversation_id).toBe("42");
    expect(note.created_at).toBeInstanceOf(Date);
  });

  it("trims note content and rejects empty notes", () => {
    expect(ConversationNoteContract.createRequestSchema.parse({
      conversation_id: "42",
      content: "  Keep this private  ",
    }).content).toBe("Keep this private");

    expect(() => ConversationNoteContract.createRequestSchema.parse({
      conversation_id: "42",
      content: "   ",
    })).toThrow();
  });
});
