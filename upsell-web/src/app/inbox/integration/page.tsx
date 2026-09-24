import { InboxService } from '@/server/inbox/inbox.service';
import { IntegrationView } from './integration-view';
import {
  DEFAULT_INBOX_CHANNEL,
  InboxContract,
} from '../../../core/contracts/inbox.contract';

export default async function IntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; result?: string; popup?: string }>;
}) {
  const { channel: rawChannel, result, popup } = await searchParams;
  const channel = InboxContract.channelSchema
    .catch(DEFAULT_INBOX_CHANNEL)
    .parse(rawChannel);
  // Validate the session even when this view is visited directly.
  await new InboxService().connectionStatus(channel);
  return (
    <IntegrationView
      channel={channel}
      result={result}
      popupReturn={popup === 'true'}
    />
  );
}
