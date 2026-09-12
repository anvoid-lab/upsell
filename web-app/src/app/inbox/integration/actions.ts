"use server";

import { InboxService } from "@server/inbox/inbox.service";
import { InboxContract } from "@core/contracts/inbox.contract";

export async function startIntegrationAction(channel: unknown) {
  return new InboxService().connect(InboxContract.channelSchema.parse(channel));
}

export async function integrationStatusAction(channel: unknown) {
  return new InboxService().connectionStatus(InboxContract.channelSchema.parse(channel));
}
