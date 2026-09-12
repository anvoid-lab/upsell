import type { InboxConnectionStatus } from "@core/contracts";

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
