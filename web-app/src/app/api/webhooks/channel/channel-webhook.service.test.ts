import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@db/client", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: fromMock })),
}));

const { channelWebhookService } = await import("./channel-webhook.service");

const INBOUND = {
  channel: "whatsapp" as const,
  channel_conversation_id: "wa-conv-1",
  channel_message_id: "wamid-1",
  contact: { name: "Joana Simulada", handle: "+244 923 000 001" },
  text: "Ainda tem o A55?",
  timestamp: new Date("2026-08-15T10:00:00Z"),
};

// Exatamente o que `.select("id, business_id")` devolve — nem mais. Um mock
// mais rico do que a query real esconderia justamente os erros que interessam:
// a primeira versão deste serviço validava a linha contra ConversationDoc, que
// exige `follow_ups` (tabela à parte, não coluna), e só rebentou em execução.
const EXISTING_CONVERSATION = {
  id: 42,
  business_id: "biz-1",
};

type TableBehaviour = {
  /** Linha devolvida por `.maybeSingle()` — a conversa existente, ou null. */
  maybeSingle?: { data: unknown; error: unknown };
  /** Erro devolvido pelo `.insert()` — usado para simular o 23505. */
  insertError?: { code: string } | null;
  /** Linha devolvida por `.insert().select().single()` — a conversa criada. */
  insertedRow?: unknown;
};

/**
 * Query builder falso do PostgREST.
 *
 * Qualquer método encadeia; só `maybeSingle`, `single` e o `await` direto
 * resolvem. Um Proxy em vez de listar métodos um a um porque o serviço usa
 * cadeias diferentes conforme a tabela (`.select().eq().is().maybeSingle()`,
 * `.select().order().limit().maybeSingle()`, `.insert()` aguardado direto),
 * e enumerá-las à mão parte a cada mudança.
 */
function mockTables(tables: Record<string, TableBehaviour>) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};

  fromMock.mockImplementation((table: string) => {
    const cfg = tables[table] ?? {};
    // O que um `await` direto sobre a cadeia devolve. `insert` troca isto pelo
    // erro configurado, para se poder simular a violação 23505.
    let pending: unknown = { data: null, error: null };

    const builder: Record<string, unknown> = {
      insert(payload: unknown) {
        (inserts[table] ??= []).push(payload);
        pending = { data: null, error: cfg.insertError ?? null };
        return proxy;
      },
      update(payload: unknown) {
        (updates[table] ??= []).push(payload);
        return proxy;
      },
      maybeSingle: () => Promise.resolve(cfg.maybeSingle ?? { data: null, error: null }),
      single: () => Promise.resolve({ data: cfg.insertedRow ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => Promise.resolve(pending).then(resolve),
    };

    // Um único proxy, devolvido por tudo o que encadeia — incluindo insert e
    // update, senão a cadeia perde os métodos a partir daí.
    const proxy: Record<string, unknown> = new Proxy(builder, {
      get(target, prop) {
        if (prop in target) {
          return target[prop as string];
        }
        // select/eq/is/order/limit/… — tudo o que só encadeia.
        return () => proxy;
      },
    });

    return proxy;
  });

  return { inserts, updates };
}

describe("ChannelWebhookService.receive", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("inserts the message into the existing conversation and bumps it unread", async () => {
    const { inserts, updates } = mockTables({
      conversations: { maybeSingle: { data: EXISTING_CONVERSATION, error: null } },
      messages: { insertError: null },
    });

    const { result, businessId } = await channelWebhookService.receive(INBOUND);

    expect(result).toEqual({ status: "accepted", conversation_id: "42" });
    expect(businessId).toBe("biz-1");

    // A mensagem tem de levar o business_id resolvido da conversa: esta
    // ligação usa a chave secreta e não tem RLS a corrigir um valor errado.
    // conversation_id como string: docSchema coage o bigint (migração 004),
    // que é a forma opaca que o resto da app assume.
    expect(inserts.messages[0]).toMatchObject({
      business_id: "biz-1",
      conversation_id: "42",
      channel_message_id: "wamid-1",
      direction: "in",
      read: false,
    });

    // Sem isto a conversa não sobe na lista nem mostra o badge.
    expect(updates.conversations[0]).toMatchObject({
      last_message: "Ainda tem o A55?",
      unread: true,
    });
  });

  it("treats a repeated channel_message_id as a duplicate, without touching the conversation", async () => {
    const { updates } = mockTables({
      conversations: { maybeSingle: { data: EXISTING_CONVERSATION, error: null } },
      // 23505 = unique_violation na constraint de channel_message_id.
      messages: { insertError: { code: "23505" } },
    });

    const { result } = await channelWebhookService.receive(INBOUND);

    expect(result).toEqual({ status: "duplicate", conversation_id: "42" });
    expect(updates.conversations).toBeUndefined();
  });

  it("propagates a database error that is not a duplicate", async () => {
    mockTables({
      conversations: { maybeSingle: { data: EXISTING_CONVERSATION, error: null } },
      messages: { insertError: { code: "42703" } },
    });

    await expect(channelWebhookService.receive(INBOUND)).rejects.toMatchObject({
      code: "42703",
    });
  });

  it("creates a conversation and contact when the lead is writing for the first time", async () => {
    const created = { id: 99, business_id: "biz-1" };
    const { inserts } = mockTables({
      // Nenhuma conversa para este channel_conversation_id...
      conversations: { maybeSingle: { data: null, error: null }, insertedRow: created },
      // ...e o business resolve-se pelo primeiro (e único) registo.
      businesses: { maybeSingle: { data: { id: "biz-1" }, error: null } },
      messages: { insertError: null },
    });

    const { result } = await channelWebhookService.receive(INBOUND);

    expect(result).toEqual({ status: "accepted", conversation_id: "99" });

    const conversation = inserts.conversations[0] as Record<string, unknown>;
    expect(conversation).toMatchObject({
      business_id: "biz-1",
      channel_conversation_id: "wa-conv-1",
      unread: true,
      status: "open",
    });
    expect(conversation.contact).toMatchObject({
      name: "Joana Simulada",
      initials: "JS",
      platform: "whatsapp",
      status: "new",
    });
  });
});
