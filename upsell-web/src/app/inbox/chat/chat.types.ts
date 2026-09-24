import { Conversation, ConversationNote, ConversationStatus, Message, MessageAttachmentType } from "../../../core/contracts";

export interface UseChatPanelReturn {
   conversation: Conversation | null;
   messages: Message[];
   replyText: string;
   isLoading: boolean;
   isSending: boolean;
   retryingMessageIds: Set<string>;
   notes: ConversationNote[];
   isAddingNote: boolean;
   selectedAttachments: SelectedAttachment[];
   setReplyText: (text: string) => void;
   addAttachments: (files: FileList | File[]) => void;
   removeAttachment: (id: string) => void;
   handleSendReply: () => Promise<void>;
   handleRetryMessage: (messageId: string) => Promise<void>;
   handleAddNote: (content: string) => Promise<boolean>;
   applyRealtimeMessage: (message: Message) => void;
}

export type SelectedAttachment = {
   id: string;
   file: File;
   previewUrl: string;
   type: MessageAttachmentType;
};


export interface InboxChatPanelProps {
   selectedId: string | null;
   /** Detido pelo InboxView — uma instância só, partilhada com o painel de detalhes. */
   chatPanel: UseChatPanelReturn;
   onStatusChange?: (id: string, status: ConversationStatus) => Promise<boolean>;
   onClose?: () => void;
}