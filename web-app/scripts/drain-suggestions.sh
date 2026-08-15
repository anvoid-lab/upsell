#!/usr/bin/env bash
#
# Dispara o endpoint que drena a fila de sugestões — o que o pg_cron faz de
# 10 em 10 segundos em produção (migração 008). Em desenvolvimento, pg_cron
# não alcança localhost, por isso este script é como se testa a passagem
# enfileirar → esperar o atraso → drenar → gerar sem esperar por um deploy.
#
# Uso:
#   ./scripts/simulate-inbound.sh "Ainda tem o A55 em stock?"
#   sleep 13   # o atraso por omissão do enqueue é 12s
#   ./scripts/drain-suggestions.sh
#
#   --url   base do servidor (por omissão http://localhost:3000)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

BASE_URL="http://localhost:3000"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) BASE_URL="$2"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "argumento desconhecido: $1" >&2; exit 1 ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  SECRET="$(grep -E '^INTERNAL_JOBS_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
fi
SECRET="${SECRET:-${INTERNAL_JOBS_SECRET:-}}"

if [[ -z "$SECRET" ]]; then
  echo "erro: INTERNAL_JOBS_SECRET não encontrado em $ENV_FILE nem no ambiente." >&2
  echo "      Acrescenta-o ao .env.local (ver .env.example)." >&2
  exit 1
fi

echo "→ $BASE_URL/api/jobs/drain-suggestions"

response="$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/api/jobs/drain-suggestions" \
  -H "x-internal-secret: $SECRET")"

status="${response##*$'\n'}"
payload="${response%$'\n'*}"

echo "  HTTP $status  $payload"
