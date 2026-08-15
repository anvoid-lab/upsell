import "server-only";

import type { ZodType } from "zod";

import {
  AIUsageContract,
  validateContract,
  type AIEnvelope,
  type AITokens,
  type AIUsageRecord,
} from "@core/contracts";
import { AppException } from "@core/exceptions";

import { getAIClient, isAIMockMode } from "./client";
import { getMockEnvelope } from "./mock-responses";

const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 2;
const MOCK_DELAY_MS = 600;

export type UsageSink = (record: AIUsageRecord) => void | Promise<void>;

export type GenerateOptions<T> = {
  /** Operação pedida à inferência, ex.: "reply_suggestion". */
  method: string;
  /**
   * Resolvido no servidor, a partir da sessão autenticada — nunca vindo do
   * cliente. A ligação do `ml/` à base de dados usa `service_role` e ignora
   * RLS, por isso um valor errado aqui não encontra nenhuma rede de segurança.
   */
  businessId: string;
  conversationId?: string;
  params?: unknown;
  responseSchema: ZodType<T>;
  usageSink?: UsageSink;
};

export type GenerateResult<T> = {
  data: T;
  usage: AITokens | null;
  latencyMs: number;
};

export async function generate<T>(options: GenerateOptions<T>): Promise<GenerateResult<T>> {
  const context = `core/ai.generate:${options.method}`;
  const startedAt = Date.now();

  try {
    const envelope = isAIMockMode()
      ? await mockRequest(options)
      : await requestWithRetry(options, context);
    const data = parseData(options.responseSchema, envelope.data, context);
    const latencyMs = Date.now() - startedAt;
    const usage = envelope.usage ?? null;

    await report(options, {
      business_id: options.businessId,
      conversation_id: options.conversationId ?? null,
      method: options.method,
      model: usage?.model ?? null,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      latency_ms: latencyMs,
      status: "success",
      error_message: null,
    });

    return { data, usage, latencyMs };
  } catch (error) {
    const failure = AppException.wrap(error, context);

    await report(options, {
      business_id: options.businessId,
      conversation_id: options.conversationId ?? null,
      method: options.method,
      model: null,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      latency_ms: Date.now() - startedAt,
      status: "error",
      error_message: failure.message,
    });

    throw failure;
  }
}

function parseData<T>(schema: ZodType<T>, data: unknown, context: string): T {
  try {
    return validateContract(schema, data, context);
  } catch (error) {
    throw new AppException("Inference returned output that does not match the expected schema", {
      code: "AI_GENERATION_INVALID_OUTPUT",
      statusCode: 502,
      context,
      details: error instanceof AppException ? error.details : error,
    });
  }
}

async function mockRequest<T>(options: GenerateOptions<T>): Promise<AIEnvelope> {
  await delay(MOCK_DELAY_MS);
  return getMockEnvelope(options.method, options.conversationId);
}

async function requestWithRetry<T>(
  options: GenerateOptions<T>,
  context: string,
): Promise<AIEnvelope> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await delay(RETRY_DELAY_MS);
    }

    try {
      return await request(options, context);
    } catch (error) {
      if (!isRetryable(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw new AppException("Inference service is unreachable", {
    code: "AI_INFERENCE_UNAVAILABLE",
    statusCode: 503,
    context,
    cause: lastError,
  });
}

async function request<T>(options: GenerateOptions<T>, context: string): Promise<AIEnvelope> {
  const { baseUrl, apiKey } = getAIClient();

  const response = await fetch(`${baseUrl}/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      method: options.method,
      business_id: options.businessId,
      conversation_id: options.conversationId ?? null,
      params: options.params ?? null,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // 429 e 5xx são transitórios (rate limit, serviço a reiniciar). Os
    // restantes 4xx são pedido malformado do nosso lado — repetir só gasta
    // latência e quota sem alguma vez mudar a resposta.
    const retryable = response.status === 429 || response.status >= 500;

    throw new AppException(`Inference request failed with status ${response.status}`, {
      code: retryable ? RETRYABLE_CODE : "AI_INFERENCE_ERROR",
      statusCode: response.status,
      context,
      details: body.slice(0, 500),
    });
  }

  return validateContract(AIUsageContract.envelopeSchema, await response.json(), context);
}

const RETRYABLE_CODE = "AI_INFERENCE_RETRYABLE";

function isRetryable(error: unknown): boolean {
  // Um erro que não é AppException veio do próprio fetch — rede caída,
  // DNS, ou o AbortSignal do timeout. Tudo transitório por natureza.
  return error instanceof AppException ? error.code === RETRYABLE_CODE : true;
}

async function report<T>(options: GenerateOptions<T>, record: AIUsageRecord): Promise<void> {
  if (!options.usageSink) {
    return;
  }

  try {
    await options.usageSink(record);
  } catch {
    // Falhar a registar consumo não pode derrubar uma geração que correu bem,
    // nem mascarar o erro original de uma que correu mal.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
