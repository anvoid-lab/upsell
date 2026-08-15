import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generate } from "@core/ai";
import { BaseRepository } from "@core/repository";
import {
  AISuggestionContract,
  ReplySuggestionContract,
  validateContract,
  type AISuggestion,
  type AIUsage,
  type Message,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";

type ClientFactory = () => Promise<SupabaseClient>;

type GenerateOptions = {
  /** Skip the cached suggestion and generate a new one (the seller's button). */
  force?: boolean;
  /**
   * Where the database client comes from. Defaults to the SSR client with the
   * cookie session. The channel webhook passes the secret-key client here,
   * because a provider brings no session at all.
   */
  client?: ClientFactory;
};

/**
 * Reply-suggestion generation, with the tenant passed in explicitly.
 *
 * Lives apart from `inbox-chat-panel.service.ts` because it has two callers
 * with different sources of identity: the inbox panel (resolves the business
 * from the authenticated session) and the channel webhook (has no session —
 * resolves it from the channel and uses the secret key). Merging the two would
 * force the webhook to invent a session that doesn't exist.
 */
class ReplySuggestionService {
  async generate(
    businessId: string,
    conversationId: string,
    options?: GenerateOptions,
  ): Promise<AISuggestion | null> {
    const client = options?.client ?? createSupabaseServerClient;
    const suggestions = new BaseRepository<AISuggestion>({ table: "ai_suggestions", client });
    const usage = new BaseRepository<AIUsage>({ table: "ai_usage", client });
    const messages = new BaseRepository<Message>({ table: "messages", client });

    // The latest customer message — the identity of the group of messages this
    // suggestion answers, and what decides whether the previous one still holds.
    const sourceMessageId = await this.latestInboundMessageId(messages, conversationId);

    if (!options?.force) {
      const cached = await this.findSuggestionFor(suggestions, conversationId, sourceMessageId);
      if (cached) {
        return cached;
      }
    }

    try {
      const { data } = await generate({
        method: "reply_suggestion",
        businessId,
        conversationId,
        responseSchema: ReplySuggestionContract.responseSchema,
        usageSink: (record) => usage.create(record).then(() => undefined),
      });

      const candidate = data.candidates[0];
      const draft = validateContract(
        AISuggestionContract.writeSchema,
        {
          conversation_id: conversationId,
          message: candidate.message,
          type: candidate.technique,
          rationale: candidate.rationale,
          source_message_id: sourceMessageId,
        },
        "ReplySuggestionService.generate",
      );

      // Audit log (T-006) — and, since migration 007, also what delivers the
      // suggestion to an open panel: the INSERT propagates over Realtime.
      try {
        return await suggestions.create<AISuggestion>({ ...draft, business_id: businessId } as Partial<AISuggestion>);
      } catch {
        // Failing to persist must not hide a suggestion that was generated
        // successfully — but with no row in the database, this one won't count
        // as a cache hit next time.
        return { ...draft, created_at: new Date() };
      }
    } catch {
      // generate() already recorded the failure in ai_usage. All this does is
      // stop a failed generation from breaking the chat panel (or the webhook).
      return null;
    }
  }

  /**
   * Id of the latest inbound message, or null if the customer hasn't written.
   *
   * Ordered by id as well as timestamp, and the tie-break is load-bearing:
   * provider timestamps have second precision, so a burst of messages sent
   * within the same second ties. With only `timestamp` the "latest" message
   * would be whichever row came back first, which changes between calls — and
   * since this id is what decides whether a cached suggestion still matches,
   * an unstable answer means regenerating for no reason. Exactly the burst
   * case the debounce exists to handle.
   */
  private async latestInboundMessageId(
    messages: BaseRepository<Message>,
    conversationId: string,
  ): Promise<string | null> {
    const inbound = await messages.findAll<Message>({
      filters: { conversation_id: conversationId, direction: "in" } as Partial<Message>,
      orderBy: [
        { column: "timestamp", ascending: false },
        { column: "id", ascending: false },
      ],
    });
    return inbound[0] ? String(inbound[0].id) : null;
  }

  /**
   * The latest suggestion for this conversation, as long as it was generated
   * for this same message.
   *
   * Compares ids, not dates. The previous version measured `created_at` (our
   * database's clock) against `timestamp` (the provider's) — different
   * quantities, and any drift between them meant regenerating on every open.
   * A suggestion predating the column has `source_message_id` null and is
   * invalidated once, which is correct.
   */
  private async findSuggestionFor(
    suggestions: BaseRepository<AISuggestion>,
    conversationId: string,
    sourceMessageId: string | null,
  ): Promise<AISuggestion | null> {
    const rows = await suggestions.findAll<AISuggestion>({
      filters: { conversation_id: conversationId } as Partial<AISuggestion>,
      orderBy: { column: "created_at", ascending: false },
    });
    const latest = rows[0];
    if (!latest) {
      return null;
    }

    const latestSource = latest.source_message_id == null ? null : String(latest.source_message_id);
    return latestSource === sourceMessageId ? latest : null;
  }
}

export const replySuggestionService = new ReplySuggestionService();
