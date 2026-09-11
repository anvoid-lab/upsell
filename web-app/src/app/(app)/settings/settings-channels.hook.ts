"use client";

import { useState } from "react";
import type { ChannelConnection } from "@/types";
import { connectChannelAction, disconnectChannelAction } from "./actions";

interface UseSettingsReturn {
  channels: ChannelConnection[];
  handleConnect: (platform: string) => Promise<void>;
  handleDisconnect: (platform: string) => Promise<void>;
}

export function useSettings(
  initialChannels: ChannelConnection[],
): UseSettingsReturn {
  const [channels, setChannels] = useState<ChannelConnection[]>(initialChannels);

  const handleConnect = async (platform: string) => {
    await connectChannelAction(platform);
    setChannels((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, connected: true, account_name: "Connected account", connected_at: new Date() }
          : c,
      ),
    );
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
    handleConnect,
    handleDisconnect,
  };
}
