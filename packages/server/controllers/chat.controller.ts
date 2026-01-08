import type { NextFunction, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { BaseController } from './base.controller';
import { inject } from 'inversify';
import { injectable } from 'inversify';

@injectable()
export class ChatController extends BaseController {
   constructor(@inject('ChatService') private chatService: ChatService) {
      super();
   }

   handleMessage = async (req: Request, res: Response, next: NextFunction) => {
      console.log('Handle message :', req.body);
      const { prompt, conversationId, senderId } = req.body;
      const actualUserId = senderId;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.sendMessage(
            prompt,
            conversationId!,
            actualUserId
         );
      });
   };

   handleStreamMessage = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      console.log('stream', req.body);
      try {
         const { prompt, conversationId, senderId } = req.body;
         const actualUserId = senderId;

         // Configuration des headers SSE
         res.setHeader('Content-Type', 'text/event-stream');
         res.setHeader('Cache-Control', 'no-cache, no-transform');
         res.setHeader('Connection', 'keep-alive');
         res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx

         // CORS headers
         const origin = req.headers.origin;
         if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
         }

         // Empêcher le timeout de la connexion
         req.socket.setTimeout(0);
         req.socket.setNoDelay(true);
         req.socket.setKeepAlive(true);

         res.write('event: connected\ndata: {"type":"connected"}\n\n');
         res.flushHeaders(); // Envoyer les headers immédiatement

         const stream = this.chatService.sendMessageStream(
            prompt,
            conversationId || this.generateConversationId(),
            actualUserId
         );

         for await (const chunk of stream) {
            // If this chunk contains conversationId, send it as a separate event
            if (chunk.conversationId && !conversationId) {
               const conversationIdData = {
                  type: 'conversationId',
                  conversationId: chunk.conversationId,
               };
               res.write(`data: ${JSON.stringify(conversationIdData)}\n\n`);
               if (typeof (res as any).flush === 'function') {
                  (res as any).flush();
               }
            }

            const eventData = {
               type: chunk.done ? 'done' : 'chunk',
               id: chunk.id,
               content: chunk.content,
               done: chunk.done,
            };

            res.write(`data: ${JSON.stringify(eventData)}\n\n`);

            if (typeof (res as any).flush === 'function') {
               (res as any).flush();
            }

            if (chunk.done) {
               break;
            }
         }

         res.end();
      } catch (error: any) {
         console.error('Error in streaming:', error);

         if (!res.headersSent) {
            res.writeHead(500, {
               'Content-Type': 'text/event-stream',
               'Cache-Control': 'no-cache',
               Connection: 'keep-alive',
            });
         }

         const errorData = {
            type: 'error',
            error: 'Failed to get response from AI',
            details: error.message,
         };

         res.write(`data: ${JSON.stringify(errorData)}\n\n`);
         res.end();

         next(error);
      }
   };

   // Method for retrieving conversation history
   getConversations = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      this.handleRequest(req, res, next, async () => {
         return this.chatService.getConversationList(req.body.userId);
      });
   };

   // Get conversations without folder (recent conversations)
   getConversationsWithoutFolder = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      this.handleRequest(req, res, next, async () => {
         return this.chatService.getConversationsWithoutFolder(req.body.userId);
      });
   };

   // Get conversations by folder
   getConversationsByFolder = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      const { folderId } = req.params;
      const { userId } = req.body;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.getConversationsByFolder(userId, folderId!);
      });
   };

   // Get conversations grouped by folder status
   getConversationsGrouped = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      this.handleRequest(req, res, next, async () => {
         return this.chatService.getConversationsGrouped(req.body.userId);
      });
   };

   getConversation = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      const { id } = req.params;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.getUserConversationById(id!);
      });
   };

   deleteConversation = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      const { id } = req.params;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.deleteConversation(id!);
      });
   };

   toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
      const { conversationId, isFavorite } = req.body;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.toggleFavorite(conversationId!, isFavorite);
      });
   };
   moveConversationToFolder = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      const { conversationId, folderId } = req.body;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.moveConversationToFolder(
            conversationId!,
            folderId || null
         );
      });
   };

   // RAG-enhanced message handler
   handleMessageWithRAG = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      console.log('Handle RAG message :', req.body);
      const { prompt, conversationId, senderId } = req.body;
      const actualUserId = senderId;

      this.handleRequest(req, res, next, async () => {
         return this.chatService.sendMessageWithRAG(
            prompt,
            conversationId!,
            actualUserId
         );
      });
   };

   // RAG-enhanced streaming handler
   handleStreamMessageWithRAG = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      console.log('RAG stream', req.body);
      try {
         const { prompt, conversationId, senderId } = req.body;
         const actualUserId = senderId;

         // Configuration des headers SSE
         res.setHeader('Content-Type', 'text/event-stream');
         res.setHeader('Cache-Control', 'no-cache, no-transform');
         res.setHeader('Connection', 'keep-alive');
         res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx

         // CORS headers
         const origin = req.headers.origin;
         if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
         }

         // Empêcher le timeout de la connexion
         req.socket.setTimeout(0);
         req.socket.setNoDelay(true);
         req.socket.setKeepAlive(true);

         res.write('event: connected\ndata: {"type":"connected"}\n\n');
         res.flushHeaders(); // Envoyer les headers immédiatement

         const stream = this.chatService.sendMessageStreamWithRAG(
            prompt,
            conversationId || this.generateConversationId(),
            actualUserId
         );

         for await (const chunk of stream) {
            // If this chunk contains conversationId, send it as a separate event
            if (chunk.conversationId && !conversationId) {
               const conversationIdData = {
                  type: 'conversationId',
                  conversationId: chunk.conversationId,
               };
               res.write(`data: ${JSON.stringify(conversationIdData)}\n\n`);
               if (typeof (res as any).flush === 'function') {
                  (res as any).flush();
               }
            }

            const eventData = {
               type: chunk.done ? 'done' : 'chunk',
               id: chunk.id,
               content: chunk.content,
               done: chunk.done,
            };

            res.write(`data: ${JSON.stringify(eventData)}\n\n`);

            if (typeof (res as any).flush === 'function') {
               (res as any).flush();
            }

            if (chunk.done) {
               break;
            }
         }

         res.end();
      } catch (error: any) {
         console.error('Error in RAG streaming:', error);

         if (!res.headersSent) {
            res.writeHead(500, {
               'Content-Type': 'text/event-stream',
               'Cache-Control': 'no-cache',
               Connection: 'keep-alive',
            });
         }

         const errorData = {
            type: 'error',
            error: 'Failed to get RAG response from AI',
            details: error.message,
         };

         res.write(`data: ${JSON.stringify(errorData)}\n\n`);
         res.end();

         next(error);
      }
   };

   private generateConversationId(): string {
      return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   }
}
