"use client";

import { useState } from "react";
import type { ChannelConnection, AISettings } from "@/types";
import { connectChannelAction, disconnectChannelAction, saveAISettingsAction } from "./actions";

interface UseSettingsReturn {
  channels: ChannelConnection[];
  aiSettings: AISettings;
  isSaving: boolean;
  saved: boolean;
  handleConnect: (platform: string) => Promise<void>;
  handleDisconnect: (platform: string) => Promise<void>;
  updateAISetting: <K extends keyof AISettings>(key: K, value: AISettings[K]) => void;
  handleSaveAI: () => Promise<void>;
}

export function useSettings(
  initialChannels: ChannelConnection[],
  initialAISettings: AISettings,
): UseSettingsReturn {
  const [channels, setChannels] = useState<ChannelConnection[]>(initialChannels);
  const [aiSettings, setAISettings] = useState<AISettings>(initialAISettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const updateAISetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setAISettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSaveAI = async () => {
    setIsSaving(true);
    await saveAISettingsAction(aiSettings);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return {
    channels,
    aiSettings,
    isSaving,
    saved,
    handleConnect,
    handleDisconnect,
    updateAISetting,
    handleSaveAI,
  };
}
