/**
 * Verifica, contra o projecto Supabase real (não um mock), que a migração 003
 * (business_id + RLS) isola tenants tal como as queries manuais confirmaram
 * durante essa migração:
 *   - um tenant novo começa sem ver dados de qualquer outro
 *   - um tenant não consegue escrever para dentro do business de outro
 *   - um tenant consegue escrever (e depois ler) dentro do seu próprio business
 *
 * Requer SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL e
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — sem eles a suite salta-se por
 * completo. Corre com `npm run test:integration` (carrega .env.local); nunca
 * faz parte de `npm run test`.
 *
 * Cria e remove o seu próprio tenant de teste; não toca em dados existentes.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const hasCredentials = Boolean(url && publishableKey && secretKey);

describe.skipIf(!hasCredentials)("multi-tenancy RLS (live Supabase)", () => {
  const email = `vitest-rls-${randomUUID()}@example.test`;
  const password = randomUUID() + randomUUID();

  let admin: SupabaseClient;
  let tenant: SupabaseClient;
  let userId: string;
  let ownBusinessId: string;
  let foreignBusinessId: string | null = null;

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, { auth: { persistSession: false } });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { business_name: `Vitest RLS Tenant ${randomUUID().slice(0, 8)}` },
    });
    if (createErr || !created.user) {
      throw new Error(`Failed to create test user: ${createErr?.message}`);
    }
    userId = created.user.id;

    // O trigger handle_new_user (migração 003) corre dentro do mesmo insert em
    // auth.users, por isso o profile/business já existem quando createUser resolve.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .single();
    if (profileErr || !profile) {
      throw new Error(`Test user has no profile — trigger did not run: ${profileErr?.message}`);
    }
    ownBusinessId = profile.business_id as string;

    const { data: otherBusiness } = await admin
      .from("businesses")
      .select("id")
      .neq("id", ownBusinessId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    foreignBusinessId = (otherBusiness?.id as string) ?? null;

    tenant = createClient(url!, publishableKey!, { auth: { persistSession: false } });
    const { error: signInErr } = await tenant.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`Test user sign-in failed: ${signInErr.message}`);
  });

  afterAll(async () => {
    // Apagar o business em cascata remove profiles e todas as linhas de
    // domínio ligadas a ele (ver migração 003); depois remove-se o utilizador.
    if (ownBusinessId) await admin.from("businesses").delete().eq("id", ownBusinessId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("starts with zero rows in every domain table", async () => {
    const tables = [
      "conversations",
      "messages",
      "follow_ups",
      "channels",
    ] as const;

    for (const table of tables) {
      const { data, error } = await tenant.from(table).select("id");
      expect(error, `unexpected error reading ${table}`).toBeNull();
      expect(data, `expected ${table} to be empty for a fresh tenant`).toEqual([]);
    }
  });

  it("cannot see another business's row by id, even when it knows the id", async () => {
    if (!foreignBusinessId) {
      console.warn("Skipping: no second business exists in this project to test against.");
      return;
    }
    const { data } = await tenant.from("businesses").select("id").eq("id", foreignBusinessId);
    expect(data).toEqual([]);
  });

  it("cannot insert a row into another business", async () => {
    if (!foreignBusinessId) {
      console.warn("Skipping: no second business exists in this project to test against.");
      return;
    }
    // id é bigint "generated always as identity" (migração 004) — nunca se
    // especifica no insert, a BD gera-o sozinha.
    const { error } = await tenant.from("conversations").insert({
      contact: {},
      last_message: "cross-tenant write attempt",
      last_message_at: new Date().toISOString(),
      status: "open",
      unread: true,
      business_id: foreignBusinessId,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/row-level security/i);
  });

  it("can insert and then read a row in its own business", async () => {
    const marker = `vitest-own-${randomUUID()}`;

    const { data: inserted, error: insertErr } = await tenant
      .from("conversations")
      .insert({
        contact: {},
        last_message: marker,
        last_message_at: new Date().toISOString(),
        status: "open",
        unread: true,
        // business_id omitted deliberately — proves the column default
        // (current_business_id()) stamps it correctly.
      })
      .select("id")
      .single();
    expect(insertErr).toBeNull();

    const { data, error: readErr } = await tenant
      .from("conversations")
      .select("id, business_id")
      .eq("id", inserted!.id)
      .single();
    expect(readErr).toBeNull();
    expect(data?.business_id).toBe(ownBusinessId);
  });
});
