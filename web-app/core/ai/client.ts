import "server-only";

import { AppException } from "@core/exceptions";

export type AIClient = {
  baseUrl: string;
  apiKey: string;
};

let cached: AIClient | null = null;

// `ml/` ainda não existe. Enquanto isso, generate() responde com dados
// simulados em vez de tentar falar com um endereço que ninguém está a servir.
// Não exige AI_INFERENCE_URL/_API_KEY — não há nada real para autenticar.
export function isAIMockMode(): boolean {
  return process.env.AI_MOCK_MODE === "true";
}

// Lida preguiçosamente: `next build` não pode exigir estas variáveis, só o
// runtime é que precisa delas. Mesma razão pela qual a chave de sessão é lida
// assim (T-002).
export function getAIClient(): AIClient {
  if (cached) {
    return cached;
  }

  const baseUrl = process.env.AI_INFERENCE_URL;
  const apiKey = process.env.AI_INFERENCE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new AppException(
      "AI_INFERENCE_URL and AI_INFERENCE_API_KEY must be set to reach the inference service",
      { code: "AI_CONFIG_ERROR", context: "core/ai.getAIClient" },
    );
  }

  cached = { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
  return cached;
}
