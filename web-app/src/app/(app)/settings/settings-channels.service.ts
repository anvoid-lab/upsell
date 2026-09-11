import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ChannelContract,
  validateContract,
  type ChannelConnection,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";

type ChannelDoc = ChannelConnection & { id: string };

class SettingsChannelsService {
  private readonly channels = new BaseRepository<ChannelConnection>({
    table: "channels",
    client: createSupabaseServerClient,
  });


  async fetchChannels(): Promise<ChannelConnection[]> {
    const docs = await this.channels.findAll<ChannelDoc>();
    return docs.map((doc) => ChannelContract.connectionSchema.parse(doc));
  }

  async connectChannel(platform: string): Promise<void> {
    validateContract(ChannelContract.connectRequestSchema, { platform }, "SettingsChannelsService.connectChannel");
    const docs = await this.channels.findAll<ChannelDoc>({ filters: { platform } as Partial<ChannelConnection> });
    if (docs[0]) {
      await this.channels.update(docs[0].id, {
        connected: true,
        connected_at: new Date(),
      } as Partial<ChannelConnection>);
    }
  }

  async disconnectChannel(platform: string): Promise<void> {
    validateContract(ChannelContract.connectRequestSchema, { platform }, "SettingsChannelsService.disconnectChannel");
    const docs = await this.channels.findAll<ChannelDoc>({ filters: { platform } as Partial<ChannelConnection> });
    if (docs[0]) {
      await this.channels.update(docs[0].id, { connected: false } as Partial<ChannelConnection>);
    }
  }

}

export const settingsChannelsService = new SettingsChannelsService();
