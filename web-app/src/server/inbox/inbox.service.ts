import "server-only";

import { createSupabaseServerClient, createSupabaseServiceClient } from "@db/client";
import { InboxContract } from "@core/contracts/inbox.contract";
import type { InboxProvider, InboxProviderName, HostedAuthRequest, ProviderEvent, ProviderMessageEvent, InboxConnectionStatus, InboxChannel } from "@core/contracts/inbox.contract";
import { UnipileInboxProvider } from "./providers/unipile";
import { createHostedAuthState, verifyHostedAuthState } from "./hosted-auth-state";
import { inboxSyncService } from "./sync.service";

type ChannelRow = {
  id: string;
  business_id: string;
  provider: string;
  provider_account_id: string | null;
};

function appUrl() {
  const value = process.env.APP_URL?.replace(/\/$/, "");
  if (!value) throw new Error("APP_URL must be configured on the server.");
  return value;
}

async function authenticatedBusinessId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Invalid session.");
  const { data, error } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();
  if (error || !data?.business_id) throw new Error("User does not belong to a business.");
  return data.business_id as string;
}

const AVATARS = [
  ["#dcfce7", "#15803d"],
  ["#dbeafe", "#1d4ed8"],
  ["#fce7f3", "#be185d"],
] as const;

export class InboxService implements InboxProvider {
  private readonly provider: InboxProvider;

  constructor(name = process.env.INBOX_PROVIDER ?? "unipile") {
    if (name !== "unipile") throw new Error(`Unsupported inbox provider: ${name}`);
    this.provider = new UnipileInboxProvider();
  }

  get name(): InboxProviderName { return this.provider.name; }
  async connect(channel: InboxChannel = "whatsapp"): Promise<string> {
    const businessId = await authenticatedBusinessId();
    const supabase = await createSupabaseServerClient();
    const { data: existingChannel, error } = await supabase
      .from("channels")
      .select("id, business_id, provider, provider_account_id")
      .eq("business_id", businessId)
      .eq("platform", channel)
      .eq("provider", this.name)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;

    let row = existingChannel as ChannelRow | null;
    if (!row) {
      const { data: created, error: createError } = await supabase
        .from("channels")
        .insert({
          platform: channel,
          business_id: businessId,
          provider: this.name,
          connected: false,
          connection_status: "connecting",
        })
        .select("id, business_id, provider, provider_account_id")
        .single();
      if (createError) throw createError;
      row = created as ChannelRow;
    } else {
      const { error: updateError } = await supabase
        .from("channels")
        .update({ connection_status: "connecting" })
        .eq("id", row.id);
      if (updateError) throw updateError;
    }

    if (row.business_id !== businessId) throw new Error("Account does not belong to the authenticated business.");
    const state = await createHostedAuthState(businessId, row.id, this.name, channel);
    const base = appUrl();
    const integrationUrl = `${base}/inbox/integration?channel=${encodeURIComponent(channel)}`;
    const provider = this.provider;
    try {
      await provider.ensureWebhooks(`${base}/inbox/webhooks/channel`);
      return await provider.createHostedAuthLink({
        channel,
        state,
        reconnectAccountId: row.provider_account_id ?? undefined,
        notifyUrl: `${base}/inbox/webhooks/channel?event=connection`,
        successRedirectUrl: `${integrationUrl}&result=success`,
        failureRedirectUrl: `${integrationUrl}&result=error`,
      });
    } catch (error) {
      await supabase.from("channels").update({ connection_status: "error" })
        .eq("id", row.id).eq("business_id", businessId);
      throw error;
    }
  }

  async receiveConnectionStatus(payload: unknown): Promise<void> {
    const parsed = InboxContract.hostedAuthCallbackSchema.parse(payload);
    const state = await verifyHostedAuthState(parsed.name);
    if (state.provider !== this.name) throw new Error("Invalid state provider.");
    const provider = this.provider;
    const account = await provider.getAccount(parsed.account_id);
    if (account.channel !== state.channel) throw new Error("Invalid account channel.");
    const supabase = createSupabaseServiceClient();
    const { data: channel, error } = await supabase
      .from("channels")
      .select("id")
      .eq("business_id", state.businessId)
      .eq("id", state.channelId)
      .eq("platform", state.channel)
      .eq("provider", provider.name)
      .is("deleted_at", null)
      .single();
    if (error || !channel) throw error ?? new Error("Channel not found.");
    const connected = account.status === "connected" || account.status === "syncing";
    const { error: updateError } = await supabase.from("channels").update({
      provider_account_id: account.id,
      account_name: account.name,
      provider_metadata: account.metadata,
      connection_status: account.status,
      connected,
      connected_at: connected ? new Date().toISOString() : null,
    }).eq("id", channel.id).eq("business_id", state.businessId);
    if (updateError) throw updateError;
  }

  async syncHistory(channel: InboxChannel = "whatsapp"): Promise<void> {
    const businessId = await authenticatedBusinessId();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("channels")
      .select("provider, provider_account_id")
      .eq("provider", this.name)
      .eq("business_id", businessId).eq("platform", channel)
      .is("deleted_at", null).single();
    if (error || !data?.provider_account_id) throw new Error(`Connect ${channelLabel(channel)} before importing history.`);
    await inboxSyncService.syncAccount(this.provider, data.provider_account_id, channel);
  }

  async disconnect(channel: InboxChannel = "whatsapp"): Promise<void> {
    const businessId = await authenticatedBusinessId();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("channels")
      .select("id, provider, provider_account_id")
      .eq("provider", this.name)
      .eq("business_id", businessId)
      .eq("platform", channel)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    if (data.provider_account_id) {
      await this.provider.disconnectAccount(data.provider_account_id);
    }
    const { error: updateError } = await supabase.from("channels").update({
      provider_account_id: null,
      provider_metadata: {},
      account_name: null,
      connected: false,
      connected_at: null,
      connection_status: "disconnected",
    }).eq("id", data.id).eq("business_id", businessId);
    if (updateError) throw updateError;
  }

  async connectionStatus(channel: InboxChannel = "whatsapp"): Promise<InboxConnectionStatus> {
    const businessId = await authenticatedBusinessId();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("channels")
      .select("connection_status").eq("business_id", businessId)
      .eq("provider", this.name).eq("platform", channel)
      .is("deleted_at", null).maybeSingle();
    if (error) throw error;
    return InboxContract.connectionStatusSchema.parse(data?.connection_status ?? "disconnected");
  }

  receiveWebhook(headers: Headers, payload: unknown) {
    if (!this.verifyWebhook(headers)) throw new Error("Webhook authentication failed.");
    const event = this.parseWebhook(payload);
    return event ? this.persist(this.name, event) : Promise.resolve("ignored" as const);
  }

  async handleWebhook(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const connectionStatus = url.searchParams.get("event") === "connection";
    if (!connectionStatus && !this.verifyWebhook(request.headers)) {
      return Response.json({ error: "Invalid webhook authentication" }, { status: 401 });
    }
    // Bound memory usage even if the sender omits Content-Length.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256 * 1024) {
          await reader.cancel();
          return Response.json({ error: "Payload too large" }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    let payload: unknown;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return Response.json({ error: "Malformed JSON" }, { status: 400 }); }
    try {
      if (connectionStatus) {
        await this.receiveConnectionStatus(payload);
        return Response.json({ status: "accepted" });
      }
      return Response.json({ status: await this.receiveWebhook(request.headers, payload) });
    } catch {
      return Response.json({ error: connectionStatus ? "Invalid connection callback" : "Event processing failed" },
        { status: connectionStatus ? 401 : 503 });
    }
  }
  private async persist(providerName: string, event: ProviderEvent) {
    const supabase = createSupabaseServiceClient();
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, business_id")
      .eq("provider", providerName)
      .eq("provider_account_id", event.providerAccountId)
      .eq("platform", event.channel)
      .is("deleted_at", null)
      .maybeSingle();
    if (channelError) throw channelError;
    if (!channel) throw new Error("Webhook account is not associated with a business.");

    if (event.type === "account_status") {
      const connected = event.status === "connected" || event.status === "syncing";
      const { error } = await supabase.from("channels").update({
        connection_status: event.status,
        connected,
      }).eq("id", channel.id).eq("business_id", channel.business_id);
      if (error) throw error;
      return "accepted" as const;
    }

    return this.persistMessage(channel.id as string, channel.business_id as string, event);
  }

  private async persistMessage(channelId: string, businessId: string, event: ProviderMessageEvent) {
    const supabase = createSupabaseServiceClient();
    let { data: conversation, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("channel_id", channelId)
      .eq("channel_conversation_id", event.externalChatId)
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;

    if (!conversation) {
      if (event.direction === "out") return "ignored" as const;
      const color = AVATARS[hash(event.sender.id) % AVATARS.length];
      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({
          business_id: businessId,
          channel_id: channelId,
          channel_conversation_id: event.externalChatId,
          contact: {
            id: event.sender.id,
            name: event.sender.name,
            initials: initials(event.sender.name),
            avatar_bg: color[0],
            avatar_color: color[1],
            platform: event.channel,
            ...(event.channel === "whatsapp" ? { phone: event.sender.id } : { username: event.sender.id }),
            first_contact: event.occurredAt.toISOString(),
            status: "new",
          },
          last_message: event.text,
          last_message_at: event.occurredAt.toISOString(),
          status: "open",
          unread: true,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      conversation = created;
    }

    const { error: insertError } = await supabase.from("messages").insert({
      business_id: businessId,
      channel_id: channelId,
      conversation_id: conversation.id,
      channel_message_id: event.externalMessageId,
      content: event.text,
      direction: event.direction,
      timestamp: event.occurredAt.toISOString(),
      read: event.direction === "out",
    });
    if (insertError?.code === "23505") return "duplicate" as const;
    if (insertError) throw insertError;

    const { error: updateError } = await supabase.from("conversations").update({
      last_message: event.text,
      last_message_at: event.occurredAt.toISOString(),
      ...(event.direction === "in" ? { unread: true } : {}),
    }).eq("id", conversation.id).eq("business_id", businessId);
    if (updateError) throw updateError;
    return "accepted" as const;
  }
  ensureWebhooks(url: string) { return this.provider.ensureWebhooks(url); }
  listChats(accountId: string, channel: InboxChannel) { return this.provider.listChats(accountId, channel); }
  listMessages(chatId: string) { return this.provider.listMessages(chatId); }
  createHostedAuthLink(input: HostedAuthRequest) { return this.provider.createHostedAuthLink(input); }
  getAccount(accountId: string) { return this.provider.getAccount(accountId); }
  disconnectAccount(accountId: string) { return this.provider.disconnectAccount(accountId); }
  sendMessage(input: Parameters<InboxProvider["sendMessage"]>[0]) { return this.provider.sendMessage(input); }
  markChatRead(input: Parameters<InboxProvider["markChatRead"]>[0]) { return this.provider.markChatRead(input); }
  verifyWebhook(headers: Headers) { return this.provider.verifyWebhook(headers); }
  parseWebhook(payload: unknown) { return this.provider.parseWebhook(payload); }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "?"}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

function channelLabel(channel: InboxChannel) {
  return channel === "whatsapp" ? "WhatsApp" : "Instagram";
}
