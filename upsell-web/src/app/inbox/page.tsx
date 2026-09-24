import { inboxConversationListService } from '@/server/inbox/inbox-conversation-list.service';
import { settingsChannelsService } from '@/server/settings-channels.service';
import { InboxView } from './inbox-view';

export default async function InboxPage() {
  const [conversationsResult, channelsResult] = await Promise.allSettled([
    inboxConversationListService.fetchConversations(),
    settingsChannelsService.fetchChannels(),
  ]);

  return (
    <InboxView
      initialConversations={
        conversationsResult.status === 'fulfilled'
          ? conversationsResult.value
          : []
      }
      initialChannels={
        channelsResult.status === 'fulfilled' ? channelsResult.value : []
      }
      initialLoadFailed={
        conversationsResult.status === 'rejected' ||
        channelsResult.status === 'rejected'
      }
    />
  );
}
