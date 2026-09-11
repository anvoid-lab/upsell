import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { receiveMock, afterMock } = vi.hoisted(() => ({
  receiveMock: vi.fn(),
  afterMock: vi.fn(),
}));

vi.mock("../../src/app/api/webhooks/channel/channel-webhook.service", () => ({
  channelWebhookService: { receive: receiveMock },
}));


const SECRET = "segredo-de-teste";

const VALID_PAYLOAD = {
  channel: "whatsapp",
  channel_conversation_id: "wa-conv-1",
  channel_message_id: "wamid-1",
  contact: { name: "Joana Simulada", handle: "+244 923 000 001" },
  text: "Ainda tem o A55?",
  timestamp: "2026-08-15T10:00:00Z",
};

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function request(body: string, signature: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) {
    headers["x-hub-signature-256"] = signature;
  }
  return new Request("http://localhost:3000/api/webhooks/channel", {
    method: "POST",
    headers,
    body,
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("../../src/app/api/webhooks/channel/route");
}

describe("POST /api/webhooks/channel", () => {
  beforeEach(() => {
    vi.stubEnv("CHANNEL_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("CHANNEL_VERIFY_TOKEN", "token-de-verificacao");
    receiveMock.mockReset();
    afterMock.mockReset();
    afterMock.mockImplementation((fn: () => unknown) => fn());
    receiveMock.mockResolvedValue({
      result: { status: "accepted", conversation_id: "42" },
      businessId: "biz-1",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("signature verification", () => {
    it("accepts a correctly signed body", async () => {
      const body = JSON.stringify(VALID_PAYLOAD);
      const { POST } = await loadRoute();

      const response = await POST(request(body, sign(body)) as never);

      expect(afterMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "accepted", conversation_id: "42" });
    });

    it("rejects a body tampered with after signing", async () => {
      const signed = JSON.stringify(VALID_PAYLOAD);
      const tampered = JSON.stringify({ ...VALID_PAYLOAD, text: "mensagem trocada" });
      const { POST } = await loadRoute();

      const response = await POST(request(tampered, sign(signed)) as never);

      expect(response.status).toBe(401);
      expect(receiveMock).not.toHaveBeenCalled();
    });

    it("rejects a signature made with the wrong secret", async () => {
      const body = JSON.stringify(VALID_PAYLOAD);
      const { POST } = await loadRoute();

      const response = await POST(request(body, sign(body, "outro-segredo")) as never);

      expect(response.status).toBe(401);
      expect(receiveMock).not.toHaveBeenCalled();
    });

    it("rejects a request with no signature header at all", async () => {
      const body = JSON.stringify(VALID_PAYLOAD);
      const { POST } = await loadRoute();

      const response = await POST(request(body, null) as never);

      expect(response.status).toBe(401);
      expect(receiveMock).not.toHaveBeenCalled();
    });

    it("rejects a malformed signature header instead of throwing", async () => {
      const body = JSON.stringify(VALID_PAYLOAD);
      const { POST } = await loadRoute();

      const response = await POST(request(body, "nonsense") as never);

      expect(response.status).toBe(401);
    });

    it("refuses to run at all when the secret is not configured", async () => {
      vi.stubEnv("CHANNEL_WEBHOOK_SECRET", "");
      const body = JSON.stringify(VALID_PAYLOAD);
      const { POST } = await loadRoute();

      const response = await POST(request(body, sign(body)) as never);

      expect(response.status).toBe(503);
      expect(receiveMock).not.toHaveBeenCalled();
    });
  });

  describe("payload handling", () => {
    it("rejects a signed body that is not valid JSON", async () => {
      const body = "isto não é json";
      const { POST } = await loadRoute();

      const response = await POST(request(body, sign(body)) as never);

      expect(response.status).toBe(400);
    });

    it("rejects a signed body that does not match the contract", async () => {
      const body = JSON.stringify({ channel: "whatsapp" });
      const { POST } = await loadRoute();

      const response = await POST(request(body, sign(body)) as never);

      expect(response.status).toBe(422);
      expect(receiveMock).not.toHaveBeenCalled();
    });
  });

  it("accepts duplicate deliveries without scheduling background work", async () => {
    receiveMock.mockResolvedValue({ result: { status: "duplicate", conversation_id: "42" }, businessId: "biz-1" });
    const body = JSON.stringify(VALID_PAYLOAD);
    const { POST } = await loadRoute();
    const response = await POST(request(body, sign(body)) as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "duplicate" });
    expect(afterMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/webhooks/channel", () => {
  beforeEach(() => {
    vi.stubEnv("CHANNEL_VERIFY_TOKEN", "token-de-verificacao");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function verifyRequest(params: Record<string, string>) {
    const url = new URL("http://localhost:3000/api/webhooks/channel");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return new Request(url) as never;
  }

  it("echoes the challenge when the verify token matches", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      verifyRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": "token-de-verificacao",
        "hub.challenge": "1234567890",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("1234567890");
  });

  it("refuses a wrong verify token", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      verifyRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": "token-errado",
        "hub.challenge": "1234567890",
      }),
    );

    expect(response.status).toBe(403);
  });
});
