import { Message } from '../types/chat';
import { Bot, User, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  message: Message;
}

// Helper function to format markdown-style text for accuracy responses
const formatMarkdown = (text: string): string => {
  return text
    // Bold text (**text**)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-700">$1</strong>')
    // Bullet points with enhanced styling
    .replace(/^•\s(.+)$/gm, '<div class="flex items-start gap-2 my-1"><span class="text-blue-500 mt-1">•</span><span>$1</span></div>')
    // Lines starting with "- " (list items)
    .replace(/^-\s(.+)$/gm, '<div class="flex items-start gap-2 my-1"><span class="text-blue-500 mt-1">•</span><span>$1</span></div>')
    // Headers (### text)
    .replace(/^###\s(.+)$/gm, '<h3 class="font-semibold text-lg text-gray-800 mt-4 mb-2">$1</h3>')
    // Section breaks
    .replace(/\n\n/g, '<br/><br/>')
    // Single line breaks
    .replace(/\n/g, '<br/>')
    // Preserve element links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
};

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isAgent = message.sender === 'agent';
  const isSystem = message.type === 'system';
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Detect if this is a precise accuracy response
  const isPreciseResponse = isAgent && (
    message.content.includes('**') &&
    (message.content.includes('business actors') ||
     message.content.includes('business processes') ||
     message.content.includes('business functions')) &&
    /\*\*\d+\s+/.test(message.content) // Contains count pattern like "**3 business actors**"
  );

  // Function to safely render HTML content while preserving line breaks
  const renderMessageContent = (content: string) => {
    // Check for both <a> tags and <span> tags with element-id class
    const linkPattern = /<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g;
    const spanPattern = /<span class="element-id"([^>]*)>([^<]*)<\/span>/g;

    // Enhanced pattern matching for accuracy indicators
    const hasAccuracyMarkers = content.includes('**') || content.includes('•') || content.includes('###');
    const hasLinks = linkPattern.test(content) || spanPattern.test(content);

    if (hasLinks) {
      // Create a comprehensive pattern that matches both links and spans
      const combinedPattern = /(<a href="[^"]*"[^>]*>[^<]*<\/a>|<span class="element-id"[^>]*>[^<]*<\/span>)/g;
      const parts = content.split(combinedPattern);
      const elements: React.ReactNode[] = [];

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
              className="element-id inline-flex items-center px-2 py-1 mx-1 text-xs font-mono bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border cursor-pointer transition-colors duration-200"
              data-element-id={elementIdMatch ? elementIdMatch[1] : ''}
              data-model={modelMatch ? modelMatch[1] : ''}
              title={titleMatch ? titleMatch[1] : 'Click to view element details'}
            >
              <span className="text-blue-500 mr-1">🔍</span>
              {spanText}
            </span>
          );
          return;
        }

        // Regular text - apply markdown formatting
        if (hasAccuracyMarkers) {
          elements.push(<span key={index} dangerouslySetInnerHTML={{ __html: formatMarkdown(part) }} />);
        } else {
          elements.push(part);
        }
      });

      return elements;
    }

    // Apply markdown formatting for accuracy-focused responses
    if (hasAccuracyMarkers) {
      return <span dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />;
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
            ? isPreciseResponse
              ? 'bg-blue-50 border border-blue-200 text-gray-900 rounded-bl-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            : 'bg-primary-500 text-white rounded-br-sm'
        )}>
          {/* Accuracy indicator */}
          {isPreciseResponse && (
            <div className="flex items-center gap-2 mb-2 text-xs text-blue-600 font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Enhanced Accuracy Mode</span>
            </div>
          )}

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