import "server-only";

import { BaseRepository } from "@core/repository";
import {
  AISettingsContract,
  ChannelContract,
  validateContract,
  type AISettings,
  type ChannelConnection,
} from "@core/contracts";
import { mongodbConnection } from "@db/client";
import { MOCK_CHANNELS, MOCK_AI_SETTINGS } from "@/lib/mock-data";

class SettingsChannelsService {
  private readonly channels = new BaseRepository<ChannelConnection>({
    collection: "channels",
    client: mongodbConnection,
  });

  private readonly aiSettings = new BaseRepository<AISettings>({
    collection: "aiSettings",
    client: mongodbConnection,
  });

  async fetchChannels(): Promise<ChannelConnection[]> {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_CHANNELS.map((channel) => ChannelContract.connectionSchema.parse(channel));
  }

  async connectChannel(platform: string): Promise<void> {
    validateContract(
      ChannelContract.connectRequestSchema,
      { platform },
      "SettingsChannelsService.connectChannel",
    );
    await new Promise((r) => setTimeout(r, 1200));
  }

  async disconnectChannel(platform: string): Promise<void> {
    validateContract(
      ChannelContract.connectRequestSchema,
      { platform },
      "SettingsChannelsService.disconnectChannel",
    );
    await new Promise((r) => setTimeout(r, 800));
  }

  async fetchAISettings(): Promise<AISettings> {
    await new Promise((r) => setTimeout(r, 200));
    return AISettingsContract.entitySchema.parse(MOCK_AI_SETTINGS);
  }

  async saveAISettings(settings: AISettings): Promise<void> {
    validateContract(
      AISettingsContract.entitySchema,
      settings,
      "SettingsChannelsService.saveAISettings",
    );
    await new Promise((r) => setTimeout(r, 600));
  }
}

export const settingsChannelsService = new SettingsChannelsService();
