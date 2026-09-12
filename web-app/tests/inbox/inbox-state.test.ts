import { describe, expect, it } from "vitest";
import {
  connectionNeedsAttention,
  resolveInboxEmptyState,
} from "../../src/app/inbox/inbox-state";

describe("inbox empty states", () => {
  it("distinguishes connection, progress, waiting, reconnection, and load errors", () => {
    expect(resolveInboxEmptyState("disconnected", 0, false)).toBe("connect");
    expect(resolveInboxEmptyState("connecting", 0, false)).toBe("connecting");
    expect(resolveInboxEmptyState("syncing", 0, false)).toBe("connecting");
    expect(resolveInboxEmptyState("connected", 0, false)).toBe("waiting");
    expect(resolveInboxEmptyState("reconnect_required", 0, false)).toBe("reconnect");
    expect(resolveInboxEmptyState("error", 0, false)).toBe("reconnect");
    expect(resolveInboxEmptyState("connected", 0, true)).toBe("error");
  });

  it("keeps existing conversations available regardless of connection status", () => {
    expect(resolveInboxEmptyState("connected", 2, false)).toBe("inbox");
    expect(resolveInboxEmptyState("reconnect_required", 2, false)).toBe("inbox");
    expect(connectionNeedsAttention("reconnect_required")).toBe(true);
    expect(connectionNeedsAttention("error")).toBe(true);
    expect(connectionNeedsAttention("connected")).toBe(false);
  });
});
