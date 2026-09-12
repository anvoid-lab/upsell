"use client";

import { useEffect, useRef, useState } from "react";
import { startIntegrationAction, integrationStatusAction } from "./actions";
import type { InboxChannel } from "@core/contracts/inbox.contract";

export function useIntegration(channel: InboxChannel, result?: string) {
  const [status, setStatus] = useState(result === "error" ? "error" : result === "success" ? "waiting" : "ready");
  const [error, setError] = useState<string | null>(result === "error" ? "Connection was not completed. Please try again." : null);
  const [url, setUrl] = useState<string | null>(null);
  const mounted = useRef(true);
  const starting = useRef(false);
  const popup = useRef<Window | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      popup.current?.close();
      popup.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "waiting" && status !== "syncing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 10 * 60 * 1000;
    async function poll() {
      try {
        const current = await integrationStatusAction(channel);
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
  }, [channel, status]);

  useEffect(() => {
    if (status !== "waiting" && status !== "syncing") return;
    const openedPopup = popup.current;
    if (!openedPopup) return;
    const timer = window.setInterval(() => {
      if (popup.current === openedPopup && openedPopup.closed) {
        popup.current = null;
        setStatus("popup_closed");
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [status]);

  async function start() {
    if (starting.current) return;
    starting.current = true;
    setError(null);
    setUrl(null);
    setStatus("preparing");
    // Open during the user gesture, before awaiting the server action.
    const width = 520;
    const height = 760;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    popup.current = window.open(
      "about:blank",
      "_blank",
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
    if (popup.current) popup.current.opener = null;
    try {
      const link = await startIntegrationAction(channel);
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

  return { status, error, url, start };
}
