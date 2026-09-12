import type { ChannelConnection, InboxConnectionStatus } from "@core/contracts";

export type InboxEmptyState =
  | "inbox"
  | "connect"
  | "connecting"
  | "waiting"
  | "reconnect"
  | "error";

export function resolveInboxEmptyState(
  connectionStatus: InboxConnectionStatus,
  conversationCount: number,
  loadFailed: boolean,
): InboxEmptyState {
  if (loadFailed) return "error";
  if (conversationCount > 0) return "inbox";
  if (connectionStatus === "connected") return "waiting";
  if (connectionStatus === "connecting" || connectionStatus === "syncing") {
    return "connecting";
  }
  if (connectionStatus === "reconnect_required" || connectionStatus === "error") {
    return "reconnect";
  }
  return "connect";
}

export function connectionNeedsAttention(status: InboxConnectionStatus): boolean {
  return status === "reconnect_required" || status === "error";
}

export function resolveInboxConnectionStatus(
  channels: ChannelConnection[],
): InboxConnectionStatus {
  const statuses = channels.map((channel) => channel.connection_status ?? "disconnected");
  if (channels.some((channel) => channel.connected) || statuses.includes("connected")) {
    return "connected";
  }
  if (statuses.includes("syncing")) return "syncing";
  if (statuses.includes("connecting")) return "connecting";
  if (statuses.includes("reconnect_required")) return "reconnect_required";
  if (statuses.includes("error")) return "error";
  return "disconnected";
}
