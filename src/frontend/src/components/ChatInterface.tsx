import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiClient } from '../utils/api';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentStatus } from './AgentStatus';
import { ElementViewer } from './ElementViewer';
import { Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const ChatInterface = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elementViewerState, setElementViewerState] = useState<{
    isOpen: boolean;
    elementId: string | null;
    modelName: string | null;
  }>({
    isOpen: false,
    elementId: null,
    modelName: null
  });

  // Use useRef for synchronous guard that works immediately
  const initializationRef = useRef(false);
  // Generate a unique ID for this component instance to track mounting
  const componentId = useState(() => Math.random().toString(36).substr(2, 9))[0];

  console.log('🔧 ChatInterface component rendered, ID:', componentId);

  const {
    currentSession,
    setCurrentSession,
    setMessages,
    isConnected,
    isLoading,
    setIsLoading,
    addMessage
  } = useChatStore();

  const { sendMessage } = useWebSocket(sessionId);

  useEffect(() => {
    // DEBUG: Log every useEffect run to trace the problem
    console.log(`🔍 ChatInterface [${componentId}] useEffect triggered:`, {
      initializationStarted: initializationRef.current,
      sessionId,
      currentSession: currentSession?.id
    });

    // FIXED: Use ref for synchronous guard that works immediately
    if (initializationRef.current || sessionId) {
      console.log('⏭️ Skipping initialization (already started or done)');
      return;
    }

    // Set the guard immediately before any async operations
    initializationRef.current = true;
    console.log('🚀 Starting chat initialization...');

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

          console.log('✅ Chat session initialized successfully:', response.data.sessionId);
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
  }, [setCurrentSession, setMessages, setIsLoading, sessionId]);

  // Global click handler for element links
  useEffect(() => {
    const handleElementLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Handle both old link format and new span format
      if (target.tagName === 'A' && target.classList.contains('element-link')) {
        event.preventDefault();

        const href = target.getAttribute('href');
        if (href && href.startsWith('/viewer/element/')) {
          const url = new URL(href, window.location.origin);
          const elementId = href.split('/viewer/element/')[1].split('?')[0];
          const modelName = url.searchParams.get('model');

          if (elementId && modelName) {
            setElementViewerState({
              isOpen: true,
              elementId,
              modelName: decodeURIComponent(modelName)
            });
          }
        }
      }
      // Handle new span-based element references
      else if (target.tagName === 'SPAN' && target.classList.contains('element-id')) {
        event.preventDefault();

        const elementId = target.getAttribute('data-element-id');
        const modelName = target.getAttribute('data-model');

        if (elementId && modelName) {
          setElementViewerState({
            isOpen: true,
            elementId,
            modelName
          });
        }
      }
    };

    document.addEventListener('click', handleElementLinkClick);
    return () => document.removeEventListener('click', handleElementLinkClick);
  }, []);

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
          <div className="flex items-center gap-4">
            <img
              src="/alliander_logo.jpeg"
              alt="Alliander"
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AInstein</h1>
              <p className="text-sm text-gray-600">AI Architecture Assistant</p>
            </div>
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
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full min-h-0">
        <div className="flex-1 overflow-hidden">
          <MessageList />
        </div>
        <div className="flex-shrink-0 border-t bg-white">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={!isConnected || !sessionId}
          />
        </div>
      </div>

      {/* Element Viewer Modal */}
      <ElementViewer
        elementId={elementViewerState.elementId}
        modelName={elementViewerState.modelName}
        isOpen={elementViewerState.isOpen}
        onClose={() => setElementViewerState({ isOpen: false, elementId: null, modelName: null })}
        onNavigate={(newElementId, newModelName) => {
          // Navigate to a different element
          setElementViewerState({
            isOpen: true,
            elementId: newElementId,
            modelName: newModelName
          });
        }}
        onArchiOpened={() => {
          // Add a message from AInstein when Archi is opened
          const ainsteinMessage = {
            id: `msg-${Date.now()}`,
            content: `ArchiMate model is opened in Archi Application. Let me know if you have any questions or need further help with other architectural challenges.`,
            sender: 'agent' as const,
            timestamp: new Date(),
            type: 'text' as const
          };
          addMessage(ainsteinMessage);
        }}
      />
    </div>
  );
};