import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { InboxContract } from "@core/contracts/inbox.contract";
import type { InboxChannel, InboxProviderName } from "@core/contracts/inbox.contract";

function key(): Uint8Array {
  const value = process.env.INBOX_HOSTED_AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("INBOX_HOSTED_AUTH_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createHostedAuthState(
  businessId: string,
  channelId: string,
  provider: InboxProviderName,
  channel: InboxChannel,
): Promise<string> {
  return new SignJWT({ businessId, channelId, provider, channel })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setAudience("inbox-hosted-auth")
    .sign(key());
}

export async function verifyHostedAuthState(token: string) {
  const { payload } = await jwtVerify(token, key(), { audience: "inbox-hosted-auth", algorithms: ["HS256"] });
  return InboxContract.hostedAuthStateSchema.parse(payload);
}
