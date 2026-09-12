import type { Metadata } from "next";
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
    const conversations =
      await inboxConversationListService.fetchConversations();
    const unreadCount = conversations.filter((conversation) => conversation.unread).length;
    content = (
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
    );
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <ConfirmToastProvider>{content}</ConfirmToastProvider>
      </body>
    </html>
  );
}
