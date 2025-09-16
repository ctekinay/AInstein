export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  metadata?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'error';
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive';
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'file_upload' | 'agent_status';
  payload: any;
}

export interface AgentStatus {
  status: 'idle' | 'processing' | 'analyzing' | 'generating';
  currentTask?: string;
  progress?: number;
}