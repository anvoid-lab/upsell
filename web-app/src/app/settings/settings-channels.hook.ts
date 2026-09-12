"use client";

import { useEffect, useState } from "react";
import type { ChannelConnection } from "@/types";
import { disconnectChannelAction, syncInboxHistoryAction } from "./actions";

interface UseSettingsReturn {
  channels: ChannelConnection[];
  handleDisconnect: (platform: string) => Promise<void>;
  handleSync: (platform: string) => Promise<void>;
  syncing: string | null;
  error: string | null;
}

export function useSettings(
  initialChannels: ChannelConnection[],
): UseSettingsReturn {
  const [channels, setChannels] = useState<ChannelConnection[]>(initialChannels);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setChannels(initialChannels), [initialChannels]);

  const handleSync = async (platform: string) => {
    if (syncing) return;
    setSyncing(platform);
    setError(null);
    try { await syncInboxHistoryAction(platform); }
    catch { setError("History import failed. Please try again."); }
    finally { setSyncing(null); }
  };

  const handleDisconnect = async (platform: string) => {
    await disconnectChannelAction(platform);
    setChannels((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, connected: false, account_name: undefined, connected_at: undefined }
          : c,
      ),
    );
  };

  return {
    channels,
    handleDisconnect,
    handleSync,
    syncing,
    error,
  };
}
