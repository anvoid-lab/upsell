-- ============================================================
-- VendAI — 006: justificação (rationale) na sugestão de IA
-- Colar no SQL Editor do Supabase e executar (depois da 005).
-- ============================================================
--
-- A geração de resposta (via `ml/`) devolve, além da mensagem, a técnica de
-- venda aplicada (já coberta pela coluna `type` existente) e uma justificação
-- curta — para o vendedor perceber *porquê* aquela resposta foi sugerida.
-- Falta uma coluna para a guardar.
--
-- `ai_suggestions` passa a ser gravada a cada geração (audit log), em vez de
-- lida como cache — por isso não há backfill: linhas antigas ficam sem
-- rationale, e o contrato (core/contracts/ai-suggestion.contract.ts) já trata
-- o campo como opcional.

alter table ai_suggestions add column if not exists rationale text;
