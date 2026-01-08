import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Textarea } from './ui/textarea';
import MessageList, { type Message } from './message-list';
import { useAuthStore } from '@/store/auth.store';
import {
   useConversations,
   useConversation,
} from '@/hooks/queries/conversation.queries';
import { useSendMessageStream } from '@/hooks/mutation/conversation.mutation';
import { useRagMode } from '@/contexts/RagModeContext';

export const ChatBox = () => {
   const { id: urlConversationId } = useParams<{ id: string }>();
   const [messages, setMessages] = useState<Message[]>([]);
   const [inputValue, setInputValue] = useState('');
   const [conversationId, setConversationId] = useState<string | undefined>(
      urlConversationId
   );
   const { user } = useAuthStore();
   const { isRagMode } = useRagMode();
   const { data: conversations } = useConversations(user?.id);
   const { data: conversation, isLoading: isConversationLoading } =
      useConversation(conversationId || '');
   const sendMessageMutation = useSendMessageStream(user?.id);

   // Charger les messages de la conversation quand elle change
   useEffect(() => {
      if (urlConversationId) {
         setConversationId(urlConversationId);
      } else {
         // Pas d'ID dans l'URL = nouvelle conversation
         setConversationId(undefined);
         setMessages([]);
      }
   }, [urlConversationId]);

   // Mettre à jour les messages quand la conversation est chargée
   useEffect(() => {
      if (conversation?.messages && urlConversationId) {
         const formattedMessages: Message[] = conversation.messages.map(
            (msg) => ({
               id: msg.id,
               content: msg.content,
               sender: msg.role.toLowerCase() === 'user' ? 'user' : 'ai',
               timestamp: new Date(msg.createdAt),
            })
         );
         setMessages(formattedMessages);
      }
   }, [conversation, urlConversationId]);

   const handleSendMessage = async () => {
      if (!inputValue.trim() || sendMessageMutation.isPending || !user) return;

      const userMessageContent = inputValue.trim();
      const newUserMessage: Message = {
         id: Date.now().toString(),
         content: userMessageContent,
         sender: 'user',
         timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputValue('');

      // Create an empty AI message for streaming
      const aiMessageId = (Date.now() + 1).toString();
      const initialAiMessage: Message = {
         id: aiMessageId,
         content: '',
         sender: 'ai',
         timestamp: new Date(),
      };
      setMessages((prev) => [...prev, initialAiMessage]);

      try {
         await sendMessageMutation.mutateAsync({
            message: {
               prompt: userMessageContent,
               senderId: user.id,
               conversationId: conversationId,
            },
            callbacks: {
               onChunk: (chunk: string) => {
                  setMessages((prev) =>
                     prev.map((msg) =>
                        msg.id === aiMessageId
                           ? {
                                ...msg,
                                content: msg.content + chunk,
                             }
                           : msg
                     )
                  );
               },
               onConversationId: (newConversationId: string) => {
                  setConversationId(newConversationId);
               },
            },
            conversationId: conversationId,
            useRag: isRagMode,
         });
      } catch (error) {
         console.error('Error sending message:', error);

         // Supprimer le message AI avec erreur et ajouter un message d'erreur clair
         setMessages((prev) =>
            prev.map((msg) =>
               msg.id === aiMessageId
                  ? {
                       ...msg,
                       content:
                          error instanceof Error
                             ? `Erreur: ${error.message}`
                             : 'Désolé, je ne peux pas répondre maintenant. Veuillez réessayer.',
                    }
                  : msg
            )
         );

         // Ne pas afficher l'erreur à l'utilisateur si le message est déjà affiché
      }
   };

   const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSendMessage();
      }
   };

   console.log(conversations);

   return (
      <div className="relative h-full max-w-6xl w-full mx-auto">
         <div className="absolute inset-0 pb-40 px-6 pt-6">
            {isConversationLoading ? (
               <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                     <p className="text-muted-foreground">
                        Loading conversation...
                     </p>
                  </div>
               </div>
            ) : messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-center mb-4">
                     Bonjour {user?.name.split(' ')[0] || 'cher utilisateur'} !,
                     <br />
                     <span className="text-muted-foreground">
                        comment puis-je vous aider aujourd'hui ?
                     </span>
                  </h1>
                  {isRagMode && (
                     <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg flex items-center gap-2">
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           width="16"
                           height="16"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="2"
                           strokeLinecap="round"
                           strokeLinejoin="round"
                        >
                           <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        </svg>
                        <span className="text-sm font-medium">
                           Mode RAG activé - Utilisation des documents internes
                        </span>
                     </div>
                  )}
               </div>
            ) : (
               <MessageList messages={messages} />
            )}
         </div>

         <div className="absolute bottom-0 left-0 right-0 p-6  backdrop-blur-sm ">
            {isRagMode && (
               <div className="mb-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5">
                  <svg
                     xmlns="http://www.w3.org/2000/svg"
                     width="12"
                     height="12"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  >
                     <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  Mode RAG activé
               </div>
            )}
            <div className="relative max-w-full">
               <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                     isRagMode
                        ? 'Posez une question sur vos documents...'
                        : 'Tapez votre message ici...'
                  }
                  className="w-full h-32 resize-none rounded-2xl border border-gray-300 p-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={sendMessageMutation.isPending}
               />
               <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || sendMessageMutation.isPending}
                  className="absolute bottom-6 right-3 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors"
               >
                  {sendMessageMutation.isPending ? (
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                     <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                     >
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                     </svg>
                  )}
               </button>
            </div>
         </div>
      </div>
   );
};
