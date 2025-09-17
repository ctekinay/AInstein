import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { MessageBubble } from './MessageBubble';

export const MessageList = () => {
  const { messages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-primary-500 rounded-full"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to AInstein
          </h3>
          <p className="text-gray-600">
            Your AI-powered architecture assistant that streamlines ESA workflows. I evaluate initiatives, analyze cross-layer impact, identify stakeholders, update ArchiMate models, and generate ADRs to maintain organizational alignment and transparency.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};