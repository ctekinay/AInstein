import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs-extra';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { createChatSession, getChatSession, sendMessage } from './controllers/chat.controller.js';
import chatService from './services/chat.service.js';
import logger from './utils/logger.js';
import archiMateParser from './services/archimate-parser.service.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174"],
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

// ArchiMate Element API routes
app.get('/api/elements/:elementId', async (req, res) => {
  try {
    const { elementId } = req.params;
    const { model } = req.query;

    // Load models if not already loaded
    if (archiMateParser.getAllModels().length === 0) {
      await archiMateParser.loadAllArchiMetalModels();
    }

    // Find the element across all models
    const models = archiMateParser.getAllModels();
    let foundElement = null;
    let modelName = '';
    let modelPath = '';

    for (const modelData of models) {
      if (modelData.elements.has(elementId)) {
        foundElement = modelData.elements.get(elementId);
        modelName = modelData.name;
        modelPath = modelData.path || '';
        break;
      }
    }

    if (!foundElement) {
      return res.status(404).json({ error: 'Element not found' });
    }

    // Get relationships for the element
    const relationships = archiMateParser.getElementRelationships(elementId);

    res.json({
      id: foundElement.id,
      name: foundElement.name,
      type: foundElement.type.replace('archimate:', ''),
      model: modelName,
      modelPath: modelPath,
      documentation: foundElement.documentation || '',
      relationships: relationships.map(rel => ({
        id: rel.id,
        type: rel.type.replace('archimate:', ''),
        source: rel.source,
        target: rel.target,
        sourceName: models.find(m => m.elements.has(rel.source))?.elements.get(rel.source)?.name || 'Unknown',
        targetName: models.find(m => m.elements.has(rel.target))?.elements.get(rel.target)?.name || 'Unknown'
      }))
    });

  } catch (error) {
    logger.error('Error fetching element details:', error);
    res.status(500).json({ error: 'Failed to fetch element details' });
  }
});

// ArchiMate Model file endpoint
app.get('/api/models/:modelName/download', async (req, res) => {
  try {
    const { modelName } = req.params;
    logger.info(`Download request for model: ${modelName}`);

    // Check if we have the model loaded in memory first
    const loadedModels = archiMateParser.getAllModels();
    let targetModelPath = '';

    for (const model of loadedModels) {
      if (model.name === modelName || model.name.includes(modelName)) {
        targetModelPath = model.path || '';
        break;
      }
    }

    if (targetModelPath && await fs.pathExists(targetModelPath)) {
      logger.info(`Found model file at: ${targetModelPath}`);
      return res.download(targetModelPath, `${modelName}.archimate`);
    }

    // Fallback: Search in ArchiMetal directory
    // When running from src/backend, go up two levels to project root
    const archiMetalPath = path.resolve(process.cwd(), '..', '..', 'knowledge_base', 'ArchiMetal_models');
    logger.info(`Searching in ArchiMetal directory: ${archiMetalPath}`);

    if (!await fs.pathExists(archiMetalPath)) {
      logger.error(`ArchiMetal directory not found: ${archiMetalPath}`);
      return res.status(404).json({ error: 'ArchiMetal directory not found' });
    }

    // Recursively search for .archimate files
    const findArchimateFiles = async (dirPath: string): Promise<string[]> => {
      const files: string[] = [];
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          const subFiles = await findArchimateFiles(fullPath);
          files.push(...subFiles);
        } else if (item.name.endsWith('.archimate')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const archimateFiles = await findArchimateFiles(archiMetalPath);
    logger.info(`Found ${archimateFiles.length} .archimate files`);

    let modelFilePath = '';

    // First try exact name match
    for (const filePath of archimateFiles) {
      const fileName = path.basename(filePath, '.archimate');
      if (fileName === modelName) {
        modelFilePath = filePath;
        break;
      }
    }

    // If no exact match, try content search
    if (!modelFilePath) {
      for (const filePath of archimateFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          if (content.includes(modelName)) {
            modelFilePath = filePath;
            break;
          }
        } catch (error) {
          logger.warn(`Failed to read file ${filePath}:`, error);
          continue;
        }
      }
    }

    if (!modelFilePath) {
      logger.error(`Model file not found for: ${modelName}`);
      logger.info(`Available files: ${archimateFiles.map(f => path.basename(f)).join(', ')}`);
      return res.status(404).json({
        error: 'Model file not found',
        available: archimateFiles.map(f => path.basename(f, '.archimate')),
        requested: modelName
      });
    }

    logger.info(`Downloading model file: ${modelFilePath}`);
    res.download(modelFilePath, `${modelName}.archimate`);

  } catch (error) {
    logger.error('Error downloading model file:', error);
    res.status(500).json({ error: 'Failed to download model file', details: error.message });
  }
});

// Open in Archi endpoint
app.post('/api/models/:modelName/open-in-archi', async (req, res) => {
  try {
    const { modelName } = req.params;
    const { elementId } = req.body;
    logger.info(`Open in Archi request for model: ${modelName}, element: ${elementId}`);

    // Find the model file path
    const archiMetalPath = path.resolve(process.cwd(), '..', '..', 'knowledge_base', 'ArchiMetal_models');

    const findArchimateFile = async (dirPath: string, targetName: string): Promise<string | null> => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          const found = await findArchimateFile(fullPath, targetName);
          if (found) return found;
        } else if (item.name.endsWith('.archimate')) {
          const fileName = path.basename(item.name, '.archimate');
          if (fileName === targetName || item.name.includes(targetName)) {
            return fullPath;
          }
        }
      }
      return null;
    };

    const modelFilePath = await findArchimateFile(archiMetalPath, modelName);

    if (!modelFilePath) {
      return res.status(404).json({ error: 'Model file not found' });
    }

    // Use the child_process module to open Archi with the model file
    const { exec } = require('child_process');
    const platform = process.platform;

    let command = '';

    if (platform === 'darwin') {
      // macOS - Try to open Archi directly with the file
      command = `open -a Archi "${modelFilePath}" || open "${modelFilePath}"`;
    } else if (platform === 'win32') {
      // Windows - Try to open with default application
      command = `start "" "${modelFilePath}"`;
    } else {
      // Linux - Try xdg-open
      command = `xdg-open "${modelFilePath}"`;
    }

    logger.info(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Error opening Archi:', error);
        logger.error('stderr:', stderr);

        // Provide fallback instructions
        return res.status(500).json({
          error: 'Failed to open Archi automatically',
          instructions: `Please open Archi manually and load the file: ${modelFilePath}`,
          elementId: elementId,
          modelPath: modelFilePath
        });
      }

      logger.info('Successfully launched Archi');
      res.json({
        success: true,
        message: 'Archi opened successfully',
        modelPath: modelFilePath,
        elementId: elementId,
        note: `Navigate to element ID: ${elementId} in the model`
      });
    });

  } catch (error) {
    logger.error('Error opening model in Archi:', error);
    res.status(500).json({ error: 'Failed to open model in Archi', details: error.message });
  }
});

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

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }

    logger.info('HTTP server closed');

    // Close socket.io server
    io.close((ioErr) => {
      if (ioErr) {
        logger.error('Error closing socket.io server:', ioErr);
        process.exit(1);
      }

      logger.info('Socket.io server closed');
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.warn('Force shutdown after 10 seconds timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});