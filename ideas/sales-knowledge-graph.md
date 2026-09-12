# Sales Knowledge Graph — AI Sales Brain
## Especificação corrigida e orientada ao MVP

## 1. Objetivo

O Sales Knowledge Graph é uma camada de conhecimento e decisão para o AI Sales Brain.

O objetivo não é apenas recuperar documentos sobre vendas. O sistema deve ligar:

```text
Evidência observada
      ↓
Estado atual do cliente
      ↓
Contexto de decisão
      ↓
Ações candidatas
      ↓
Políticas e restrições
      ↓
Recomendação
      ↓
Ação do vendedor
      ↓
Reação do cliente
      ↓
Resultado
```

A pergunta central é:

> **Dado o estado atual do cliente, o playbook da empresa e o histórico da conversa, qual é a próxima melhor ação?**

## 2. Princípio arquitetural

O sistema deve separar cinco tipos de informação:

1. **Eventos:** o que aconteceu na conversa.
2. **Inferências:** o que o sistema concluiu a partir dos eventos.
3. **Conhecimento:** regras, técnicas e relações de vendas.
4. **Decisões:** recomendações produzidas pelo sistema.
5. **Resultados:** o que aconteceu depois da decisão.

Não se deve misturar uma classificação da IA com um facto absoluto nem uma recomendação com conhecimento universal.

## 3. As cinco camadas do grafo

### 3.1 Conversation Graph

Representa os eventos observáveis:

```text
Customer
   ↓ participates_in
Conversation
   ↓ contains
Message
   ↓ authored_by
Customer / Seller
```

Inclui:

- Mensagens.
- Autor.
- Timestamp.
- Canal.
- Produtos mencionados.
- Respostas enviadas.
- Reações do cliente.
- Conversas relacionadas.

### 3.2 Interpretation Graph

Representa as interpretações da IA:

```text
Message
   ↓ supports
Evidence / Signal
   ↓ supports
State Assertion
   ↓ belongs_to
State Snapshot
```

Inclui:

- Purchase intent.
- Sales stage.
- Objection.
- Need.
- Sentiment.
- Buying signals.
- Engagement.
- Confidence.
- Evidência utilizada.
- Modelo e versão.
- Timestamp da inferência.

### 3.3 Knowledge Graph

Representa conhecimento relativamente estável:

```text
Objection
   ↓ compatible_with
Strategy
   ↓ implemented_by
Technique
   ↓ executed_as
Action
```

Inclui:

- Estratégias de vendas.
- Técnicas.
- Ações.
- Condições de aplicação.
- Condições de exclusão.
- Regras de produto.
- Playbooks.
- Políticas comerciais.
- Evidência de suporte.

### 3.4 Decision Graph

Representa a decisão produzida para uma conversa específica:

```text
DecisionContext
   ↓ considers
CandidateAction
   ↓ filtered_by
Policy
   ↓ ranked_as
Recommendation
```

O sistema deve registar também as ações rejeitadas e os motivos da rejeição.

### 3.5 Outcome Graph

Representa a execução e os resultados:

```text
Recommendation
   ↓ executed_as
SellerAction
   ↓ followed_by
CustomerReaction
   ↓ leads_to
Outcome
```

## 4. Entidades principais

### Entidades de runtime

```text
Tenant
Business
Seller
Customer
Conversation
Message
Product
Order
StateSnapshot
StateAssertion
Evidence
DecisionContext
DecisionEpisode
CandidateAction
Recommendation
SellerAction
CustomerReaction
Outcome
```

### Entidades de conhecimento

```text
SalesStage
IntentType
ObjectionType
NeedType
SentimentType
Strategy
Technique
ActionType
Policy
Playbook
Rule
DecisionPattern
KnowledgeItem
```

## 5. Grafo conceptual

```text
Business
 ├── hasSeller ───────────────> Seller
 ├── hasCustomer ─────────────> Customer
 ├── ownsProduct ─────────────> Product
 ├── usesPlaybook ────────────> Playbook
 └── definesPolicy ───────────> Policy

Customer
 └── participatesIn ──────────> Conversation

Conversation
 ├── occursOn ────────────────> Channel
 ├── contains ────────────────> Message
 ├── hasStateSnapshot ────────> StateSnapshot
 ├── hasDecisionEpisode ──────> DecisionEpisode
 └── hasOutcome ──────────────> Outcome

Message
 ├── authoredBy ──────────────> Customer / Seller
 ├── mentions ────────────────> Product
 └── supports ────────────────> Evidence

Evidence
 └── supports ────────────────> StateAssertion

StateSnapshot
 ├── contains ────────────────> StateAssertion
 ├── hasIntent ───────────────> IntentType
 ├── hasStage ────────────────> SalesStage
 ├── hasObjection ────────────> ObjectionType
 ├── hasNeed ─────────────────> NeedType
 └── supportedBy ─────────────> Evidence

DecisionContext
 ├── basedOn ─────────────────> StateSnapshot
 ├── uses ────────────────────> Playbook
 ├── retrieves ───────────────> KnowledgeItem
 ├── matches ────────────────> DecisionPattern
 ├── considers ───────────────> CandidateAction
 └── produces ────────────────> Recommendation

Recommendation
 ├── recommendsStrategy ───────> Strategy
 ├── recommendsAction ─────────> ActionType
 ├── justifiedBy ─────────────> Evidence
 ├── constrainedBy ───────────> Policy
 └── executedAs ──────────────> SellerAction

SellerAction
 ├── authoredBy ──────────────> Seller
 ├── sends ───────────────────> Message
 ├── accepts ─────────────────> Recommendation
 └── followedBy ──────────────> CustomerReaction

CustomerReaction
 └── leadsTo ─────────────────> Outcome
```

## 6. Estado temporal do cliente

Não modelar o estado como um atributo permanente do cliente:

```text
Customer → hasIntent → High
```

O estado deve ser guardado como snapshots temporais:

```text
Conversation
   ↓ hasSnapshot
StateSnapshot_1
StateSnapshot_2
StateSnapshot_3
```

Cada snapshot representa o que o sistema acreditava num determinado momento.

### Exemplo

```json
{
  "id": "state_003",
  "conversation_id": "conv_123",
  "created_at": "2026-08-16T11:30:00Z",
  "based_on_message_id": "msg_009",
  "purchase_intent": "high",
  "sales_stage": "consideration",
  "main_objection": "price",
  "customer_need": "durability",
  "sentiment": "positive",
  "engagement": "high",
  "confidence": 0.86,
  "model_version": "state-extractor-0.3"
}
```

## 7. Assertions e proveniência

Uma classificação da IA é uma afirmação com evidência, confiança e validade temporal.

Em vez de:

```text
Customer → hasObjection → Price
```

Usar:

```text
StateSnapshot_3
   └── hasAssertion → Assertion_45

Assertion_45
   ├── predicate → hasObjection
   ├── object → Price
   ├── confidence → 0.94
   ├── supportedBy → Message_009
   ├── generatedBy → ModelVersion_12
   └── validAt → Timestamp
```

Cada assertion deve guardar:

- Predicado.
- Valor.
- Confiança.
- Evidência.
- Modelo.
- Versão.
- Timestamp.
- Estado de validação humana, quando existir.

Isto permite auditoria, correção e comparação entre previsão e resultado.

## 8. Knowledge Graph versus Runtime Graph

Separar logicamente dois tipos de informação.

### Knowledge graph

Conhecimento estável ou versionado:

```text
PriceObjection
ValueReframing
ReinforceValue
PolicyNoEarlyDiscount
PremiumProduct
```

### Runtime graph

Dados específicos de uma conversa:

```text
Conversation_456
Message_789
StateSnapshot_12
Recommendation_99
SellerAction_22
Outcome_5
```

Uma observação individual não deve ser tratada automaticamente como conhecimento geral.

## 9. Strategy, Technique e Action

### Strategy

Objetivo comercial de alto nível:

- Reforçar valor.
- Reduzir risco.
- Descobrir necessidade.
- Aumentar confiança.
- Criar clareza.
- Avançar para decisão.

### Technique

Método de comunicação:

- Pergunta aberta.
- Value reframing.
- Social proof.
- Comparação.
- Trial close.
- Alternative offer.

### Action

Comportamento executável:

- Perguntar qual é a principal preocupação.
- Explicar uma característica relevante.
- Apresentar um testemunho.
- Recomendar o Produto Premium.
- Pedir confirmação da compra.
- Agendar follow-up.

A relação deve ser:

```text
Strategy
   ↓ implementedBy
Technique
   ↓ executedAs
Action
```

Exemplo:

```text
ReducePerceivedRisk
   ↓
SocialProof
   ↓
ShareRelevantCustomerExample
```

## 10. Produtos e recomendações comerciais

Produtos devem ter relações específicas para recomendações:

```text
Product
 ├── hasFeature ─────────────> Feature
 ├── solvesNeed ─────────────> Need
 ├── complements ────────────> Product
 ├── upgrades ───────────────> Product
 ├── alternativeTo ──────────> Product
 ├── suitableFor ────────────> CustomerSegment
 ├── hasPrice ───────────────> Price
 └── hasStockStatus ─────────> StockStatus
```

### Cross-sell

```text
Product_A
   └── complements ──> Product_B
```

### Upsell

```text
Product_Standard
   └── upgradesTo ──> Product_Premium
```

As relações devem possuir condições de aplicação:

```json
{
  "source_product": "standard",
  "target_product": "premium",
  "relation": "upgrade",
  "appropriate_when": [
    "need = durability",
    "budget >= 100",
    "intent = high"
  ],
  "avoid_when": [
    "budget_sensitive = true",
    "customer_frustrated = true"
  ]
}
```

## 11. Playbook por empresa

A hierarquia de conhecimento deve ser explícita:

```text
Global Sales Knowledge
        ↓
Industry Knowledge
        ↓
Business Playbook
        ↓
Team Rules
        ↓
Seller Preferences
        ↓
Conversation Context
```

A prioridade de segurança e política comercial deve ser:

```text
Safety / Compliance
        ↓
Business Policies
        ↓
Conversation Context
        ↓
Sales Strategy
        ↓
Seller Style
```

Exemplo:

```text
Conhecimento geral:
Reforçar valor antes de oferecer desconto.

Regra da empresa:
Desconto só pode ser oferecido após confirmação de intenção.

Política:
Não prometer entrega sem consultar stock.
```

## 12. Decision Pattern

Um `DecisionPattern` representa condições e ações recomendadas.

```text
DecisionPattern
 ├── matchesState ───────> StateCondition
 ├── recommendsStrategy ─> Strategy
 ├── recommendsAction ───> ActionType
 ├── excludesAction ─────> ActionType
 ├── hasPriority ────────> Priority
 ├── definedBy ──────────> Playbook
 └── supportedBy ────────> Evidence
```

### Exemplo

```json
{
  "id": "pattern_price_high_intent",
  "conditions": [
    {"field": "intent", "operator": "in", "value": ["medium", "high"]},
    {"field": "stage", "operator": "in", "value": ["consideration", "objection"]},
    {"field": "objection", "operator": "equals", "value": "price"},
    {"field": "sentiment", "operator": "not_equals", "value": "frustrated"}
  ],
  "include_actions": [
    "reinforce_value",
    "social_proof",
    "diagnostic_question"
  ],
  "exclude_actions": [
    "discount",
    "aggressive_urgency"
  ],
  "priority": 80
}
```

Decision Patterns são preferíveis a codificar toda a inteligência em prompts.

## 13. DecisionContext

O `DecisionContext` regista o contexto exato no momento de uma decisão.

```json
{
  "id": "decision_context_22",
  "conversation_id": "conv_123",
  "state_snapshot_id": "state_003",
  "tenant_id": "business_01",
  "playbook_version": "playbook_07",
  "knowledge_version": "sales-knowledge-02",
  "retrieved_items": [
    "strategy_value_reframing",
    "policy_no_early_discount",
    "product_premium"
  ],
  "available_actions": [
    "reinforce_value",
    "ask_question",
    "offer_discount",
    "recommend_alternative"
  ]
}
```

Este objeto permite reconstruir por que razão o sistema tomou determinada decisão.

## 14. DecisionEpisode

O `DecisionEpisode` é a unidade principal de análise e aprendizagem.

Representa:

```text
Mensagem do cliente
→ estado identificado
→ recomendação
→ ação do vendedor
→ reação do cliente
→ resultado
```

### Estrutura

```text
DecisionEpisode
 ├── observedState ───────> StateSnapshot
 ├── decisionContext ─────> DecisionContext
 ├── recommendation ──────> Recommendation
 ├── sellerAction ────────> SellerAction
 ├── customerReaction ────> CustomerReaction
 └── outcome ──────────────> Outcome
```

Esta unidade é mais útil para aprendizagem do que uma simples relação entre conversa e compra.

## 15. Recommendation auditável

```json
{
  "id": "recommendation_44",
  "decision_context_id": "decision_context_22",
  "strategy": "value_reframing",
  "action": "reinforce_value",
  "rank": 1,
  "decision_score": 0.87,
  "confidence": 0.84,
  "reason_codes": [
    "HIGH_INTENT",
    "PRICE_OBJECTION",
    "CONSIDERATION_STAGE",
    "NO_FRUSTRATION"
  ],
  "excluded_actions": [
    {
      "action": "discount",
      "reason": "BUSINESS_POLICY_NO_EARLY_DISCOUNT"
    }
  ],
  "evidence": [
    "message_009",
    "playbook_rule_12"
  ],
  "model_version": "decision-engine-0.1",
  "created_at": "2026-08-16T11:30:00Z"
}
```

## 16. Score, confidence e outcome probability

São conceitos diferentes.

### Confidence

Confiança na interpretação:

```text
Objeção = Price
Confidence = 0.94
```

### Decision score

Adequação de uma ação entre as alternativas:

```text
Value Reframing
Decision score = 0.87
```

### Outcome probability

Probabilidade estimada de um resultado futuro:

```text
Estimated purchase probability = 0.61
```

No MVP, usar `confidence` e `decision_score`. Evitar probabilidades exatas de compra até existir um dataset confiável.

## 17. Relações negativas e políticas

O graph deve representar aquilo que não deve ser feito:

```text
AggressiveUrgency
      ↓ avoid_when
CustomerFrustrated
```

E também:

```text
Discount
      ↓ blocked_by
PolicyNoEarlyDiscount
```

Exemplos de guardrails:

- Não inventar características, preços, stock ou prazos.
- Não prometer descontos sem autorização.
- Não recomendar produtos indisponíveis.
- Não fazer upsell quando o cliente está frustrado.
- Não utilizar urgência falsa.
- Não insistir depois de uma recusa clara.
- Não ignorar reclamações para tentar vender.
- Não apresentar produtos em excesso.
- Encaminhar para humano quando a confiança for baixa.

## 18. Graph + RAG

Não escolher entre Graph e RAG. Usar cada um para uma função diferente.

```text
1. Extrair estado estruturado
2. Consultar relações e regras do Graph
3. Gerar ações candidatas
4. Aplicar políticas e exclusões
5. Recuperar documentos, exemplos e dados de produto
6. Ranquear ações válidas
7. Gerar resposta controlada
```

### Responsabilidade de cada componente

```text
Graph
→ determina o que é relevante e permitido.

RAG
→ recupera conteúdo, exemplos e evidências.

Sales Brain
→ decide a próxima melhor ação.

LLM
→ comunica a decisão numa resposta natural.
```

### Exemplo

```text
Estado:
- Stage = Consideration
- Intent = High
- Objection = Price
- Sentiment = Positive

Graph:
- Value Reframing permitido
- Social Proof permitido
- Discount bloqueado pelo playbook
- Aggressive Urgency bloqueado pelo contexto

RAG:
- Benefícios verificados do produto
- Testemunho relevante
- Exemplos aprovados da marca

Decision:
- Value Reframing + Diagnostic Question

LLM:
- Gera a resposta no idioma e tom da marca
```

## 19. Pipeline completo

```text
Conversation
      ↓
Message ingestion
      ↓
State extraction
      ↓
State Snapshot + Assertions
      ↓
DecisionContext
      ↓
Graph pattern matching
      ↓
Candidate Actions
      ↓
Policy filtering
      ↓
RAG retrieval
      ↓
Action ranking
      ↓
Recommendation
      ↓
Controlled LLM generation
      ↓
Seller review
      ↓
Seller action
      ↓
Customer reaction
      ↓
Outcome
      ↓
Learning data
```

## 20. Arquitetura de armazenamento para o MVP

Um knowledge graph conceptual não obriga a começar com uma graph database.

### Opção recomendada para o MVP

- PostgreSQL para entidades e eventos.
- JSONB para estados e atributos variáveis.
- pgvector para embeddings.
- Tabelas de regras para Decision Patterns.
- Event log append-only para decisões e outcomes.

### Tabelas iniciais

```text
businesses
sellers
customers
conversations
messages
products
state_snapshots
state_assertions
playbooks
playbook_rules
strategies
techniques
actions
decision_patterns
decision_contexts
decision_episodes
recommendations
seller_actions
customer_reactions
outcomes
knowledge_documents
retrieval_events
```

### Quando considerar uma graph database

- Muitas relações multi-hop.
- Consultas frequentes sobre caminhos entre entidades.
- Necessidade de exploração visual.
- Ontologia complexa partilhada entre domínios.
- Inferência ou proveniência avançada.
- Dificuldade de manter regras relacionais em tabelas.

## 21. Esquema relacional mínimo

```text
state_snapshots
- id
- conversation_id
- based_on_message_id
- purchase_intent
- sales_stage
- main_objection
- customer_need
- sentiment
- confidence
- evidence_json
- model_version
- created_at
```

```text
recommendations
- id
- decision_context_id
- strategy_id
- action_id
- decision_score
- confidence
- reason_codes
- excluded_actions_json
- evidence_json
- model_version
- created_at
```

```text
outcomes
- id
- decision_episode_id
- conversation_id
- type
- revenue
- occurred_at
- attribution_method
```

## 22. Validação estrutural

Se o projeto evoluir para RDF, separar:

### Ontologia

Define o significado das entidades e relações.

### Instâncias

Representam conversas, estados, recomendações e resultados reais.

### Shapes

Validam a estrutura dos dados.

Exemplo de regra de validação para uma Recommendation:

```text
Uma Recommendation deve:
- pertencer a um DecisionContext;
- recomendar uma Action;
- ter decision_score;
- ter confidence;
- ter timestamp;
- apontar para pelo menos uma evidência.
```

SHACL é uma opção adequada para validar a estrutura de grafos RDF através de constraints declaradas. [web:100][web:103]

## 23. Subgrafo mínimo do MVP

```text
Conversation
   ↓
Message
   ↓
StateSnapshot
   ├── intent
   ├── sales_stage
   ├── objection
   └── need
          ↓
DecisionPattern
   ↓
Strategy
   ↓
Action
   ↓
Recommendation
   ↓
SellerAction
   ↓
CustomerReaction
   ↓
Outcome
```

Relações mínimas:

```text
Conversation contains Message
Conversation hasSnapshot StateSnapshot
StateSnapshot supportedBy Message
StateSnapshot matches DecisionPattern
DecisionPattern recommends Strategy
Strategy implementedBy Action
Recommendation recommends Action
Recommendation justifiedBy Message
SellerAction executes Recommendation
SellerAction followedBy CustomerReaction
CustomerReaction leadsTo Outcome
```

## 24. Exemplo completo

### Mensagem do cliente

> “Gosto muito, mas 120 euros parece demasiado.”

### Estado interpretado

```json
{
  "purchase_intent": "high",
  "sales_stage": "consideration",
  "main_objection": "price",
  "customer_need": "quality",
  "sentiment": "positive",
  "confidence": 0.91
}
```

### Pattern match

```text
High intent
+ Consideration
+ Price objection
+ Positive sentiment
```

### Ações candidatas

```text
Value Reframing      0.87
Social Proof         0.70
Alternative Product  0.56
Discount             blocked
Aggressive Urgency   blocked
```

### Recomendação

```json
{
  "strategy": "value_reframing",
  "action": "reinforce_value",
  "reason": [
    "PRICE_OBJECTION",
    "HIGH_INTENT",
    "POSITIVE_SENTIMENT",
    "CONSIDERATION_STAGE"
  ],
  "avoid": [
    "discount",
    "aggressive_urgency"
  ]
}
```

### Resposta gerada

> “Entendo. A diferença de preço está principalmente na qualidade do material e na garantia de dois anos. Como procuras algo duradouro, essa versão tende a compensar mais no uso diário. A tua principal preocupação é o orçamento ou gostarias de perceber melhor o que inclui?”

### Outcome

```text
Seller action: accepted_and_sent
Customer reaction: continued_conversation
Outcome: qualified
```

Este episódio deve ser armazenado como evidência observada, não como prova de causalidade.

## 25. Aprendizagem futura

O sistema pode acumular episódios no formato:

```text
State Snapshot
      ↓
Decision Pattern
      ↓
Recommendation
      ↓
Seller Action
      ↓
Customer Reaction
      ↓
Outcome
```

Com dados suficientes, será possível estimar quais ações funcionam melhor em determinados contextos:

```text
Price Objection
+ High Intent
+ Consideration
+ Segment X
        ↓
Value Reframing
        ↓
Observed conversion rate
```

Mas o sistema deve distinguir associação de causalidade. Uma conversão depois de uma recomendação não prova que a recomendação causou a conversão.

Para medir impacto incremental, serão necessários:

- Grupos de controlo.
- Experimentos.
- Critérios de atribuição.
- Volume suficiente.
- Registo consistente das ações.

## 26. Ordem de implementação

### Fase 1 — Estrutura mínima

- Conversation.
- Message.
- StateSnapshot.
- Strategy.
- Action.
- DecisionPattern.
- Recommendation.
- SellerAction.
- Outcome.

### Fase 2 — Contexto comercial

- Products.
- Product relations.
- Playbook por empresa.
- Policies.
- Knowledge documents.
- RAG híbrido.

### Fase 3 — Proveniência e avaliação

- State assertions.
- Evidence links.
- Model versions.
- DecisionContext.
- DecisionEpisode.
- Feedback do vendedor.

### Fase 4 — Aprendizagem baseada em outcomes

- Ranking por resultados.
- Personalização por segmento.
- Personalização por vendedor.
- Modelos de conversão.
- Next Best Action preditivo.

## 27. O que não fazer inicialmente

- Não criar um grafo com centenas de tipos de entidades.
- Não modelar emoção detalhada antes de provar utilidade.
- Não treinar modelos próprios sem dados rotulados.
- Não tratar percentagens do LLM como probabilidades calibradas.
- Não colocar conhecimento genérico acima do playbook da empresa.
- Não começar por uma graph database apenas por razões conceptuais.
- Não assumir que toda compra é causada pela última recomendação.
- Não guardar apenas a recomendação final; guardar alternativas e exclusões.
- Não misturar dados de runtime com conhecimento global.

## 28. Definição final

O Sales Knowledge Graph do AI Sales Brain não deve ser apenas:

```text
Objection → Strategy → Action
```

Deve ser:

```text
Observed Evidence
      ↓
Customer State Snapshot
      ↓
Decision Context
      ↓
Candidate Actions
      ↓
Policy Filtering
      ↓
Recommendation
      ↓
Seller Action
      ↓
Customer Reaction
      ↓
Outcome
      ↓
Evidence for future decisions
```

A função do graph é organizar contexto, relações, restrições, evidência e resultados para que o Sales Brain possa decidir de forma explicável.

```text
RAG
→ recupera conteúdo

Knowledge Graph
→ organiza relações e contexto

ML / NLP
→ interpreta mensagens e identifica padrões

Sales Brain
→ decide

LLM
→ comunica

Outcome Data
→ permite avaliar e melhorar
```

> **A primeira versão deve ser um sistema pequeno, temporal, auditável e orientado a decisões — não uma ontologia gigante.**

> **O objetivo é criar a infraestrutura para responder, com evidência, qual é a próxima melhor ação para esta conversa.**
