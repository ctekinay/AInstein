import AIAgentService from '../services/ai-agent.service';

// Mock all dependencies
jest.mock('../services/archimate-parser.service');
jest.mock('../services/precise-response.service');
jest.mock('../services/feature-flags.service');
jest.mock('fs-extra');

import archiMateParser from '../services/archimate-parser.service';
import preciseResponseService from '../services/precise-response.service';
import featureFlagsService from '../services/feature-flags.service';

describe('AI Agent Integration Tests', () => {
  const sessionId = 'test-session-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (archiMateParser.loadAllArchiMetalModels as jest.Mock).mockResolvedValue(undefined);
    (archiMateParser.getBusinessActors as jest.Mock).mockReturnValue([
      { id: 'actor-1', name: 'ArchiMetal', type: 'archimate:BusinessActor', layer: 'business' },
      { id: 'actor-2', name: 'DC Benelux', type: 'archimate:BusinessActor', layer: 'business' },
      { id: 'actor-3', name: 'Customer Relations', type: 'archimate:BusinessActor', layer: 'business' },
    ]);
    (archiMateParser.getBusinessProcesses as jest.Mock).mockReturnValue([]);
    (archiMateParser.getAllModels as jest.Mock).mockReturnValue([]);

    (featureFlagsService.isEnabled as jest.Mock).mockImplementation((flag: string) => {
      // Default: accuracy improvements disabled for baseline testing
      return false;
    });

    (preciseResponseService.generatePreciseResponse as jest.Mock).mockResolvedValue(
      'I found **3 business actors** in the ArchiMetal models: ArchiMetal, DC Benelux, Customer Relations.'
    );
    (preciseResponseService.handleBusinessActorsQuery as jest.Mock).mockResolvedValue(
      'I found **3 business actors** in the ArchiMetal models: ArchiMetal, DC Benelux, Customer Relations.'
    );
  });

  describe('Session Management', () => {
    it('should initialize context for new session', async () => {
      await AIAgentService.initializeContext(sessionId);
      const context = AIAgentService.getContext(sessionId);

      expect(context).toBeDefined();
      expect(context?.sessionId).toBe(sessionId);
      expect(context?.messageHistory).toEqual([]);
    });

    it('should load ArchiMetal models on initialization', async () => {
      await AIAgentService.initializeContext(sessionId);

      expect(archiMateParser.loadAllArchiMetalModels).toHaveBeenCalled();
    });

    it('should clear context correctly', () => {
      AIAgentService.initializeContext(sessionId);
      expect(AIAgentService.getContext(sessionId)).toBeDefined();

      AIAgentService.clearContext(sessionId);
      expect(AIAgentService.getContext(sessionId)).toBeUndefined();
    });
  });

  describe('Feature Flag Integration', () => {
    it('should use precise response service when accuracy improvements enabled', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockImplementation((flag: string) => {
        return flag === 'precise_response_validation';
      });

      const response = await AIAgentService.processMessage(sessionId, 'how many business actors');

      expect(preciseResponseService.generatePreciseResponse).toHaveBeenCalledWith(
        'how many business actors',
        expect.any(Object)
      );
      expect(response).toContain('**3 business actors**');
    });

    it('should fallback to legacy handler when feature flags disabled', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockReturnValue(false);

      const response = await AIAgentService.processMessage(sessionId, 'list business actors');

      expect(preciseResponseService.generatePreciseResponse).not.toHaveBeenCalled();
      expect(response).toBeDefined();
    });

    it('should handle precise response service failures gracefully', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockReturnValue(true);
      (preciseResponseService.generatePreciseResponse as jest.Mock).mockRejectedValue(
        new Error('Precise response service failed')
      );

      const response = await AIAgentService.processMessage(sessionId, 'how many business actors');

      expect(response).toBeDefined();
      expect(response).not.toContain('Error');
    });
  });

  describe('Business Intent Detection', () => {
    it('should route business actor queries to organizational structure handler', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockReturnValue(false); // Test legacy path

      const response = await AIAgentService.processMessage(sessionId, 'list all ArchiMetal business actors');

      expect(response).toContain('business actors');
    });

    it('should handle greetings with business intent correctly', async () => {
      const response = await AIAgentService.processMessage(sessionId, 'Hi, list business actors');

      // Should route to business analysis, not greeting handler
      expect(response).not.toContain('Hello! I\'m AInstein');
      expect(response).toContain('business actors');
    });

    it('should route pure greetings to greeting handler', async () => {
      const response = await AIAgentService.processMessage(sessionId, 'Hello');

      expect(response).toContain('Hello! I\'m AInstein');
    });
  });

  describe('Organizational Structure Queries', () => {
    it('should handle organizational structure queries with strict parsing enabled', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockImplementation((flag: string) => {
        return flag === 'strict_archimate_parsing';
      });

      const response = await AIAgentService.processMessage(sessionId, 'show me the ArchiMetal organizational structure');

      expect(preciseResponseService.handleBusinessActorsQuery).toHaveBeenCalledWith(
        'show me the ArchiMetal organizational structure'
      );
    });

    it('should fallback to legacy implementation when strict parsing fails', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockImplementation((flag: string) => {
        return flag === 'strict_archimate_parsing';
      });

      (preciseResponseService.handleBusinessActorsQuery as jest.Mock).mockRejectedValue(
        new Error('Strict parsing failed')
      );

      const response = await AIAgentService.processMessage(sessionId, 'list business actors');

      expect(response).toBeDefined();
      expect(response).toContain('business actors');
    });
  });

  describe('Progress Callbacks', () => {
    it('should report progress during message processing', async () => {
      const progressCallback = jest.fn();

      await AIAgentService.processMessage(sessionId, 'analyze business actors', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({
        step: 'Initializing analysis',
        progress: 10
      });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number)
        })
      );
    });

    it('should handle progress callbacks with feature flags enabled', async () => {
      (featureFlagsService.isEnabled as jest.Mock).mockReturnValue(true);
      const progressCallback = jest.fn();

      await AIAgentService.processMessage(sessionId, 'count business actors', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({
        step: 'Analyzing query intent',
        progress: 35
      });

      expect(progressCallback).toHaveBeenCalledWith({
        step: 'Validating response accuracy',
        progress: 90
      });
    });
  });

  describe('Message History', () => {
    it('should store message history correctly', async () => {
      await AIAgentService.processMessage(sessionId, 'Hello');
      await AIAgentService.processMessage(sessionId, 'List business actors');

      const context = AIAgentService.getContext(sessionId);
      expect(context?.messageHistory).toHaveLength(4); // 2 user + 2 assistant messages

      expect(context?.messageHistory[0].role).toBe('user');
      expect(context?.messageHistory[0].content).toBe('Hello');
      expect(context?.messageHistory[1].role).toBe('assistant');
      expect(context?.messageHistory[2].role).toBe('user');
      expect(context?.messageHistory[2].content).toBe('List business actors');
    });

    it('should include timestamps in message history', async () => {
      const before = new Date();
      await AIAgentService.processMessage(sessionId, 'Test message');
      const after = new Date();

      const context = AIAgentService.getContext(sessionId);
      const message = context?.messageHistory[0];

      expect(message?.timestamp).toBeInstanceOf(Date);
      expect(message?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Off-Topic Query Handling', () => {
    it('should redirect off-topic queries', async () => {
      const response = await AIAgentService.processMessage(sessionId, 'What is the weather like?');

      expect(response).toContain('ArchiMetal specific challenges');
      expect(response).toContain('organizational analysis');
    });

    it('should handle business queries with off-topic elements', async () => {
      // Should prioritize business intent
      const response = await AIAgentService.processMessage(
        sessionId,
        'I like pizza but can you list ArchiMetal business actors?'
      );

      expect(response).not.toContain('ArchiMetal specific challenges');
      expect(response).toContain('business actors');
    });
  });

  describe('Error Handling', () => {
    it('should handle parser loading failures gracefully', async () => {
      (archiMateParser.loadAllArchiMetalModels as jest.Mock).mockRejectedValue(
        new Error('Failed to load models')
      );

      const response = await AIAgentService.processMessage(sessionId, 'list business actors');

      expect(response).toBeDefined();
      expect(response).not.toContain('Error');
    });

    it('should handle empty business actors gracefully', async () => {
      (archiMateParser.getBusinessActors as jest.Mock).mockReturnValue([]);

      const response = await AIAgentService.processMessage(sessionId, 'list business actors');

      expect(response).toContain("don't see any business actors");
    });
  });

  describe('Response Quality', () => {
    it('should provide structured responses for organizational queries', async () => {
      const response = await AIAgentService.processMessage(sessionId, 'show organizational structure');

      expect(response).toMatch(/business actors/i);
      expect(response).toMatch(/\d+ (actors|units)/);
    });

    it('should avoid prohibited response patterns', async () => {
      const response = await AIAgentService.processMessage(sessionId, 'hello, list actors');

      // Should not contain prohibited phrases from knowledge base
      expect(response).not.toContain('## 🏗️ **ArchiMetal Enterprise Architecture Analysis**');
      expect(response).not.toContain('**Your Query:**');
      expect(response).not.toContain('**Available ArchiMetal Models:**');
    });
  });
});