import { describe, expect, it, vi, beforeEach } from "vitest";

const { getCurrentUserMock, generateMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  generateMock: vi.fn(),
}));

vi.mock("../current-user.service", () => ({
  currentUserService: { fetchCurrentUser: getCurrentUserMock },
}));

vi.mock("@core/ai", () => ({
  generate: generateMock,
}));

type TableResult = {
  // Resolves `await query` — used by findAll's `.is().eq().order()` chain.
  selectResult?: { data: unknown[]; error: unknown };
  // Resolves `.insert(...).select().single()` — used by create().
  singleResult?: { data: unknown; error: unknown };
};

// Columns passed to .order(), per table.
let orderings: Record<string, string[]> = {};

// Payloads passed to .insert(), per table — lets a test assert on what was
// actually written, not just that a write happened.
let inserts: Record<string, unknown[]> = {};

// inbox-chat-panel.service.ts imports createSupabaseServerClient, which calls
// next/headers cookies() — unavailable outside a request. Mocked out the same
// way current-user.service.test.ts does it. Builds a chainable fake query
// builder per table so both findAll() (thenable chain) and create()
// (.insert().select().single()) resolve to whatever each test configures.
function mockSupabaseFrom(tables: Record<string, TableResult>) {
  return vi.fn((table: string) => {
    const cfg = tables[table] ?? {};
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = chain;
    builder.is = chain;
    builder.eq = chain;
    builder.order = (column: string) => {
      (orderings[table] ??= []).push(column);
      return builder;
    };
    builder.insert = (payload: unknown) => {
      (inserts[table] ??= []).push(payload);
      return builder;
    };
    builder.single = () =>
      Promise.resolve(cfg.singleResult ?? { data: null, error: null });
    builder.then = (
      resolve: (value: { data: unknown[]; error: unknown }) => void,
      reject: (reason: unknown) => void,
    ) => Promise.resolve(cfg.selectResult ?? { data: [], error: null }).then(resolve, reject);
    return builder;
  });
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@db/client", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: fromMock })),
}));

const { inboxChatPanelService } = await import("./inbox-chat-panel.service");

const CANDIDATE = { message: "Olá!", technique: "urgency" as const, rationale: "porque sim" };

function mockGeneratedCandidate() {
  generateMock.mockResolvedValue({
    data: { candidates: [CANDIDATE] },
    usage: null,
    latencyMs: 5,
  });
}

describe("InboxChatPanelService.fetchAISuggestion", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    generateMock.mockReset();
    fromMock.mockReset();
    inserts = {};
    orderings = {};
    getCurrentUserMock.mockResolvedValue({ business_id: "biz-1" });
  });

  it("returns null without calling generate() when there is no authenticated business", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    fromMock.mockImplementation(mockSupabaseFrom({}));

    const result = await inboxChatPanelService.fetchAISuggestion("42");

    expect(result).toBeNull();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("generates and writes an audit row when no suggestion exists yet", async () => {
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [], error: null }, // sem cache
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T10:00:00Z" },
            error: null,
          },
        },
        messages: { selectResult: { data: [], error: null } },
      }),
    );
    mockGeneratedCandidate();

    const result = await inboxChatPanelService.fetchAISuggestion("42");

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: "reply_suggestion", businessId: "biz-1", conversationId: "42" }),
    );
    expect(result).toMatchObject({ conversation_id: "42", message: "Olá!", type: "urgency" });
  });

  it("records usage through the caller-supplied usageSink on a fresh generation", async () => {
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [], error: null },
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T10:00:00Z" },
            error: null,
          },
        },
        messages: { selectResult: { data: [], error: null } },
      }),
    );
    generateMock.mockImplementation(async (options) => {
      await options.usageSink({
        business_id: "biz-1",
        conversation_id: "42",
        method: "reply_suggestion",
        model: "mock",
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: 5,
        status: "success",
        error_message: null,
      });
      return { data: { candidates: [CANDIDATE] }, usage: { model: "mock" }, latencyMs: 5 };
    });

    await inboxChatPanelService.fetchAISuggestion("42");

    const tables = fromMock.mock.calls.map(([table]) => table);
    expect(tables).toEqual(expect.arrayContaining(["ai_suggestions", "ai_usage"]));
  });

  it("reuses the cached suggestion when it was generated for the latest customer message", async () => {
    const cached = {
      conversation_id: "42",
      message: "Sugestão antiga",
      type: "upsell",
      rationale: "já gerada",
      source_message_id: "7",
      created_at: "2026-08-14T12:00:00Z",
    };
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: { selectResult: { data: [cached], error: null } },
        // Same message the cached suggestion points at — nothing new to answer.
        messages: { selectResult: { data: [{ id: 7 }], error: null } },
      }),
    );

    const result = await inboxChatPanelService.fetchAISuggestion("42");

    expect(generateMock).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it("reuses across ids of different types — the link is compared as a string", async () => {
    const cached = {
      conversation_id: "42",
      message: "Sugestão antiga",
      type: "upsell",
      rationale: "já gerada",
      // PostgREST may hand back bigint as a number or a string depending on
      // the driver; the comparison must not care which.
      source_message_id: 7,
      created_at: "2026-08-14T12:00:00Z",
    };
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: { selectResult: { data: [cached], error: null } },
        messages: { selectResult: { data: [{ id: "7" }], error: null } },
      }),
    );

    await inboxChatPanelService.fetchAISuggestion("42");

    expect(generateMock).not.toHaveBeenCalled();
  });

  it("regenerates when the customer has sent a newer message than the cached suggestion answers", async () => {
    const cached = {
      conversation_id: "42",
      message: "Sugestão antiga",
      type: "upsell",
      rationale: "já gerada",
      source_message_id: "7",
      created_at: "2026-08-14T10:00:00Z",
    };
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [cached], error: null },
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T13:00:00Z" },
            error: null,
          },
        },
        // A newer inbound message the cached suggestion never saw.
        messages: { selectResult: { data: [{ id: 9 }], error: null } },
      }),
    );
    mockGeneratedCandidate();

    const result = await inboxChatPanelService.fetchAISuggestion("42");

    expect(generateMock).toHaveBeenCalled();
    expect(result).toMatchObject({ message: "Olá!", type: "urgency" });
  });

  it("regenerates once for a legacy suggestion that predates the source-message link", async () => {
    const legacy = {
      conversation_id: "42",
      message: "Sugestão antiga",
      type: "upsell",
      rationale: "já gerada",
      // Rows written before the column existed carry no link.
      source_message_id: null,
      created_at: "2026-08-14T12:00:00Z",
    };
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [legacy], error: null },
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T13:00:00Z" },
            error: null,
          },
        },
        messages: { selectResult: { data: [{ id: 7 }], error: null } },
      }),
    );
    mockGeneratedCandidate();

    await inboxChatPanelService.fetchAISuggestion("42");

    expect(generateMock).toHaveBeenCalled();
  });

  it("breaks timestamp ties by id when picking the latest inbound message", async () => {
    // Provider timestamps are second-precision, so a burst sent within one
    // second ties. Without the id tie-break the "latest" message is whichever
    // row comes back first — unstable between calls, which would invalidate a
    // perfectly good cached suggestion and regenerate for nothing.
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [], error: null },
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T13:00:00Z" },
            error: null,
          },
        },
        messages: { selectResult: { data: [{ id: 9 }], error: null } },
      }),
    );
    mockGeneratedCandidate();

    await inboxChatPanelService.fetchAISuggestion("42");

    expect(orderings.messages).toEqual(["timestamp", "id"]);
  });

  it("stores the message it was generated for, so the next open is a cache hit", async () => {
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [], error: null },
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T13:00:00Z" },
            error: null,
          },
        },
        messages: { selectResult: { data: [{ id: 9 }], error: null } },
      }),
    );
    mockGeneratedCandidate();

    await inboxChatPanelService.fetchAISuggestion("42");

    const suggestionInsert = inserts.ai_suggestions?.[0] as Record<string, unknown>;
    expect(suggestionInsert).toMatchObject({ source_message_id: "9" });
  });

  it("force:true regenerates even when a matching cached suggestion exists", async () => {
    const cached = {
      conversation_id: "42",
      message: "Sugestão antiga",
      type: "upsell",
      rationale: "já gerada",
      source_message_id: "7",
      created_at: "2026-08-14T12:00:00Z",
    };
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [cached], error: null },
          singleResult: {
            data: { conversation_id: "42", ...CANDIDATE_ROW(), created_at: "2026-08-14T13:00:00Z" },
            error: null,
          },
        },
        messages: { selectResult: { data: [], error: null } },
      }),
    );
    mockGeneratedCandidate();

    const result = await inboxChatPanelService.fetchAISuggestion("42", { force: true });

    expect(generateMock).toHaveBeenCalled();
    expect(result).toMatchObject({ message: "Olá!", type: "urgency" });
  });

  it("returns null instead of throwing when generate() fails — the panel must stay usable", async () => {
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: { selectResult: { data: [], error: null } },
        messages: { selectResult: { data: [], error: null } },
      }),
    );
    generateMock.mockRejectedValue(new Error("inference is down"));

    const result = await inboxChatPanelService.fetchAISuggestion("42");

    expect(result).toBeNull();
  });

  it("still returns the suggestion when the audit write itself fails", async () => {
    fromMock.mockImplementation(
      mockSupabaseFrom({
        ai_suggestions: {
          selectResult: { data: [], error: null },
          singleResult: { data: null, error: { message: "insert failed" } },
        },
        messages: { selectResult: { data: [], error: null } },
      }),
    );
    mockGeneratedCandidate();

    const result = await inboxChatPanelService.fetchAISuggestion("42");

    expect(result).toMatchObject({ conversation_id: "42", message: "Olá!", type: "urgency" });
    expect(result?.created_at).toBeInstanceOf(Date);
  });
});

function CANDIDATE_ROW() {
  return { message: CANDIDATE.message, type: CANDIDATE.technique, rationale: CANDIDATE.rationale };
}
