import { create } from 'zustand';
import { Message, ChatSession, AgentStatus } from '../types/chat';

interface ChatStore {
  currentSession: ChatSession | null;
  messages: Message[];
  agentStatus: AgentStatus;
  isConnected: boolean;
  isLoading: boolean;

  setCurrentSession: (session: ChatSession) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setAgentStatus: (status: AgentStatus) => void;
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  currentSession: null,
  messages: [],
  agentStatus: { status: 'idle' },
  isConnected: false,
  isLoading: false,

  setCurrentSession: (session) => set({ currentSession: session }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  setMessages: (messages) => set({ messages }),

  setAgentStatus: (agentStatus) => set({ agentStatus }),

  setIsConnected: (isConnected) => set({ isConnected }),

  setIsLoading: (isLoading) => set({ isLoading }),

  clearMessages: () => set({ messages: [] }),
}));