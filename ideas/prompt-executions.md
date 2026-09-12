# 10 — Prompts de Desenvolvimento para IA

> Documento com **prompts prontos a colar** num assistente de IA (Claude, Cursor, Copilot, etc.) para desenvolver o Sales Brain fase a fase. Cada prompt é autocontido: leva contexto, requisitos, perguntas concretas, critérios de aceitação e dependências.
>
> **Como usar:** cola o bloco da fase na IA, anexa os ficheiros de schema referenciados (`07-data-flow-schemas.md`) e itera. Não pares numa fase sem todos os critérios de aceitação verificados. Acompanha cada prompt com os ficheiros relevantes da pasta `sales-brain/`.

## Definition of Done global (aplica a TODAS as fases) -

Cada fase só está concluída quando cumpre TODOS os pontos:

- [ ] Testes unitários para a lógica nova.
- [ ] Testes de contrato que validam payloads contra o JSON Schema (`07-data-flow-schemas.md`).
- [ ] Testes multi-tenant: tenant A não vê/escreve dados do tenant B.
- [ ] Testes de idempotência quando a componente tiver mutações/ações.
- [ ] Documentação/migrations geradas (com rollback se aplicável).
- [ ] Comandos para correr os testes listados.
- [ ] Output esperado descrito.
- [ ] Lista de ficheiros alterados/criados.

---

## Fase 1 — Fundações de plataforma (tenant, observabilidade, outbox, audit) - done

> Dividir em 3 sub-fases; cada uma é uma interação própria com a IA.

### Fase 1A — tenant_id + trace_id + validação de schemas

```
Contexto: Sales Brain multi-tenant. Implementa a base de identidade e rastreio.
1. Middleware/filtro que obriga tenant_id em todo o pedido.
2. Geração e propagação de trace_id/span_id; logs estruturados JSON com tenant_id, event_id.
3. Registry de schemas com validação na entrada/saída de cada handoff (usa `07-data-flow-schemas.md`).

Perguntas:
1. Como garantir isolamento de tenant em BD relacional e (futuro) índices vetoriais?
2. Como propagar trace_id através de filas/outbox assíncronos?
3. Como validar schemas na fronteira de cada serviço sem acoplar?

Entrega: middleware de tenant, tracing, registry de schemas, testes de isolamento de tenant.
```

### Fase 1B — outbox + audit log

```
Implementa:
1. Outbox pattern: escrita transacional de eventos no log + aplicação assíncrona idempotente com replay.
2. Audit log imutável append-only: AuditEnvelope persistido, com override_reason obrigatório quando há override de política.
3. Estratégia de retention/rotação do audit log.

Perguntas:
1. Como tornar o outbox idempotente e tolerante a duplicados no consumer?
2. Como garantir append-only e imutabilidade do audit log?
3. Que retention usar por tipo de evento?

Entrega: outbox + consumer idempotente, audit log append-only, testes de replay.
```

### Fase 1C — Í

```
Implementa:
1. RBAC: papéis (vendedor, gestor, admin) + user_scope; verificação de permissão por ação.
2. PII: utilitário de mascaramento em logs; campos sensíveis marcados.
3. Gestão básica de consentimento (estado por contacto) consultável antes de outbound.

Perguntas:
1. Como modelar papéis/permissions de forma extensível?
2. Como detetar PII para mascaramento sem degradar desempenho?
3. Como representar e consultar o estado de consentimento de forma fiável?

Entrega: RBAC, PII masking, consent state, testes de permissão e mascaramento.
```

### Critérios de aceitação

- [ ] Teste demonstra que tenant A não consegue ler/escrever dados do tenant B.
- [ ] trace_id propagado fim-a-fim numa chamada assíncrona.
- [ ] Outbox replaya sem duplicar efeitos.
- [ ] Audit log é append-only e regista overrides com justificação.

---

## Fase 2 — Brain v0 (esqueleto do orquestrador + state machine) - done

### Prompt para a IA

```
O "Brain" é o orquestrador central do Sales Brain. É o ÚNICO componente que detém o estado do ciclo de vida de uma interação e o único que despacha ações de execução. Nesta fase v0, as camadas KG, RAG e Execução são STUBS/MOCKS.

Implementa:
1. Normalização de um sinal heterogéneo (ex.: e-mail, evento CRM) num InteractionEvent com trace_id.
2. Máquina de estados do ciclo de vida: RECEIVED → INTERPRETING → STRATEGIZING → ENRICHING → RETRIEVING → RECONCILING → PLANNING → AWAITING_APPROVAL → EXECUTING → COMPLETED → FAILED → COMPENSATED.
3. Orquestração que invoca, por esta ordem: Strategy (stub) → KG (stub) → RAG (stub) → reconciliação → Execution (stub).
4. Persistência do estado por trace_id; transições emitem spans com state_from/state_to.
5. Timeout de reconciliação: se >10s, marca degraded_mode e segue com dados parciais + HITL.

Perguntas a responder:
1. Que padrão uso para a state machine (state machine library vs explícita)? Justifica.
2. Como garantir que o estado é durável e retomável após crash (resume no último estado)?
3. Como modelar degraded_mode e garantir que nunca despacha uma ação sem reconciliação?
4. Que interface define cada camada (Strategy/KG/RAG/Execution) para que o Brain as chame de forma intercambiável com stubs?
5. Como testar a orquestração fim-a-fim com mocks?

Entrega: Brain com state machine persistida, interfaces das 4 camadas, stubs, e um teste E2E que percorre RECEIVED→COMPLETED com mocks.
```

### Critérios de aceitação

- [ ] State machine cobre todas as transições do `05-nucleo-brain.md`.
- [ ] Estado durável e retomável após reinício.
- [ ] Nenhuma ação despachada sem passar por RECONCILING.
- [ ] Teste E2E com mocks percorre o ciclo completo.

---

## Fase 3 — KG v0 (memória mínima) - done

### Prompt para a IA

```
Implementa a v0 do Knowledge Graph: a memória reconciliada do Sales Brain. Entidades essenciais já incluídas: Account, Contact, Opportunity, Interaction, Evidence, Task (Task é usado por Strategy/Execution, por isso entra já na v0). Relações: Account→Contact, Account→Opportunity, Contact→Interaction, Interaction→Evidence, Task→Account/Opportunity.

Entidades OPCIONAIS (marcar como KG v0.5 — só implementar quando a Fase 5 as necessitar): Objection, PainPoint, Product, Competitor, Playbook. Na Fase 5 (RAG), a graph expansion usa, no MVP, apenas Interaction/Evidence; só expande para Objection/PainPoint/Product quando essas entidades existirem no KG.

Funcionalidades:
1. Leitura: AccountContextSnapshot(account_id, depth) — subgrafo até profundidade N.
2. Escrita: KnowledgeGraphMutation (operation: upsert/merge/link/archive) via outbox, idempotente, com expected_version (optimistic concurrency).
3. Provenância por facto: source, source_type (system_of_record/communication/enrichment/llm_inferred/manual), retrieved_at, confidence, freshness (fresh/stale/expired por TTL).
4. Resolução de conflitos BÁSICA: CRM (system of record) prevalece sobre inferência; mais recente desempata; conflito não-resolvível marcado conflict=true.

Perguntas:
1. Que storage de grafo uso (Neo4j, Postgres+jsonb, etc.) para v0? Justifica simplicidade.
2. Como implementar optimistic concurrency sem perder desempenho?
3. Como calcular freshness por tipo de facto (TTL diferente)?
4. Como garantir que factos llm_inferred NUNCA sobrescrevem factos de system_of_record?
5. Como particionar por tenant_id?

Entrega: modelo de dados, endpoints de leitura/escrita, outbox consumer, testes de conflito (CRM vs inferência → CRM ganha).
```

### Critérios de aceitação

- [ ] AccountContextSnapshot devolve subgrafo à profundidade N.
- [ ] Mutação idempotente; duplicado não cria efeito.
- [ ] Facto LLM-inferido nunca sobrescreve facto de sistema de registo.
- [ ] Conflito não-resolvível marcado `conflict=true`.

---

## Fase 4 — Strategy v0 (intenção, prioridade, playbook) - done

### Prompt para a IA

```
Implementa a v0 da Strategy Layer. Recebe um InteractionEvent + snapshot do KG e produz um StrategicIntent: intent_type, intent_confidence, account_priority, playbook_id, risk_level, requires_rag, execution_tier_hint, guardrails, routing_targets.

Abordagem: começar com REGRAS DETERMINÍSTICAS (playbook + política); usar LLM APENAS para intenção ambígua, com intent_confidence; se confidence < limiar, marca requires_human_classification.

Regras mínimas (ver 01-camada-estrategia.md §4):
- information_request + conta ativa → RAG, tier draft.
- objection + risk high → KG+RAG, tier human_approved.
- follow_up + tarefa vencida → execução direta, tier auto.
- churn_signal → RAG+KG+alerta gestor, tier human_approved, critical.
- setor regulado + outbound → human_approved + compliance_gate.

Guardrails: consent_verified, pii_filter, competitor_block, max_outbound_frequency.

Perguntas:
1. Como combinar regras determinísticas + scoring de conta + inferência LLM respeitando a hierarquia: política > utilizador > CRM > KG > RAG > inferência?
2. Como evitar que a inferência LLM sobrescreva uma regra de política?
3. Que limiar de intent_confidence escala para HITL?
4. Como tornar a seleção de playbook versionada (playbook_version)?
5. Modos de falha: conta não existe no KG; playbook obsoleto; regras contraditórias — como tratar cada um?

Entrega: motor de regras + scoring + fallback LLM, com testes por regra de routing.
```

### Critérios de aceitação

- [ ] Hierarquia de verdade respeitada (inferência nunca sobrepõe política).
- [ ] intent_confidence < limiar → HITL.
- [ ] Playbook versionado.
- [ ] Falhas (conta ausente, playbook obsoleto, conflito) tratadas explicitamente.

---

## Fase 5 — RAG v0 (retrieval, grounding, citação) - In Progress

### Prompt para a IA

```
Implementa a v0 do RAG Engine. Pipeline:
1. Query construction: a partir de StrategicIntent + AccountContextSnapshot, produz query vetorial + filtros (tenant_id, account_id, source_type, date_range, embedding_index_version) + termos lexicais.
2. Vector + lexical search sobre índices particionados por tenant.
3. Graph expansion: expande resultados usando relações do KG (objeções anteriores, pain points, produtos).
4. Reranking: relevância × autoridade da fonte × frescura × compatibilidade com playbook/policy.
5. Grounded generation: gera conteúdo ancorado no conjunto de evidência; cada afirmação mapeada a evidence_id + source_url.
6. groundedness_score (0–1): cobertura, qualidade, densidade, conflito. >=0.8 despacha; 0.5–0.8 low_confidence+HITL; <0.5 rejeita.

Controlo de alucinação: prompt restringe ao bundle; verificação pós-geração de que cada citação corresponde ao conteúdo real da evidência; regeneração (máx 2) se citação inválida.

Perguntas:
1. Que base de dados vetorial uso, e como parto por tenant?
2. Como versionar índices (embedding_index_version) para reindexação controlada?
3. Como validar citações pós-geração (matching de conteúdo)?
4. Comportamento de fallback: sem resultados, groundedness baixo, LLM indisponível, índice indisponível?
5. Como empacotar o RetrievalEvidenceBundle com citation_map?

Entrega: pipeline RAG, verificador de citações, bundles com citações, testes de groundedness (alta/baixa/rejeição).
```

### Critérios de aceitação

- [ ] Nenhuma afirmação sem evidence_id citável.
- [ ] Citações validadas contra conteúdo real.
- [ ] groundedness < 0.5 rejeita geração.
- [ ] Índices particionados por tenant.

---

## Fase 6 — Brain v1 (reconciliação e routing reais)

### Prompt para a IA

```
Agora aprofunda o Brain: implementa a reconciliação real (triângulo de consistência) e o routing. O Brain valida, antes de despachar qualquer ExecutionPlan:
1. Ação proposta pela Strategy é compatível com policy_version e guardrails?
2. Factos do KG usados estão frescos e não conflituosos?
3. Evidência do RAG suporta o conteúdo (groundedness >= limiar) e as citações são válidas?

Hierarquia de verdade (precedência na reconciliação): política/compliance > instrução explícita do utilizador > CRM (system of record) > memória do KG (factos não-inferidos) > evidência RAG > inferência LLM. Nível inferior NUNCA sobrescreve superior; overrides de política são audit-only (com justificação).

Matriz de routing (intent_type × confidence × risk_level → rota + tier). Regras: risk_level=critical → sempre human_approved; confidence baixa → eleva tier; requires_rag=true com groundedness baixo → bloqueia despacho + HITL.

Conflitos comuns a tratar: consentimento não verificado, afirmação não suportada por citação, facto KG stale vs CRM fresco, política proíbe comunicação, inferência LLM contradiz evidência RAG.

Perguntas:
1. Como implementar o triângulo de consistência sem bloquear indefinidamente?
2. Como elevar tier de forma programática (mais humano) sem nunca baixar abaixo do mínimo de política?
3. Como registar overrides de política de forma audit-only?
4. Que circuit breaker por camada, e como entrar em degraded_mode por camada?
5. Como medir taxa de conflitos (RECONCILING→AWAITING_APPROVAL) como proxy de qualidade?

Entrega: reconciliador, matriz de routing, gates por confiança/risco, circuit breakers por camada, testes de cada conflito.
```

### Critérios de aceitação

- [ ] Nenhuma ação despachada sem triângulo de consistência verificado.
- [ ] Hierarquia de verdade enforced; inferência nunca sobrepõe política.
- [ ] Tier pode ser elevado, nunca baixado abaixo do mínimo.
- [ ] Overrides de política registados com justificação.

---

## Fase 7 — Execution v0 (seguro por defeito: draft + human_approved)

### Prompt para a IA

```
Implementa a v0 da Execution Tier. APENAS tiers draft e human_approved. Nenhum envio automático. Operações: criar rascunho de resposta, criar tarefa interna, criar nota no CRM.

Requisitos:
1. Adaptadores de canal com interface ChannelAdapter: submit(ExecutionPlan)→ExecutionResult, compensate(ExecutionResult), health().
2. Idempotência: idempotency_key derivado de trace_id+action_id; duplicados devolvem resultado original.
3. Gate HITL: ações human_approved ficam AWAITING_APPROVAL até aprovação/rejeição/edição; timeout TTL → escala gestor ou cancela.
4. Auditoria: AuditEnvelope em toda a execução; quem aprovou/editou/rejeitou + justificação.
5. Compensation: ações declaradas reversible + compensation_action; compensa em ordem inversa em planos multi-passo (saga).

Perguntas:
1. Como garantir idempotência por canal (CRM external_ref, e-mail)?
2. Como modelar o gate HITL com timeout e escalada?
3. Como implementar saga com compensação em ordem inversa?
4. Que ações são reversible vs só compensáveis (e-mail enviado não é reversível)?
5. Como detectar e tratar execução parcial num plano multi-passo?

Entrega: adaptadores (CRM rascunho/nota/tarefa), gate HITL, saga/compensação, testes de idempotência e compensação.
```

### Critérios de aceitação

- [ ] Nenhum envio automático; tudo em draft ou aguardando aprovação.
- [ ] Idempotência verificada (duplicado não duplica).
- [ ] Compensação em ordem inversa funciona.
- [ ] Decisão HITL auditada com ator e timestamp.

---

## Fase 8 — Execução real com adaptadores outbound

### Prompt para a IA

```
Agora ativa execução outbound real: adaptadores para CRM (Salesforce/HubSpot create/update), e-mail (envio), calendário (criar/reagendar/cancelar reuniões), Slack (notificação interna), enriquecimento (consulta externa com consentimento + rate limits).

Reforços obrigatórios ANTES de ativar envio automático:
1. Consentimento verificado antes de qualquer comunicação outbound.
2. PII filter aplicado antes do despacho.
3. max_outbound_frequency (anti-spam) por contacto.
4. Retries com backoff exponencial + jitter; distinguir erros transientes (5xx/timeout/rate limit) de permanentes (4xx validação/permissão).
5. Dead-letter queue após N falhas; escalada humana.
6. Circuit breaker por canal: abre se taxa de erro > limiar.
7. Tier semi_auto com janela de veto (ex.: 60s) e tier auto apenas para ações determinísticas de baixo risco.

Perguntas:
1. Como validar consentimento de forma fiável antes do envio?
2. Como aplicar PII filter sem degradar conteúdo legítimo?
3. Como implementar rate limiting por fornecedor de enriquecimento?
4. Que estratégia de circuit breaker (janela, limiar, half-open)?
5. Como tornar o cancelamento de reunião compensável/reversível?

Entrega: adaptadores outbound, filtros de consentimento/PII/cadência, retries, dead-letter, circuit breakers.
```

### Critérios de aceitação

- [ ] Nenhum outbound sem consentimento verificado e PII filtrado.
- [ ] Retries distinguem transientes de permanentes.
- [ ] Circuit breaker abre em falhas sustentadas.
- [ ] Dead-letter + escalada humana em falhas repetidas.

---

## Fase 9 — Feedback loop

### Prompt para a IA

```
Implementa o feedback loop que fecha o ciclo. Após ExecutionResult:
1. Produz FeedbackSignal (outcome: delivered/opened/replied/bounced/attended/no_show/rejected/completed; client_reaction; confidence).
2. Aplica KnowledgeGraphMutation no KG a partir do outcome (interação registada, objeção criada/resolvida, stage alterado) — respeitando proveniência e hierarquia de verdade.
3. Ajusta scoring de conta/priorização com base no feedback.
4. Atualiza métricas: resposta enviada, aberta, reunião marcada, objeção resolvida, deal avançou.

Perguntas:
1. Como ingerir sinais de outcome de forma fiável (webhooks de e-mail, CRM updates)?
2. Como evitar que feedback contraditório corrompa o KG?
3. Como ajustar scoring sem re-treinar modelos pesados a cada evento?
4. Que métricas de outcome expor no dashboard?

Entrega: ingestor de feedback, mutações de KG a partir de outcome, ajuste de scoring, métricas.
```

### Critérios de aceitação

- [ ] Outcome atualiza o KG respeitando hierarquia de verdade.
- [ ] Feedback contraditório não corrompe KG (marcado como conflito).
- [ ] Scoring ajusta com feedback.
- [ ] Métricas de outcome disponíveis.

---

## Fase 10 — Hardening e escala

> Dividir em 3 sub-fases; cada uma é uma interação própria com a IA.

### Fase 10A — degradação + circuit breakers

```
Implementa modos de degradação por camada (ver 00-visao-geral.md §7.4): KG indisponível → RAG sem contexto, confiança capped; RAG indisponível → só KG+playbook; CRM indisponível → outbox+replay; canal indisponível → enfileirar+fallback; LLM indisponível → suspender geração, ações determinísticas prosseguem. Circuit breakers por camada com estado half-open.

Perguntas:
1. Como detetar e recuperar automaticamente de cada modo de degradação?
2. Que estratégia de circuit breaker (janela, limiar, half-open)?
3. Como marcar e propagar degraded_mode sem perder traceabilidade?

Entrega: modos de degradação testados por componente, circuit breakers.
```

### Fase 10B — dashboards de avaliação

```
Implementa dashboards: groundedness médio, taxa de citações válidas, drift de confiança, taxa de HITL, taxa de compensação, latência p50/p95/p99 por camada, taxa de conflitos (RECONCILING→AWAITING_APPROVAL).

Perguntas:
1. Que alertas definem degradação de qualidade (drift de groundedness)?
2. Como expor métricas sem custo de desempenho na via crítica?
3. Como correlacionar métricas por trace_id para diagnóstico?

Entrega: dashboards + alertas de drift de qualidade.
```

### Fase 10C — migrations, RBAC/PII avançado, multi-tenant robusto

```
Implementa:
1. PII filter avançado (detecção de entidades, mascaramento configurável).
2. RBAC completo + gestão de consentimento auditável e revogável.
3. Multi-tenant robusto (quota por tenant, isolamento de índices, noise prevention).
4. Migrations de schema com janela de compatibilidade dupla e rollback testado.

Perguntas:
1. Como auditar e revogar consentimento de forma fiável?
2. Como escalar índices vetoriais por tenant sem custos explosivos?
3. Como fazer rollback seguro de migrations de schema?

Entrega: PII avançado, RBAC/consent revogável, quotas, migrations com rollback.
```

### Critérios de aceitação

- [ ] Cada falha de componente tem modo de degradação testado.
- [ ] Dashboards expõem groundedness, HITL, compensação, latências.
- [ ] Consentimento auditável e revogável.
- [ ] Migrations com rollback testado.

---

## Notas de uso

- **Ordem estrita:** não avances para uma fase sem os critérios de aceitação da anterior verificados.
- **Iteração:** cada prompt pode precisar de 2–3 rondas com a IA; pede testes e refatoração.
- **Contexto:** anexa sempre `07-data-flow-schemas.md` e o ficheiro da camada relevante (`01`–`06`) ao prompt.
- **Segurança:** a primeira versão não "vende sozinha" — entende, fundamenta, sugere e pede aprovação humana.
