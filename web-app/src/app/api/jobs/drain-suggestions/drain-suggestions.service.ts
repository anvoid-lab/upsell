import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { drainDueSuggestionJobs } from "@core/queue/suggestion-queue";
import { createSupabaseServiceClient } from "@db/client";
import { replySuggestionService } from "@/app/(app)/inbox/reply-suggestion.service";

type ClientFactory = () => Promise<SupabaseClient>;

// Um pouco mais do que o intervalo do heartbeat (20s) — tolera algumas
// batidas perdidas sem tratar "ainda a ver" como "foi embora".
const PRESENCE_FRESHNESS_MS = 60_000;

export type DrainResult = {
  processed: number;
  generated: number;
  skipped: number;
};

/**
 * Processa os jobs de sugestão cujo atraso já passou.
 *
 * A presença é verificada aqui — no momento em que o job dispara — e não ao
 * enfileirar. Verificar cedo trataria como "ausente" um vendedor que só abre
 * a conversa em reação à própria mensagem que disparou o job.
 */
class DrainSuggestionsService {
  async run(
    client: ClientFactory = () => Promise.resolve(createSupabaseServiceClient()),
  ): Promise<DrainResult> {
    const jobs = await drainDueSuggestionJobs(client);
    let generated = 0;
    let skipped = 0;

    for (const job of jobs) {
      try {
        if (await this.isBeingViewed(client, job.conversationId)) {
          await replySuggestionService.generate(job.businessId, job.conversationId, {
            force: true,
            client,
          });
          generated += 1;
        } else {
          // Ninguém a ver agora — não vale a pena gastar a chamada. Se o
          // vendedor abrir mais tarde, o caminho preguiçoso (cache-miss em
          // fetchAISuggestion) gera na hora.
          skipped += 1;
        }
      } catch {
        // Um job falhado não pode travar os restantes do lote; o caminho
        // preguiçoso continua a cobrir esta conversa mais tarde.
        skipped += 1;
      }
    }

    return { processed: jobs.length, generated, skipped };
  }

  private async isBeingViewed(client: ClientFactory, conversationId: string): Promise<boolean> {
    const supabase = await client();
    const { data } = await supabase
      .from("conversations")
      .select("last_viewed_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (!data?.last_viewed_at) {
      return false;
    }
    return Date.now() - new Date(data.last_viewed_at as string).getTime() < PRESENCE_FRESHNESS_MS;
  }
}

export const drainSuggestionsService = new DrainSuggestionsService();
