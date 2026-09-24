import "server-only";

import { createSupabaseServerClient } from "@db/client";

export type CurrentUser = {
  id: string;
  email: string;
  business_id: string;
  business_name: string;
};

class CurrentUserService {
  /**
   * Utilizador autenticado e o negócio a que pertence.
   *
   * O `business_id` daqui é informativo — o isolamento entre tenants é imposto
   * pelo RLS na base de dados (migração 003), não por filtros na aplicação.
   */
  async fetchCurrentUser(): Promise<CurrentUser | null> {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // O RLS confina esta query ao próprio profile e ao próprio business.
    const { data } = await supabase
      .from("profiles")
      .select("id, email, business_id, businesses(name)")
      .eq("id", user.id)
      .maybeSingle();

    const business = data?.businesses as { name?: string } | { name?: string }[] | null;
    const businessName = Array.isArray(business) ? business[0]?.name : business?.name;

    return {
      id: user.id,
      email: data?.email ?? user.email ?? "",
      business_id: (data?.business_id as string) ?? "",
      // Sem profile ainda (registo a meio) — mostrar o email é melhor que vazio.
      business_name: businessName ?? data?.email ?? user.email ?? "VendAI",
    };
  }
}

export const currentUserService = new CurrentUserService();
