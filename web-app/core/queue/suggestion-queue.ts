import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppException } from "@core/exceptions";

type ClientFactory = () => Promise<SupabaseClient>;

export type SuggestionJob = {
  conversationId: string;
  businessId: string;
};

/**
 * Enfileira a geração de uma sugestão, com debounce.
 *
 * Chama `public.enqueue_suggestion_job()` (migração 008) — a única forma da
 * app falar com `pgmq`, já que a ligação com a chave secreta só alcança o que
 * o PostgREST expõe (por omissão, só `public`). A função em si apaga
 * qualquer job já pendente para esta conversa antes de acrescentar o novo:
 * é isso que faz uma rajada de mensagens colapsar num só job em vez de
 * acumular vários.
 */
export async function enqueueSuggestionJob(
  client: ClientFactory,
  businessId: string,
  conversationId: string,
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc("enqueue_suggestion_job", {
    p_conversation_id: conversationId,
    p_business_id: businessId,
  });

  if (error) {
    throw AppException.wrap(error, "suggestion-queue.enqueueSuggestionJob");
  }
}

/**
 * Drena os jobs cujo atraso já passou.
 *
 * Chama `public.drain_due_suggestion_jobs()`, que por baixo usa `pgmq.pop()`
 * — lê e apaga atomicamente, por isso duas chamadas concorrentes (dois
 * disparos do cron sobrepostos) nunca processam o mesmo job duas vezes.
 */
export async function drainDueSuggestionJobs(
  client: ClientFactory,
  max = 20,
): Promise<SuggestionJob[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("drain_due_suggestion_jobs", { p_max: max });

  if (error) {
    throw AppException.wrap(error, "suggestion-queue.drainDueSuggestionJobs");
  }

  return ((data ?? []) as Array<{ conversation_id: number | string; business_id: string }>).map(
    (message) => ({
      conversationId: String(message.conversation_id),
      businessId: message.business_id,
    }),
  );
}
