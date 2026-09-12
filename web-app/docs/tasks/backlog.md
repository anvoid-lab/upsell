# Upsell — Backlog de implementação

Atualizado em 2026-09-11 após revisão do código de `web-app/`.

## Objetivo atual

Centralizar o atendimento por WhatsApp, Instagram e Facebook e ajudar o vendedor a
recuperar oportunidades através de lembretes e follow-ups definidos por ele.

IA não faz parte do âmbito atual: geração de respostas, análise por modelos, RAG,
embeddings, agentes e sugestões automáticas foram removidos do web-app. Os componentes
visuais associados estão preservados, ocultos e sem ligação funcional.

A especificação comercial original ainda descreve IA; deve ser revista quando fecharmos
o posicionamento sem IA. O [backlog anterior](backlog-20260816-archive.md) fica como
histórico, não como lista de funcionalidades disponíveis ou trabalho a executar.

## Estado verificado

- Autenticação por email/password e sessão Supabase.
- Separação dos dados por empresa e políticas RLS, com testes de integração.
- Conversas, mensagens, canais e follow-ups com persistência na base de dados.
- Inbox com leitura de dados e eventos Realtime de mensagens e conversas.
- Webhook interno com assinatura HMAC, validação e tratamento de entregas duplicadas.
  Recebe um formato normalizado próprio; não adapta ainda os eventos reais da Meta.
- Respostas manuais gravadas na base de dados. Ainda não são entregues a um canal externo.
- Serviço de agendamento manual existente, mas o diálogo do painel de detalhes ainda
  cria apenas um item local. Não existe executor de follow-ups.
- Analytics parcialmente ligados a dados reais; séries históricas, variações e alguns
  painéis continuam simulados.
- Última validação: build e TypeScript passaram; 41 testes unitários e 4 de integração passaram.
- Remoção de IA registada no commit `b78457e`; migrações aplicadas à base de dados ligada.
  Foram removidas as quatro tabelas `ai_*`, fila, cron, três funções e campos exclusivos
  de IA. Conversas e mensagens preservadas, com cópia de segurança antes da remoção.
- A base de dados é partilhada com `anvoid-upsell-ml`. As estruturas desse projeto
  permanecem intactas; a sua remoção depende de uma decisão explícita sobre esse âmbito.

## Prioridades

- **P1:** percurso mínimo de atendimento real.
- **P2:** follow-ups sem IA e operação diária.
- **P3:** métricas, escala e preparação para lançamento.
- **Estados:** pendente, parcial, concluído, retirado do âmbito.

## P1 — Atendimento real

### T-010 · Integração dos canais — parcial

**Hoje:** “Connect” apenas altera um registo; não autentica na plataforma. O webhook
normalizado e a gravação de mensagens existem, mas a integração completa não existe.

- **T-010a — Conexão de contas:** implementar autorização do canal, seleção da conta/número,
  associação à empresa, armazenamento protegido das credenciais e desconexão real.
  Criar o registo de canal quando não existir; tratar credenciais inválidas ou expiradas.
- **T-010b — Entrada real:** adaptar os eventos de cada plataforma para o contrato interno,
  resolver a empresa a partir da conta ligada e preservar idempotência. A infraestrutura
  HMAC existente está concluída; o adaptador do fornecedor está pendente.
- **T-010c — Saída real:** enviar respostas pelo canal correto e registar identificador externo,
  estado de envio, confirmação de entrega/leitura quando disponível e erros recuperáveis.
- **T-010d — Requisitos do fornecedor:** verificar documentação vigente sobre permissões,
  autorização da aplicação, templates e condições de envio antes de implementar follow-ups.
  Não assumir que os três canais têm as mesmas regras ou o mesmo fluxo de ligação.

**Concluído quando:** uma conta real é ligada, uma mensagem do cliente aparece na inbox,
uma resposta chega ao cliente e os eventos repetidos não criam duplicados nem cruzam empresas.

**Decisões pendentes para discussão:** primeiro canal; integração direta ou fornecedor;
contas/números que o cliente já utiliza; múltiplas contas por empresa; importação de histórico;
texto apenas ou também anexos na primeira versão. WhatsApp primeiro é uma proposta,
não uma decisão tomada.

### T-030 · Persistência dos controlos da inbox — pendente

Guardar alterações de estado, fecho/reabertura, responsável e notas internas.
Atualmente, vários controlos alteram apenas estado local. As notas laterais não são
persistidas nem isoladas por conversa no estado do componente.

**Concluído quando:** recarregar a página e alternar entre conversas preserva os dados certos;
notas privadas nunca seguem para o canal do cliente; ações são autorizadas no servidor.

### T-019 · Erros e recuperação — pendente

Apresentar erros de carregamento, ligação e envio com possibilidade de tentar novamente.
Preservar o rascunho numa falha e não mostrar sucesso antes da confirmação correspondente.

**Concluído quando:** falhas previsíveis não deixam uma página inutilizável nem fazem perder
texto, e uma nova tentativa não duplica mensagens entregues.

### T-021 · Estados de envio e resposta otimista — parcial

A reconciliação pelo identificador da mensagem já evita duplicação do eco Realtime.
Faltam mensagem pendente imediata, falha visível, nova tentativa e atualização pelo estado
real de entrega do fornecedor. Depende de T-010c.

### T-022 · Onboarding e estados vazios — pendente

Guiar uma empresa nova desde a criação de conta até à primeira ligação e mensagem real,
sem depender do seed. Distinguir ausência de conversas, canal desligado e erro de carregamento.

## P2 — Operação e recuperação de oportunidades

### T-009 · Agendamento manual e execução de follow-ups — parcial

Ligar o diálogo ao serviço existente, validar data/atraso no servidor e permitir editar e
cancelar. Implementar execução de itens vencidos, controlo de concorrência, tentativas,
registo de erro e estados coerentes com a confirmação do fornecedor.

**Concluído quando:** o agendamento sobrevive a um refresh, é enviado uma única vez pelo
canal real e pode ser cancelado antes do envio. Depende de T-010c/d e T-014.

### T-014 · Infraestrutura de tarefas de follow-up — pendente

A antiga fila de sugestões de IA foi removida. Criar infraestrutura própria para
follow-ups, com execução periódica, reserva de trabalho concorrente, recuperação após
interrupção e visibilidade de falhas. Reutilizar extensões partilhadas apenas quando adequado.

### T-008 · Deteção de conversas sem resposta — pendente, reformulado sem IA

Usar regras explícitas: última mensagem do vendedor, tempo decorrido, conversa elegível e
estado comercial selecionado pelo vendedor. Não inferir intenção de compra com modelos.

Definir com o produto se o resultado é um lembrete ou um envio previamente autorizado.
Cancelar o follow-up quando o cliente responder ou quando a oportunidade deixar de ser elegível.

**Concluído quando:** as regras podem ser configuradas e verificadas, respeitam o canal e
não enviam mensagens após resposta, cancelamento ou exclusão do cliente.

### T-031 · Respostas rápidas e anexos — pendente

Substituir templates fixos por respostas rápidas geridas por empresa. Implementar upload,
armazenamento, validação e envio/receção dos tipos de ficheiro escolhidos para cada canal.
Distinguir templates internos das mensagens sujeitas a aprovação pelo fornecedor.

### T-032 · Equipa e permissões — pendente

Substituir os membros fictícios por utilizadores reais, convites, funções e atribuição
persistida de conversas. Garantir acesso apenas à empresa e às ações autorizadas.

### T-033 · Datas e navegação da conversa — pendente

Agrupar mensagens pela data real: o código atual distribui-as entre “Today” e “Yesterday”
pela posição na lista. Gerar links a partir da rota real da aplicação e preservar rascunhos
por conversa ao mudar de seleção.

## P3 — Métricas e lançamento

### T-017 · Resultados comerciais e atribuição — pendente, reformulado sem IA

Permitir marcar oportunidades como ganhas/perdidas, com valor, moeda e data. Separar
“conversa resolvida” de “venda realizada”. Definir uma regra explícita para associar uma
venda a um follow-up, sem apresentar essa associação como prova de causalidade.

### T-016 · Analytics reais — parcial

Contagens de conversas e follow-ups vêm da base de dados. Falta:

- Agregar séries por timestamps reais e aplicar os filtros de 7/30/90 dias.
- Calcular variações face ao período anterior, em vez de `+0` fixo.
- Substituir produtos e outros valores demonstrativos por dados reais ou estados vazios.
- Calcular conversão pelos resultados de T-017, não pelo estado “resolved”.

**Concluído quando:** cada indicador tem definição clara e verificável e nenhum painel
apresenta números simulados como resultados reais.

### T-023 · Paginação e pesquisa — pendente

Paginar conversas e mensagens no servidor, pesquisar sem carregar todo o histórico e
compatibilizar paginação, seleção e eventos Realtime.

### T-020 · Limites e proteção contra abuso — pendente, reformulado sem IA

Definir limites para entradas públicas, envios e uploads, controlar repetição de pedidos
e respeitar os limites do fornecedor. Quotas de tokens e custos de modelos foram retirados.

### T-034 · Conta, experiência móvel e operação — pendente

Completar recuperação de password e confirmação de email; validar entrega de emails de
conta. Adaptar a inbox a ecrãs pequenos. Preparar ambiente de produção, monitorização de
webhooks/envios e procedimentos de recuperação e suporte.

### T-018 · Testes dos percursos reais — parcial

Manter os testes existentes em `tests/`. Acrescentar cobertura às novas integrações,
notas privadas, permissões, agendamentos, cancelamento após resposta e concorrência.
Testar o percurso completo de uma empresa nova até à entrega de uma resposta.

### T-025 · Lint — pendente

O script continua a usar `next lint` e a configuração de ESLint está desalinhada com o
Next instalado. Migrar para uma configuração compatível e resolver os erros existentes.

## Histórico de tarefas

| IDs | Estado atual |
|---|---|
| T-001, T-003, T-011, T-012, T-013 | Concluídos: autenticação, limpeza de configuração antiga, multiempresa, RLS e timestamps. |
| T-002 | Substituído pela autenticação Supabase; a sessão personalizada foi retirada. |
| T-024, T-026, T-029 | Concluídos: refatoração, correção dos IDs de escrita e adoção das migrações Supabase. |
| T-027 | Base do webhook e Realtime concluída; integração real do fornecedor continua em T-010. |
| T-004, T-005, T-006, T-007, T-015, T-028 | Retirados do âmbito: fornecedores/modelos, sugestões, análise e infraestrutura de IA. |
| T-008, T-017, T-020 | Reformulados acima para funcionamento sem IA. |

## Sequência proposta

1. Discutir e fechar as decisões de integração de T-010.
2. Ligar o primeiro canal de ponta a ponta: conectar → receber → responder → confirmar entrega.
3. Completar persistência da inbox, erros e onboarding.
4. Implementar follow-ups manuais e depois regras de ausência de resposta.
5. Completar ferramentas de equipa, métricas reais e preparação para lançamento.

Não reativar IA nem remover estruturas de outros projetos como parte destas tarefas.
