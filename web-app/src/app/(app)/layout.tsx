export const dynamic = "force-dynamic";

import { AppSidebar } from "@/app/sidebar";
import { ConfirmToastProvider } from "@/components/shared/confirm-toast";
import { inboxConversationListService } from "@/app/(app)/inbox/inbox-conversation-list.service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const conversations = await inboxConversationListService.fetchConversations();
  const unreadCount = inboxConversationListService.countUnread(conversations);

  return (
    <ConfirmToastProvider>
      <div
        className="flex h-screen bg-white overflow-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <AppSidebar unreadCount={unreadCount} />
        {children}
      </div>
    </ConfirmToastProvider>
  );
}
