/**
 * Verifica, contra o projecto Supabase real (não um mock), o comportamento de
 * `pgmq` que não se pode provar com mocks: que enfileirar duas vezes para a
 * mesma conversa colapsa num só job (o debounce), e que duas chamadas
 * concorrentes a drenar nunca processam o mesmo job duas vezes (SKIP LOCKED).
 *
 * Usa `conversation_id`/`business_id` sintéticos — o payload da fila é jsonb
 * sem FK para `conversations`, por isso não é preciso semear dados reais só
 * para testar a mecânica da fila.
 *
 * Requer SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL e a migração 008
 * aplicada — sem eles a suite salta-se por completo. Corre com
 * `npm run test:integration`; nunca faz parte de `npm run test`.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const hasCredentials = Boolean(url && secretKey);

// bigint fora do intervalo que `identity` alguma vez atribui a `conversations`
// reais — evita colidir com dados a sério mesmo sem FK a impedir.
function syntheticConversationId(): number {
  return 900_000_000 + Math.floor(Math.random() * 90_000_000);
}

describe.skipIf(!hasCredentials)("suggestion queue — debounce and drain (live Supabase)", () => {
  let admin: SupabaseClient;
  const usedConversationIds: number[] = [];

  beforeAll(() => {
    admin = createClient(url!, secretKey!, { auth: { persistSession: false } });
  });

  afterAll(async () => {
    // Drenagem de limpeza — apanha qualquer job desta suite que uma asserção
    // falhada tenha deixado para trás. Delay curto nos testes (1s), por isso
    // já deviam estar todos visíveis a esta altura.
    if (usedConversationIds.length > 0) {
      await admin.rpc("drain_due_suggestion_jobs", { p_max: 100 });
    }
  });

  it("collapses two enqueues for the same conversation into one job", async () => {
    const conversationId = syntheticConversationId();
    usedConversationIds.push(conversationId);
    const businessId = randomUUID();

    const first = await admin.rpc("enqueue_suggestion_job", {
      p_conversation_id: conversationId,
      p_business_id: businessId,
      p_delay_seconds: 1,
    });
    expect(first.error).toBeNull();

    const second = await admin.rpc("enqueue_suggestion_job", {
      p_conversation_id: conversationId,
      p_business_id: businessId,
      p_delay_seconds: 1,
    });
    expect(second.error).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { data, error } = await admin.rpc("drain_due_suggestion_jobs", { p_max: 100 });
    expect(error).toBeNull();

    const matching = (data as Array<{ conversation_id: number }>).filter(
      (job) => job.conversation_id === conversationId,
    );
    expect(matching).toHaveLength(1);
  });

  it("never delivers the same job twice under concurrent drains", async () => {
    const conversationId = syntheticConversationId();
    usedConversationIds.push(conversationId);
    const businessId = randomUUID();

    await admin.rpc("enqueue_suggestion_job", {
      p_conversation_id: conversationId,
      p_business_id: businessId,
      p_delay_seconds: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const [first, second] = await Promise.all([
      admin.rpc("drain_due_suggestion_jobs", { p_max: 100 }),
      admin.rpc("drain_due_suggestion_jobs", { p_max: 100 }),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const total = [
      ...(first.data as Array<{ conversation_id: number }>),
      ...(second.data as Array<{ conversation_id: number }>),
    ].filter((job) => job.conversation_id === conversationId);

    expect(total).toHaveLength(1);
  });
});
