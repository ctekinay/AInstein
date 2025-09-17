import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { createChatSession, getChatSession, sendMessage } from './controllers/chat.controller.js';
import chatService from './services/chat.service.js';
import logger from './utils/logger.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Chat API routes
app.post('/api/chat/sessions', createChatSession);
app.get('/api/chat/sessions/:sessionId', getChatSession);
app.post('/api/chat/sessions/:sessionId/messages', sendMessage);

// WebSocket handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join_session', (sessionId: string) => {
    socket.join(sessionId);
    logger.info(`Client ${socket.id} joined session ${sessionId}`);

    // Send current agent status
    socket.emit('agent_status', chatService.getAgentStatus());
  });

  socket.on('send_message', async (data: { sessionId: string; content: string }) => {
    try {
      const { sessionId, content } = data;

      if (!content?.trim()) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      // Create socket emitter function for real-time progress updates
      const socketEmitter = (event: string, data: any) => {
        io.to(sessionId).emit(event, data);
      };

      // Process the message with progress updates
      const message = await chatService.processUserMessage(sessionId, content.trim(), socketEmitter);

      if (!message) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Emit the user message to all clients in the session
      io.to(sessionId).emit('new_message', message);

      // Simulate agent response after processing
      setTimeout(() => {
        const session = chatService.getSession(sessionId);
        if (session && session.messages.length > 0) {
          const agentMessage = session.messages[session.messages.length - 1];
          if (agentMessage.sender === 'agent') {
            io.to(sessionId).emit('new_message', agentMessage);
          }
        }

        chatService.updateAgentStatus({ status: 'idle' });
        io.to(sessionId).emit('agent_status', { status: 'idle' });
      }, 1200);

    } catch (error) {
      logger.error('Error processing message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});