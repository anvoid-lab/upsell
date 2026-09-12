Aqui está a ordem que recomendo, baseada na arquitetura documentada. O princípio: **um fluxo vertical pequeno e seguro primeiro, com o Brain como esqueleto desde o início**, e só depois aprofundar cada camada. A primeira versão não deve "vender sozinha" — deve **entender, fundamentar, sugerir e pedir aprovação humana**.

## Ordem de desenvolvimento

**0 — Definir o caso de uso MVP**
Um fluxo único, ex.: "email inbound de um lead → classificar intenção → buscar contexto → gerar resposta fundamentada → criar rascunho para aprovação humana". Sem auto-envio no início. Isto delimita o alcance e dá um critério de "pronto" claro.

**1 — Contratos e fundações mínimas**
Definir primeiro os schemas canónicos (`07-esquemas-dados.md`) como contratos: `InteractionEvent`, `StrategicIntent`, `RetrievalRequest`, `RetrievalEvidenceBundle`, `ExecutionPlan`, `ExecutionResult`, `AuditEnvelope`. Juntar `tenant_id`, `trace_id`, logs estruturados, versionamento de schema e audit log. _Schema-first_ evita retrabalho nas camadas.

**2 — Brain v0 (esqueleto do orquestrador)**
O Brain nasce já aqui, não na fase final. State machine mínima: `RECEIVED → STRATEGIZING → ENRICHING → RETRIEVING → PLANNING → AWAITING_APPROVAL`. KG, RAG e Execução podem ser stubs/mocks nesta fase — o objetivo é validar o encaminhamento e o tracing fim-a-fim.

**3 — KG v0 (memória mínima)**
Apenas entidades essenciais: `Account`, `Contact`, `Opportunity`, `Interaction`, `Evidence`. Implementar `AccountContextSnapshot` (leitura) e `KnowledgeGraphMutation` simples via outbox. Resolução complexa de conflitos e freshness fica para depois.

**4 — Strategy v0**
Classificação de intenção, prioridade básica, seleção de playbook, decisão de risco/tier. Começar com **regras determinísticas** + LLM só onde estritamente necessário.

**5 — RAG v0**
Ingestão de documentos/conversas, busca vetorial/lexical simples, evidências citáveis, geração com citações e `groundedness_score`. Foco: rascunho confiável, não resposta perfeita.

**6 — Brain v1 (reconciliação e routing reais)**
Aqui entra o núcleo: hierarquia de verdade, matriz de routing, gates por confiança/risco, validação de citações, bloqueio de ações inseguras. É quando o sistema fica "vivo".

**7 — Execution v0 (seguro por padrão)**
Começar só com tiers `draft` e `human_approved`: criar rascunhos, tarefas internas, notas no CRM. **Sem enviar e-mails automaticamente ainda.**

**8 — Execução real com adaptadores**
Adicionar CRM, e-mail, calendário, Slack. Só depois reforçar: idempotência forte, retries, outbox, saga/compensação, dead-letter queues.

**9 — Feedback loop**
`ExecutionResult` + `FeedbackSignal` atualizam o KG. Começar a medir: resposta enviada, aberta, reunião marcada, objeção resolvida, deal avançou.

**10 — Hardening e escala**
Degradação por camada, circuit breakers, dashboards de avaliação, filtro de PII avançado, RBAC completo, multi-tenant robusto, migrations de schema.

## Três correções importantes face a uma ordem "ingénua"

- O **Brain não espera pela fase 6** — nasce como esqueleto na fase 2 e vai ganhando capacidade.
- Não vale a pena construir o KG "profundo" antes de um fluxo **fim-a-fim validado** com mocks.
- **Compliance, auditoria e HITL não são "hardening final"**: tudo o que previne ação perigosa tem de existir **antes de qualquer execução real outbound** (fase 7 com `draft`/`human_approved` primeiro, fase 8 só depois).

Quer que eu converta este plano de desenvolvimento num documento markdown adicional (ex.: `10-plano-desenvolvimento.md`) com milestones, dependências e critérios de aceitação por fase?
