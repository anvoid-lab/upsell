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
  const secondEmail = `vitest-rls-${randomUUID()}@example.test`;
  const secondPassword = randomUUID() + randomUUID();

  let admin: SupabaseClient;
  let tenant: SupabaseClient;
  let userId: string;
  let secondUserId: string;
  let ownBusinessId: string;
  let foreignBusinessId: string;
  let foreignConversationId: string;

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

    const { data: secondCreated, error: secondCreateErr } =
      await admin.auth.admin.createUser({
        email: secondEmail,
        password: secondPassword,
        email_confirm: true,
        user_metadata: { business_name: `Vitest RLS Tenant ${randomUUID().slice(0, 8)}` },
      });
    if (secondCreateErr || !secondCreated.user) {
      throw new Error(`Failed to create second test user: ${secondCreateErr?.message}`);
    }
    secondUserId = secondCreated.user.id;

    const { data: secondProfile, error: secondProfileErr } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", secondUserId)
      .single();
    if (secondProfileErr || !secondProfile) {
      throw new Error(`Second test user has no profile: ${secondProfileErr?.message}`);
    }
    foreignBusinessId = secondProfile.business_id as string;

    const { data: foreignConversation, error: foreignConversationErr } = await admin
      .from("conversations")
      .insert({
        business_id: foreignBusinessId,
        contact: {},
        last_message: "foreign conversation",
        last_message_at: new Date().toISOString(),
        status: "open",
        unread: false,
      })
      .select("id")
      .single();
    if (foreignConversationErr || !foreignConversation) {
      throw new Error(`Failed to create foreign conversation: ${foreignConversationErr?.message}`);
    }
    foreignConversationId = String(foreignConversation.id);

    tenant = createClient(url!, publishableKey!, { auth: { persistSession: false } });
    const { error: signInErr } = await tenant.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`Test user sign-in failed: ${signInErr.message}`);
  });

  afterAll(async () => {
    // Apagar o business em cascata remove profiles e todas as linhas de
    // domínio ligadas a ele (ver migração 003); depois remove-se o utilizador.
    if (ownBusinessId) await admin.from("businesses").delete().eq("id", ownBusinessId);
    if (foreignBusinessId) await admin.from("businesses").delete().eq("id", foreignBusinessId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (secondUserId) await admin.auth.admin.deleteUser(secondUserId);
  });

  it("starts with zero rows in every domain table", async () => {
    const tables = [
      "conversations",
      "messages",
      "follow_ups",
      "channels",
      "conversation_notes",
    ] as const;

    for (const table of tables) {
      const { data, error } = await tenant.from(table).select("id");
      expect(error, `unexpected error reading ${table}`).toBeNull();
      expect(data, `expected ${table} to be empty for a fresh tenant`).toEqual([]);
    }
  });

  it("cannot see another business's row by id, even when it knows the id", async () => {
    const { data } = await tenant.from("businesses").select("id").eq("id", foreignBusinessId);
    expect(data).toEqual([]);
  });

  it("cannot insert a row into another business", async () => {
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

  it("persists conversation status and notes inside its own business", async () => {
    const { data: conversation, error: conversationError } = await tenant
      .from("conversations")
      .insert({
        contact: {},
        last_message: "note owner",
        last_message_at: new Date().toISOString(),
        status: "open",
        unread: false,
      })
      .select("id")
      .single();
    expect(conversationError).toBeNull();

    const { error: statusError } = await tenant
      .from("conversations")
      .update({ status: "resolved" })
      .eq("id", conversation!.id);
    expect(statusError).toBeNull();

    const { data: note, error: noteError } = await tenant
      .from("conversation_notes")
      .insert({ conversation_id: conversation!.id, content: "Private context" })
      .select("conversation_id, business_id, author_id, content")
      .single();
    expect(noteError).toBeNull();
    expect(note).toMatchObject({
      conversation_id: conversation!.id,
      business_id: ownBusinessId,
      author_id: userId,
      content: "Private context",
    });

    const { data: refreshed } = await tenant
      .from("conversations")
      .select("status")
      .eq("id", conversation!.id)
      .single();
    expect(refreshed?.status).toBe("resolved");
  });

  it("cannot attach a note to another business's conversation", async () => {
    const { error } = await tenant.from("conversation_notes").insert({
      conversation_id: foreignConversationId,
      content: "cross-tenant note attempt",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/row-level security/i);

    const { data } = await tenant
      .from("conversation_notes")
      .select("id")
      .eq("conversation_id", foreignConversationId);
    expect(data).toEqual([]);
  });
});
