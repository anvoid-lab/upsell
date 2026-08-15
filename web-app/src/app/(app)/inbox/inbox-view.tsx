'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Conversation, ConversationRealtimeRow, ConversationStatus } from '@/types';
import { InboxConversationList } from './inbox-conversation-list';
import { InboxChatPanel } from './inbox-chat-panel';
import { InboxDetailsPanel } from './inbox-details-panel';
import { useChatPanel } from './inbox-chat-panel.hook';
import { useRealtimeInbox } from './use-realtime-inbox.hook';

interface InboxViewProps {
  initialConversations: Conversation[];
}

const SELECTED_PARAM = 'c';

export function InboxView({ initialConversations }: InboxViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // A seleção vive na URL (?c=<id>), não em useState — um refresh da página
  // reconstrói o React do zero, e um useState local não sobrevive a isso.
  // 'c1' era um placeholder que nunca correspondeu a dados reais; com id
  // agora bigint (migração 004), uma id inexistente deixa de falhar em
  // silêncio e passa a rebentar a query logo no load da página.
  const selectedId = searchParams.get(SELECTED_PARAM);

  const setSelectedId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set(SELECTED_PARAM, id);
      } else {
        params.delete(SELECTED_PARAM);
      }
      // replace, não push: trocar de conversa é mais "mudar de separador" do
      // que "navegar" — com push, o botão Voltar ficava a andar conversa a
      // conversa em vez de sair da inbox.
      router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, ConversationStatus>
  >({});

  // A lista vive aqui, não dentro de useConversationList: é o mesmo sítio onde
  // está a subscrição Realtime, e o painel de conversa precisa de reagir aos
  // mesmos eventos. Antes era um `useState(initialConversations)` sem setter —
  // um snapshot congelado no momento em que a página carregou.
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);

  // useChatPanel corria em duas instâncias (aqui e dentro do InboxChatPanel),
  // cada uma com o seu estado e o seu useEffect — o que duplicava cada
  // fetchConversationAction e cada fetchAISuggestionAction ao abrir uma
  // conversa. Agora é uma só, e o painel recebe-a por props.
  const chatPanel = useChatPanel(selectedId);
  const { applyRealtimeMessage, applyRealtimeSuggestion } = chatPanel;

  const handleConversationChange = useCallback((incoming: ConversationRealtimeRow) => {
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === incoming.id);
      if (index === -1) {
        // Conversa nova (lead a escrever pela primeira vez). Ainda não tem
        // mensagens nem follow-ups carregados — chegam ao abrir, ou por
        // Realtime se já estiver aberta.
        return [{ ...incoming, messages: [], follow_ups: [] }, ...prev];
      }
      const next = [...prev];
      // Preserva o que o payload do Realtime não traz: mensagens (só na
      // tabela messages) e follow_ups (junção que só o serviço da lista faz).
      next[index] = {
        ...incoming,
        messages: prev[index].messages,
        follow_ups: prev[index].follow_ups,
      };
      return next;
    });
  }, []);

  useRealtimeInbox({
    onMessage: applyRealtimeMessage,
    onConversationChange: handleConversationChange,
    onSuggestion: applyRealtimeSuggestion,
  });

  const handleStatusChange = (id: string, status: ConversationStatus) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
  };

  const handleClose = () => {
    if (selectedId) handleStatusChange(selectedId, 'resolved');
    setSelectedId(null);
  };

  return (
    <>
      <InboxConversationList
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusOverrides={statusOverrides}
        conversations={conversations}
      />
      <InboxChatPanel
        selectedId={selectedId}
        chatPanel={chatPanel}
        onStatusChange={handleStatusChange}
        onClose={handleClose}
      />
      <InboxDetailsPanel conversation={chatPanel.conversation} />
    </>
  );
}
