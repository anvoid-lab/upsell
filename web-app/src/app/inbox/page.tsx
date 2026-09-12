import { inboxConversationListService } from "@server/inbox/inbox-conversation-list.service";
import { InboxView } from "./inbox-view";

export default async function InboxPage() {
  const conversations = await inboxConversationListService.fetchConversations();
  return <InboxView initialConversations={conversations} />;
}
