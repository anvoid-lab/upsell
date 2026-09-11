"use server";

import { settingsChannelsService } from "./settings-channels.service";

export async function connectChannelAction(platform: string): Promise<void> {
  await settingsChannelsService.connectChannel(platform);
}

export async function disconnectChannelAction(platform: string): Promise<void> {
  await settingsChannelsService.disconnectChannel(platform);
}
