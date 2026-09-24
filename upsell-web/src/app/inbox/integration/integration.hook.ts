"use client";

import { useEffect, useRef, useState } from "react";
import { cancelIntegrationAction, startIntegrationAction, integrationStatusAction } from "./actions";
import type { InboxChannel } from "../../../core/contracts/inbox.contract";

export const INBOX_INTEGRATION_POPUP_NAME = "inbox-channel-integration";
export const INBOX_INTEGRATION_SAME_TAB_KEY = "inbox-integration-same-tab";
export const integrationSuccessKey = (channel: InboxChannel) => `inbox-integration-success:${channel}`;
export const INBOX_INTEGRATION_SUCCESS = "INBOX_INTEGRATION_SUCCESS";
export const INBOX_INTEGRATION_CANCELLED = "INBOX_INTEGRATION_CANCELLED";

export function useIntegration(channel: InboxChannel, result?: string) {
  const [status, setStatus] = useState(result === "error" ? "error" : result === "success" ? "waiting" : "ready");
  const [error, setError] = useState<string | null>(result === "error" ? "Connection was not completed. Please try again." : null);
  const [url, setUrl] = useState<string | null>(null);
  const mounted = useRef(true);
  const starting = useRef(false);
  const popup = useRef<Window | null>(null);
  const popupCompleted = useRef(false);
  const [activeChannel, setActiveChannel] = useState(channel);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      popup.current?.close();
      popup.current = null;
    };
  }, []);

  useEffect(() => {
    async function handlePopupMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== popup.current) return;
      if (event.data?.channel !== activeChannel) return;
      if (event.data?.type !== INBOX_INTEGRATION_SUCCESS
        && event.data?.type !== INBOX_INTEGRATION_CANCELLED) return;

      popupCompleted.current = true;
      popup.current?.close();
      popup.current = null;

      if (event.data.type === INBOX_INTEGRATION_SUCCESS) {
        setStatus("syncing");
        return;
      }

      try {
        await cancelIntegrationAction(activeChannel);
      } catch {
        // The next server refresh will reconcile a failed cancellation.
      }
      if (mounted.current) setStatus("popup_closed");
    }

    window.addEventListener("message", handlePopupMessage);
    return () => window.removeEventListener("message", handlePopupMessage);
  }, [activeChannel]);

  useEffect(() => {
    if (status !== "waiting" && status !== "syncing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 10 * 60 * 1000;
    async function poll() {
      try {
        const current = await integrationStatusAction(activeChannel);
        if (cancelled) return;
        if (current === "connected") {
          popup.current?.close();
          popup.current = null;
          setStatus("connected");
          return;
        }
        if (current === "error" || current === "reconnect_required" || current === "disconnected") {
          throw new Error("Connection was interrupted. Please try again.");
        }
        if (Date.now() > deadline) throw new Error("Connection timed out. Please try again.");
        // Keep one polling loop alive while the provider synchronizes.
        if (current === "syncing") setStatus("syncing");
        timer = setTimeout(poll, 2500);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unable to check the connection.");
        setStatus("error");
      }
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeChannel, status]);

  useEffect(() => {
    if (status !== "waiting" && status !== "syncing") return;
    const openedPopup = popup.current;
    if (!openedPopup) return;
    const timer = window.setInterval(async () => {
      if (popup.current === openedPopup && openedPopup.closed) {
        popup.current = null;
        const authenticationCompleted = popupCompleted.current
          || window.localStorage.getItem(integrationSuccessKey(activeChannel)) === "true";
        window.localStorage.removeItem(integrationSuccessKey(activeChannel));
        if (!authenticationCompleted) {
          try {
            await cancelIntegrationAction(activeChannel);
          } catch {
            // The local flow must still leave its loading state. A later status
            // refresh can reconcile a failed cancellation with the server.
          }
          setStatus("popup_closed");
          return;
        }
        try {
          const current = await integrationStatusAction(activeChannel);
          if (current === "connected") {
            setStatus("connected");
          } else if (current === "connecting" || current === "syncing") {
            // Hosted Auth may close before the provider owner identity is
            // available. Keep polling until the server validates it.
            setStatus("syncing");
          } else {
            setStatus("popup_closed");
          }
        } catch {
          setStatus("popup_closed");
        }
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [activeChannel, status]);

  async function start(selectedChannel: InboxChannel = channel) {
    if (starting.current) return;
    starting.current = true;
    setActiveChannel(selectedChannel);
    setError(null);
    setUrl(null);
    setStatus("preparing");

    popupCompleted.current = false;
    window.localStorage.removeItem(integrationSuccessKey(selectedChannel));
    window.sessionStorage.removeItem(INBOX_INTEGRATION_SAME_TAB_KEY);
    // Open during the user gesture, before awaiting the server action.
    const width = 520;
    const height = 760;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    popup.current = window.open(
      "about:blank",
      INBOX_INTEGRATION_POPUP_NAME,
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup.current) {
      setError("The authentication popup was blocked. Please allow popups and try again.");
      setStatus("error");
      starting.current = false;
      return;
    }

    try {
      const link = await startIntegrationAction(selectedChannel);

      if (!mounted.current) {
        popup.current?.close();
        return;
      }

      setUrl(link);

      if (popup.current && !popup.current.closed) popup.current.location.replace(link);

      setStatus("waiting");
    } catch {
      popup.current?.close();
      if (mounted.current) {
        setError("Unable to start the connection. Please try again.");
        setStatus("error");
      }
    } finally {
      starting.current = false;
    }
  }

  function reset() {
    popup.current?.close();
    popup.current = null;
    setError(null);
    setUrl(null);
    setStatus("ready");
  }

  return { status, error, url, start, reset };
}
