import OpenAI from 'openai';
import { ConversationRepository } from '../repositories/conversation.repository';
import { inject, injectable } from 'inversify';
import type { Message } from '../types/Conversation';
import { TokensHelper } from '../utils/tokensHelper';
import { RagService } from './rag.service';

interface ChatResponse {
   id: string;
   message: string;
}

interface StreamChunk {
   id: string;
   content: string;
   done: boolean;
}

const openai = new OpenAI({
   apiKey: process.env.OPENROUTER_API_KEY,
   baseURL: process.env.OPENROUTER_BASE_URL,
});

@injectable()
export class ChatService {
   private readonly DEFAULT_MODEL = 'gpt-4o-mini';
   private readonly DEFAULT_TEMPERATURE = 0.2;
   private readonly DEFAULT_MAX_TOKENS = 1000;

   constructor(
      @inject('ConversationRepository')
      private conversationRepository: ConversationRepository,
      @inject('RagService')
      private ragService: RagService
   ) {}

   async generateConversationTitle(
      conversationId: string,
      messages: Message[]
   ): Promise<string> {
      try {
         const existingTitle =
            await this.conversationRepository.getConversationTitle(
               conversationId
            );

         if (existingTitle && existingTitle !== 'Nouvelle conversation') {
            return existingTitle;
         }

         if (messages.length < 2) {
            return 'Nouvelle conversation';
         }

         const contextMessages = messages.slice(0, 4);
         const titlePrompt = `Génère un titre concis et descriptif (max 5-6 mots) pour la conversation suivante. Le titre doit capturer le sujet principal. Réponds uniquement avec le titre, sans texte supplémentaire.

Conversation:
${contextMessages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}
Titre:`;

         const response = await openai.chat.completions.create({
            model: this.DEFAULT_MODEL,
            messages: [{ role: 'user', content: titlePrompt }] as any,
            temperature: 0.3,
            max_tokens: 30,
         });

         const title =
            response.choices[0]?.message?.content?.trim() ||
            'Nouvelle conversation';

         const cleanTitle = title.replace(/^["']|["']$|\.$/g, '').trim();

         await this.conversationRepository.setConversationTitle(
            conversationId,
            cleanTitle
         );

         console.log(
            `Titre généré: "${cleanTitle}" pour la conversation ${conversationId}`
         );
         return cleanTitle;
      } catch (error) {
         console.error('Error generating conversation title:', error);
         return 'Nouvelle conversation';
      }
   }

   async getConversationList(userId: string) {
      return this.conversationRepository.listUserConversations(userId);
   }

   async getConversationsWithoutFolder(userId: string) {
      return this.conversationRepository.listUserConversationsWithoutFolder(
         userId
      );
   }

   async getConversationsByFolder(userId: string, folderId: string) {
      return this.conversationRepository.listConversationsByFolder(
         userId,
         folderId
      );
   }

   async getConversationsGrouped(userId: string) {
      return this.conversationRepository.listUserConversationsGrouped(userId);
   }

   async getUserConversationById(conversationId: string) {
      return this.conversationRepository.getUserConversationById(
         conversationId
      );
   }

   /**
    * Send message with RAG context enhancement
    */
   async sendMessageWithRAG(
      prompt: string,
      conversationId: string | undefined,
      userId: string
   ): Promise<ChatResponse & { conversationId: string; sources?: any[] }> {
      try {
         let actualConversationId = conversationId;
         let isNewConversation = false;

         if (!actualConversationId) {
            const conversation = await this.conversationRepository.create(
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );
            actualConversationId = conversation.id;
            isNewConversation = true;
         } else {
            await this.conversationRepository.ensureConversationExists(
               actualConversationId,
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );
         }

         let messages: Message[] =
            await this.conversationRepository.getConversationMessages(
               actualConversationId
            );

         const systemPrompt = RagService.getSystemPrompt();
         const ragResult = await this.ragService.answerWithContext(prompt);
         // Build enhanced prompt with RAG context
         const enhancedPrompt = RagService.buildPrompt(prompt, [
            ragResult.context,
         ]);

         // Build messages for the OpenAI API (include system prompt)
         const messagesForApi = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: enhancedPrompt },
         ];

         // Add ONLY the original user prompt to stored conversation messages (not the enhanced prompt with RAG context)
         messages.push({
            role: 'user',
            content: prompt,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               prompt,
               this.DEFAULT_MODEL
            ),
         });

         const response = await openai.chat.completions.create({
            model: this.DEFAULT_MODEL,
            messages: messagesForApi as any,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.DEFAULT_MAX_TOKENS,
         });

         const assistantMessage =
            response.choices[0]?.message?.content?.trim() ||
            "Désolé, je n'ai pas pu générer de réponse.";

         messages.push({
            role: 'assistant',
            content: assistantMessage,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               assistantMessage,
               this.DEFAULT_MODEL
            ),
         });

         await this.conversationRepository.saveConversationMessages(
            actualConversationId,
            messages
         );

         if (isNewConversation || messages.length === 2) {
            await this.generateConversationTitle(
               actualConversationId,
               messages
            ).catch((error) =>
               console.error('Title generation failed:', error)
            );
         }

         return {
            id: response.id,
            message: assistantMessage,
            conversationId: actualConversationId,
         };
      } catch (error) {
         console.error('Error in sendMessageWithRAG:', error);
         throw new Error(
            'Failed to send message with RAG: ' +
               (error instanceof Error ? error.message : 'Unknown error')
         );
      }
   }

   async sendMessage(
      prompt: string,
      conversationId: string | undefined,
      userId: string
   ): Promise<ChatResponse & { conversationId: string }> {
      try {
         let actualConversationId = conversationId;
         let isNewConversation = false;

         if (!actualConversationId) {
            const conversation = await this.conversationRepository.create(
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );
            actualConversationId = conversation.id;
            isNewConversation = true;
         } else {
            // Verify that the conversation exists, create if not
            await this.conversationRepository.ensureConversationExists(
               actualConversationId,
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );
         }

         let messages: Message[] =
            await this.conversationRepository.getConversationMessages(
               actualConversationId
            );

         // Add user message
         messages.push({
            role: 'user',
            content: prompt,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               prompt,
               this.DEFAULT_MODEL
            ),
         });

         const response = await openai.chat.completions.create({
            model: this.DEFAULT_MODEL,
            messages: messages as any,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.DEFAULT_MAX_TOKENS,
         });

         const assistantMessage =
            response.choices[0]?.message?.content?.trim() ||
            "Désolé, je n'ai pas pu générer de réponse.";

         messages.push({
            role: 'assistant',
            content: assistantMessage,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               assistantMessage,
               this.DEFAULT_MODEL
            ),
         });

         // save message and conversation ID
         await this.conversationRepository.saveConversationMessages(
            actualConversationId,
            messages
         );

         // New conversation title generation
         if (isNewConversation || messages.length === 2) {
            await this.generateConversationTitle(
               actualConversationId,
               messages
            ).catch((error) =>
               console.error('Title generation failed:', error)
            );
         }

         return {
            id: response.id,
            message: assistantMessage,
            conversationId: actualConversationId,
         };
      } catch (error) {
         console.error('Error in sendMessage:', error);
         throw new Error(
            'Failed to send message: ' +
               (error instanceof Error ? error.message : 'Unknown error')
         );
      }
   }

   /**
    * Send message stream with RAG context enhancement
    */
   async *sendMessageStreamWithRAG(
      prompt: string,
      conversationId: string | undefined,
      userId: string
   ): AsyncGenerator<StreamChunk & { conversationId?: string }> {
      try {
         let actualConversationId = conversationId;
         let messages: Message[] = [];
         let isNewConversation = false;

         // Create or get conversation
         if (!actualConversationId) {
            const conversation = await this.conversationRepository.create(
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );
            actualConversationId = conversation.id;
            isNewConversation = true;
            messages = [];
         } else {
            await this.conversationRepository.ensureConversationExists(
               actualConversationId,
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );

            messages =
               await this.conversationRepository.getConversationMessages(
                  actualConversationId
               );
            isNewConversation = messages.length === 0;
         }

         // 🔥 Get RAG context
         const systemPrompt = RagService.getSystemPrompt();
         const ragResult = await this.ragService.answerWithContext(prompt);
         const enhancedPrompt = RagService.buildPrompt(prompt, [
            ragResult.context,
         ]);

         // Build messages for the OpenAI API (include system prompt)
         const messagesForApi = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: enhancedPrompt },
         ];

         // Add ONLY the original user prompt to stored conversation messages (not the enhanced prompt with RAG context)
         messages.push({
            role: 'user',
            content: prompt,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               prompt,
               this.DEFAULT_MODEL
            ),
         });

         const stream = await openai.chat.completions.create({
            model: this.DEFAULT_MODEL,
            messages: messagesForApi as any,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.DEFAULT_MAX_TOKENS,
            stream: true,
         });

         let fullResponse = '';
         let responseId = '';

         // Send conversationId immediately so frontend knows it
         yield {
            id: 'conversation',
            content: '',
            done: false,
            conversationId: actualConversationId,
         };

         for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (chunk.id && !responseId) {
               responseId = chunk.id;
            }

            if (delta?.content) {
               const content = delta.content;
               fullResponse += content;
               yield {
                  id: responseId,
                  content: content,
                  done: false,
               };
            }

            if (chunk.choices[0]?.finish_reason === 'length') {
               console.warn('Stream ended due to token limit');
               break;
            }
         }

         const cleanResponse = fullResponse.trim();
         messages.push({
            role: 'assistant',
            content: cleanResponse,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               cleanResponse,
               this.DEFAULT_MODEL
            ),
         });

         await this.conversationRepository.saveConversationMessages(
            actualConversationId,
            messages
         );

         if (isNewConversation && messages.length >= 2) {
            await this.generateConversationTitle(
               actualConversationId,
               messages
            ).catch((error) =>
               console.error('Background title generation failed:', error)
            );
         }

         console.log(
            `Conversation ${actualConversationId}: RAG Stream completed`
         );

         yield {
            id: responseId,
            content: '',
            done: true,
         };
      } catch (error) {
         console.error('Error in sendMessageStreamWithRAG:', error);
         yield {
            id: 'error',
            content:
               'Une erreur est survenue lors de la génération de la réponse.',
            done: true,
         };
         throw new Error(
            'RAG Streaming failed: ' +
               (error instanceof Error ? error.message : 'Unknown error')
         );
      }
   }

   async *sendMessageStream(
      prompt: string,
      conversationId: string | undefined,
      userId: string
   ): AsyncGenerator<StreamChunk & { conversationId?: string }> {
      try {
         let actualConversationId = conversationId;
         let messages: Message[] = [];
         let isNewConversation = false;

         // Create or get conversation
         if (!actualConversationId) {
            const conversation = await this.conversationRepository.create(
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );
            actualConversationId = conversation.id;
            isNewConversation = true;
            messages = [];
         } else {
            // Verify that the conversation exists, create if not
            await this.conversationRepository.ensureConversationExists(
               actualConversationId,
               userId,
               'Nouvelle conversation',
               this.DEFAULT_MODEL
            );

            messages =
               await this.conversationRepository.getConversationMessages(
                  actualConversationId
               );
            isNewConversation = messages.length === 0;
         }

         messages.push({ role: 'user', content: prompt });

         const stream = await openai.chat.completions.create({
            model: this.DEFAULT_MODEL,
            messages: messages,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.DEFAULT_MAX_TOKENS,
            stream: true,
         });

         let fullResponse = '';
         let responseId = '';

         // Send conversationId immediately so frontend knows it
         yield {
            id: 'conversation',
            content: '',
            done: false,
            conversationId: actualConversationId,
         };

         for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (chunk.id && !responseId) {
               responseId = chunk.id;
            }

            if (delta?.content) {
               const content = delta.content;
               fullResponse += content;
               yield {
                  id: responseId,
                  content: content,
                  done: false,
               };
            }

            if (chunk.choices[0]?.finish_reason === 'length') {
               console.warn('Stream ended due to token limit');
               break;
            }
         }

         const cleanResponse = fullResponse.trim();
         messages.push({
            role: 'assistant',
            content: cleanResponse,
            model_used: this.DEFAULT_MODEL,
            token_count: TokensHelper.getTokenCountForMessage(
               cleanResponse,
               this.DEFAULT_MODEL
            ),
         });

         // Save messages - conversation is guaranteed to exist now
         await this.conversationRepository.saveConversationMessages(
            actualConversationId,
            messages
         );

         if (isNewConversation && messages.length >= 2) {
            await this.generateConversationTitle(
               actualConversationId,
               messages
            ).catch((error) =>
               console.error('Background title generation failed:', error)
            );
         }

         yield {
            id: responseId,
            content: '',
            done: true,
         };
      } catch (error) {
         console.error('Error in sendMessageStream:', error);
         yield {
            id: 'error',
            content:
               'Une erreur est survenue lors de la génération de la réponse.',
            done: true,
         };
         throw new Error(
            'Streaming failed: ' +
               (error instanceof Error ? error.message : 'Unknown error')
         );
      }
   }

   async deleteConversation(conversationId: string) {
      return this.conversationRepository.deleteConversation(conversationId);
   }

   async toggleFavorite(conversationId: string, isFavorite: boolean) {
      return this.conversationRepository.setConversationFavorite(
         conversationId,
         isFavorite
      );
   }

   async moveConversationToFolder(
      conversationId: string,
      folderId: string | null
   ) {
      const currentFolderId =
         await this.conversationRepository.getConversationFolder(
            conversationId
         );
      if (currentFolderId === folderId) {
         return;
      }
      return this.conversationRepository.moveConversationToFolder(
         conversationId,
         folderId
      );
   }
}
