"use server";

import { settingsChannelsService } from "./settings-channels.service";
import { InboxService } from "@server/inbox/inbox.service";
import { InboxContract } from "@core/contracts/inbox.contract";

export async function syncInboxHistoryAction(platform: unknown): Promise<void> {
  await new InboxService().syncHistory(InboxContract.channelSchema.parse(platform));
}

export async function connectChannelAction(platform: string): Promise<string> {
  return settingsChannelsService.connectChannel(platform);
}

export async function disconnectChannelAction(platform: string): Promise<void> {
  await settingsChannelsService.disconnectChannel(platform);
}
