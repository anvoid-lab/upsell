# Plano de Testes Manuais — MVP da Inbox

## Objetivo

Validar manualmente o fluxo principal do MVP:

```text
Empresa conecta o Instagram -> recebe uma mensagem -> responde ->
altera o estado da conversa -> adiciona uma nota -> atualiza a página
sem perder os dados
```

## Escopo

- Canal: Instagram.
- Fornecedor: Unipile.
- Uma conta do Instagram por empresa.
- Mensagens de texto.
- Estados de envio: pendente, enviado e falhou.
- Estados da conversa: aberta, pendente e resolvida.
- Notas internas.
- Estados vazios, erros e reconexão.
- Isolamento entre empresas.

## Fora do escopo

- WhatsApp e Facebook.
- Anexos, imagens, áudio e vídeo.
- Confirmações de leitura e entrega no Instagram.
- Equipa, convites e responsáveis.
- Follow-ups automáticos.
- Analytics e resultados comerciais.
- Testes de carga e desempenho.

## Preparação

### Contas necessárias

- Uma empresa de teste cadastrada na aplicação.
- Uma conta real do Instagram para conectar à empresa.
- Uma segunda conta do Instagram para atuar como cliente e trocar mensagens.
- Para testar isolamento, uma segunda empresa cadastrada na aplicação.

### Ambiente

- Aplicação executando no ambiente que será entregue.
- URL pública configurada e acessível pelo Unipile.
- Credenciais do Supabase e do Unipile configuradas.
- Webhook registrado para a URL pública correta.
- Migrações do banco aplicadas.
- Navegador com acesso às ferramentas de desenvolvimento para simular falhas de rede.

### Dados que devem ser registrados

Para cada caso, anotar:

- Data e hora.
- Ambiente testado.
- Empresa utilizada.
- Conta do Instagram conectada.
- Resultado esperado.
- Resultado observado.
- Evidência, como captura de tela ou vídeo.
- Resultado final: aprovado, reprovado ou bloqueado.
- Descrição do problema, quando houver.

## Critérios de severidade

- **Bloqueador:** impede conectar, receber, responder ou acessar a inbox.
- **Crítico:** causa perda, duplicação ou exposição de dados entre empresas.
- **Alto:** quebra retry, persistência, notas ou reconexão.
- **Médio:** estado visual incorreto, mensagem pouco clara ou ação recuperável difícil de encontrar.
- **Baixo:** problema visual que não impede o fluxo.

## Roteiro principal

### TM-01 — Empresa sem canal conectado

**Pré-condição:** empresa nova, sem canal conectado e sem conversas.

1. Entrar na aplicação.
2. Abrir a inbox.

**Resultado esperado:**

- A navegação autenticada permanece visível e utilizável.
- A Inbox apresenta o primeiro passo do onboarding com o GIF explicativo.
- A ação `Connect a channel` está visível.
- A ação abre o segundo passo com as mesmas opções de canais apresentadas em Settings.
- Nenhum canal é pré-selecionado ou destacado.
- Não existem conversas ou dados de demonstração.
- A tela não mostra responsáveis ou membros fictícios.

### TM-02 — Iniciar conexão

1. Clicar em `Connect a channel`.
2. Selecionar um dos canais disponíveis.
3. Confirmar que a janela de autenticação é aberta diretamente, sem um modal intermediário.
4. Manter a autenticação aberta por alguns segundos.

**Resultado esperado:**

- A aplicação mostra que a conexão está em andamento.
- A interface não permite iniciar várias conexões simultaneamente.
- Se a janela não abrir, existe uma opção para continuar na mesma aba.

### TM-03 — Cancelar ou fechar a autenticação

1. Iniciar a conexão.
2. Fechar a janela antes de concluir.

**Resultado esperado:**

- A aplicação deixa o estado de carregamento.
- É possível iniciar a conexão novamente.
- Nenhuma conta é marcada incorretamente como conectada.

### TM-04 — Conectar uma conta real

1. Iniciar a conexão.
2. Concluir a autenticação no Unipile.
3. Aguardar o retorno à aplicação.

**Resultado esperado:**

- A aplicação confirma a conexão.
- A conta correta aparece como conectada.
- A tela é atualizada sem exigir novo login.
- Nenhuma conversa de outra empresa aparece.

### TM-05 — Instagram conectado e inbox vazia

**Pré-condição:** canal conectado e nenhuma mensagem recebida.

1. Abrir ou atualizar a inbox.

**Resultado esperado:**

- A tela mostra `Waiting for the first message`.
- A tela não pede para conectar novamente.
- A tela vazia é diferente de uma tela de erro.

### TM-06 — Receber a primeira mensagem

1. Enviar uma mensagem de texto para a conta conectada usando a conta cliente.
2. Manter a inbox aberta.

**Resultado esperado:**

- Uma nova conversa aparece automaticamente.
- A mensagem recebida aparece na conversa correta.
- O nome ou identificador do cliente está correto.
- A conversa aparece como não lida até ser aberta.
- A mensagem aparece somente uma vez.

### TM-07 — Atualização após nova mensagem

1. Abrir a conversa recebida.
2. Enviar outra mensagem pela conta cliente.

**Resultado esperado:**

- A nova mensagem aparece sem atualizar manualmente a página.
- A conversa é movida para a posição correta na lista.
- O texto e o horário da última mensagem são atualizados.
- A mensagem não aparece em outra conversa.

### TM-08 — Enviar uma resposta

1. Escrever uma resposta de texto.
2. Clicar uma vez em `Send`.
3. Verificar a conta cliente no Instagram.

**Resultado esperado:**

- A mensagem aparece imediatamente como pendente.
- Depois da aceitação pelo fornecedor, o estado muda para enviado.
- A conta cliente recebe exatamente uma mensagem.
- O texto recebido é igual ao texto enviado.
- O campo de resposta é limpo após o envio.

### TM-09 — Evitar envio duplicado

1. Escrever uma resposta.
2. Clicar rapidamente várias vezes em `Send`.
3. Verificar a conversa e a conta cliente.

**Resultado esperado:**

- Apenas uma mensagem local é criada.
- Apenas uma mensagem chega ao Instagram.
- A ação fica temporariamente indisponível durante o envio.

### TM-10 — Falha confirmada no envio

**Sugestão:** usar uma conta desconectada, credenciais inválidas ou outro cenário controlado que faça o fornecedor rejeitar a mensagem.

1. Escrever uma resposta.
2. Tentar enviar.

**Resultado esperado:**

- A mensagem fica associada à conversa correta.
- O estado muda para falhou.
- A interface exibe uma explicação segura e compreensível.
- O texto escrito é preservado.
- A ação de retry fica disponível.

### TM-11 — Retry sem duplicação

**Pré-condição:** existir uma mensagem com estado falhou.

1. Corrigir a causa da falha.
2. Clicar em `Retry` uma vez.
3. Se possível, clicar novamente rapidamente.
4. Verificar a conta cliente.

**Resultado esperado:**

- A mesma mensagem local é reutilizada.
- O estado passa por pendente e termina como enviado.
- Apenas uma mensagem chega ao Instagram.
- Não aparece uma segunda bolha com o mesmo conteúdo.

### TM-12 — Falha de rede ambígua

1. Escrever uma resposta.
2. Iniciar o envio.
3. Interromper a rede durante a requisição.
4. Restaurar a rede.

**Resultado esperado:**

- A aplicação não afirma que houve falha definitiva quando o resultado é desconhecido.
- A aplicação não executa retry automático que possa duplicar o envio.
- Se o webhook confirmar o envio, a mensagem é reconciliada como enviada sem criar outra bolha.

## Persistência da conversa

### TM-13 — Alterar estado para pendente

1. Abrir uma conversa.
2. Alterar o estado de aberta para pendente.
3. Atualizar a página.

**Resultado esperado:**

- A conversa continua pendente após o refresh.
- Ela aparece na aba de conversas pendentes.

### TM-14 — Fechar uma conversa

1. Abrir uma conversa.
2. Clicar em `Close`.
3. Confirmar a ação.
4. Abrir a aba de resolvidas.
5. Atualizar a página.

**Resultado esperado:**

- A conversa passa para resolvida.
- Ela permanece resolvida após o refresh.

### TM-15 — Reabrir uma conversa

1. Abrir uma conversa resolvida.
2. Alterar o estado para aberta.
3. Atualizar a página.

**Resultado esperado:**

- A conversa volta para a aba de abertas.
- O estado aberto permanece após o refresh.

### TM-16 — Falha ao salvar o estado

1. Abrir uma conversa.
2. Interromper a rede.
3. Tentar alterar o estado.

**Resultado esperado:**

- A interface informa que o estado não foi salvo.
- O estado visual volta ao valor anterior.
- Após o refresh, o banco continua com o estado anterior.

## Notas internas

### TM-17 — Criar uma nota pela área de detalhes

1. Abrir uma conversa.
2. Escrever uma nota em `Internal notes`.
3. Salvar a nota.
4. Atualizar a página.

**Resultado esperado:**

- A nota aparece apenas na conversa selecionada.
- A nota continua visível após o refresh.
- A nota mostra autor e data.
- A nota não aparece no Instagram.

### TM-18 — Criar uma nota pelo compositor

1. Selecionar o modo `Note` no compositor.
2. Escrever e adicionar uma nota.
3. Verificar a área de notas internas.
4. Verificar a conta cliente no Instagram.

**Resultado esperado:**

- A nota aparece em `Internal notes`.
- Nenhuma mensagem é enviada ao cliente.
- O modo de nota é visualmente diferente do modo de resposta.

### TM-19 — Falha ao salvar uma nota

1. Escrever uma nota.
2. Interromper a rede.
3. Tentar salvar.

**Resultado esperado:**

- A nota otimista é removida se não for persistida.
- O texto digitado é preservado.
- Uma mensagem de erro é exibida.
- A nota não aparece após atualizar a página.

### TM-20 — Isolamento entre conversas

1. Adicionar notas em duas conversas diferentes.
2. Alternar entre as conversas.
3. Atualizar a página e repetir a alternância.

**Resultado esperado:**

- Cada conversa mostra apenas as próprias notas.
- Notas não são misturadas durante a troca de conversa.

## Reconexão e recuperação

### TM-21 — Credenciais expiradas

**Pré-condição:** conta marcada como necessitando reconexão.

1. Abrir a inbox.

**Resultado esperado:**

- A interface mostra que o Instagram precisa ser reconectado.
- A ação `Reconnect Instagram` está visível.
- Se existirem conversas antigas, elas continuam acessíveis.

### TM-22 — Reconectar a conta

1. Clicar em `Reconnect Instagram`.
2. Concluir a autenticação.
3. Enviar e receber uma nova mensagem.

**Resultado esperado:**

- A conta existente é reconectada, sem criar uma segunda integração para a empresa.
- O aviso de reconexão desaparece.
- O histórico continua disponível.
- Novas mensagens voltam a ser recebidas e enviadas.

### TM-23 — Erro ao carregar a inbox

**Sugestão:** bloquear temporariamente as requisições ao Supabase ou interromper a rede antes de abrir a página.

1. Abrir ou atualizar a inbox durante a falha.
2. Restaurar a conexão.
3. Clicar em `Try again`.

**Resultado esperado:**

- A falha é apresentada como erro, não como inbox vazia.
- A ação `Try again` está disponível.
- Após a recuperação, conversas e estado do canal são carregados normalmente.

## Isolamento entre empresas

### TM-24 — Conversas isoladas

1. Entrar na empresa A e registrar os identificadores ou nomes das conversas.
2. Sair da aplicação.
3. Entrar na empresa B.
4. Abrir a inbox e pesquisar pelos contatos da empresa A.

**Resultado esperado:**

- Nenhuma conversa da empresa A aparece na empresa B.
- Contagens e mensagens não incluem dados da empresa A.

### TM-25 — Acesso por URL conhecida

1. Na empresa A, copiar o endereço de uma conversa.
2. Entrar na empresa B.
3. Tentar abrir diretamente o endereço copiado.

**Resultado esperado:**

- A conversa da empresa A não é exibida.
- Nenhuma mensagem ou nota é retornada.
- A tentativa não altera nenhum dado.

### TM-26 — Notas isoladas

1. Criar uma nota privada em uma conversa da empresa A.
2. Entrar na empresa B.
3. Tentar localizar a conversa ou acessar seu endereço diretamente.

**Resultado esperado:**

- A nota da empresa A nunca aparece na empresa B.
- O conteúdo da nota não aparece em erros, logs visíveis ou respostas da interface.

## Verificação em navegadores

Executar pelo menos o roteiro principal nos navegadores suportados pela entrega:

- Google Chrome atualizado.
- Safari atualizado.

Verificar especialmente:

- Abertura e fechamento da janela de autenticação.
- Atualizações em tempo real.
- Atalhos de envio.
- Rolagem da lista e da conversa.
- Ausência de elementos sobrepostos em larguras comuns de notebook.

## Checklist de regressão rápida

Após cada correção encontrada durante os testes, confirmar:

- [ ] Login continua funcionando.
- [ ] Instagram continua conectado.
- [ ] Mensagem recebida aparece uma única vez.
- [ ] Resposta chega uma única vez ao cliente.
- [ ] Falha de envio mostra retry.
- [ ] Estado da conversa sobrevive ao refresh.
- [ ] Nota sobrevive ao refresh e não chega ao cliente.
- [ ] Reconexão mantém o histórico.
- [ ] Empresas continuam isoladas.
- [ ] Inbox vazia, erro e canal desconectado continuam visualmente distintos.

## Critérios finais de aprovação

O MVP pode ser aprovado quando:

- Todos os casos bloqueadores e críticos estiverem aprovados.
- Não houver perda ou duplicação de mensagens.
- Não houver exposição de dados entre empresas.
- Conexão, recebimento e resposta funcionarem com uma conta real do Instagram.
- Estados e notas permanecerem após refresh.
- Falhas recuperáveis oferecerem uma ação clara.
- Não existirem problemas altos sem uma decisão explícita de aceite.

## Resultado da execução

| Caso | Resultado | Evidência | Observações |
|---|---|---|---|
| TM-01 | Não executado | — | — |
| TM-02 | Não executado | — | — |
| TM-03 | Não executado | — | — |
| TM-04 | Não executado | — | — |
| TM-05 | Não executado | — | — |
| TM-06 | Não executado | — | — |
| TM-07 | Não executado | — | — |
| TM-08 | Não executado | — | — |
| TM-09 | Não executado | — | — |
| TM-10 | Não executado | — | — |
| TM-11 | Não executado | — | — |
| TM-12 | Não executado | — | — |
| TM-13 | Não executado | — | — |
| TM-14 | Não executado | — | — |
| TM-15 | Não executado | — | — |
| TM-16 | Não executado | — | — |
| TM-17 | Não executado | — | — |
| TM-18 | Não executado | — | — |
| TM-19 | Não executado | — | — |
| TM-20 | Não executado | — | — |
| TM-21 | Não executado | — | — |
| TM-22 | Não executado | — | — |
| TM-23 | Não executado | — | — |
| TM-24 | Não executado | — | — |
| TM-25 | Não executado | — | — |
| TM-26 | Não executado | — | — |

## Decisão final

- **Resultado:** não avaliado.
- **Responsável:** a definir.
- **Data:** a definir.
- **Bloqueadores encontrados:** nenhum registrado.
- **Decisão:** pendente da execução manual.
