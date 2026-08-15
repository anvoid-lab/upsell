import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do browser — usado pelas subscrições Realtime da inbox.
 *
 * Vive num ficheiro separado de `client.ts` de propósito: esse importa
 * `next/headers`, que só existe no servidor. Bastava um componente cliente
 * importar dali para o bundle do browser tentar arrastar `next/headers` atrás
 * e a build rebentar.
 *
 * Lê a mesma sessão em cookie que o cliente SSR, e isso não é detalhe: as
 * políticas da migração 003 são `for all to authenticated`, por isso uma
 * subscrição cujo socket não leve o JWT do utilizador não recebe nada — e não
 * recebe *em silêncio*, sem erro nenhum.
 */
let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  // Uma só instância por separador: cada `createBrowserClient()` abre a sua
  // própria ligação Realtime, e várias ligações significam eventos duplicados.
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return browserClient;
}

let realtimeAuthReady: Promise<void> | null = null;

/**
 * Garante que o socket Realtime já tem o JWT do utilizador antes de
 * subscrever — necessário porque `supabase-js` só chama `realtime.setAuth()`
 * sozinho nos eventos `SIGNED_IN`/`TOKEN_REFRESHED` do próprio cliente
 * (ver `SupabaseClient.ts:_handleTokenChanged`). O login desta app corre num
 * Server Action; quando o cliente do browser arranca, a sessão já existe no
 * cookie e chega como `INITIAL_SESSION` — um evento que esse código ignora.
 * Sem isto, a subscrição liga e devolve SUBSCRIBED na mesma, só que
 * autenticada como `anon`, e o RLS filtra tudo sem erro nenhum.
 */
export function ensureRealtimeAuth(client: SupabaseClient): Promise<void> {
  if (!realtimeAuthReady) {
    realtimeAuthReady = client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        client.realtime.setAuth(session.access_token);
      }
    });
  }
  return realtimeAuthReady;
}
