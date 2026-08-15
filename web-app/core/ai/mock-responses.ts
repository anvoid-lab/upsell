import "server-only";

import type { AIEnvelope } from "@core/contracts";
import { AppException } from "@core/exceptions";

// Suporte a T-005/T-007 ainda não existe (`ml/`) — estes são gerados como
// substitutos, com a mesma forma que a inferência real terá de devolver.
// Ficam aqui, não dentro de generate(), para serem fáceis de apagar por
// inteiro quando `ml/` estiver a responder de verdade.

const REPLY_TEMPLATES: ReadonlyArray<{
  message: string;
  technique: "urgency" | "upsell" | "social_proof" | "cart_recovery";
  rationale: string;
}> = [
  {
    message:
      "Olá! Ainda tem interesse? Temos poucas unidades a este preço — posso reservar uma para si agora.",
    technique: "urgency",
    rationale: "O cliente perguntou pelo produto mas não respondeu nas últimas mensagens — criar urgência tende a reabrir a conversa.",
  },
  {
    message:
      "Boa! Além desse, muitos clientes levam também o acessório a combinar — fica com um desconto se levar os dois.",
    technique: "upsell",
    rationale: "O cliente já confirmou interesse no produto principal — é o momento certo para sugerir um complemento.",
  },
  {
    message:
      "Esse é dos nossos produtos mais pedidos este mês — várias pessoas compraram e ficaram satisfeitas. Posso avançar com o seu pedido?",
    technique: "social_proof",
    rationale: "O cliente parece indeciso entre opções — mostrar procura social ajuda a decidir.",
  },
  {
    message:
      "Reparei que ficou a meio da compra — ainda tem essa peça guardada para si. Quer que finalize o pedido agora?",
    technique: "cart_recovery",
    rationale: "Conversa parada depois de um passo concreto em direção à compra — vale a pena retomar antes que arrefeça.",
  },
];

// Determinístico por conversationId: a mesma conversa vê sempre o mesmo
// mock dentro da mesma sessão de desenvolvimento, mas conversas diferentes
// mostram drafts diferentes — o que T-005 pede como critério de sucesso.
function pickTemplate(conversationId: string | undefined) {
  if (!conversationId) {
    return REPLY_TEMPLATES[0];
  }
  let hash = 0;
  for (let i = 0; i < conversationId.length; i += 1) {
    hash = (hash * 31 + conversationId.charCodeAt(i)) >>> 0;
  }
  return REPLY_TEMPLATES[hash % REPLY_TEMPLATES.length];
}

export function getMockEnvelope(method: string, conversationId?: string): AIEnvelope {
  switch (method) {
    case "reply_suggestion": {
      const candidate = pickTemplate(conversationId);
      return {
        data: { candidates: [candidate] },
        usage: {
          model: "mock",
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }
    default:
      throw new AppException(`No mock response registered for method "${method}"`, {
        code: "AI_MOCK_METHOD_NOT_FOUND",
        context: "core/ai.getMockEnvelope",
      });
  }
}
