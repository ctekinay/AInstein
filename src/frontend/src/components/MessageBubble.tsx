import { Message } from '../types/chat';
import { Bot, User, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isAgent = message.sender === 'agent';
  const isSystem = message.type === 'system';
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Function to safely render HTML content while preserving line breaks
  const renderMessageContent = (content: string) => {
    // Check for both <a> tags and <span> tags with element-id class
    const linkPattern = /<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g;
    const spanPattern = /<span class="element-id"([^>]*)>([^<]*)<\/span>/g;

    const hasLinks = linkPattern.test(content) || spanPattern.test(content);

    if (hasLinks) {
      // Create a comprehensive pattern that matches both links and spans
      const combinedPattern = /(<a href="[^"]*"[^>]*>[^<]*<\/a>|<span class="element-id"[^>]*>[^<]*<\/span>)/g;
      const parts = content.split(combinedPattern);
      const elements = [];

      parts.forEach((part, index) => {
        if (!part) return;

        // Check if this part is an <a> tag
        const linkMatch = part.match(/<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/);
        if (linkMatch) {
          const href = linkMatch[1];
          const attributes = linkMatch[2] || '';
          const linkText = linkMatch[3];

          // Extract attributes
          const titleMatch = attributes.match(/title="([^"]*)"/);
          const classMatch = attributes.match(/class="([^"]*)"/);
          const targetMatch = attributes.match(/target="([^"]*)"/);

          elements.push(
            <a
              key={index}
              href={href}
              title={titleMatch ? titleMatch[1] : ''}
              className={`${classMatch ? classMatch[1] : ''} text-blue-600 hover:text-blue-800 underline font-medium`}
              target={targetMatch ? targetMatch[1] : '_self'}
              rel={targetMatch && targetMatch[1] === '_blank' ? 'noopener noreferrer' : ''}
            >
              {linkText}
            </a>
          );
          return;
        }

        // Check if this part is a <span> tag with element-id
        const spanMatch = part.match(/<span class="element-id"([^>]*)>([^<]*)<\/span>/);
        if (spanMatch) {
          const attributes = spanMatch[1] || '';
          const spanText = spanMatch[2];

          // Extract data attributes
          const elementIdMatch = attributes.match(/data-element-id="([^"]*)"/);
          const modelMatch = attributes.match(/data-model="([^"]*)"/);
          const titleMatch = attributes.match(/title="([^"]*)"/);

          elements.push(
            <span
              key={index}
              className="element-id"
              data-element-id={elementIdMatch ? elementIdMatch[1] : ''}
              data-model={modelMatch ? modelMatch[1] : ''}
              title={titleMatch ? titleMatch[1] : 'Click to view element details'}
            >
              {spanText}
            </span>
          );
          return;
        }

        // Regular text
        elements.push(part);
      });

      return elements;
    }

    return content;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy message');
    }
  };

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
    <div
      className={clsx(
        'flex gap-3 max-w-4xl group',
        isAgent ? 'justify-start' : 'justify-end ml-auto'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isAgent && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className="relative">
        <div className={clsx(
          'max-w-3xl px-4 py-3 rounded-2xl',
          isAgent
            ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
            : 'bg-primary-500 text-white rounded-br-sm'
        )}>
          <div className="whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</div>

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

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={clsx(
            'absolute bottom-2 right-2 p-1.5 rounded-md transition-all duration-200',
            isAgent
              ? 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300'
              : 'bg-primary-600 hover:bg-primary-700 text-white border border-primary-400',
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
          )}
          title="Copy message"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {!isAgent && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
};