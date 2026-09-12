# 00 — Visão Geral do Sales Brain (Brain)

> Documento de mapeamento arquitetural do **Sales Brain System**, o "cérebro de vendas" orquestrado pelo núcleo **Brain**. Este ficheiro é o ponto de entrada; os restantes documentos detalham cada componente.

## 1. Objetivo

O Sales Brain é um sistema cognitivo de vendas que transforma **sinais** (interações de clientes, eventos de CRM, e-mails, calendário, mensagens, enriquecimento de dados) em **ações de venda contextuais e auditáveis**. O núcleo **Brain** é o orquestrador responsável por reconciliar, validar e encaminhar cada interação entre quatro camadas funcionais:

1. **Camada de Estratégia** (Strategy Layer) — decide *o que* fazer e *porquê*.
2. **Grafo de Conhecimento** (Knowledge Graph) — guarda *o que se sabe* sobre contas, contactos e oportunidades.
3. **Motor RAG** (RAG Engine) — recupera e fundamenta *a evidência* usada para gerar respostas.
4. **Camada de Execução** (Execution Tiers) — executa *a ação* no canal correto, com o nível de autonomia adequado.

## 2. Princípios Arquiteturais

- **Reconciliação antes de ação.** Nenhuma ação de execução é despachada sem que a Estratégia, o Grafo de Conhecimento e o RAG estejam reconciliados pelo Brain.
- **Proveniência obrigatória.** Todo o facto, evidência ou decisão transporta `provenance` (fonte, timestamp, confiança).
- **Confiança como gate.** Decisões de baixa confiança escalam para humano; decisões de alto risco exigem aprovação explícita.
- **Idempotência e compensação.** Toda a ação de execução é idempotente e reversível (ou compensável).
- **Tenant isolation.** Dados, memória e execução são isolados por `tenant_id` e `user_scope`.
- **Observabilidade total.** Cada interação tem um `trace_id` propagado por toda a pilha.
- **Degradável por design.** Cada componente tem um modo de degradação explícito (ver §7).

## 3. Mapa de Componentes

| Componente | Papel | Ficheiro de detalhe |
|---|---|---|
| Brain (Núcleo) | Orquestrador, reconciliação, routing, state machine | `05-nucleo-brain.md` |
| Strategy Layer | Classificação de intenção, priorização, seleção de playbook, guardrails | `01-camada-estrategia.md` |
| Knowledge Graph | Modelo de entidades/relações, memória de conta, resolução de conflitos | `02-grafo-conhecimento.md` |
| RAG Engine | Retrieval, reranking, grounding, citações, controlo de alucinação | `03-motor-rag.md` |
| Execution Tiers | Adaptadores de canal, gates HITL, retry/compensação, auditoria | `04-camada-execucao.md` |
| Handoff Protocols | Contratos entre camadas | `06-protocolos-handoff.md` |
| Data Schemas | Esquemas JSON canónicos das mensagens | `07-esquemas-dados.md` |
| Workflow Diagrams | Diagramas Mermaid (arquitetura, sequência, estado, ERD) | `08-diagrama-workflow.md` |

## 4. Fluxo Macro

```
Sinal → Interpretação → Estratégia → Conhecimento (KG) → Recuperação (RAG) → Execução → Feedback → (loop)
```

1. **Sinal** chega (e-mail, evento CRM, mensagem, webhook de enriquecimento).
2. **Brain** normaliza num `InteractionEvent` e abre um ciclo de vida.
3. **Estratégia** classifica intenção, prioriza conta e seleciona playbook/caminho.
4. **Grafo de Conhecimento** fornece contexto de conta (entidades, relações, histórico).
5. **RAG** recupera evidência (documentos, conversas, base de conhecimento) e gera conteúdo fundamentado.
6. **Brain reconcilia** tudo: valida que a ação proposta é consistente com estratégia + KG + evidência.
7. **Execução** despacha a ação no canal correto, respeitando o tier de autonomia e gates HITL.
8. **Feedback** (resultado da execução, reação do cliente) fecha o ciclo e atualiza o KG.

## 5. Pressupostos Arquitetónicos

> "Lindymode" é o nome de uma técnica de pesquisa/prompt (baseada no efeito Lindy), sem relação com este produto. O núcleo orquestrador chama-se **Brain**. Os pressupostos abaixo são a base de design deste documento; devem ser confirmados/refinados pela equipa antes de implementação.

- **A1 — Multi-tenant B2B SaaS.** O sistema serve múltiplas equipas de vendas; isolamento por `tenant_id`.
- **A2 — Fontes de verdade heterogéneas.** CRM (ex.: Salesforce/HubSpot), e-mail, calendário, ferramentas de enriquecimento (ex.: ZoomInfo), notas manuais e documentos. O KG é a *memória reconciliada*, não a fonte primária.
- **A3 — LLM-backed.** A geração de conteúdo é feita por modelos de linguagem; o RAG é o mecanismo de fundamentação.
- **A4 — Hierarquia de verdade.** Quando há conflito, a precedência é (ordem decrescente): política/compliance > instrução explícita do utilizador > verdade do CRM > memória do KG > evidência RAG > inferência do modelo.
- **A5 — Canais de saída.** E-mail, CRM, Slack, calendário, gestor de tarefas, ferramentas de enriquecimento.
- **A6 — Latência alvo.** Interpretação + estratégia + KG + RAG ≤ 5s (p95) para interações síncronas; execuções assíncronas admitem minutos.

## 6. Vocabulário Canónico (partilhado por todos os ficheiros)

- **InteractionEvent** — unidade de entrada normalizada (sinal).
- **StrategicIntent** — intenção classificada + prioridade + playbook.
- **KnowledgeGraphMutation** — alteração proposta ao KG.
- **RetrievalRequest / RetrievalEvidenceBundle** — pedido e bundle de evidência do RAG.
- **ExecutionPlan / ExecutionResult** — plano e resultado de execução.
- **FeedbackSignal** — sinal de retroalimentação pós-execução.
- **AuditEnvelope** — envelope de auditoria que envolve qualquer ação persistente.
- **Estados do ciclo de vida:** `RECEIVED → INTERPRETING → STRATEGIZING → ENRICHING → RETRIEVING → RECONCILING → PLANNING → EXECUTING → AWAITING_APPROVAL → COMPLETED → FAILED → COMPENSATED`.

## 7. Secções Transversais (cross-cutting)

### 7.1 Observabilidade
- `trace_id` propagado em todas as mensagens; `span_id` por componente.
- Métricas: taxa de reconciliação, taxa de escuta HITL, latência p50/p95/p99 por camada, taxa de fallback RAG, taxa de compensação.
- Logs estruturados (JSON) com `trace_id`, `tenant_id`, `event_id`.
- Dashboard de avaliação: qualidade de respostas (groundedness), taxa de citações válidas, drift de confiança.

### 7.2 Segurança e Privacidade
- **RBAC** por `tenant_id` + `user_scope` + papel (vendedor, gestor, admin).
- **PII:** mascaramento em logs; campos sensíveis encriptados em repouso; consentimento verificado antes de enriquecimento externo.
- **Tenant isolation** ao nível de dados e índices vetoriais (índices particionados por tenant).

### 7.3 Versionamento
- `schema_version` em todas as mensagens (semver).
- `playbook_version` (a estratégia pode referenciar versões de playbook).
- `embedding_index_version` (versionamento de índices vetoriais para reindexação controlada).
- Migrations com janela de compatibilidade dupla.

### 7.4 Degradabilidade
| Falha de | Comportamento |
|---|---|
| KG indisponível | RAG opera sem contexto de conta; confiança capped; marca `degraded_mode=KG_DOWN`. |
| RAG indisponível | Estratégia usa apenas KG + playbook; geração de conteúdo bloqueada para esse evento; escalada humana se necessária. |
| CRM indisponível | Leitura de verdade primária falha; operações de escrita enfileiradas (outbox) com replay. |
| Canal de execução indisponível | Enfileiramento com retry exponencial; após N falhas, fallback para canal alternativo ou escalada humana. |
| LLM indisponível | Operações que exigem geração são suspensas; ações determinísticas (ex.: criar tarefa) prosseguem. |

### 7.5 Governação
- Gates de aprovação obrigatórios para ações de alto risco (envio externo, alteração de dados de cliente, ofertas).
- Auditoria imutável (`AuditEnvelope`) de toda mutação persistente.
- Overrides de política são *auditable-only*: nunca silenciosos; sempre registados com justificação.

## 8. Limites deste Documento
- Não cobre infraestrutura de baixo nível (k8s, networking).
- Não especifica modelos LLM exatos; apenas interfaces e SLAs.
- Pressupostos (§5) carecem de validação pela equipa.
