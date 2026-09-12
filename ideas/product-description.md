# AI Sales Brain — MVP Product Specification

## 1. Resumo executivo

O AI Sales Brain é um copiloto de vendas para vendedores que conduzem conversas comerciais através de canais como Instagram e WhatsApp.

O MVP não pretende substituir o vendedor nem funcionar como chatbot autónomo. O objetivo é ajudar o vendedor a tomar uma decisão comercial melhor em cada momento da conversa:

> **Qual é a próxima melhor ação para fazer esta conversa avançar?**

O produto analisa o histórico da conversa, transforma-o num estado comercial estruturado, aplica as regras e o playbook da empresa e recomenda uma ação. Depois, ajuda o vendedor a executar essa ação através de uma resposta sugerida e de uma avaliação antes do envio.

## 2. Problema

Vendedores que trabalham através de mensagens enfrentam problemas recorrentes:

- Não sabem se o cliente está realmente interessado.
- Respondem sem compreender a fase da venda.
- Oferecem desconto demasiado cedo.
- Ignoram ou interpretam mal objeções.
- Não sabem quando fazer upsell ou cross-sell.
- Esquecem follow-ups.
- Enviam mensagens longas, genéricas ou pouco persuasivas.
- Cada vendedor comunica de forma diferente.
- Gestores têm pouca visibilidade sobre a qualidade das conversas.

As ferramentas existentes tendem a centralizar mensagens, automatizar atendimento ou gerar texto. O MVP deve concentrar-se em melhorar a decisão e a execução do vendedor.

## 3. Público-alvo inicial

### Cliente ideal

Marcas de ecommerce de moda, beleza e acessórios que:

- Vendem através de Instagram e WhatsApp.
- Recebem aproximadamente 30–500 conversas comerciais por dia.
- Têm entre 2 e 20 vendedores ou agentes.
- Possuem catálogo com vários produtos, versões ou complementos.
- Precisam de aconselhamento antes da compra.
- Têm oportunidades de upsell e cross-sell.
- Perdem vendas por respostas lentas, inconsistentes ou pouco estratégicas.

### Utilizador principal

- Vendedor.
- Agente comercial.
- Social seller.
- Consultor de vendas.

### Comprador ou decisor

- Fundador da marca.
- Diretor comercial.
- Head of Ecommerce.
- Responsável de Customer Experience.
- Gestor de marketing ou operações.

## 4. Posicionamento

### Proposta de valor

> **Ajuda a tua equipa a saber o que responder, como responder e qual deve ser o próximo passo para converter conversas de Instagram e WhatsApp em vendas.**

### O que o produto não é

- Não é apenas uma inbox omnichannel.
- Não é apenas um chatbot.
- Não é apenas um gerador de respostas.
- Não é um CRM completo.
- Não é um agente autónomo que substitui vendedores.

### O que o produto é

> **Um sistema de decisão comercial que transforma cada conversa num estado estruturado, recomenda a próxima melhor ação e ajuda o vendedor a executá-la.**

## 5. Objetivo do MVP

Validar se um copiloto que fornece contexto comercial e orientação em tempo real consegue:

- Melhorar a qualidade das respostas.
- Aumentar a continuidade das conversas.
- Reduzir o tempo de resposta.
- Aumentar a taxa de conversão.
- Aumentar upsell e cross-sell quando apropriado.
- Reduzir erros comerciais e mensagens inadequadas.

A hipótese central é:

> **Vendedores que recebem uma recomendação contextual da próxima melhor ação têm maior probabilidade de avançar a conversa e converter o cliente do que vendedores sem essa orientação.**

## 6. Escopo funcional do MVP

### 6.1 Inbox inicial

O MVP deve começar com o menor número possível de canais:

1. Instagram Direct.
2. WhatsApp Business, quando a integração e as permissões estiverem validadas.

A inbox deve permitir:

- Ver conversas.
- Identificar o vendedor responsável.
- Abrir o painel de inteligência.
- Escrever uma resposta.
- Pedir análise da mensagem.
- Aceitar, editar ou rejeitar uma sugestão.
- Registar o resultado da conversa.

### 6.2 Conversation Memory

O sistema deve guardar o contexto relevante da conversa:

- Mensagens anteriores.
- Produtos mencionados.
- Perguntas do cliente.
- Respostas enviadas.
- Objeções detetadas.
- Produtos rejeitados.
- Preferências declaradas.
- Última ação recomendada.
- Resultado conhecido da conversa.

O sistema não deve analisar apenas a última mensagem. Deve acompanhar a evolução da conversa.

### 6.3 Customer State

A primeira versão deve usar um estado comercial simples e explicável:

```json
{
  "purchase_intent": "high",
  "sales_stage": "consideration",
  "main_objection": "price",
  "customer_need": "durability",
  "engagement": "high",
  "recommended_action": "value_reframing",
  "confidence": 0.86
}
```

#### Campos do MVP

- `purchase_intent`: low, medium ou high.
- `sales_stage`: discovery, interest, consideration, objection ou decision.
- `main_objection`: price, trust, timing, product_fit, quality, shipping, availability, competition ou none.
- `customer_need`: necessidade principal identificada.
- `engagement`: low, medium ou high.
- `recommended_action`: próxima ação comercial.
- `confidence`: confiança do sistema na interpretação, não probabilidade de compra.

#### Campos adiados

- Modelo emocional detalhado.
- Probabilidade exata de conversão.
- Decision readiness com grande precisão.
- Predição de lifetime value.
- Perfil psicológico complexo.

## 7. Sales Stage Detection

A primeira taxonomia deve ser simples:

```text
Discovery
   ↓
Interest
   ↓
Consideration
   ↓
Objection
   ↓
Decision
   ↓
Purchase
```

O estágio deve ser atualizado à medida que chegam novas mensagens.

A mesma objeção pode exigir ações diferentes conforme o estágio. Uma objeção de preço durante a descoberta pode exigir uma pergunta; a mesma objeção perto da decisão pode exigir reforço de valor ou uma alternativa.

## 8. Objection Detection

Categorias iniciais:

- Price.
- Trust.
- Timing.
- Product fit.
- Quality.
- Risk.
- Competition.
- Shipping.
- Availability.
- Need.

A deteção deve incluir uma explicação simples:

```text
Objeção: preço
Confiança: alta
Evidência: o cliente comparou o valor com outra opção e perguntou por uma alternativa mais barata.
```

O sistema não deve limitar-se a classificar a objeção. Deve recomendar o que fazer a seguir.

## 9. Sales Playbook da empresa

Cada empresa deve conseguir configurar:

- Produtos e variantes.
- Benefícios e características.
- Produtos complementares.
- Produtos alternativos.
- Preços e stock, quando disponíveis.
- Perfil de cliente ideal.
- Tom da marca.
- Objeções frequentes.
- Regras de desconto.
- Regras de upsell e cross-sell.
- Políticas comerciais.
- Perguntas de descoberta.
- Frases ou abordagens proibidas.
- Condições para fazer follow-up.

### Exemplo de regra

```text
Se:
- purchase_intent = high
- sales_stage = consideration
- objection = price
- customer_need = durability

Então:
- priorizar value_reframing;
- recomendar o produto Premium se o orçamento permitir;
- não oferecer desconto imediatamente;
- fazer uma pergunta de confirmação antes do fechamento.
```

## 10. Sales Knowledge

O MVP deve utilizar conhecimento comercial estruturado, mas sem tentar implementar inicialmente todas as metodologias de vendas.

### Técnicas iniciais

- Discovery.
- Qualification.
- Value reframing.
- Objection handling.
- Social proof.
- Alternative product.
- Upsell.
- Cross-sell.
- Closing.
- Follow-up.

Cada técnica deve possuir:

- Objetivo.
- Pré-condições.
- Estágios aplicáveis.
- Objeções compatíveis.
- Situações em que deve ser evitada.
- Próximas ações possíveis.
- Exemplos.
- Nível de risco.

### Estrutura de conhecimento

No MVP, utilizar objetos estruturados e documentos indexados. Um knowledge graph completo pode ser considerado posteriormente.

```json
{
  "technique": "value_reframing",
  "purpose": "mostrar o valor antes de discutir desconto",
  "valid_stages": ["consideration", "objection"],
  "valid_objections": ["price"],
  "avoid_when": ["low_intent", "customer_frustrated"],
  "risk": "low",
  "examples": []
}
```

## 11. Next Best Action Engine

Esta é a camada central do MVP.

### A pergunta principal

> **O que o vendedor deve fazer agora?**

### Ações disponíveis

- Fazer pergunta de descoberta.
- Identificar necessidade.
- Qualificar o cliente.
- Reforçar valor.
- Resolver objeção.
- Apresentar produto.
- Apresentar alternativa.
- Fazer upsell.
- Fazer cross-sell.
- Pedir o fechamento.
- Fazer follow-up.
- Esperar.
- Não pressionar.

### Exemplo de ranking

```text
Customer State:
- Intent: high
- Stage: consideration
- Objection: price
- Need: durability

Candidate actions:
1. Value reframing      0.87
2. Social proof         0.68
3. Alternative product  0.55
4. Discount             0.22

Selected action:
Value reframing
```

A pontuação inicial deve ser determinada por regras, playbook e contexto. O ranking baseado em resultados reais será desenvolvido depois de existir volume suficiente de dados.

## 12. Resposta sugerida

Depois de selecionar a próxima ação, o sistema gera uma ou mais respostas.

### Formatos iniciais

- Resposta recomendada.
- Versão curta.
- Versão mais consultiva.
- Versão direta para fechamento.

Cada resposta deve ser baseada em:

- Estado do cliente.
- Objetivo comercial.
- Playbook da empresa.
- Produto correto.
- Idioma do cliente.
- Tom da marca.
- Histórico da conversa.

### Exemplo

```text
Estratégia:
Reforçar valor antes de discutir desconto.

Resposta:
“Entendo. A diferença de preço deve-se principalmente ao material reforçado e à garantia de dois anos. Como procuras algo para utilizar diariamente, essa versão tende a compensar mais a longo prazo. O teu principal limite é o orçamento ou procuras manter estas características?”
```

## 13. Message Coach

O vendedor pode escrever a sua própria resposta e pedir uma análise antes do envio.

### A análise deve verificar

- Se respondeu à pergunta do cliente.
- Se está alinhada com o estágio da venda.
- Se trata a objeção correta.
- Se é clara e objetiva.
- Se está demasiado longa.
- Se o tom é adequado.
- Se contém uma pergunta útil.
- Se oferece desconto demasiado cedo.
- Se perde uma oportunidade de upsell ou cross-sell.
- Se contém promessas não confirmadas.
- Se respeita o playbook.

### Exemplo de feedback

```text
Avaliação: precisa de melhoria

Problema principal:
Estás a oferecer desconto antes de compreender se o preço é a única objeção.

Recomendação:
Responde primeiro à preocupação sobre valor e termina com uma pergunta de diagnóstico.

Versão melhorada:
[resposta sugerida]
```

## 14. Explainability

Toda recomendação importante deve incluir uma explicação curta e compreensível.

### Estrutura

```text
Estado identificado:
Cliente interessado, na fase de consideração.

Problema:
Demonstrou preocupação com o preço.

Recomendação:
Reforçar valor antes de oferecer desconto.

Motivo:
O cliente ainda não rejeitou o produto; procurar uma alternativa imediatamente pode reduzir o valor percebido.
```

A explicação deve basear-se em sinais visíveis da conversa e em regras do playbook.

## 15. Guardrails comerciais

O sistema deve ter regras explícitas para evitar recomendações prejudiciais.

### Exemplos

- Não inventar características, preços, stock ou prazos.
- Não prometer descontos sem autorização.
- Não recomendar produtos indisponíveis.
- Não fazer upsell quando o cliente está frustrado.
- Não usar urgência falsa.
- Não insistir depois de uma recusa clara.
- Não ignorar uma reclamação para tentar vender.
- Não apresentar demasiados produtos ao mesmo tempo.
- Não recomendar uma técnica proibida pela empresa.
- Encaminhar para um humano quando a confiança for baixa ou o caso for sensível.

## 16. Arquitetura técnica do MVP

```text
Instagram / WhatsApp
          ↓
Conversation Ingestion
          ↓
Conversation Memory
          ↓
Structured State Extraction
          ↓
Business Context + Sales Playbook
          ↓
Rules + Retrieval
          ↓
Next Best Action Engine
          ↓
Controlled LLM Generation
          ↓
Seller Review / Edit / Send
          ↓
Customer Response
          ↓
Outcome Tracking
```

### Componentes

#### Ingestion layer

- Recebe mensagens.
- Normaliza eventos.
- Associa a conversa a um cliente.
- Mantém ordem temporal.

#### State extraction layer

- Extrai campos estruturados.
- Atualiza o Customer State.
- Guarda evidências da classificação.

#### Knowledge and retrieval layer

- Recupera regras da empresa.
- Recupera informações de produtos.
- Recupera técnicas compatíveis.
- Filtra por estágio, objeção e contexto.

#### Decision layer

- Gera ações candidatas.
- Aplica restrições.
- Faz ranking inicial.
- Seleciona a Next Best Action.

#### Generation layer

- Recebe apenas o contexto aprovado.
- Gera a resposta.
- Mantém tom, idioma e políticas.

#### Feedback layer

- Regista aceitação, edição ou rejeição.
- Regista resposta do cliente.
- Regista resultado conhecido.

## 17. Estratégia de implementação de IA

### Fase 1 — MVP

Utilizar:

- LLM com output estruturado.
- Regras determinísticas.
- RAG híbrido.
- Exemplos curados.
- Validação humana.
- Scoring categórico.

Não treinar ainda modelos próprios de grande escala.

### Fase 2 — Dados rotulados

- Recolher exemplos de estados comerciais.
- Rever classificações por humanos.
- Criar dataset de objeções, estágios e ações.
- Avaliar sistematicamente precisão e erros.

### Fase 3 — Modelos especializados

Quando houver dados suficientes:

- Intent classifier.
- Objection classifier.
- Sales stage classifier.
- Action ranking model.
- Conversion prediction model.

### Fase 4 — Outcome-based learning

- Relacionar estado, recomendação, ação e resultado.
- Comparar estratégias por segmento.
- Criar ranking baseado em evidência.
- Testar recomendações com grupos de controlo.

## 18. Learning Loop

```text
Conversation
      ↓
Customer State
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
      ↺
```

### Eventos a registar

- Sugestão apresentada.
- Sugestão aceite.
- Sugestão editada.
- Sugestão rejeitada.
- Resposta enviada pelo vendedor.
- Cliente respondeu.
- Conversa qualificada.
- Checkout iniciado.
- Compra concluída.
- Upsell realizado.
- Cross-sell realizado.
- Conversa perdida.
- Follow-up necessário.

## 19. Métricas do MVP

### Métricas de adoção

- Número de vendedores ativos.
- Conversas analisadas.
- Percentagem de conversas com recomendação aberta.
- Frequência de utilização do Message Coach.

### Métricas de interação

- Taxa de aceitação das sugestões.
- Taxa de edição das sugestões.
- Taxa de rejeição.
- Tempo médio para enviar uma resposta.
- Percentagem de conversas com próxima ação definida.

### Métricas comerciais

- Taxa de resposta do cliente.
- Taxa de continuação da conversa.
- Taxa de qualificação.
- Conversão conversa-para-compra.
- Valor médio do pedido.
- Taxa de upsell.
- Taxa de cross-sell.
- Taxa de follow-up concluído.

### Métrica de longo prazo

> **Conversão incremental gerada pelo Sales Brain.**

Essa métrica deve ser validada através de comparação com conversas sem assistência do copiloto.

## 20. Instrumentação e avaliação

Cada recomendação deve guardar:

```json
{
  "conversation_id": "...",
  "state_version": 4,
  "recommended_action": "value_reframing",
  "reason": "price_objection_high_intent",
  "confidence": 0.86,
  "seller_action": "edited_and_sent",
  "customer_replied": true,
  "outcome": "purchase"
}
```

### Avaliação offline

Criar um conjunto de conversas anonimizadas e avaliar:

- Correção do estágio.
- Correção da objeção.
- Qualidade da próxima ação.
- Correção da recomendação de produto.
- Adequação do tom.
- Cumprimento das regras.

### Avaliação online

- Comparar conversas com e sem copiloto.
- Medir resultados por vendedor.
- Monitorizar alterações feitas nas sugestões.
- Rever casos de erro.
- Evitar atribuir toda a receita influenciada à IA sem controlo adequado.

## 21. Roadmap

### Versão 0 — Validação

- Entrevistas com vendedores e gestores.
- Recolha de conversas anonimizadas.
- Protótipo de painel.
- Testes manuais de análise e recomendação.

### Versão 1 — MVP

- Um canal principal, preferencialmente Instagram ou WhatsApp.
- Customer State básico.
- Deteção de intenção, estágio e objeção.
- Sales Playbook configurável.
- Next Best Action baseado em regras.
- Respostas sugeridas.
- Message Coach.
- Feedback do vendedor.

### Versão 2 — Produto inicial

- Segundo canal.
- Integração com catálogo.
- Recomendações de produto.
- Upsell e cross-sell baseados em regras.
- Follow-up recomendado.
- Dashboard para gestores.
- Outcome tracking mais completo.

### Versão 3 — Inteligência baseada em dados

- Modelos especializados.
- Ranking baseado em resultados.
- Personalização por vendedor.
- Personalização por segmento de cliente.
- Experimentos de recomendação.
- Conversão incremental.

### Versão 4 — Visão de longo prazo

- Predictive Sales Intelligence.
- AI Sales Agent opcional.
- Autopilot para situações de baixo risco.
- Knowledge graph comercial.
- Modelos próprios de Next Best Action.

## 22. Fora do escopo do MVP

- Agente totalmente autónomo.
- CRM completo.
- Helpdesk completo.
- Email outbound.
- Voicebot.
- Todas as redes sociais.
- Modelos próprios de emoção.
- Fine-tuning prematuro.
- Probabilidades exatas de conversão.
- Automatização de descontos sem aprovação.
- Gestão completa de encomendas e reembolsos.
- Knowledge graph complexo.

## 23. Riscos

### Integrações

Instagram e WhatsApp podem ter limitações de API, permissões, templates, custos e processos de aprovação. A viabilidade deve ser validada antes de prometer todos os fluxos.

### Confiança

Recomendações incorretas podem prejudicar a relação com o cliente. O vendedor deve permanecer no controlo no MVP.

### Dados insuficientes

Sem outcomes confiáveis, o sistema não deve apresentar previsões excessivamente precisas.

### Privacidade

Conversas comerciais podem conter dados pessoais. O produto deve prever anonimização, controlo de acesso, retenção e tratamento adequado dos dados.

### Atribuição

Uma compra pode ser influenciada por vários fatores. “Receita influenciada” não deve ser tratada automaticamente como receita incremental.

## 24. Princípios de produto

1. A IA recomenda; o vendedor decide.
2. A estratégia vem antes da geração de texto.
3. Toda recomendação deve ser explicável.
4. O sistema deve mostrar incerteza.
5. O playbook da empresa tem prioridade sobre conhecimento genérico.
6. Não fazer upsell é uma decisão válida.
7. O sistema deve aprender com resultados, não apenas com cliques.
8. Segurança e confiança são mais importantes do que autonomia.
9. Começar com poucas categorias bem classificadas.
10. Medir melhoria comercial, não apenas produtividade.

## 25. Tese do produto

> **A maioria das ferramentas de IA para vendas concentra-se em gerar texto. O AI Sales Brain deve concentrar-se em tomar melhores decisões comerciais.**

O sistema não deve perguntar apenas:

> “O que posso responder?”

Deve perguntar:

- Qual é o estado atual deste cliente?
- O que está a impedir o avanço?
- Qual é a fase da venda?
- Qual estratégia é apropriada agora?
- Qual é a próxima melhor ação?
- Como executar essa ação sem violar o playbook?
- O que aconteceu depois?
- O que podemos aprender com esse resultado?

## 26. Definição final do MVP

O MVP do AI Sales Brain é um copiloto para vendedores que:

1. Lê a conversa completa.
2. Identifica intenção, estágio, necessidade e objeção.
3. Mostra um Customer State simples e explicável.
4. Consulta o catálogo e o playbook da empresa.
5. Recomenda a próxima melhor ação.
6. Sugere uma resposta alinhada com essa ação.
7. Avalia a mensagem do vendedor antes do envio.
8. Mantém o vendedor no controlo.
9. Regista a decisão, a resposta e o resultado.
10. Cria a base de dados necessária para evoluir para Sales Intelligence preditiva.

> **O objetivo inicial não é construir uma IA que venda sozinha. É construir uma IA que faça o vendedor vender melhor.**
