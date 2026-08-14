export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/sidebar";
import { ConfirmToastProvider } from "@/components/shared/confirm-toast";
import { inboxConversationListService } from "@/app/(app)/inbox/inbox-conversation-list.service";
import { currentUserService } from "@/app/(app)/current-user.service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O proxy já protege estas rotas; esta verificação é a rede de segurança para
  // o caso de a sessão expirar entre o middleware e o render.
  const user = await currentUserService.fetchCurrentUser();
  if (!user) redirect("/login");

  const conversations = await inboxConversationListService.fetchConversations();
  const unreadCount = inboxConversationListService.countUnread(conversations);

  return (
    <ConfirmToastProvider>
      <div
        className="flex h-screen bg-white overflow-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <AppSidebar
          unreadCount={unreadCount}
          email={user.email}
          businessName={user.business_name}
        />
        {children}
      </div>
    </ConfirmToastProvider>
  );
}
