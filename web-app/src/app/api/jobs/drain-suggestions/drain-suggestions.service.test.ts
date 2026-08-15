import { beforeEach, describe, expect, it, vi } from "vitest";

const { drainMock, generateMock } = vi.hoisted(() => ({
  drainMock: vi.fn(),
  generateMock: vi.fn(),
}));

vi.mock("@core/queue/suggestion-queue", () => ({
  drainDueSuggestionJobs: drainMock,
}));

vi.mock("@/app/(app)/inbox/reply-suggestion.service", () => ({
  replySuggestionService: { generate: generateMock },
}));

vi.mock("@db/client", () => ({
  createSupabaseServiceClient: vi.fn(() => ({})),
}));

const { drainSuggestionsService } = await import("./drain-suggestions.service");

// Só o que a checagem de presença precisa: .from("conversations").select().eq().maybeSingle().
function clientWithLastViewedAt(byConversationId: Record<string, string | null>) {
  return async () =>
    ({
      from: () => ({
        select: () => ({
          eq: (_column: string, id: string) => ({
            maybeSingle: async () => ({
              data: { last_viewed_at: byConversationId[id] ?? null },
              error: null,
            }),
          }),
        }),
      }),
    }) as never;
}

describe("DrainSuggestionsService.run", () => {
  beforeEach(() => {
    drainMock.mockReset();
    generateMock.mockReset();
  });

  it("generates for a conversation viewed recently", async () => {
    drainMock.mockResolvedValue([{ conversationId: "42", businessId: "biz-1" }]);
    generateMock.mockResolvedValue(null);
    const fresh = new Date().toISOString();

    const result = await drainSuggestionsService.run(clientWithLastViewedAt({ "42": fresh }));

    expect(generateMock).toHaveBeenCalledWith(
      "biz-1",
      "42",
      expect.objectContaining({ force: true }),
    );
    expect(result).toEqual({ processed: 1, generated: 1, skipped: 0 });
  });

  it("skips a conversation nobody has viewed in the last 60s", async () => {
    drainMock.mockResolvedValue([{ conversationId: "42", businessId: "biz-1" }]);
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();

    const result = await drainSuggestionsService.run(clientWithLastViewedAt({ "42": stale }));

    expect(generateMock).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, generated: 0, skipped: 1 });
  });

  it("skips a conversation with no presence recorded at all", async () => {
    drainMock.mockResolvedValue([{ conversationId: "42", businessId: "biz-1" }]);

    const result = await drainSuggestionsService.run(clientWithLastViewedAt({}));

    expect(generateMock).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, generated: 0, skipped: 1 });
  });

  it("isolates a failing job — the rest of the batch still runs", async () => {
    drainMock.mockResolvedValue([
      { conversationId: "42", businessId: "biz-1" },
      { conversationId: "43", businessId: "biz-1" },
    ]);
    const fresh = new Date().toISOString();
    generateMock
      .mockRejectedValueOnce(new Error("inference is down"))
      .mockResolvedValueOnce(null);

    const result = await drainSuggestionsService.run(
      clientWithLastViewedAt({ "42": fresh, "43": fresh }),
    );

    expect(result).toEqual({ processed: 2, generated: 1, skipped: 1 });
  });

  it("returns all-zero when nothing is due", async () => {
    drainMock.mockResolvedValue([]);

    const result = await drainSuggestionsService.run(clientWithLastViewedAt({}));

    expect(result).toEqual({ processed: 0, generated: 0, skipped: 0 });
  });
});
