import { StrictArchiMateParser } from '../services/archimate-strict-parser.service';
import { ArchiMateElement, ArchiMateModel } from '../types/archimate.types';

describe('StrictArchiMateParser', () => {
  let parser: StrictArchiMateParser;
  let mockModel: ArchiMateModel;

  beforeEach(() => {
    parser = new StrictArchiMateParser();

    // Create mock ArchiMetal model data for testing
    mockModel = {
      id: 'test-model',
      name: 'ArchiMetal Test Model',
      version: '3.2',
      elements: new Map([
        ['actor-1', {
          id: 'actor-1',
          name: 'ArchiMetal',
          type: 'archimate:BusinessActor',
          layer: 'business'
        }],
        ['actor-2', {
          id: 'actor-2',
          name: 'DC Benelux',
          type: 'archimate:BusinessActor',
          layer: 'business'
        }],
        ['actor-3', {
          id: 'actor-3',
          name: 'Customer Relations',
          type: 'archimate:BusinessActor',
          layer: 'business'
        }],
        ['process-1', {
          id: 'process-1',
          name: 'Customer Order Processing',
          type: 'archimate:BusinessProcess',
          layer: 'business'
        }],
        ['function-1', {
          id: 'function-1',
          name: 'Production Planning',
          type: 'archimate:BusinessFunction',
          layer: 'business'
        }],
        ['app-1', {
          id: 'app-1',
          name: 'CRM System',
          type: 'archimate:ApplicationComponent',
          layer: 'application'
        }]
      ]),
      relationships: new Map(),
      views: new Map(),
      folders: {
        strategy: [],
        business: [],
        application: [],
        technology: [],
        implementation: []
      }
    };
  });

  describe('Type Enforcement', () => {
    it('should strictly identify BusinessActor elements only', async () => {
      await parser.loadModel(mockModel);
      const actors = parser.getBusinessActorsOnly();

      expect(actors).toHaveLength(3);
      actors.forEach(actor => {
        expect(actor.type).toContain('BusinessActor');
      });
    });

    it('should strictly identify BusinessProcess elements only', async () => {
      await parser.loadModel(mockModel);
      const processes = parser.getBusinessProcessesOnly();

      expect(processes).toHaveLength(1);
      expect(processes[0].name).toBe('Customer Order Processing');
      expect(processes[0].type).toContain('BusinessProcess');
    });

    it('should strictly identify BusinessFunction elements only', async () => {
      await parser.loadModel(mockModel);
      const functions = parser.getBusinessFunctionsOnly();

      expect(functions).toHaveLength(1);
      expect(functions[0].name).toBe('Production Planning');
      expect(functions[0].type).toContain('BusinessFunction');
    });

    it('should not mix element types', async () => {
      await parser.loadModel(mockModel);

      const actors = parser.getBusinessActorsOnly();
      const processes = parser.getBusinessProcessesOnly();
      const functions = parser.getBusinessFunctionsOnly();

      // Verify no overlap between types
      actors.forEach(actor => {
        expect(actor.type).not.toContain('Process');
        expect(actor.type).not.toContain('Function');
      });

      processes.forEach(process => {
        expect(process.type).not.toContain('Actor');
        expect(process.type).not.toContain('Function');
      });

      functions.forEach(func => {
        expect(func.type).not.toContain('Actor');
        expect(func.type).not.toContain('Process');
      });
    });
  });

  describe('Element Categorization', () => {
    it('should categorize business actors correctly', async () => {
      await parser.loadModel(mockModel);
      const categorized = parser.categorizeBusinessActors();

      expect(categorized.headquarters).toHaveLength(1);
      expect(categorized.headquarters[0].name).toBe('ArchiMetal');

      expect(categorized.distributionCenters).toHaveLength(1);
      expect(categorized.distributionCenters[0].name).toBe('DC Benelux');

      expect(categorized.departments).toHaveLength(1);
      expect(categorized.departments[0].name).toBe('Customer Relations');
    });

    it('should handle empty categories gracefully', async () => {
      // Create model with only headquarters actor
      const minimalModel = {
        ...mockModel,
        elements: new Map([
          ['actor-1', {
            id: 'actor-1',
            name: 'ArchiMetal',
            type: 'archimate:BusinessActor',
            layer: 'business' as const
          }]
        ])
      };

      await parser.loadModel(minimalModel);
      const categorized = parser.categorizeBusinessActors();

      expect(categorized.headquarters).toHaveLength(1);
      expect(categorized.distributionCenters).toHaveLength(0);
      expect(categorized.departments).toHaveLength(0);
      expect(categorized.externalPartners).toHaveLength(0);
    });
  });

  describe('Element Counting', () => {
    it('should provide accurate element counts', async () => {
      await parser.loadModel(mockModel);
      const counts = parser.getElementCounts();

      expect(counts.businessActors).toBe(3);
      expect(counts.businessProcesses).toBe(1);
      expect(counts.businessFunctions).toBe(1);
      expect(counts.applicationComponents).toBe(1);
      expect(counts.total).toBe(6);
    });

    it('should handle zero counts correctly', async () => {
      const emptyModel = {
        ...mockModel,
        elements: new Map()
      };

      await parser.loadModel(emptyModel);
      const counts = parser.getElementCounts();

      expect(counts.businessActors).toBe(0);
      expect(counts.businessProcesses).toBe(0);
      expect(counts.businessFunctions).toBe(0);
      expect(counts.applicationComponents).toBe(0);
      expect(counts.total).toBe(0);
    });
  });

  describe('Response Validation', () => {
    it('should validate correct business actor count', async () => {
      await parser.loadModel(mockModel);

      const validation = parser.validateBusinessActorResponse(
        3,
        ['ArchiMetal', 'DC Benelux', 'Customer Relations']
      );

      expect(validation.isValid).toBe(true);
      expect(validation.actualCount).toBe(3);
      expect(validation.listedCount).toBe(3);
      expect(validation.missingActors).toHaveLength(0);
      expect(validation.extraItems).toHaveLength(0);
      expect(validation.accuracy).toBe(1.0);
    });

    it('should detect count mismatch', async () => {
      await parser.loadModel(mockModel);

      const validation = parser.validateBusinessActorResponse(
        21, // Wrong count
        ['ArchiMetal', 'DC Benelux', 'Customer Relations']
      );

      expect(validation.isValid).toBe(false);
      expect(validation.actualCount).toBe(3);
      expect(validation.listedCount).toBe(3);
    });

    it('should detect missing actors', async () => {
      await parser.loadModel(mockModel);

      const validation = parser.validateBusinessActorResponse(
        2,
        ['ArchiMetal', 'DC Benelux'] // Missing Customer Relations
      );

      expect(validation.isValid).toBe(false);
      expect(validation.missingActors).toContain('Customer Relations');
      expect(validation.accuracy).toBeLessThan(1.0);
    });

    it('should detect extra items', async () => {
      await parser.loadModel(mockModel);

      const validation = parser.validateBusinessActorResponse(
        4,
        ['ArchiMetal', 'DC Benelux', 'Customer Relations', 'Non-existent Actor']
      );

      expect(validation.isValid).toBe(false);
      expect(validation.extraItems).toContain('Non-existent Actor');
    });
  });

  describe('Type Validation', () => {
    it('should validate correct ArchiMate types', async () => {
      const validTypes = [
        'archimate:BusinessActor',
        'archimate:BusinessProcess',
        'archimate:BusinessFunction',
        'archimate:ApplicationComponent',
        'archimate:Node'
      ];

      validTypes.forEach(type => {
        const element: ArchiMateElement = {
          id: 'test',
          name: 'Test Element',
          type: type,
          layer: 'business'
        };

        // Access private method for testing
        const isValid = (parser as any).isValidArchiMateType(type);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid ArchiMate types', async () => {
      const invalidTypes = [
        'InvalidType',
        'BusinessActorWrong',
        'process',
        ''
      ];

      invalidTypes.forEach(type => {
        const isValid = (parser as any).isValidArchiMateType(type);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Deduplication', () => {
    it('should remove duplicate elements by name', async () => {
      const modelWithDuplicates = {
        ...mockModel,
        elements: new Map([
          ['actor-1', {
            id: 'actor-1',
            name: 'ArchiMetal',
            type: 'archimate:BusinessActor',
            layer: 'business' as const
          }],
          ['actor-2', {
            id: 'actor-2',
            name: 'ArchiMetal', // Duplicate name
            type: 'archimate:BusinessActor',
            layer: 'business' as const
          }]
        ])
      };

      await parser.loadModel(modelWithDuplicates);
      const actors = parser.getBusinessActorsOnly();

      expect(actors).toHaveLength(1);
      expect(actors[0].name).toBe('ArchiMetal');
    });
  });
});