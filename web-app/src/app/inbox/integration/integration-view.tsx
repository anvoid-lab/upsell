"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { CheckCircle2, Instagram, Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIntegration } from "./integration.hook";
import type { InboxChannel } from "@core/contracts/inbox.contract";

const CHANNEL_DETAILS = {
  whatsapp: {
    label: "WhatsApp",
    Icon: MessageCircle,
    ready: "Have your phone ready to scan the QR code.",
  },
  instagram: {
    label: "Instagram",
    Icon: Instagram,
    ready: "Have your credentials ready and choose the country where you normally use Instagram when prompted.",
  },
} as const;

export function IntegrationView({
  channel = "whatsapp",
  onClose,
  result,
}: {
  channel?: InboxChannel;
  onClose?: () => void;
  result?: string;
}) {
  const router = useRouter();
  const details = CHANNEL_DETAILS[channel];
  const { status, error, url, start } = useIntegration(channel, result);
  const Icon = details.Icon;
  useEffect(() => {
    // A script-opened Hosted Auth window can close itself after Unipile redirects back.
    if (result === "success") window.close();
  }, [result]);
  useEffect(() => {
    if (status === "connected") router.refresh();
  }, [status, router]);
  const close = useCallback(() => {
    if (onClose) onClose();
    else router.replace("/inbox");
    router.refresh();
  }, [onClose, router]);
  useEffect(() => {
    if (status === "popup_closed") close();
  }, [close, status]);
  const pending = status === "preparing" || status === "waiting" || status === "syncing";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {details.label}</DialogTitle>
          <DialogDescription>Link your account to manage your conversations here.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6 text-center" aria-live="polite">
          {status === "connected"
            ? <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            : pending ? <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            : <Icon className="h-10 w-10 text-emerald-600" />}
          <p className="text-sm text-zinc-700">
            {status === "ready" && details.ready}
            {status === "preparing" && "Preparing your secure connection…"}
            {status === "waiting" && "Complete the connection in the authentication window. This dialog will update automatically."}
            {status === "syncing" && `${details.label} is synchronizing your account…`}
            {status === "connected" && `${details.label} is connected.`}
          </p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        {(status === "ready" || status === "error") && (
          <Button onClick={() => void start()}>{status === "error" ? "Try again" : `Continue with ${details.label}`}</Button>
        )}
        {url && (status === "waiting" || status === "syncing") && (
          <div className="space-y-2 text-center">
            <p className="text-xs text-zinc-500">If the authentication window did not open:</p>
            <Button variant="outline" onClick={() => window.location.assign(url)}>Continue in this tab</Button>
          </div>
        )}
        {status === "connected" && <Button onClick={close}>Done</Button>}
      </DialogContent>
    </Dialog>
  );
}
