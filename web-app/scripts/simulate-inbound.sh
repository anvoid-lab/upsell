#!/usr/bin/env bash
#
# Simula um cliente a enviar uma mensagem por um canal (WhatsApp/Instagram/
# Facebook), fazendo POST ao webhook em src/app/api/webhooks/channel/.
#
# Assina o corpo com o mesmo HMAC que a rota verifica — não há atalho nem modo
# de teste que salte a assinatura. Um script que contornasse a verificação
# testaria um caminho que não existe em produção.
#
# Uso:
#   ./scripts/simulate-inbound.sh "Ainda tem o A55 em stock?"
#   ./scripts/simulate-inbound.sh --new "Olá, vi a vossa página"
#   ./scripts/simulate-inbound.sh --repeat "Esta chega duas vezes"
#
#   --new      cria um lead novo (channel_conversation_id nunca visto)
#   --repeat   envia a MESMA mensagem duas vezes, com o mesmo
#              channel_message_id — a segunda tem de responder "duplicate"
#   --url      base do servidor (por omissão http://localhost:3000)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

BASE_URL="http://localhost:3000"
NEW_LEAD=false
REPEAT=false
TEXT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --new) NEW_LEAD=true; shift ;;
    --repeat) REPEAT=true; shift ;;
    --url) BASE_URL="$2"; shift 2 ;;
    -h|--help) sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) TEXT="$1"; shift ;;
  esac
done

if [[ -z "$TEXT" ]]; then
  echo "erro: falta o texto da mensagem." >&2
  echo "uso: $0 [--new] [--repeat] [--url URL] \"texto da mensagem\"" >&2
  exit 1
fi

# O segredo vem do .env.local — o mesmo que a rota lê.
if [[ -f "$ENV_FILE" ]]; then
  SECRET="$(grep -E '^CHANNEL_WEBHOOK_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
fi
SECRET="${SECRET:-${CHANNEL_WEBHOOK_SECRET:-}}"

if [[ -z "$SECRET" ]]; then
  echo "erro: CHANNEL_WEBHOOK_SECRET não encontrado em $ENV_FILE nem no ambiente." >&2
  echo "      Acrescenta-o ao .env.local (ver .env.example)." >&2
  exit 1
fi

# Conversa: por omissão a mesma de sempre, para acumular histórico num lead
# conhecido. Com --new, um id único cria contacto e conversa do zero.
if [[ "$NEW_LEAD" == true ]]; then
  CONVERSATION_ID="wa-lead-$(date +%s)"
  CONTACT_NAME="Cliente Novo $(date +%H%M%S)"
  CONTACT_HANDLE="+244 9$(printf '%08d' $((RANDOM % 100000000)))"
else
  CONVERSATION_ID="wa-sim-conversa-1"
  CONTACT_NAME="Joana Simulada"
  CONTACT_HANDLE="+244 923 000 001"
fi

MESSAGE_ID="wamid-sim-$(date +%s)-$RANDOM"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# jq garante que o texto é escapado como JSON válido, em vez de partir o corpo
# à primeira aspa ou acento no input.
if command -v jq >/dev/null 2>&1; then
  BODY="$(jq -nc \
    --arg cid "$CONVERSATION_ID" --arg mid "$MESSAGE_ID" \
    --arg name "$CONTACT_NAME" --arg handle "$CONTACT_HANDLE" \
    --arg text "$TEXT" --arg ts "$TIMESTAMP" \
    '{channel:"whatsapp", channel_conversation_id:$cid, channel_message_id:$mid,
      contact:{name:$name, handle:$handle}, text:$text, timestamp:$ts}')"
else
  echo "aviso: jq não encontrado — o texto não vai ser escapado." >&2
  BODY="{\"channel\":\"whatsapp\",\"channel_conversation_id\":\"$CONVERSATION_ID\",\"channel_message_id\":\"$MESSAGE_ID\",\"contact\":{\"name\":\"$CONTACT_NAME\",\"handle\":\"$CONTACT_HANDLE\"},\"text\":\"$TEXT\",\"timestamp\":\"$TIMESTAMP\"}"
fi

send() {
  local attempt="$1"
  # Assinatura sobre os bytes exatos do corpo — é o que a rota recalcula.
  local signature
  signature="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')"

  local response
  response="$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/api/webhooks/channel" \
    -H "content-type: application/json" \
    -H "x-hub-signature-256: $signature" \
    --data-binary "$BODY")"

  local status="${response##*$'\n'}"
  local payload="${response%$'\n'*}"

  echo "  [$attempt] HTTP $status  $payload"
}

echo "→ $BASE_URL/api/webhooks/channel"
echo "  conversa: $CONVERSATION_ID"
echo "  mensagem: $TEXT"
send "1/1"

if [[ "$REPEAT" == true ]]; then
  echo "  a reenviar o MESMO channel_message_id (a Meta faz isto)..."
  send "2/2"
  echo "  ↑ a segunda tem de dizer \"duplicate\" e não criar outra bolha."
fi
