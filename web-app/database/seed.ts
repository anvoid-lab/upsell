import { createClient } from "@supabase/supabase-js";
import {
  ConversationContract,
  MessageContract,
  ChannelContract,
  AISettingsContract,
  AISuggestionContract,
  validateContract,
  type ConversationDoc,
  type Message,
  type ChannelConnection,
  type AISettings,
  type AISuggestion,
} from "../core/contracts";

// ─── Supabase client (sem SSR — script standalone) ────────────
// Usa a chave secreta: o RLS (migração 003) confina cada tenant ao seu próprio
// business e não existem políticas para `anon`, logo a chave publishable não
// consegue escrever nada. Esta chave nunca pode ter prefixo NEXT_PUBLIC_ —
// ignora o RLS por completo e não pode chegar ao browser.
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!secretKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY não está definido. Obtém-no em Project Settings → API Keys " +
      "(chave `secret`) e acrescenta-o ao .env.local. Necessário porque o RLS bloqueia a chave publishable.",
  );
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey);

// ─── Helpers ──────────────────────────────────────────────────

function id(prefix: string, n: number | string) {
  return `${prefix}-${n}`;
}

/** Instante N minutos atrás (negativo = futuro). Serializa para ISO no insert. */
function ts(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

// ─── Conversations ────────────────────────────────────────────

const conversations: ConversationDoc[] = [
  {
    id: id("conv", 1),
    contact: {
      id: id("contact", 1),
      name: "Esperança Mateus",
      initials: "EM",
      avatar_bg: "#fce7f3",
      avatar_color: "#be185d",
      platform: "whatsapp",
      phone: "+244 923 456 789",
      first_contact: ts(60 * 24 * 5),
      status: "interested",
    },
    last_message: "Tem capulanas de Angola com padrão tradicional?",
    last_message_at: ts(12),
    status: "open",
    unread: true,
    ai_scheduled: true,
    product_interest: {
      item: "Capulana Tradicional",
      price: "2.500 Kz",
      stock: 3,
      is_low_stock: true,
    },
    follow_ups: [],
  },
  {
    id: id("conv", 2),
    contact: {
      id: id("contact", 2),
      name: "Carlos Neto",
      initials: "CN",
      avatar_bg: "#dbeafe",
      avatar_color: "#1d4ed8",
      platform: "instagram",
      phone: "+244 912 345 678",
      first_contact: ts(60 * 24 * 3),
      status: "interested",
    },
    last_message: "Qual é o preço do Samsung Galaxy A55?",
    last_message_at: ts(35),
    status: "open",
    unread: true,
    ai_scheduled: false,
    product_interest: {
      item: "Samsung Galaxy A55",
      price: "85.000 Kz",
      stock: 5,
      is_low_stock: false,
    },
    follow_ups: [
      {
        id: id("fu", 1),
        conversation_id: id("conv", 2),
        contact_name: "Carlos Neto",
        title: "Follow-up telemóvel",
        message: "Olá Carlos! O Samsung A55 ainda está disponível. Posso reservar um para si?",
        status: "scheduled",
        type: "urgency",
        scheduled_for: ts(-120),
      },
    ],
  },
  {
    id: id("conv", 3),
    contact: {
      id: id("contact", 3),
      name: "Benedita Santos",
      initials: "BS",
      avatar_bg: "#dcfce7",
      avatar_color: "#15803d",
      platform: "facebook",
      phone: "+244 934 567 890",
      first_contact: ts(60 * 24 * 7),
      status: "new",
    },
    last_message: "Têm vestidos de festa disponíveis para o fim de semana?",
    last_message_at: ts(90),
    status: "pending",
    unread: false,
    ai_scheduled: true,
    product_interest: {
      item: "Vestido de Festa",
      price: "15.000 Kz",
      stock: 2,
      is_low_stock: true,
    },
    follow_ups: [],
  },
  {
    id: id("conv", 4),
    contact: {
      id: id("contact", 4),
      name: "Filipe Tavares",
      initials: "FT",
      avatar_bg: "#fef9c3",
      avatar_color: "#854d0e",
      platform: "whatsapp",
      phone: "+244 945 678 901",
      first_contact: ts(60 * 24 * 10),
      status: "converted",
    },
    last_message: "Obrigado! Os sapatos chegaram em perfeito estado.",
    last_message_at: ts(60 * 3),
    status: "resolved",
    unread: false,
    ai_scheduled: false,
    product_interest: {
      item: "Sapatos de Couro",
      price: "22.000 Kz",
      stock: 8,
      is_low_stock: false,
    },
    follow_ups: [
      {
        id: id("fu", 2),
        conversation_id: id("conv", 4),
        contact_name: "Filipe Tavares",
        title: "Pós-venda sapatos",
        message: "Esperamos que esteja a gostar dos sapatos! Avalie a sua experiência.",
        status: "sent",
        type: "social_proof",
        sent_at: ts(60 * 24),
      },
    ],
  },
  {
    id: id("conv", 5),
    contact: {
      id: id("contact", 5),
      name: "Lúcia Figueira",
      initials: "LF",
      avatar_bg: "#f3e8ff",
      avatar_color: "#7e22ce",
      platform: "instagram",
      phone: "+244 956 789 012",
      first_contact: ts(60 * 24 * 2),
      status: "interested",
    },
    last_message: "A bolsa que vi no Instagram ainda está disponível?",
    last_message_at: ts(20),
    status: "open",
    unread: true,
    ai_scheduled: false,
    product_interest: {
      item: "Bolsa de Senhora",
      price: "18.500 Kz",
      stock: 1,
      is_low_stock: true,
    },
    follow_ups: [],
  },
  {
    id: id("conv", 6),
    contact: {
      id: id("contact", 6),
      name: "António Domingos",
      initials: "AD",
      avatar_bg: "#fce7f3",
      avatar_color: "#9f1239",
      platform: "whatsapp",
      phone: "+244 967 890 123",
      first_contact: ts(60 * 24 * 1),
      status: "new",
    },
    last_message: "Olá, queria saber mais sobre os telemóveis disponíveis.",
    last_message_at: ts(5),
    status: "open",
    unread: true,
    ai_scheduled: true,
    follow_ups: [],
  },
];

// ─── Messages ─────────────────────────────────────────────────

const messages: Message[] = [
  { id: id("msg", "1-1"), conversation_id: id("conv", 1), content: "Bom dia! Vi que vendem capulanas. Têm com padrão tradicional angolano?", direction: "in",  timestamp: ts(70),  read: true },
  { id: id("msg", "1-2"), conversation_id: id("conv", 1), content: "Bom dia, Esperança! Sim, temos vários padrões tradicionais. Envio fotos já!", direction: "out", timestamp: ts(65), read: true },
  { id: id("msg", "1-3"), conversation_id: id("conv", 1), content: "Tem capulanas de Angola com padrão tradicional?", direction: "in", timestamp: ts(12), read: false },
  { id: id("msg", "2-1"), conversation_id: id("conv", 2), content: "Boa tarde! Tenho interesse no Samsung Galaxy A55.", direction: "in", timestamp: ts(180), read: true },
  { id: id("msg", "2-2"), conversation_id: id("conv", 2), content: "Boa tarde, Carlos! O A55 está disponível. Temos em preto e azul.", direction: "out", timestamp: ts(170), read: true },
  { id: id("msg", "2-3"), conversation_id: id("conv", 2), content: "Inclui garantia?", direction: "in", timestamp: ts(100), read: true },
  { id: id("msg", "2-4"), conversation_id: id("conv", 2), content: "Sim! 12 meses de garantia e protector de ecrã incluído.", direction: "out", timestamp: ts(90), read: true },
  { id: id("msg", "2-5"), conversation_id: id("conv", 2), content: "Qual é o preço do Samsung Galaxy A55?", direction: "in", timestamp: ts(35), read: false },
  { id: id("msg", "3-1"), conversation_id: id("conv", 3), content: "Olá! Vi os vossos vestidos no Facebook. São lindos!", direction: "in", timestamp: ts(200), read: true },
  { id: id("msg", "3-2"), conversation_id: id("conv", 3), content: "Muito obrigada, Benedita! Temos novas chegadas esta semana.", direction: "out", timestamp: ts(190), read: true },
  { id: id("msg", "3-3"), conversation_id: id("conv", 3), content: "Têm vestidos de festa disponíveis para o fim de semana?", direction: "in", timestamp: ts(90), read: true },
  { id: id("msg", "4-1"), conversation_id: id("conv", 4), content: "Boa tarde, queria encomendar os sapatos de couro tamanho 43.", direction: "in", timestamp: ts(60 * 24 * 3), read: true },
  { id: id("msg", "4-2"), conversation_id: id("conv", 4), content: "Perfeito, Filipe! Reservado. Entrega em 2 dias úteis.", direction: "out", timestamp: ts(60 * 24 * 3 - 10), read: true },
  { id: id("msg", "4-3"), conversation_id: id("conv", 4), content: "Pago via transferência ou M-Pesa?", direction: "in", timestamp: ts(60 * 24 * 2), read: true },
  { id: id("msg", "4-4"), conversation_id: id("conv", 4), content: "Ambas! M-Pesa: 923 000 000 ou transferência para o IBAN que enviamos por email.", direction: "out", timestamp: ts(60 * 24 * 2 - 5), read: true },
  { id: id("msg", "4-5"), conversation_id: id("conv", 4), content: "Obrigado! Os sapatos chegaram em perfeito estado.", direction: "in", timestamp: ts(60 * 3), read: true },
  { id: id("msg", "5-1"), conversation_id: id("conv", 5), content: "Olá! Adoro a bolsa que publicaram hoje no Instagram.", direction: "in", timestamp: ts(45), read: true },
  { id: id("msg", "5-2"), conversation_id: id("conv", 5), content: "Boa tarde, Lúcia! É um dos nossos bestsellers. Temos em castanho e preto.", direction: "out", timestamp: ts(40), read: true },
  { id: id("msg", "5-3"), conversation_id: id("conv", 5), content: "A bolsa que vi no Instagram ainda está disponível?", direction: "in", timestamp: ts(20), read: false },
  { id: id("msg", "6-1"), conversation_id: id("conv", 6), content: "Olá, queria saber mais sobre os telemóveis disponíveis.", direction: "in", timestamp: ts(5), read: false },
];

// ─── Channels ─────────────────────────────────────────────────

const channels: ChannelConnection[] = [
  { platform: "whatsapp",  connected: true,  account_name: "Shop & Go Luanda",  connected_at: ts(60 * 24 * 210) },
  { platform: "instagram", connected: true,  account_name: "@shopandgo.angola", connected_at: ts(60 * 24 * 175) },
  { platform: "facebook",  connected: false },
];

// ─── AI Settings ──────────────────────────────────────────────

const aiSettings: AISettings = {
  follow_up_delay_hours: 4,
  use_urgency: true,
  use_upsell: true,
  use_social_proof: true,
  use_cart_recovery: true,
  tone: "friendly",
  language: "pt",
};

// ─── AI Suggestions ───────────────────────────────────────────

const aiSuggestions: AISuggestion[] = [
  { conversation_id: id("conv", 1), message: "Olá Esperança! Tenho capulanas tradicionais angolanas a 2.500 Kz. São as últimas unidades — posso reservar uma para si?", type: "urgency" },
  { conversation_id: id("conv", 2), message: "Olá Carlos! O Samsung Galaxy A55 está a 85.000 Kz com garantia de 12 meses. Posso processar a sua encomenda hoje mesmo?", type: "cart_recovery" },
  { conversation_id: id("conv", 5), message: "Boa tarde, Lúcia! A bolsa ainda está disponível em castanho e preto. Temos poucas unidades — quer que reserve uma?", type: "urgency" },
  { conversation_id: id("conv", 6), message: "Olá António! Temos Samsung, Tecno e Itel com ótimos preços. Qual gama prefere — entrada, médio ou topo de gama?", type: "upsell" },
];

// ─── Seed ─────────────────────────────────────────────────────

/**
 * Resolve o business a que as fixtures pertencem.
 *
 * A chave secreta não tem `auth.uid()`, por isso o default `current_business_id()`
 * das colunas business_id resolveria para NULL. Cada linha tem de ser carimbada
 * explicitamente.
 */
async function resolveBusinessId(): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from("businesses")
    .select("id, name")
    .order("created_at")
    .limit(1);
  if (selErr) throw selErr;

  if (existing?.[0]) {
    console.log(`  Using business: ${existing[0].name}`);
    return existing[0].id as string;
  }

  const { data: created, error: insErr } = await supabase
    .from("businesses")
    .insert({ name: "Shop & Go Luanda" })
    .select("id")
    .single();
  if (insErr) throw insErr;
  console.log("  Created business: Shop & Go Luanda");
  return created.id as string;
}

/**
 * Provisiona (ou repõe a password de) um utilizador de desenvolvimento e
 * garante que o seu profile aponta para o business semeado.
 *
 * Sem isto, um ambiente novo não tem forma de entrar nos dados que o seed
 * acabou de inserir: um signup normal cria o SEU PRÓPRIO business vazio (via
 * trigger handle_new_user), que nada tem a ver com as fixtures.
 *
 * Sem SEED_DEV_EMAIL/SEED_DEV_PASSWORD no ambiente, este passo salta-se —
 * não há utilizador de desenvolvimento hard-coded no código.
 */
async function ensureDevUser(businessId: string): Promise<void> {
  const email = process.env.SEED_DEV_EMAIL;
  const password = process.env.SEED_DEV_PASSWORD;
  if (!email || !password) {
    console.log("  Skipped: SEED_DEV_EMAIL / SEED_DEV_PASSWORD não definidos.");
    return;
  }

  const { data: existing, error: findErr } = await supabase
    .from("profiles")
    .select("id, business_id")
    .eq("email", email)
    .maybeSingle();
  if (findErr) throw findErr;

  let userId: string;
  let previousBusinessId: string | undefined = existing?.business_id as string | undefined;

  if (existing) {
    userId = existing.id as string;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`  Password reset for: ${email}`);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = created.user!.id;
    console.log(`  Created dev user: ${email}`);

    // O trigger handle_new_user acabou de criar um business novo para este
    // utilizador — é esse que fica órfão, não o de `existing` (que era null).
    const { data: freshProfile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();
    previousBusinessId = freshProfile?.business_id as string | undefined;
  }

  // Limpa o business que o trigger atribuiu antes de o substituirmos pelo
  // business semeado — caso contrário fica um business vazio para sempre.
  if (previousBusinessId && previousBusinessId !== businessId) {
    await supabase.from("businesses").delete().eq("id", previousBusinessId);
  }

  const { error: linkErr } = await supabase
    .from("profiles")
    .update({ business_id: businessId })
    .eq("id", userId);
  if (linkErr) throw linkErr;
}

async function seed() {
  console.log("Connecting to Supabase...");

  const businessId = await resolveBusinessId();
  const scoped = <T extends object>(row: T) => ({ ...row, business_id: businessId });

  console.log("\nProvisioning dev login...");
  await ensureDevUser(businessId);

  // Limpar tabelas por ordem (FKs)
  const tables = ["ai_suggestions", "follow_ups", "messages", "conversations", "channels", "ai_settings"];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) {
      console.warn(`  ! Could not clear ${table}: ${error.message}`);
    } else {
      console.log(`  Cleared: ${table}`);
    }
  }

  // Conversations (sem follow_ups — vão para tabela separada)
  console.log("\nInserting conversations...");
  const convDocs = conversations.map((c) => {
    const { follow_ups: _, ...doc } = c;
    return validateContract(ConversationContract.docSchema.omit({ follow_ups: true } as never), doc, `seed:conv:${c.id}`);
  });
  const { error: convErr } = await supabase.from("conversations").insert(
    convDocs.map((c) => scoped({ ...c, contact: c.contact, product_interest: c.product_interest ?? null }))
  );
  if (convErr) throw convErr;
  console.log(`  ✓ ${convDocs.length} conversations`);

  // Follow-ups (extraídos das conversations)
  const allFollowUps = conversations.flatMap((c) => c.follow_ups);
  if (allFollowUps.length > 0) {
    const { error: fuErr } = await supabase.from("follow_ups").insert(allFollowUps.map(scoped));
    if (fuErr) throw fuErr;
    console.log(`  ✓ ${allFollowUps.length} follow_ups`);
  }

  // Messages
  console.log("Inserting messages...");
  const validatedMsgs = messages.map((m) =>
    validateContract(MessageContract.entitySchema, m, `seed:msg:${m.id}`)
  );
  const { error: msgErr } = await supabase.from("messages").insert(validatedMsgs.map(scoped));
  if (msgErr) throw msgErr;
  console.log(`  ✓ ${validatedMsgs.length} messages`);

  // Channels
  console.log("Inserting channels...");
  const validatedChannels = channels.map((ch) =>
    validateContract(ChannelContract.connectionSchema, ch, `seed:channel:${ch.platform}`)
  );
  const { error: chErr } = await supabase.from("channels").insert(validatedChannels.map(scoped));
  if (chErr) throw chErr;
  console.log(`  ✓ ${validatedChannels.length} channels`);

  // AI Settings
  console.log("Inserting AI settings...");
  const validatedSettings = validateContract(AISettingsContract.entitySchema, aiSettings, "seed:aiSettings");
  const { error: aiErr } = await supabase.from("ai_settings").insert(scoped(validatedSettings));
  if (aiErr) throw aiErr;
  console.log("  ✓ 1 ai_settings");

  // AI Suggestions
  console.log("Inserting AI suggestions...");
  const validatedSuggestions = aiSuggestions.map((s) =>
    validateContract(AISuggestionContract.entitySchema, s, `seed:suggestion:${s.conversation_id}`)
  );
  const { error: sugErr } = await supabase.from("ai_suggestions").insert(validatedSuggestions.map(scoped));
  if (sugErr) throw sugErr;
  console.log(`  ✓ ${validatedSuggestions.length} ai_suggestions`);

  console.log("\nSeed completed successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
