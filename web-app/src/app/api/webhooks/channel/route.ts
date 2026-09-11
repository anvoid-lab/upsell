import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { ChannelWebhookContract, validateContract } from "@core/contracts";

import { channelWebhookService } from "./channel-webhook.service";

export const maxDuration = 60;

// Um corpo de webhook legítimo tem alguns KB. Isto é um endpoint público sem
// autenticação prévia — não pode aceitar um corpo de tamanho arbitrário.
const MAX_BODY_BYTES = 128 * 1024;

/**
 * Handshake de verificação do provider (Meta): responde ao desafio com o
 * próprio `hub.challenge` quando o token bate certo.
 */
export async function GET(request: NextRequest) {
  // new URL(request.url) e não request.nextUrl: é o que auth/callback/route.ts
  // já faz, e funciona com um Request normal — o que torna a rota testável sem
  // ter de fabricar um NextRequest.
  const { searchParams: params } = new URL(request.url);
  const verifyToken = process.env.CHANNEL_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  if (params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === verifyToken) {
    // Texto simples, não JSON — a Meta espera o desafio tal e qual.
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

/**
 * Recebe uma mensagem de um cliente.
 *
 * Esta é a primeira superfície pública, não autenticada e com escrita da app —
 * tudo o resto está atrás de sessão + RLS. Daí a ordem: verificar a assinatura
 * antes de olhar sequer para o conteúdo, e só depois validar o contrato.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CHANNEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  // O HMAC é calculado sobre os bytes exatos que o provider enviou, por isso o
  // corpo tem de ser lido cru — se fosse parseado primeiro, a reserialização
  // mudaria espaços e ordem de chaves e a assinatura nunca bateria certo.
  const raw = await request.text();

  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  if (!hasValidSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "malformed json" }, { status: 400 });
  }

  let inbound;
  try {
    inbound = validateContract(
      ChannelWebhookContract.inboundMessageSchema,
      payload,
      "webhooks/channel.POST",
    );
  } catch {
    return NextResponse.json({ error: "payload does not match contract" }, { status: 422 });
  }

  const { result } = await channelWebhookService.receive(inbound);

  return NextResponse.json(result, { status: 200 });
}

/**
 * `X-Hub-Signature-256: sha256=<hex>` — o esquema da Meta, adotado agora para
 * a T-010 não ter de mudar nada aqui.
 */
function hasValidSignature(body: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");

  // timingSafeEqual rebenta se os comprimentos diferirem — e comparar
  // comprimentos primeiro não vaza nada de útil.
  if (received.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
