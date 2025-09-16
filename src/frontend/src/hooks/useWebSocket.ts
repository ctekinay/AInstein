import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../stores/chatStore';
import { Message, AgentStatus } from '../types/chat';
import toast from 'react-hot-toast';

export const useWebSocket = (sessionId: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const {
    addMessage,
    setAgentStatus,
    setIsConnected
  } = useChatStore();

  useEffect(() => {
    if (!sessionId) return;

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    socketRef.current = io(serverUrl);

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);

      // Join the chat session
      socketRef.current?.emit('join_session', sessionId);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('new_message', (message: Message) => {
      addMessage({
        ...message,
        timestamp: new Date(message.timestamp)
      });
    });

    socketRef.current.on('agent_status', (status: AgentStatus) => {
      setAgentStatus(status);
    });

    socketRef.current.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    return () => {
      socketRef.current?.disconnect();
      setIsConnected(false);
    };
  }, [sessionId, addMessage, setAgentStatus, setIsConnected]);

  const sendMessage = (content: string) => {
    if (!socketRef.current || !sessionId) {
      toast.error('Not connected to server');
      return;
    }

    socketRef.current.emit('send_message', {
      sessionId,
      content
    });
  };

  return {
    sendMessage,
    isConnected: socketRef.current?.connected || false
  };
};