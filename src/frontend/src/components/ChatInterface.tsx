import { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiClient } from '../utils/api';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentStatus } from './AgentStatus';
import { Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const ChatInterface = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const {
    currentSession,
    setCurrentSession,
    setMessages,
    isConnected,
    isLoading,
    setIsLoading
  } = useChatStore();

  const { sendMessage } = useWebSocket(sessionId);

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      try {
        // Create a new chat session
        const response = await apiClient.createChatSession();

        if (response.success && response.data) {
          setSessionId(response.data.sessionId);

          // Create a basic session object
          const session = {
            id: response.data.sessionId,
            userId: 'anonymous',
            messages: [],
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.createdAt),
            status: 'active' as const,
          };

          setCurrentSession(session);
          setMessages([]);

          toast.success('Chat session initialized');
        } else {
          toast.error(response.error || 'Failed to initialize chat');
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast.error('Failed to connect to chat service');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [setCurrentSession, setMessages, setIsLoading]);

  const handleSendMessage = (content: string) => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    sendMessage(content);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing AInstein...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AInstein</h1>
            <p className="text-sm text-gray-600">AI Architecture Assistant</p>
          </div>

          <div className="flex items-center gap-4">
            <AgentStatus />

            <div className="flex items-center gap-2 text-sm">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <MessageList />
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!isConnected || !sessionId}
        />
      </div>
    </div>
  );
};