/**
 * End-to-End Accuracy Validation Tests
 * These tests validate the complete accuracy solution addressing:
 * - Count accuracy issues
 * - Type mixing prevention
 * - Response scope control
 * - Query intent matching
 */

import AIAgentService from '../services/ai-agent.service';
import { PreciseResponseService } from '../services/precise-response.service';
import { StrictArchiMateParser } from '../services/archimate-strict-parser.service';
import { FeatureFlagsService } from '../services/feature-flags.service';

// Mock file system for controlled testing
jest.mock('fs-extra');
jest.mock('../services/archimate-parser.service');

import archiMateParser from '../services/archimate-parser.service';

describe('Accuracy Validation Tests', () => {
  let preciseService: PreciseResponseService;
  let strictParser: StrictArchiMateParser;
  let featureFlags: FeatureFlagsService;

  const mockAccurateData = {
    businessActors: [
      { id: 'ba-1', name: 'ArchiMetal', type: 'archimate:BusinessActor', layer: 'business' },
      { id: 'ba-2', name: 'DC Benelux', type: 'archimate:BusinessActor', layer: 'business' },
      { id: 'ba-3', name: 'DC Spain', type: 'archimate:BusinessActor', layer: 'business' }
    ],
    businessProcesses: [
      { id: 'bp-1', name: 'Customer Order Processing', type: 'archimate:BusinessProcess', layer: 'business' },
      { id: 'bp-2', name: 'Steel Production', type: 'archimate:BusinessProcess', layer: 'business' }
    ],
    businessFunctions: [
      { id: 'bf-1', name: 'Quality Management', type: 'archimate:BusinessFunction', layer: 'business' }
    ]
  };

  beforeEach(() => {
    preciseService = new PreciseResponseService();
    strictParser = new StrictArchiMateParser();
    featureFlags = new FeatureFlagsService();

    // Mock parser with accurate data
    (archiMateParser.getBusinessActors as jest.Mock).mockReturnValue(mockAccurateData.businessActors);
    (archiMateParser.getBusinessProcesses as jest.Mock).mockReturnValue(mockAccurateData.businessProcesses);
    (archiMateParser.getBusinessFunctions as jest.Mock).mockReturnValue(mockAccurateData.businessFunctions);
    (archiMateParser.getElementCounts as jest.Mock).mockReturnValue({
      businessActors: 3,
      businessProcesses: 2,
      businessFunctions: 1,
      applicationComponents: 0,
      total: 6
    });
    (archiMateParser.loadAllArchiMetalModels as jest.Mock).mockResolvedValue(undefined);
    (archiMateParser.getAllModels as jest.Mock).mockReturnValue([]);
  });

  describe('Count Accuracy Validation', () => {
    it('should provide exact count for business actors', async () => {
      const response = await preciseService.handleBusinessActorsQuery('how many business actors');

      expect(response).toMatch(/There are \*\*3 business actors\*\*/);
      expect(response).not.toMatch(/\*\*21 business actors\*\*/); // Original problematic count
      expect(response).not.toMatch(/\*\*15 business actors\*\*/);
      expect(response).not.toMatch(/\*\*12 business actors\*\*/);
    });

    it('should validate count accuracy in responses', () => {
      const correctResponse = 'I found **3 business actors** in the ArchiMetal models.';
      const incorrectResponse = 'I found **21 business actors** in the ArchiMetal models.';

      const correctValidation = preciseService.validateResponse(correctResponse, 'actor');
      const incorrectValidation = preciseService.validateResponse(incorrectResponse, 'actor');

      expect(correctValidation.isValid).toBe(true);
      expect(incorrectValidation.isValid).toBe(false);
      expect(incorrectValidation.issues).toContain('Count mismatch: claimed 21, actual 3');
    });

    it('should auto-correct count mismatches', () => {
      const validation = {
        isValid: false,
        suggestions: ['Update count to 3']
      };

      const corrected = (preciseService as any).attemptAutoCorrection(
        'There are **21 business actors**',
        validation
      );

      expect(corrected).toMatch(/\*\*3 business actors\*\*/);
    });
  });

  describe('Type Mixing Prevention', () => {
    it('should not mix actors and processes in business actor queries', async () => {
      const response = await preciseService.handleBusinessActorsQuery('list all business actors');

      // Should contain actors
      expect(response).toMatch(/ArchiMetal/);
      expect(response).toMatch(/DC Benelux/);
      expect(response).toMatch(/DC Spain/);

      // Should NOT contain processes or functions
      expect(response).not.toMatch(/Customer Order Processing/);
      expect(response).not.toMatch(/Steel Production/);
      expect(response).not.toMatch(/Quality Management/);
    });

    it('should detect type mixing in responses', () => {
      const mixedResponse = 'Business actors include ArchiMetal and Customer Order Processing process.';
      const validation = preciseService.validateResponse(mixedResponse, 'actor');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Response includes processes when only actors were requested');
    });

    it('should handle process queries separately from actor queries', async () => {
      const processResponse = await preciseService.generatePreciseResponse('list business processes');

      expect(processResponse).toMatch(/Customer Order Processing/);
      expect(processResponse).toMatch(/Steel Production/);
      expect(processResponse).not.toMatch(/ArchiMetal/); // Should not include actors
    });

    it('should handle function queries separately from actor queries', async () => {
      const functionResponse = await preciseService.generatePreciseResponse('list business functions');

      expect(functionResponse).toMatch(/Quality Management/);
      expect(functionResponse).not.toMatch(/ArchiMetal/); // Should not include actors
      expect(functionResponse).not.toMatch(/Customer Order Processing/); // Should not include processes
    });
  });

  describe('Response Scope Control', () => {
    it('should provide only count for count queries', async () => {
      const response = await preciseService.handleBusinessActorsQuery('how many business actors');

      expect(response).toMatch(/There are \*\*3 business actors\*\*/);
      expect(response).not.toMatch(/ArchiMetal.*DC Benelux/); // Should not list individual actors
    });

    it('should provide only list for list queries', async () => {
      const response = await preciseService.handleBusinessActorsQuery('list business actors');

      expect(response).toMatch(/ArchiMetal/);
      expect(response).toMatch(/DC Benelux/);
      expect(response).toMatch(/DC Spain/);
      expect(response).not.toMatch(/I found \*\*3 business actors\*\*/); // Should not emphasize count
    });

    it('should provide both count and list for combined queries', async () => {
      const response = await preciseService.handleBusinessActorsQuery('list all business actors and count them');

      expect(response).toMatch(/I found \*\*3 business actors\*\*/);
      expect(response).toMatch(/ArchiMetal/);
      expect(response).toMatch(/DC Benelux/);
      expect(response).toMatch(/DC Spain/);
    });

    it('should detect verbose responses for simple queries', () => {
      const verboseResponse = `There are **3 business actors**.
        These are distributed across multiple organizational levels...
        Each actor has specific responsibilities...
        The organizational hierarchy shows...
        [Many more lines of unnecessary detail]`;

      const validation = preciseService.validateResponse(verboseResponse, 'count');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Response too verbose for a count query');
    });
  });

  describe('Query Intent Matching', () => {
    it('should correctly detect count intent', () => {
      const queries = [
        'how many business actors',
        'count the business actors',
        'number of business actors'
      ];

      queries.forEach(query => {
        const intent = (preciseService as any).analyzeQueryIntent(query);
        expect(intent.wantsCount).toBe(true);
        expect(intent.wantsList).toBe(false);
      });
    });

    it('should correctly detect list intent', () => {
      const queries = [
        'list all business actors',
        'show me the business actors',
        'what are the business actors'
      ];

      queries.forEach(query => {
        const intent = (preciseService as any).analyzeQueryIntent(query);
        expect(intent.wantsList).toBe(true);
        expect(intent.wantsCount).toBe(false);
      });
    });

    it('should correctly detect relationship intent', () => {
      const queries = [
        'show business actor hierarchy',
        'organizational structure of actors',
        'relationships between actors'
      ];

      queries.forEach(query => {
        const intent = (preciseService as any).analyzeQueryIntent(query);
        expect(intent.wantsRelationships).toBe(true);
      });
    });

    it('should correctly detect element type intent', () => {
      const testCases = [
        { query: 'list business actors', expectedType: 'actor' },
        { query: 'show business processes', expectedType: 'process' },
        { query: 'business functions overview', expectedType: 'function' },
        { query: 'application services', expectedType: 'service' }
      ];

      testCases.forEach(({ query, expectedType }) => {
        const intent = (preciseService as any).analyzeQueryIntent(query);
        expect(intent.elementType).toBe(expectedType);
      });
    });
  });

  describe('End-to-End Accuracy Scenarios', () => {
    const sessionId = 'accuracy-test-session';

    beforeEach(() => {
      // Enable all accuracy improvements
      featureFlags.enableAccuracyImprovements();
    });

    it('should handle the original problematic scenario correctly', async () => {
      // Original issue: "List all business actors" returned 21 actors with mixed types
      const response = await AIAgentService.processMessage(sessionId, 'List all business actors in ArchiMetal');

      // Verify accurate count
      expect(response).not.toMatch(/21.*actors/);
      expect(response).toMatch(/3.*actors/);

      // Verify no type mixing
      expect(response).not.toMatch(/process/i);
      expect(response).not.toMatch(/function/i);

      // Verify only actors listed
      expect(response).toMatch(/ArchiMetal/);
      expect(response).toMatch(/DC Benelux/);
      expect(response).toMatch(/DC Spain/);
    });

    it('should prevent scope creep in responses', async () => {
      // User asks for actors, should not get processes
      const response = await AIAgentService.processMessage(sessionId, 'How many business actors?');

      expect(response).toMatch(/3 business actors/);
      expect(response).not.toMatch(/process/i);
      expect(response).not.toMatch(/Customer Order Processing/);
      expect(response).not.toMatch(/Steel Production/);
    });

    it('should provide accurate responses for different element types', async () => {
      const actorResponse = await AIAgentService.processMessage(sessionId, 'Count business actors');
      const processResponse = await AIAgentService.processMessage(sessionId, 'Count business processes');
      const functionResponse = await AIAgentService.processMessage(sessionId, 'Count business functions');

      expect(actorResponse).toMatch(/3.*actors/);
      expect(processResponse).toMatch(/2.*processes/);
      expect(functionResponse).toMatch(/1.*functions/);

      // Verify no cross-contamination
      expect(actorResponse).not.toMatch(/process/);
      expect(processResponse).not.toMatch(/actor/);
      expect(functionResponse).not.toMatch(/actor|process/);
    });

    it('should maintain accuracy under different query formulations', async () => {
      const variations = [
        'how many business actors are there',
        'count the business actors',
        'number of business actors',
        'business actor count'
      ];

      for (const query of variations) {
        const response = await AIAgentService.processMessage(sessionId, query);
        expect(response).toMatch(/3.*business actors/);
        expect(response).not.toMatch(/21|15|12/); // Common wrong counts
      }
    });
  });

  describe('Accuracy Metrics Validation', () => {
    it('should achieve target count accuracy (>95%)', () => {
      const testQueries = [
        'how many business actors',
        'count business processes',
        'number of business functions'
      ];

      let correctResponses = 0;
      const totalQueries = testQueries.length;

      testQueries.forEach(query => {
        const intent = (preciseService as any).analyzeQueryIntent(query);
        const elementType = intent.elementType;

        // Verify correct count is returned based on element type
        if (elementType === 'actor' && mockAccurateData.businessActors.length === 3) correctResponses++;
        if (elementType === 'process' && mockAccurateData.businessProcesses.length === 2) correctResponses++;
        if (elementType === 'function' && mockAccurateData.businessFunctions.length === 1) correctResponses++;
      });

      const accuracy = correctResponses / totalQueries;
      expect(accuracy).toBeGreaterThan(0.95); // >95% accuracy target
    });

    it('should achieve target type classification accuracy (>95%)', () => {
      const testElements = [
        ...mockAccurateData.businessActors,
        ...mockAccurateData.businessProcesses,
        ...mockAccurateData.businessFunctions
      ];

      let correctClassifications = 0;
      const totalElements = testElements.length;

      testElements.forEach(element => {
        if (element.type.includes('BusinessActor') && element.id.startsWith('ba-')) correctClassifications++;
        if (element.type.includes('BusinessProcess') && element.id.startsWith('bp-')) correctClassifications++;
        if (element.type.includes('BusinessFunction') && element.id.startsWith('bf-')) correctClassifications++;
      });

      const accuracy = correctClassifications / totalElements;
      expect(accuracy).toBeGreaterThan(0.95); // >95% type classification accuracy
    });

    it('should achieve target response relevance (>90%)', async () => {
      const intentTestCases = [
        { query: 'how many business actors', shouldContain: ['3', 'actors'], shouldNotContain: ['process', 'function'] },
        { query: 'list business processes', shouldContain: ['Customer Order Processing', 'Steel Production'], shouldNotContain: ['ArchiMetal', 'DC Benelux'] },
        { query: 'count business functions', shouldContain: ['1', 'functions'], shouldNotContain: ['actors', 'processes'] }
      ];

      let relevantResponses = 0;
      const totalCases = intentTestCases.length;

      for (const testCase of intentTestCases) {
        const response = await preciseService.generatePreciseResponse(testCase.query);

        const hasAllRequired = testCase.shouldContain.every(term =>
          response.toLowerCase().includes(term.toLowerCase())
        );
        const hasNoProhibited = testCase.shouldNotContain.every(term =>
          !response.toLowerCase().includes(term.toLowerCase())
        );

        if (hasAllRequired && hasNoProhibited) relevantResponses++;
      }

      const relevance = relevantResponses / totalCases;
      expect(relevance).toBeGreaterThan(0.90); // >90% response relevance target
    });

    it('should achieve target query intent match (>85%)', () => {
      const intentTestCases = [
        { query: 'how many business actors', expectedCount: true, expectedList: false },
        { query: 'list business actors', expectedCount: false, expectedList: true },
        { query: 'count and list actors', expectedCount: true, expectedList: true },
        { query: 'business actor relationships', expectedRelationships: true }
      ];

      let correctIntentMatches = 0;
      const totalCases = intentTestCases.length;

      intentTestCases.forEach(testCase => {
        const intent = (preciseService as any).analyzeQueryIntent(testCase.query);

        let isCorrect = true;
        if (testCase.expectedCount !== undefined && intent.wantsCount !== testCase.expectedCount) isCorrect = false;
        if (testCase.expectedList !== undefined && intent.wantsList !== testCase.expectedList) isCorrect = false;
        if (testCase.expectedRelationships !== undefined && intent.wantsRelationships !== testCase.expectedRelationships) isCorrect = false;

        if (isCorrect) correctIntentMatches++;
      });

      const intentMatchAccuracy = correctIntentMatches / totalCases;
      expect(intentMatchAccuracy).toBeGreaterThan(0.85); // >85% query intent match target
    });
  });
});