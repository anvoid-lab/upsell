import type { Metadata } from "next";
import "@/app/globals.css";
import { AppSidebar } from "@/app/sidebar";
import { ConfirmToastProvider } from "@/components/shared/confirm-toast";
import { inboxConversationListService } from "@/app/inbox/inbox-conversation-list.service";

export const metadata: Metadata = {
  title: "VendAI Dashboard",
  description: "Unified inbox and AI sales assistant",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const conversations = await inboxConversationListService.fetchConversations();
  const unreadCount = inboxConversationListService.countUnread(conversations);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ConfirmToastProvider>
          <div
            className="flex h-screen bg-white overflow-hidden"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            <AppSidebar unreadCount={unreadCount} />
            {children}
          </div>
        </ConfirmToastProvider>
      </body>
    </html>
  );
}
