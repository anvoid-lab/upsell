"use client";

import { useState, useEffect } from "react";
import type { ChannelConnection, AISettings } from "@/types";
import { settingsChannelsService } from "./settings-channels.service";

interface UseSettingsReturn {
  channels: ChannelConnection[];
  aiSettings: AISettings | null;
  isLoading: boolean;
  isSaving: boolean;
  saved: boolean;
  handleConnect: (platform: string) => Promise<void>;
  handleDisconnect: (platform: string) => Promise<void>;
  updateAISetting: <K extends keyof AISettings>(key: K, value: AISettings[K]) => void;
  handleSaveAI: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsChannelsService.fetchChannels(),
      settingsChannelsService.fetchAISettings(),
    ]).then(([ch, ai]) => {
      setChannels(ch);
      setAISettings(ai);
      setIsLoading(false);
    });
  }, []);

  const handleConnect = async (platform: string) => {
    await settingsChannelsService.connectChannel(platform);
    setChannels((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, connected: true, accountName: "Connected account", connectedAt: "Just now" }
          : c
      )
    );
  };

  const handleDisconnect = async (platform: string) => {
    await settingsChannelsService.disconnectChannel(platform);
    setChannels((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, connected: false, accountName: undefined, connectedAt: undefined }
          : c
      )
    );
  };

  const updateAISetting = <K extends keyof AISettings>(
    key: K,
    value: AISettings[K]
  ) => {
    setAISettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSaveAI = async () => {
    if (!aiSettings) return;
    setIsSaving(true);
    await settingsChannelsService.saveAISettings(aiSettings);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return {
    channels,
    aiSettings,
    isLoading,
    isSaving,
    saved,
    handleConnect,
    handleDisconnect,
    updateAISetting,
    handleSaveAI,
  };
}
