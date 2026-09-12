import { inboxConversationListService } from "@server/inbox/inbox-conversation-list.service";
import { InboxService } from "@server/inbox/inbox.service";
import { InboxView } from "./inbox-view";

export default async function InboxPage() {
  const [conversationsResult, connectionResult] = await Promise.allSettled([
    inboxConversationListService.fetchConversations(),
    new InboxService().connectionStatus("instagram"),
  ]);

  return (
    <InboxView
      initialConversations={
        conversationsResult.status === "fulfilled" ? conversationsResult.value : []
      }
      initialConnectionStatus={
        connectionResult.status === "fulfilled" ? connectionResult.value : "error"
      }
      initialLoadFailed={
        conversationsResult.status === "rejected" || connectionResult.status === "rejected"
      }
    />
  );
}
