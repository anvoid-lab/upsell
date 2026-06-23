"use server";

import { settingsChannelsService } from "./settings-channels.service";
import type { AISettings } from "@core/contracts";

export async function connectChannelAction(platform: string): Promise<void> {
  await settingsChannelsService.connectChannel(platform);
}

export async function disconnectChannelAction(platform: string): Promise<void> {
  await settingsChannelsService.disconnectChannel(platform);
}

export async function saveAISettingsAction(settings: AISettings): Promise<void> {
  await settingsChannelsService.saveAISettings(settings);
}
