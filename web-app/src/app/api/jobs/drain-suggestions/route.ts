import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { drainSuggestionsService } from "./drain-suggestions.service";

// Uma passagem pode gerar várias sugestões reais (ml/); dá-lhe folga.
export const maxDuration = 60;

/**
 * Chamado pelo `pg_cron` (migração 008) a cada 10s para drenar a fila de
 * sugestões. Protegido por segredo partilhado, não HMAC sobre o corpo como o
 * webhook de canais — ali autenticamos um terceiro (a Meta); aqui somos nós
 * dos dois lados, um segredo simples chega.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_JOBS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "jobs endpoint not configured" }, { status: 503 });
  }

  if (!hasValidSecret(request.headers.get("x-internal-secret"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await drainSuggestionsService.run();
  return NextResponse.json(result, { status: 200 });
}

function hasValidSecret(received: string | null, expected: string): boolean {
  if (!received) {
    return false;
  }

  const receivedBuf = Buffer.from(received);
  const expectedBuf = Buffer.from(expected);

  // timingSafeEqual rebenta se os comprimentos diferirem — e comparar
  // comprimentos primeiro não vaza nada de útil.
  if (receivedBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(receivedBuf, expectedBuf);
}
