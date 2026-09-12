import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/app/globals.css";
import { AppSidebar } from "@/app/sidebar";
import { ConfirmToastProvider } from "@/components/shared/confirm-toast";
import { inboxConversationListService } from "@server/inbox/inbox-conversation-list.service";
import { currentUserService } from "@server/current-user.service";

export const metadata: Metadata = {
  title: "VendAI",
  description: "Unified customer inbox",
};

export const dynamic = "force-dynamic";

const appFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy guards protected routes. This layout only decides whether to
  // render the application shell; public pages such as /login remain bare.
  const user = await currentUserService.fetchCurrentUser();

  let content = children;
  if (user) {
    const conversations = await inboxConversationListService
      .fetchConversations()
      .catch(() => []);
    const unreadCount = conversations.filter((conversation) => conversation.unread).length;
    content = (
      <div
        className="flex h-screen bg-white overflow-hidden"
      >
        <AppSidebar
          unreadCount={unreadCount}
          email={user.email}
          businessName={user.business_name}
        />
        {children}
      </div>
    );
  }

  return (
    <html lang="en" className={appFont.className}>
      <body>
        <ConfirmToastProvider>{content}</ConfirmToastProvider>
      </body>
    </html>
  );
}
