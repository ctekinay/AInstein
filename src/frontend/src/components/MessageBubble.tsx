import { Message } from '../types/chat';
import { Bot, User } from 'lucide-react';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isAgent = message.sender === 'agent';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'flex gap-3 max-w-4xl',
      isAgent ? 'justify-start' : 'justify-end ml-auto'
    )}>
      {isAgent && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={clsx(
        'max-w-3xl px-4 py-3 rounded-2xl',
        isAgent
          ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
          : 'bg-primary-500 text-white rounded-br-sm'
      )}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {message.metadata && (
          <div className="mt-2 text-xs opacity-75">
            {message.metadata.fileName && (
              <span>📎 {message.metadata.fileName}</span>
            )}
          </div>
        )}

        <div className={clsx(
          'text-xs mt-2 opacity-60',
          isAgent ? 'text-gray-500' : 'text-white'
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {!isAgent && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
};