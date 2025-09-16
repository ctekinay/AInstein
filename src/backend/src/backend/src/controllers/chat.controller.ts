import { Request, Response } from 'express';
import chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';

export const createChatSession = (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || 'anonymous';
    const session = chatService.createSession(userId);

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
    });
  }
};

export const getChatSession = (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = chatService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Error getting chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat session',
    });
  }
};

export const sendMessage = (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required',
      });
    }

    const message = chatService.processUserMessage(sessionId, content.trim());

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
};