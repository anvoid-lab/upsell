import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { createHostedAuthState, verifyHostedAuthState } from "../../src/app/inbox/hosted-auth-state";

const businessId = "11111111-1111-4111-8111-111111111111";
const channelId = "22222222-2222-4222-8222-222222222222";
const secret = "a".repeat(64);
beforeEach(() => {
  vi.stubEnv("INBOX_HOSTED_AUTH_SECRET", secret);
  vi.stubEnv("UNIPILE_WEBHOOK_SECRET", "b".repeat(64));
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("Hosted Auth state", () => {
  it("binds the business, exact channel and provider", async () => {
    const token = await createHostedAuthState(businessId, channelId, "unipile", "whatsapp");
    expect(await verifyHostedAuthState(token)).toEqual({ businessId, channelId, provider: "unipile", channel: "whatsapp" });
  });

  it("binds an Instagram integration to its channel", async () => {
    const token = await createHostedAuthState(businessId, channelId, "unipile", "instagram");
    expect(await verifyHostedAuthState(token)).toMatchObject({ channel: "instagram" });
  });

  it("rejects expired state", async () => {
    vi.useFakeTimers();
    const token = await createHostedAuthState(businessId, channelId, "unipile", "whatsapp");
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    await expect(verifyHostedAuthState(token)).rejects.toThrow();
  });

  it("rejects tampered state", async () => {
    const token = await createHostedAuthState(businessId, channelId, "unipile", "whatsapp");
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ businessId: channelId })).toString("base64url");
    await expect(verifyHostedAuthState(parts.join("."))).rejects.toThrow();
  });

  it("rejects state signed with the webhook secret", async () => {
    const token = await new SignJWT({ businessId, channelId, provider: "unipile", channel: "whatsapp" })
      .setProtectedHeader({ alg: "HS256" }).setAudience("inbox-hosted-auth").setExpirationTime("15m")
      .sign(new TextEncoder().encode(process.env.UNIPILE_WEBHOOK_SECRET));
    await expect(verifyHostedAuthState(token)).rejects.toThrow();
  });

  it("rejects a different audience", async () => {
    const token = await new SignJWT({ businessId, channelId, provider: "unipile", channel: "whatsapp" })
      .setProtectedHeader({ alg: "HS256" }).setAudience("other").setExpirationTime("15m")
      .sign(new TextEncoder().encode(secret));
    await expect(verifyHostedAuthState(token)).rejects.toThrow();
  });
});
