import { useChatStore } from '../stores/chatStore';
import { Loader2, CheckCircle, Brain, Zap } from 'lucide-react';
import clsx from 'clsx';

export const AgentStatus = () => {
  const { agentStatus } = useChatStore();

  if (agentStatus.status === 'idle') {
    return null;
  }

  const getStatusIcon = () => {
    switch (agentStatus.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'analyzing':
        return <Brain className="w-4 h-4" />;
      case 'generating':
        return <Zap className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (agentStatus.status) {
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'analyzing':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'generating':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium',
      getStatusColor()
    )}>
      {getStatusIcon()}
      <span className="capitalize">{agentStatus.status}</span>
      {agentStatus.currentTask && (
        <>
          <span>•</span>
          <span className="font-normal opacity-80">{agentStatus.currentTask}</span>
        </>
      )}
      {agentStatus.progress !== undefined && (
        <div className="ml-2 flex-1 min-w-16">
          <div className="bg-white bg-opacity-50 rounded-full h-1.5">
            <div
              className="bg-current h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${agentStatus.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};