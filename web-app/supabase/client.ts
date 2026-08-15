// O cliente do browser vive em `browser-client.ts` — este ficheiro importa
// `next/headers`, que não pode entrar no bundle do cliente.
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookies só podem ser escritos em Server Actions/Route Handlers
          }
        },
      },
    }
  );
}

/**
 * Cliente com a chave secreta — sem cookies, sem sessão.
 *
 * Para código de servidor que corre fora de um pedido autenticado: hoje, o
 * webhook de canais (um provider não traz sessão nenhuma).
 *
 * **Ignora o RLS por completo.** Sem `auth.uid()`, `current_business_id()`
 * devolve NULL e o default da coluna `business_id` não ajuda — cada query feita
 * por aqui tem de filtrar/definir `business_id` explicitamente, resolvido a
 * partir do canal e nunca vindo do corpo do pedido. É o mesmo risco já
 * documentado para o `ml/` no CLAUDE.md.
 *
 * Lida preguiçosamente para que `next build` não exija a variável.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY não está definido. Necessário para código de servidor sem sessão " +
        "(webhook de canais), onde o RLS não tem `auth.uid()` para resolver o tenant."
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
