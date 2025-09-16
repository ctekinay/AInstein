import { useState, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const MessageInput = ({ onSendMessage, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const { agentStatus } = useChatStore();

  const isProcessing = agentStatus.status !== 'idle';

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !isProcessing) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isProcessing;

  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <button
          type="button"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isDisabled}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isProcessing
                ? "Agent is processing..."
                : "Ask me about ArchiMate models, architectural decisions, or upload a file..."
            }
            disabled={isDisabled}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            rows={1}
            style={{
              minHeight: '52px',
              maxHeight: '120px',
              resize: 'none',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />

          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length > 0 && (
              <span>{message.length}/2000</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          className="flex-shrink-0 p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};