import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ChannelContract,
  validateContract,
  type ChannelConnection,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";
import { InboxService } from "@/app/inbox/inbox.service";
import { InboxContract, type InboxChannel } from "@core/contracts/inbox.contract";

type ChannelDoc = ChannelConnection & { id: string };

class SettingsChannelsService {
  private readonly channels = new BaseRepository<ChannelConnection>({
    table: "channels",
    client: createSupabaseServerClient,
  });


  async fetchChannels(): Promise<ChannelConnection[]> {
    const docs = await this.channels.findAll<ChannelDoc>();
    const channels = docs.map((doc) => ChannelContract.connectionSchema.parse(doc));
    const supported: InboxChannel[] = ["whatsapp", "instagram"];
    return supported.map((platform) => channels.find((channel) => channel.platform === platform) ?? ({
      platform,
      connected: false,
      provider: process.env.INBOX_PROVIDER ?? "unipile",
      connection_status: "disconnected",
    }));
  }

  async connectChannel(platform: string): Promise<string> {
    validateContract(ChannelContract.connectRequestSchema, { platform }, "SettingsChannelsService.connectChannel");
    const channel = InboxContract.channelSchema.parse(platform);
    return new InboxService().connect(channel);
  }

  async disconnectChannel(platform: string): Promise<void> {
    validateContract(ChannelContract.connectRequestSchema, { platform }, "SettingsChannelsService.disconnectChannel");
    const channel = InboxContract.channelSchema.parse(platform);
    await new InboxService().disconnect(channel);
  }

}

export const settingsChannelsService = new SettingsChannelsService();
