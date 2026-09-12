# AI Sales Brain — MVP Architecture

## 1. Objetivo

O **AI Sales Brain** é um copiloto de vendas para vendedores que trabalham com conversas comerciais em canais como Instagram e WhatsApp.

O MVP não pretende ser um chatbot autónomo nem uma plataforma completa de atendimento. O objetivo é ajudar o vendedor a responder a uma pergunta concreta:

> **Qual é a melhor próxima ação nesta conversa e como devo executá-la?**

O produto deve:

- compreender o estado atual da conversa;
- identificar intenção, fase, necessidade e objeção;
- consultar o conhecimento estruturado da empresa;
- aplicar regras e políticas comerciais;
- recomendar uma próxima ação;
- ajudar o vendedor a escrever a mensagem;
- registar o que aconteceu depois.

---

## 2. Princípio central

O MVP deve separar claramente três responsabilidades:

```text
Understanding
      ↓
Decision
      ↓
Generation
```

### Understanding

Interpreta a conversa e cria um estado estruturado do cliente.

### Decision

Combina o estado com o playbook, o Knowledge Graph, o RAG e as políticas para escolher a próxima melhor ação.

### Generation

Transforma a ação aprovada numa mensagem natural para o vendedor rever e enviar.

O LLM não deve decidir sozinho qual técnica de vendas utilizar.

---

## 3. Papel de cada camada

```text
Knowledge Graph
→ memória estruturada, relações, regras e restrições

Sales Brain
→ orquestração e decisão contextual

Decision Engine
→ filtra e classifica ações permitidas

RAG
→ recupera factos, exemplos e evidências

LLM
→ interpretação, explicação e comunicação
```

A ligação correta é:

```text
Conversation
    ↓
State Snapshot
    ↓
Sales Brain Orchestrator
    ├── consulta Knowledge Graph
    ├── consulta RAG
    ├── consulta dados do negócio
    ├── aplica políticas
    └── consulta evidência histórica
    ↓
Decision Context
    ↓
Decision Engine
    ↓
Recommendation
    ↓
Controlled Generation
    ↓
Seller Copilot
```

---

## 4. O que o MVP não é

O MVP não deve tentar ser:

- um chatbot totalmente autónomo;
- um helpdesk completo;
- um CRM completo;
- uma plataforma de marketing;
- um agente que negocia sem aprovação;
- um sistema de reinforcement learning;
- uma ontologia empresarial completa;
- um modelo próprio de conversão desde o primeiro dia.

A primeira versão deve ser um **sistema de decisão comercial assistida**.

---

## 5. Fluxo principal do produto

```text
1. Cliente envia uma mensagem
2. Sistema atualiza a conversa
3. Conversation Understanding extrai sinais
4. Sistema cria um State Snapshot
5. Sales Brain consulta conhecimento e políticas
6. Sistema constrói o Decision Context
7. Decision Engine gera ações candidatas
8. Políticas removem ações proibidas
9. Ações permitidas são classificadas
10. Sistema cria uma Recommendation
11. LLM gera uma mensagem controlada
12. Vendedor revê, edita, aceita ou rejeita
13. Mensagem é enviada
14. Sistema regista a reação do cliente
15. Resultado é associado à decisão
```

---

## 6. Arquitetura do MVP

```text
                    ┌──────────────────────┐
                    │    Conversation      │
                    │ Instagram / WhatsApp │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Conversation          │
                    │ Understanding         │
                    │ LLM + Rules           │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ State Snapshot        │
                    │ intent / stage /      │
                    │ objection / need      │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Sales Brain           │
                    │ Orchestrator          │
                    └───────┬───────┬──────┘
                            ↓       ↓
              ┌─────────────┐       ┌─────────────┐
              │ Knowledge   │       │ Hybrid RAG  │
              │ Graph       │       │             │
              │ regras      │       │ factos      │
              │ relações    │       │ exemplos    │
              │ políticas   │       │ evidência   │
              └──────┬──────┘       └──────┬──────┘
                     └──────────┬──────────┘
                                ↓
                    ┌──────────────────────┐
                    │ Decision Context      │
                    │ permitidas / bloqueio │
                    │ evidência / padrões   │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Decision Engine       │
                    │ filter + rank         │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Recommendation        │
                    │ estratégia + ação     │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Controlled LLM        │
                    │ generation            │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Seller Copilot        │
                    │ orientação + mensagem │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Seller Action         │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Customer Reaction     │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Outcome + Feedback    │
                    └──────────────────────┘
```

---

## 7. Conversation Understanding

A primeira camada transforma mensagens não estruturadas em informação comercial estruturada.

No MVP, começar apenas com cinco sinais principais:

- `purchase_intent`;
- `sales_stage`;
- `main_objection`;
- `customer_need`;
- `sentiment`.

Exemplo:

```json
{
  "purchase_intent": "high",
  "sales_stage": "consideration",
  "main_objection": "price",
  "customer_need": "durability",
  "sentiment": "positive",
  "confidence": 0.86
}
```

O MVP não precisa inicialmente de modelos separados para todas as emoções, estados psicológicos e sinais comportamentais. Esses componentes podem ser adicionados quando houver dados suficientes e uma prova clara de utilidade.

---

## 8. Customer State Snapshot

O estado do cliente deve ser temporal. Não deve ser guardado como um atributo permanente do cliente.

```text
Conversation
   ↓ hasSnapshot
StateSnapshot_1
StateSnapshot_2
StateSnapshot_3
```

Cada snapshot representa o que o sistema acreditava num determinado momento.

```json
{
  "id": "state_003",
  "conversation_id": "conv_123",
  "based_on_message_id": "msg_009",
  "created_at": "2026-08-16T11:30:00Z",
  "purchase_intent": "high",
  "sales_stage": "consideration",
  "main_objection": "price",
  "customer_need": "durability",
  "sentiment": "positive",
  "confidence": 0.86,
  "model_version": "state-extractor-0.1"
}
```

O snapshot deve conservar:

- a mensagem que serviu de base;
- a versão do modelo;
- a confiança da classificação;
- a data e hora;
- a evidência utilizada;
- eventuais correções do vendedor.

---

## 9. Assertions e evidência

Uma classificação da IA não deve ser tratada como facto absoluto.

Em vez de:

```text
Customer → hasObjection → Price
```

O MVP deve preservar a afirmação e a sua origem:

```text
StateSnapshot_3
   ↓ hasAssertion
Assertion_45
   ├── predicate: hasObjection
   ├── object: Price
   ├── confidence: 0.94
   ├── supportedBy: Message_009
   ├── generatedBy: state-extractor-0.1
   └── validAt: timestamp
```

Isto permite:

- explicar a classificação;
- corrigir interpretações;
- auditar decisões;
- comparar previsões com resultados;
- preservar histórico quando o estado muda.

---

## 10. Knowledge Graph do MVP

O Knowledge Graph não deve ser uma ontologia gigante. Deve conter apenas as entidades necessárias para orientar decisões.

### Entidades de conhecimento

```text
SalesStage
IntentType
ObjectionType
NeedType
Strategy
Technique
ActionType
Policy
Playbook
DecisionPattern
Product
Evidence
```

### Entidades de runtime

```text
Business
Seller
Customer
Conversation
Message
StateSnapshot
DecisionContext
Recommendation
SellerAction
CustomerReaction
Outcome
```

### Relações principais

```text
Conversation contains Message
Conversation hasSnapshot StateSnapshot
StateSnapshot supportedBy Message
StateSnapshot matches DecisionPattern
DecisionPattern recommends Strategy
Strategy implementedBy Technique
Technique executedAs ActionType
Recommendation recommends ActionType
Recommendation justifiedBy Evidence
SellerAction executes Recommendation
SellerAction followedBy CustomerReaction
CustomerReaction leadsTo Outcome
```

---

## 11. Separação entre Knowledge Graph e Runtime Graph

O MVP deve distinguir conhecimento estável de eventos específicos de conversas.

### Knowledge Graph

```text
PriceObjection
ValueReframing
ReinforceValue
PolicyNoEarlyDiscount
ProductPremium
```

### Runtime Graph

```text
Conversation_456
Message_789
StateSnapshot_12
Recommendation_99
SellerAction_22
Outcome_5
```

Uma recomendação feita numa conversa não deve alterar automaticamente o conhecimento global.

---

## 12. Strategy, Technique e Action

Estes conceitos devem ter funções diferentes.

### Strategy

Objetivo comercial de alto nível.

Exemplos:

- Reforçar valor.
- Reduzir risco.
- Descobrir necessidade.
- Aumentar confiança.
- Avançar para decisão.

### Technique

Método de comunicação utilizado.

Exemplos:

- Pergunta aberta.
- Value reframing.
- Social proof.
- Comparação.
- Trial close.

### Action

Comportamento executável pelo vendedor.

Exemplos:

- Perguntar qual é a principal preocupação.
- Explicar um benefício relevante.
- Apresentar prova social.
- Recomendar o produto Premium.
- Pedir confirmação da compra.
- Marcar follow-up.

Cadeia:

```text
Strategy
   ↓ implementedBy
Technique
   ↓ executedAs
Action
```

---

## 13. Decision Patterns

O MVP deve representar combinações contextuais como `DecisionPattern`.

Um pattern liga condições a estratégias, ações e exclusões.

```json
{
  "id": "pattern_price_high_intent",
  "conditions": [
    {
      "field": "purchase_intent",
      "operator": "in",
      "value": ["medium", "high"]
    },
    {
      "field": "sales_stage",
      "operator": "in",
      "value": ["consideration", "objection"]
    },
    {
      "field": "main_objection",
      "operator": "equals",
      "value": "price"
    },
    {
      "field": "sentiment",
      "operator": "not_equals",
      "value": "frustrated"
    }
  ],
  "include_actions": [
    "reinforce_value",
    "ask_diagnostic_question",
    "show_social_proof"
  ],
  "exclude_actions": [
    "offer_discount",
    "aggressive_urgency"
  ],
  "priority": 80
}
```

O pattern representa conhecimento aplicável, não uma recomendação automática. O Sales Brain ainda precisa de avaliar o contexto final.

---

## 14. O Decision Context como ponte

O `DecisionContext` é o principal contrato entre o Knowledge Graph e o Sales Brain.

```text
Knowledge Graph + RAG + Business Data
                ↓
        Decision Context
                ↓
          Sales Brain
```

Exemplo:

```json
{
  "id": "decision_context_22",
  "conversation_id": "conv_123",
  "state_snapshot_id": "state_003",
  "applicable_patterns": [
    "pattern_price_high_intent"
  ],
  "allowed_actions": [
    "reinforce_value",
    "ask_diagnostic_question",
    "show_social_proof",
    "recommend_premium_product"
  ],
  "blocked_actions": [
    {
      "action": "offer_discount",
      "reason": "BUSINESS_POLICY_NO_EARLY_DISCOUNT"
    },
    {
      "action": "create_urgency",
      "reason": "NO_VERIFIED_URGENCY_SIGNAL"
    }
  ],
  "product_options": [
    "premium_01"
  ],
  "business_policies": [
    "policy_no_early_discount"
  ],
  "historical_evidence": [],
  "playbook_version": "playbook_07",
  "knowledge_version": "knowledge_02"
}
```

O Brain deve tomar decisões sobre este objeto, não sobre uma coleção desorganizada de documentos.

---

## 15. Como o Brain consulta o Knowledge Graph

O Sales Brain não deve criar consultas Cypher ou SPARQL arbitrárias durante a execução.

Deve utilizar uma camada de queries tipadas, por exemplo:

```text
get_current_customer_state()
get_applicable_decision_patterns()
get_allowed_actions()
get_blocked_actions()
get_product_recommendations()
get_relevant_playbook_rules()
get_strategy_evidence()
get_historical_action_outcomes()
```

Exemplo:

```json
{
  "query": "get_applicable_decision_patterns",
  "input": {
    "tenant_id": "business_01",
    "state_snapshot_id": "state_003",
    "product_id": "premium_01"
  }
}
```

Resposta:

```json
{
  "patterns": [
    {
      "id": "pattern_price_high_intent",
      "strategy": "value_reframing",
      "actions": [
        "reinforce_value",
        "ask_diagnostic_question"
      ],
      "excluded_actions": [
        "offer_discount",
        "aggressive_urgency"
      ],
      "priority": 80,
      "evidence": [
        "playbook_rule_12"
      ]
    }
  ]
}
```

Esta camada evita acoplamento excessivo entre a lógica de decisão e a tecnologia de armazenamento.

---

## 16. Papel do RAG

O Knowledge Graph deve selecionar o que é relevante. O RAG deve recuperar o conteúdo detalhado.

### Knowledge Graph

Seleciona:

- estratégia;
- técnica;
- ação;
- produto;
- política;
- restrição;
- fonte de evidência.

### RAG

Recupera:

- benefícios verificados do produto;
- exemplos aprovados de mensagens;
- provas sociais;
- características técnicas;
- políticas detalhadas;
- casos de uso;
- exemplos de objeções.

Fluxo:

```text
Customer State
      ↓
Knowledge Graph
      ↓
Knowledge Targets
      ↓
Hybrid Retrieval
      ↓
Evidence Pack
      ↓
Decision Context
```

O graph reduz o espaço de pesquisa. O RAG fornece detalhes e linguagem de apoio.

---

## 17. Âncoras do graph para o RAG

Cada documento ou fragmento deve poder ser associado a entidades do graph.

```text
DocumentChunk_101
   ├── describes ──> ValueReframing
   ├── appliesTo ──> PriceObjection
   ├── appliesAt ──> ConsiderationStage
   └── concerns ───> ProductPremium
```

Assim, em vez de procurar em todos os documentos, o sistema procura exemplos associados às entidades relevantes.

```text
Recuperar exemplos de Value Reframing
para Price Objection,
na fase Consideration,
para Product Premium,
no tom Friendly.
```

---

## 18. Pipeline de decisão

```text
Customer State
      ↓
Graph Retrieval
      ↓
Decision Context
      ↓
Candidate Action Generation
      ↓
Hard Policy Filter
      ↓
Soft Ranking
      ↓
Recommendation
      ↓
Controlled Generation
```

### Hard Policy Filter

Remove ações proibidas:

- desconto não autorizado;
- promessa de prazo sem verificação;
- produto sem stock;
- urgência falsa;
- informação não comprovada;
- ação bloqueada pelo playbook.

### Soft Ranking

Classifica ações permitidas:

```text
Value Reframing      0.87
Diagnostic Question   0.79
Social Proof          0.71
Alternative Product   0.56
```

Política não deve ser apenas uma penalização no score. Uma violação deve retirar a ação da lista.

```text
PolicyViolation(a) = 1
→ a não é permitida
```

---

## 19. Ranking no MVP

No início, utilizar regras transparentes e pesos configuráveis.

A lógica conceptual pode ser:

```text
Action Score =
  State Match
+ Playbook Priority
+ Product Fit
+ Historical Evidence
+ Seller Fit
- Risk
- Uncertainty
```

No entanto, `policy violation` é um filtro absoluto e não apenas um fator negativo.

Uma ação pode ser:

```text
permitida, mas sem evidência histórica
```

ou:

```text
eficaz historicamente, mas proibida pelo playbook atual
```

O sistema deve distinguir essas situações.

---

## 20. Recommendation auditável

A recomendação deve guardar a decisão completa.

```json
{
  "id": "recommendation_44",
  "decision_context_id": "decision_context_22",
  "strategy": "value_reframing",
  "action": "reinforce_value",
  "rank": 1,
  "score": 0.87,
  "confidence": 0.84,
  "reason_codes": [
    "HIGH_INTENT",
    "PRICE_OBJECTION",
    "CONSIDERATION_STAGE",
    "POSITIVE_SENTIMENT"
  ],
  "excluded_actions": [
    {
      "action": "offer_discount",
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

Isto torna a recomendação:

- explicável;
- auditável;
- comparável;
- treinável;
- avaliável.

---

## 21. Confidence, decision score e outcome probability

Estes valores devem ser diferentes.

### Confidence

Confiança na interpretação:

```text
Objection = Price
Confidence = 0.94
```

### Decision score

Adequação de uma ação entre as opções permitidas:

```text
Value Reframing
Decision score = 0.87
```

### Outcome probability

Estimativa de um resultado futuro:

```text
Purchase probability = 0.61
```

No MVP, utilizar principalmente `confidence` e `decision_score`. Evitar probabilidades precisas de compra antes de haver dados suficientes e validação adequada.

---

## 22. Os três outputs do Sales Brain

O Sales Brain deve produzir três saídas diferentes.

### Decision Output

Para o sistema:

```json
{
  "strategy": "value_reframing",
  "action": "reinforce_value",
  "confidence": 0.84,
  "score": 0.87
}
```

### Seller Guidance

Para o vendedor:

```text
Reforça o valor antes de oferecer desconto.
O cliente demonstra intenção elevada, mas está hesitante com o preço.
```

### Generation Context

Para o LLM:

```json
{
  "language": "Spanish",
  "tone": "friendly",
  "approved_facts": [
    "reinforced material",
    "two-year warranty"
  ],
  "forbidden_actions": [
    "offer_discount",
    "create_urgency"
  ],
  "response_objective": "reinforce_value_before_discount_discussion"
}
```

A orientação ao vendedor e o contexto de geração não devem ser confundidos.

---

## 23. Controlled Generation

O LLM recebe somente o contexto necessário para comunicar a decisão.

```json
{
  "customer_language": "Spanish",
  "brand_tone": "friendly",
  "customer_state": {
    "sales_stage": "consideration",
    "main_objection": "price",
    "customer_need": "durability"
  },
  "decision": {
    "strategy": "value_reframing",
    "action": "reinforce_value",
    "secondary_action": "ask_diagnostic_question"
  },
  "approved_facts": [
    "reinforced material",
    "two-year warranty"
  ],
  "forbidden_claims": [
    "do not promise delivery date",
    "do not offer discount"
  ]
}
```

Instrução principal:

> Gera uma mensagem natural que execute a ação aprovada usando apenas os factos autorizados. Não alteres a estratégia, não ofereças desconto e não inventes benefícios.

O sistema deve validar a resposta antes de a mostrar ao vendedor.

---

## 24. Exemplo completo

### Mensagem do cliente

> “Me gusta mucho, pero €120 me parece demasiado.”

### State Snapshot

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

### Graph Retrieval

```text
Price Objection
+ High Intent
+ Consideration
+ Positive Sentiment
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
  "secondary_action": "ask_diagnostic_question",
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

> “Entiendo. La diferencia de precio está principalmente en la calidad del material y en la garantía de dos años. Como buscas algo duradero, esta versión puede compensar más con el uso diario. ¿Tu principal preocupación es el presupuesto o te gustaría entender mejor lo que incluye?”

### Outcome

```text
Seller action: accepted_and_sent
Customer reaction: continued_conversation
Outcome: qualified
```

O sistema deve guardar o episódio, mas não afirmar automaticamente que a estratégia causou a conversão.

---

## 25. Decision Episode

O MVP deve usar `DecisionEpisode` como unidade de análise.

```text
Message
   ↓
StateSnapshot
   ↓
Recommendation
   ↓
SellerAction
   ↓
CustomerReaction
   ↓
Outcome
```

Exemplo:

```json
{
  "id": "episode_001",
  "conversation_id": "conv_123",
  "state_snapshot_id": "state_003",
  "recommendation_id": "rec_001",
  "seller_action_id": "seller_action_001",
  "customer_reaction_id": "reaction_001",
  "outcome_id": "outcome_001"
}
```

Este objeto permite relacionar exatamente:

- estado observado;
- contexto recuperado;
- recomendação feita;
- ação real do vendedor;
- reação do cliente;
- resultado posterior.

---

## 26. Feedback do vendedor

O vendedor deve poder corrigir cada camada:

```text
Estado:
[✓] Objeção = preço
[ ] Objeção = qualidade
```

```text
Recomendação:
[✓] Útil
[ ] Não útil
[ ] Estratégia errada
[ ] Produto errado
[ ] Momento errado
```

```text
Mensagem:
[Enviar]
[Editar]
[Regenerar]
[Rejeitar]
```

Eventos a registar:

```text
SellerFeedback
   ├── corrects ───> StateAssertion
   ├── evaluates ─> Recommendation
   └── modifies ──> GeneratedMessage
```

O feedback não deve alterar automaticamente o conhecimento global. Primeiro deve ser armazenado como evidência e posteriormente agregado ou revisto.

---

## 27. Learning Loop

O learning loop inicial deve ser observacional e auditável.

```text
Conversation
      ↓
State Snapshot
      ↓
Recommendation
      ↓
Seller Action
      ↓
Customer Reaction
      ↓
Outcome
      ↓
Evaluation
      ↓
Aggregated Evidence
```

O sistema pode aprender relações como:

```text
Price Objection
+ High Intent
+ Consideration
+ Value Reframing
→ 132 episódios
→ 28 compras
→ 21.2% observed conversion
```

Mas deve distinguir:

```text
A ação foi seguida por uma compra
```

de:

```text
A ação causou a compra
```

No MVP, chamar estes dados de **observed outcomes**, não de causalidade comprovada.

---

## 28. Guardrails e prioridades

A ordem de prioridade deve ser:

```text
Compliance / Safety
        ↓
Business Policies
        ↓
Playbook
        ↓
Product Rules
        ↓
Conversation Context
        ↓
Historical Ranking
        ↓
Seller Style
```

Guardrails mínimos:

- não inventar benefícios;
- não prometer prazos sem confirmação;
- não recomendar produtos sem stock;
- não oferecer descontos não autorizados;
- não criar urgência falsa;
- não fazer upsell quando o cliente está frustrado;
- não insistir depois de uma recusa clara;
- não usar dados que o vendedor não esteja autorizado a consultar.

---

## 29. Fallbacks

### Baixa confiança na interpretação

```text
Não assumir a objeção.
Sugerir uma pergunta de clarificação.
```

### Nenhuma regra aplicável

```text
Priorizar escuta, resumo e pergunta aberta.
```

### Conflito de regras

```text
Aplicar a hierarquia de prioridades.
```

### Dados de produto insuficientes

```text
Não recomendar produto específico.
Pedir verificação do catálogo.
```

### Cliente frustrado

```text
Bloquear upsell, urgência e pressão.
Priorizar resolução e empatia.
```

### Erro na geração

```text
Rejeitar a mensagem.
Regenerar com contexto mais restrito.
Ou mostrar apenas a orientação ao vendedor.
```

---

## 30. Armazenamento recomendado

Para o MVP, não é necessário começar com uma graph database dedicada.

### Stack inicial

```text
PostgreSQL
├── entidades
├── relações
├── state snapshots
├── decision contexts
├── recommendations
├── outcomes
└── playbook rules

JSONB
└── estado variável e evidência

pgvector
└── documentos, exemplos e chunks

Rule Engine
└── decision patterns e policies

LLM
└── extraction, explanation e generation
```

O graph conceptual pode ser implementado em tabelas relacionais no início. O essencial é preservar:

- IDs estáveis;
- relações explícitas;
- versionamento;
- proveniência;
- eventos imutáveis;
- consultas encapsuladas;
- separação entre conhecimento e runtime.

Uma graph database dedicada pode ser adicionada quando houver muitas consultas multi-hop, necessidade de inferência complexa ou grande volume de relações.

---

## 31. Esquema mínimo

### `state_snapshots`

```text
id
conversation_id
based_on_message_id
purchase_intent
sales_stage
main_objection
customer_need
sentiment
confidence
evidence_json
model_version
created_at
```

### `decision_contexts`

```text
id
conversation_id
state_snapshot_id
applicable_patterns_json
allowed_actions_json
blocked_actions_json
product_options_json
policies_json
historical_evidence_json
playbook_version
knowledge_version
created_at
```

### `recommendations`

```text
id
decision_context_id
strategy_id
action_id
score
confidence
reason_codes_json
excluded_actions_json
evidence_json
model_version
created_at
```

### `decision_episodes`

```text
id
conversation_id
state_snapshot_id
recommendation_id
seller_action_id
customer_reaction_id
outcome_id
created_at
```

### `outcomes`

```text
id
conversation_id
decision_episode_id
type
revenue
occurred_at
attribution_method
```

---

## 32. APIs internas

```text
POST /conversation-state/extract
POST /knowledge/applicable-patterns
POST /knowledge/action-constraints
POST /decision-context/build
POST /sales-brain/recommend
POST /response/generate
POST /seller-feedback/record
POST /outcomes/record
```

### Exemplo: `/sales-brain/recommend`

Input:

```json
{
  "conversation_id": "conv_123",
  "state_snapshot_id": "state_003",
  "tenant_id": "business_01",
  "seller_id": "seller_07"
}
```

Output:

```json
{
  "recommendation_id": "rec_001",
  "strategy": "value_reframing",
  "action": "reinforce_value",
  "score": 0.87,
  "confidence": 0.84,
  "seller_guidance": "Reforça o valor antes de oferecer desconto.",
  "allowed_facts": [
    "reinforced material",
    "two-year warranty"
  ],
  "blocked_actions": [
    "offer_discount",
    "create_urgency"
  ]
}
```

---

## 33. Roadmap técnico do MVP

### Fase 1 — Assistência básica

- Integração com um canal principal.
- Histórico da conversa.
- Extração de intent, stage, objection, need e sentiment.
- State Snapshots.
- Resumo para o vendedor.

### Fase 2 — Conhecimento e decisão

- Catálogo de produtos.
- Playbook por empresa.
- Decision Patterns.
- Políticas e bloqueios.
- Decision Context.
- Next Best Action.

### Fase 3 — Geração controlada

- Mensagens sugeridas.
- Message Coach.
- Factos aprovados.
- Validação de claims.
- Suporte a idioma e tom.

### Fase 4 — Outcomes

- Aceitação, edição e rejeição.
- Reação do cliente.
- Follow-up.
- Compra, upsell e cross-sell.
- Decision Episodes.
- Métricas de resultado.

### Fase 5 — Ranking baseado em evidência

- Agregação de outcomes.
- Comparação de Decision Patterns.
- Ranking histórico por segmento.
- Experimentos controlados.
- Modelos especializados quando houver dados suficientes.

---

## 34. Métricas do MVP

### Uso

- Taxa de aceitação das recomendações.
- Taxa de edição.
- Taxa de rejeição.
- Tempo até o envio.
- Frequência de utilização por vendedor.

### Qualidade

- Correção do intent.
- Correção da objeção.
- Correção do estágio.
- Taxa de mensagens bloqueadas por violação.
- Taxa de respostas regeneradas.
- Feedback positivo do vendedor.

### Resultado comercial

- Conversas que continuam.
- Conversas qualificadas.
- Follow-ups concluídos.
- Conversão observada.
- Valor médio por pedido.
- Taxa de upsell.
- Taxa de cross-sell.

### Métrica de longo prazo

```text
Incremental conversion generated by the Sales Brain
```

No MVP, não assumir causalidade sem desenho experimental adequado.

---

## 35. Decisões de produto

O MVP deve privilegiar:

- vendedor humano no controlo;
- recomendações explicáveis;
- poucas categorias de estado;
- regras transparentes;
- políticas fortes;
- geração controlada;
- histórico temporal;
- feedback explícito;
- outcomes observáveis.

Deve evitar:

- autonomia excessiva;
- percentagens de compra sem calibração;
- ontologia demasiado grande;
- fine-tuning prematuro;
- complexidade de multi-agent systems;
- claims de causalidade sem evidência.

---

## 36. Tese final

O MVP não deve ser definido como:

> “Um RAG com técnicas de vendas.”

Nem como:

> “Um LLM que escreve respostas.”

A definição correta é:

> **Um sistema de decisão comercial assistida que transforma cada conversa num estado estruturado, consulta conhecimento e políticas da empresa, escolhe uma próxima melhor ação e ajuda o vendedor a executá-la.**

O ciclo central é:

```text
Estado observado
      ↓
Contexto recuperado
      ↓
Ações permitidas
      ↓
Recomendação
      ↓
Ação do vendedor
      ↓
Reação do cliente
      ↓
Resultado
```

O verdadeiro núcleo do produto não é a tecnologia de armazenamento. É o ciclo auditável:

```text
State Snapshot
      ↓
Decision Context
      ↓
Recommendation
      ↓
Decision Episode
      ↓
Outcome
```

O Knowledge Graph fornece memória estruturada e restrições. O Sales Brain transforma esse conhecimento em decisão contextual. O Decision Engine filtra e classifica ações. O LLM transforma a decisão em linguagem. O vendedor mantém o controlo.
