import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession, AgentStatus } from '../types/chat.types.js';
import logger from '../utils/logger.js';
import aiAgentService from './ai-agent.service.js';

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private agentStatus: AgentStatus = { status: 'idle' };

  createSession(userId: string): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    };

    this.sessions.set(session.id, session);
    logger.info(`Created new chat session ${session.id} for user ${userId}`);

    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId: string, content: string, sender: 'user' | 'agent', type: 'text' | 'file' | 'system' = 'text'): Message | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.error(`Session ${sessionId} not found`);
      return null;
    }

    const message: Message = {
      id: uuidv4(),
      content,
      sender,
      timestamp: new Date(),
      type,
    };

    session.messages.push(message);
    session.updatedAt = new Date();

    logger.info(`Added ${sender} message to session ${sessionId}`);
    return message;
  }

  updateAgentStatus(status: AgentStatus): void {
    this.agentStatus = status;
    logger.info(`Agent status updated: ${status.status}`);
  }

  getAgentStatus(): AgentStatus {
    return this.agentStatus;
  }

  async processUserMessage(sessionId: string, content: string, socketEmitter?: (event: string, data: any) => void): Promise<Message | null> {
    // Add user message
    const userMessage = this.addMessage(sessionId, content, 'user');
    if (!userMessage) return null;

    // Process with AI agent
    this.updateAgentStatus({ status: 'processing', currentTask: 'Analyzing user input' });

    try {
      // Create progress callback for WebSocket updates
      const progressCallback = (update: { step: string; progress: number; details?: string }) => {
        this.updateAgentStatus({
          status: 'processing',
          currentTask: update.step,
          progress: update.progress
        });

        if (socketEmitter) {
          socketEmitter('agent_progress', {
            sessionId,
            step: update.step,
            progress: update.progress,
            details: update.details
          });
        }
      };

      // Get intelligent response from AI agent with progress updates
      const agentResponse = await aiAgentService.processMessage(sessionId, content, progressCallback);

      this.updateAgentStatus({ status: 'generating', currentTask: 'Finalizing response' });

      // Add agent response
      setTimeout(() => {
        this.addMessage(sessionId, agentResponse, 'agent');
        this.updateAgentStatus({ status: 'idle' });

        if (socketEmitter) {
          socketEmitter('agent_progress', {
            sessionId,
            step: 'Analysis complete',
            progress: 100
          });
        }
      }, 500);

    } catch (error) {
      logger.error('Error processing message with AI agent:', error);
      const errorResponse = 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.';
      setTimeout(() => {
        this.addMessage(sessionId, errorResponse, 'agent');
        this.updateAgentStatus({ status: 'idle' });
      }, 500);
    }

    return userMessage;
  }
}

export default new ChatService();