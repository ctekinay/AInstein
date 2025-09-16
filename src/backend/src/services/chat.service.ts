import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession, AgentStatus } from '../types/chat.types.js';
import logger from '../utils/logger.js';

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

  processUserMessage(sessionId: string, content: string): Message | null {
    // Add user message
    const userMessage = this.addMessage(sessionId, content, 'user');
    if (!userMessage) return null;

    // Simulate agent processing
    this.updateAgentStatus({ status: 'processing', currentTask: 'Analyzing user input' });

    // Simple echo response for now - will be replaced with actual AI agent logic
    setTimeout(() => {
      const agentResponse = `I received your message: "${content}". This is a placeholder response while the AI agent is being implemented.`;
      this.addMessage(sessionId, agentResponse, 'agent');
      this.updateAgentStatus({ status: 'idle' });
    }, 1000);

    return userMessage;
  }
}

export default new ChatService();