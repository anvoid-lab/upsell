import { InboxService } from "../inbox.service";
import { IntegrationView } from "./integration-view";
import { InboxContract } from "@core/contracts/inbox.contract";

export default async function IntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; result?: string }>;
}) {
  const { channel: rawChannel, result } = await searchParams;
  const channel = InboxContract.channelSchema.catch("whatsapp").parse(rawChannel);
  // Validate the session even when this view is visited directly.
  await new InboxService().connectionStatus(channel);
  return <IntegrationView channel={channel} result={result} />;
}
