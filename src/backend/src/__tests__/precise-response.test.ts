import { PreciseResponseService } from '../services/precise-response.service';

// Mock the archimate parser
jest.mock('../services/archimate-parser.service', () => ({
  getBusinessActors: jest.fn(),
  getBusinessProcesses: jest.fn(),
  getBusinessFunctions: jest.fn(),
  getElementCounts: jest.fn(),
}));

import archiMateParser from '../services/archimate-parser.service';

describe('PreciseResponseService', () => {
  let service: PreciseResponseService;
  const mockBusinessActors = [
    { id: 'actor-1', name: 'ArchiMetal', type: 'archimate:BusinessActor', layer: 'business' },
    { id: 'actor-2', name: 'DC Benelux', type: 'archimate:BusinessActor', layer: 'business' },
    { id: 'actor-3', name: 'Customer Relations', type: 'archimate:BusinessActor', layer: 'business' },
  ];

  beforeEach(() => {
    service = new PreciseResponseService();
    jest.clearAllMocks();

    // Setup default mocks
    (archiMateParser.getBusinessActors as jest.Mock).mockReturnValue(mockBusinessActors);
    (archiMateParser.getBusinessProcesses as jest.Mock).mockReturnValue([]);
    (archiMateParser.getBusinessFunctions as jest.Mock).mockReturnValue([]);
    (archiMateParser.getElementCounts as jest.Mock).mockReturnValue({
      businessActors: 3,
      businessProcesses: 0,
      businessFunctions: 0,
      applicationComponents: 0,
      total: 3
    });
  });

  describe('Query Intent Analysis', () => {
    it('should detect count-only queries', async () => {
      const queries = [
        'how many business actors',
        'count business actors',
        'number of business actors'
      ];

      for (const query of queries) {
        const response = await service.handleBusinessActorsQuery(query);
        expect(response).toMatch(/There are \*\*3 business actors\*\*/);
        expect(response).not.toMatch(/ArchiMetal/); // Should not list individual actors
      }
    });

    it('should detect list-only queries', async () => {
      const queries = [
        'list all business actors',
        'show business actors',
        'what are the business actors'
      ];

      for (const query of queries) {
        const response = await service.handleBusinessActorsQuery(query);
        expect(response).toMatch(/ArchiMetal/);
        expect(response).toMatch(/DC Benelux/);
        expect(response).toMatch(/Customer Relations/);
        expect(response).not.toMatch(/\*\*3 business actors\*\*/); // Should not show count prominently
      }
    });

    it('should detect combined count and list queries', async () => {
      const queries = [
        'list all business actors and tell me how many',
        'show me the business actors with count',
        'how many business actors are there and what are they'
      ];

      for (const query of queries) {
        const response = await service.handleBusinessActorsQuery(query);
        expect(response).toMatch(/I found \*\*3 business actors\*\*/);
        expect(response).toMatch(/ArchiMetal/);
        expect(response).toMatch(/DC Benelux/);
        expect(response).toMatch(/Customer Relations/);
      }
    });

    it('should handle relationship queries', async () => {
      const query = 'show business actors with their organizational structure';
      const response = await service.handleBusinessActorsQuery(query);

      expect(response).toMatch(/Business Actor Organizational Structure/);
      expect(response).toMatch(/3 actors/);
    });
  });

  describe('Response Validation', () => {
    it('should validate correct responses', () => {
      const response = 'There are **3 business actors** in the ArchiMetal models.';
      const validation = service.validateResponse(response, 'actor');

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.suggestions).toHaveLength(0);
    });

    it('should detect count mismatches', () => {
      const response = 'There are **21 business actors** in the ArchiMetal models.';
      const validation = service.validateResponse(response, 'actor');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Count mismatch: claimed 21, actual 3');
      expect(validation.suggestions).toContain('Update count to 3');
    });

    it('should detect type mixing', () => {
      const response = 'Business actors include processes and functions';
      const validation = service.validateResponse(response, 'actor');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Response includes processes when only actors were requested');
    });

    it('should detect verbose responses for count queries', () => {
      const verboseResponse = `There are **3 business actors**.
        1. ArchiMetal
        2. DC Benelux
        3. Customer Relations
        These actors handle various business processes...
        [Many more lines]`;

      const validation = service.validateResponse(verboseResponse, 'count');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Response too verbose for a count query');
    });
  });

  describe('Element Categorization', () => {
    it('should categorize headquarters correctly', () => {
      const categorized = (service as any).categorizeBusinessActors(mockBusinessActors);

      expect(categorized.headquarters).toHaveLength(1);
      expect(categorized.headquarters[0].name).toBe('ArchiMetal');
    });

    it('should categorize distribution centers correctly', () => {
      const categorized = (service as any).categorizeBusinessActors(mockBusinessActors);

      expect(categorized.distributionCenters).toHaveLength(1);
      expect(categorized.distributionCenters[0].name).toBe('DC Benelux');
    });

    it('should categorize departments correctly', () => {
      const categorized = (service as any).categorizeBusinessActors(mockBusinessActors);

      expect(categorized.departments).toHaveLength(1);
      expect(categorized.departments[0].name).toBe('Customer Relations');
    });

    it('should handle external partners', () => {
      const actorsWithPartners = [
        ...mockBusinessActors,
        { id: 'partner-1', name: 'Transportation Partner', type: 'archimate:BusinessActor', layer: 'business' }
      ];

      const categorized = (service as any).categorizeBusinessActors(actorsWithPartners);

      expect(categorized.externalPartners).toHaveLength(1);
      expect(categorized.externalPartners[0].name).toBe('Transportation Partner');
    });
  });

  describe('Response Generation', () => {
    it('should generate precise responses based on context', async () => {
      const countQuery = 'how many business actors';
      const response = await service.generatePreciseResponse(countQuery);

      expect(response).toMatch(/There are \*\*3 business actors\*\*/);
      expect(response).not.toMatch(/ArchiMetal.*DC Benelux/); // Should not list all actors for count query
    });

    it('should handle process queries differently from actor queries', async () => {
      const processes = [
        { id: 'proc-1', name: 'Order Processing', type: 'archimate:BusinessProcess', layer: 'business' }
      ];
      (archiMateParser.getBusinessProcesses as jest.Mock).mockReturnValue(processes);

      const response = await service.generatePreciseResponse('how many business processes');
      expect(response).toMatch(/1 business processes/);
      expect(response).not.toMatch(/business actors/);
    });

    it('should provide comprehensive overview when requested', async () => {
      const response = await service.generatePreciseResponse('show me everything');

      expect(response).toMatch(/ArchiMetal Model Element Summary/);
      expect(response).toMatch(/Business Actors: 3/);
      expect(response).toMatch(/Total Elements: 3/);
    });
  });

  describe('Auto-correction', () => {
    it('should auto-correct count mismatches', () => {
      const incorrectResponse = 'There are **21 business actors** in the models.';
      const validation = {
        isValid: false,
        issues: ['Count mismatch: claimed 21, actual 3'],
        suggestions: ['Update count to 3']
      };

      const corrected = (service as any).attemptAutoCorrection(incorrectResponse, validation);
      expect(corrected).toMatch(/\*\*3 business actors\*\*/);
      expect(corrected).not.toMatch(/\*\*21 business actors\*\*/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty model gracefully', async () => {
      (archiMateParser.getBusinessActors as jest.Mock).mockReturnValue([]);
      (archiMateParser.getElementCounts as jest.Mock).mockReturnValue({
        businessActors: 0,
        businessProcesses: 0,
        businessFunctions: 0,
        applicationComponents: 0,
        total: 0
      });

      const response = await service.handleBusinessActorsQuery('how many business actors');
      expect(response).toMatch(/There are \*\*0 business actors\*\*/);
    });

    it('should handle malformed queries gracefully', async () => {
      const response = await service.generatePreciseResponse('asdf random text xyz');
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle queries with mixed intent signals', async () => {
      const response = await service.handleBusinessActorsQuery('maybe list actors or count them?');
      expect(response).toBeDefined();
      // Should default to list with count for ambiguous queries
      expect(response).toMatch(/I found \*\*3 business actors\*\*/);
    });
  });
});