import type { ChannelConnection, AISettings } from "@/types";
import { MOCK_CHANNELS, MOCK_AI_SETTINGS } from "@/lib/mock-data";

class SettingsChannelsService {
  async fetchChannels(): Promise<ChannelConnection[]> {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_CHANNELS;
  }

  async connectChannel(platform: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 1200));
    console.log("[service] connectChannel", platform);
  }

  async disconnectChannel(platform: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 800));
    console.log("[service] disconnectChannel", platform);
  }

  async fetchAISettings(): Promise<AISettings> {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_AI_SETTINGS;
  }

  async saveAISettings(settings: AISettings): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    console.log("[service] saveAISettings", settings);
  }
}

export const settingsChannelsService = new SettingsChannelsService();
