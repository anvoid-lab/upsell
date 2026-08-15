import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ReplySuggestionContract, type AIUsageRecord } from "@core/contracts";

const replySchema = z.object({ reply: z.string() });

const baseOptions = {
  method: "reply_suggestion",
  businessId: "biz-1",
  conversationId: "42",
  responseSchema: replySchema,
};

// `client.ts` guarda a configuração em cache no módulo — recarregar garante
// que cada teste lê as variáveis de ambiente que acabou de definir.
async function loadGenerate() {
  vi.resetModules();
  return (await import("./generate")).generate;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("generate", () => {
  beforeEach(() => {
    vi.stubEnv("AI_INFERENCE_URL", "https://inference.test/");
    vi.stubEnv("AI_INFERENCE_API_KEY", "secret-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts a reference payload and returns contract-validated data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { reply: "Olá!" } }));
    vi.stubGlobal("fetch", fetchMock);

    const generate = await loadGenerate();
    const result = await generate({ ...baseOptions, params: { tone: "friendly" } });

    expect(result.data).toEqual({ reply: "Olá!" });

    const [url, init] = fetchMock.mock.calls[0];
    // A barra final da env var não pode duplicar na URL final.
    expect(url).toBe("https://inference.test/generate");
    expect(init.headers.authorization).toBe("Bearer secret-key");
    expect(JSON.parse(init.body)).toEqual({
      method: "reply_suggestion",
      business_id: "biz-1",
      conversation_id: "42",
      params: { tone: "friendly" },
    });
  });

  it("retries once on a 500 and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse({ data: { reply: "recuperado" } }));
    vi.stubGlobal("fetch", fetchMock);

    const generate = await loadGenerate();
    const result = await generate(baseOptions);

    expect(result.data).toEqual({ reply: "recuperado" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx — the request is malformed, not transient", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "unknown method" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    const generate = await loadGenerate();
    await expect(generate(baseOptions)).rejects.toMatchObject({
      code: "AI_INFERENCE_ERROR",
      statusCode: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces AI_INFERENCE_UNAVAILABLE once retries are exhausted", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const generate = await loadGenerate();
    await expect(generate(baseOptions)).rejects.toMatchObject({
      code: "AI_INFERENCE_UNAVAILABLE",
      statusCode: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects output that does not match the caller's schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { reply: 123 } }));
    vi.stubGlobal("fetch", fetchMock);

    const generate = await loadGenerate();
    await expect(generate(baseOptions)).rejects.toMatchObject({
      code: "AI_GENERATION_INVALID_OUTPUT",
    });
  });

  it("throws AI_CONFIG_ERROR when the inference env vars are missing", async () => {
    vi.stubEnv("AI_INFERENCE_URL", "");
    vi.stubEnv("AI_INFERENCE_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn());

    const generate = await loadGenerate();
    await expect(generate(baseOptions)).rejects.toMatchObject({ code: "AI_CONFIG_ERROR" });
  });

  describe("usageSink", () => {
    it("records token counts on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            data: { reply: "Olá!" },
            usage: {
              model: "qwen-plus",
              prompt_tokens: 120,
              completion_tokens: 30,
              total_tokens: 150,
            },
          }),
        ),
      );

      const records: AIUsageRecord[] = [];
      const generate = await loadGenerate();
      await generate({ ...baseOptions, usageSink: (record) => void records.push(record) });

      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        business_id: "biz-1",
        conversation_id: "42",
        method: "reply_suggestion",
        model: "qwen-plus",
        total_tokens: 150,
        status: "success",
        error_message: null,
      });
    });

    it("records failures too — a failed call still burned tokens", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "nope" }, 400)));

      const records: AIUsageRecord[] = [];
      const generate = await loadGenerate();
      await expect(
        generate({ ...baseOptions, usageSink: (record) => void records.push(record) }),
      ).rejects.toMatchObject({ code: "AI_INFERENCE_ERROR" });

      expect(records).toHaveLength(1);
      expect(records[0].status).toBe("error");
      expect(records[0].error_message).toContain("400");
    });

    it("does not let a failing sink break a successful generation", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: { reply: "Olá!" } })));

      const generate = await loadGenerate();
      const result = await generate({
        ...baseOptions,
        usageSink: () => {
          throw new Error("usage table is down");
        },
      });

      expect(result.data).toEqual({ reply: "Olá!" });
    });
  });

  describe("mock mode", () => {
    beforeEach(() => {
      vi.stubEnv("AI_MOCK_MODE", "true");
      // ml/ não existe ainda — o modo mock não pode exigir configuração para
      // um serviço que ninguém está a servir.
      vi.stubEnv("AI_INFERENCE_URL", "");
      vi.stubEnv("AI_INFERENCE_API_KEY", "");
    });

    it("never calls fetch, and still validates against the caller's schema", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const generate = await loadGenerate();
      const result = await generate({
        method: "reply_suggestion",
        businessId: "biz-1",
        conversationId: "1",
        responseSchema: ReplySuggestionContract.responseSchema,
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data.candidates).toHaveLength(1);
      expect(result.usage).toMatchObject({ model: "mock" });
    });

    it("picks a different canned candidate for a different conversation", async () => {
      vi.stubGlobal("fetch", vi.fn());
      const generate = await loadGenerate();

      const a = await generate({
        method: "reply_suggestion",
        businessId: "biz-1",
        conversationId: "1",
        responseSchema: ReplySuggestionContract.responseSchema,
      });
      const b = await generate({
        method: "reply_suggestion",
        businessId: "biz-1",
        conversationId: "3",
        responseSchema: ReplySuggestionContract.responseSchema,
      });

      expect(a.data.candidates[0].message).not.toBe(b.data.candidates[0].message);
    });

    it("still reports usage, stamped as model: mock", async () => {
      vi.stubGlobal("fetch", vi.fn());
      const records: AIUsageRecord[] = [];
      const generate = await loadGenerate();

      await generate({
        method: "reply_suggestion",
        businessId: "biz-1",
        conversationId: "1",
        responseSchema: ReplySuggestionContract.responseSchema,
        usageSink: (record) => void records.push(record),
      });

      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ status: "success", model: "mock" });
    });

    it("rejects a method with no registered mock", async () => {
      vi.stubGlobal("fetch", vi.fn());
      const generate = await loadGenerate();

      await expect(
        generate({ ...baseOptions, method: "conversation_analysis" }),
      ).rejects.toMatchObject({ code: "AI_MOCK_METHOD_NOT_FOUND" });
    });
  });
});
