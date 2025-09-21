import { ArchiMateElement, ArchiMateRelationship, ArchiMateModel } from '../types/archimate.types';
import logger from '../utils/logger';

/**
 * Strict ArchiMate Parser with Precise Element Type Enforcement
 * Follows ArchiMate 3.2 specification exactly
 */
export class StrictArchiMateParser {
  private models: Map<string, ArchiMateModel> = new Map();
  private elementTypeCache: Map<string, Map<string, ArchiMateElement>> = new Map();

  /**
   * ArchiMate 3.2 Element Type Definitions
   * Strictly separated by layer and type
   */
  private readonly ELEMENT_TYPES = {
    BUSINESS: {
      ACTIVE: {
        BusinessActor: 'archimate:BusinessActor',
        BusinessRole: 'archimate:BusinessRole',
        BusinessCollaboration: 'archimate:BusinessCollaboration',
        BusinessInterface: 'archimate:BusinessInterface'
      },
      BEHAVIOR: {
        BusinessProcess: 'archimate:BusinessProcess',
        BusinessFunction: 'archimate:BusinessFunction',
        BusinessInteraction: 'archimate:BusinessInteraction',
        BusinessEvent: 'archimate:BusinessEvent',
        BusinessService: 'archimate:BusinessService'
      },
      PASSIVE: {
        BusinessObject: 'archimate:BusinessObject',
        Contract: 'archimate:Contract',
        Representation: 'archimate:Representation',
        Product: 'archimate:Product'
      }
    },
    APPLICATION: {
      ACTIVE: {
        ApplicationComponent: 'archimate:ApplicationComponent',
        ApplicationCollaboration: 'archimate:ApplicationCollaboration',
        ApplicationInterface: 'archimate:ApplicationInterface'
      },
      BEHAVIOR: {
        ApplicationFunction: 'archimate:ApplicationFunction',
        ApplicationInteraction: 'archimate:ApplicationInteraction',
        ApplicationProcess: 'archimate:ApplicationProcess',
        ApplicationEvent: 'archimate:ApplicationEvent',
        ApplicationService: 'archimate:ApplicationService'
      },
      PASSIVE: {
        DataObject: 'archimate:DataObject'
      }
    },
    TECHNOLOGY: {
      ACTIVE: {
        Node: 'archimate:Node',
        Device: 'archimate:Device',
        SystemSoftware: 'archimate:SystemSoftware',
        TechnologyCollaboration: 'archimate:TechnologyCollaboration',
        TechnologyInterface: 'archimate:TechnologyInterface',
        Path: 'archimate:Path',
        CommunicationNetwork: 'archimate:CommunicationNetwork'
      },
      BEHAVIOR: {
        TechnologyFunction: 'archimate:TechnologyFunction',
        TechnologyProcess: 'archimate:TechnologyProcess',
        TechnologyInteraction: 'archimate:TechnologyInteraction',
        TechnologyEvent: 'archimate:TechnologyEvent',
        TechnologyService: 'archimate:TechnologyService'
      },
      PASSIVE: {
        Artifact: 'archimate:Artifact'
      }
    }
  };

  /**
   * Get ONLY Business Actors - no other element types
   */
  getBusinessActorsOnly(): ArchiMateElement[] {
    const actors: ArchiMateElement[] = [];

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        // Strict type checking - must be exactly BusinessActor
        if (this.isExactType(element, 'BusinessActor')) {
          actors.push(element);
        }
      }
    }

    // Remove duplicates based on name
    const uniqueActors = new Map<string, ArchiMateElement>();
    for (const actor of actors) {
      if (!uniqueActors.has(actor.name)) {
        uniqueActors.set(actor.name, actor);
      }
    }

    return Array.from(uniqueActors.values());
  }

  /**
   * Get ONLY Business Processes - no functions or services
   */
  getBusinessProcessesOnly(): ArchiMateElement[] {
    const processes: ArchiMateElement[] = [];

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessProcess')) {
          processes.push(element);
        }
      }
    }

    return this.deduplicateByName(processes);
  }

  /**
   * Get ONLY Business Functions - distinct from processes
   */
  getBusinessFunctionsOnly(): ArchiMateElement[] {
    const functions: ArchiMateElement[] = [];

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessFunction')) {
          functions.push(element);
        }
      }
    }

    return this.deduplicateByName(functions);
  }

  /**
   * Strict type checking with namespace handling
   */
  private isExactType(element: ArchiMateElement, typeName: string): boolean {
    const elementType = element.type.toLowerCase();
    const targetType = typeName.toLowerCase();

    // Handle namespace variations
    const normalizedType = elementType
      .replace('archimate:', '')
      .replace('xsi:type=', '')
      .replace(/["']/g, '')
      .trim();

    return normalizedType === targetType;
  }

  /**
   * Categorize business actors by organizational structure
   */
  categorizeBusinessActors(): {
    headquarters: ArchiMateElement[];
    distributionCenters: ArchiMateElement[];
    departments: ArchiMateElement[];
    externalPartners: ArchiMateElement[];
    roles: ArchiMateElement[];
  } {
    const actors = this.getBusinessActorsOnly();

    const categorized = {
      headquarters: [] as ArchiMateElement[],
      distributionCenters: [] as ArchiMateElement[],
      departments: [] as ArchiMateElement[],
      externalPartners: [] as ArchiMateElement[],
      roles: [] as ArchiMateElement[]
    };

    for (const actor of actors) {
      const name = actor.name.toLowerCase();

      if (name.includes('archimetal') && !name.includes('dc')) {
        categorized.headquarters.push(actor);
      } else if (name.includes('dc ') || name.includes('distribution')) {
        categorized.distributionCenters.push(actor);
      } else if (name.includes('department') || name.includes('finance') ||
                 name.includes('hr') || name.includes('quality') ||
                 name.includes('it') || name.includes('production')) {
        categorized.departments.push(actor);
      } else if (name.includes('partner') || name.includes('supplier') ||
                 name.includes('customer') || name.includes('external')) {
        categorized.externalPartners.push(actor);
      } else {
        // Check if it's likely a role based on documentation
        if (actor.documentation &&
            (actor.documentation.includes('role') ||
             actor.documentation.includes('responsibility'))) {
          categorized.roles.push(actor);
        } else {
          // Default to headquarters if unclear
          categorized.headquarters.push(actor);
        }
      }
    }

    return categorized;
  }

  /**
   * Get accurate count of each element type
   */
  getElementCounts(): {
    businessActors: number;
    businessRoles: number;
    businessProcesses: number;
    businessFunctions: number;
    businessServices: number;
    applicationComponents: number;
    technologyNodes: number;
    total: number;
  } {
    const counts = {
      businessActors: 0,
      businessRoles: 0,
      businessProcesses: 0,
      businessFunctions: 0,
      businessServices: 0,
      applicationComponents: 0,
      technologyNodes: 0,
      total: 0
    };

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessActor')) counts.businessActors++;
        else if (this.isExactType(element, 'BusinessRole')) counts.businessRoles++;
        else if (this.isExactType(element, 'BusinessProcess')) counts.businessProcesses++;
        else if (this.isExactType(element, 'BusinessFunction')) counts.businessFunctions++;
        else if (this.isExactType(element, 'BusinessService')) counts.businessServices++;
        else if (this.isExactType(element, 'ApplicationComponent')) counts.applicationComponents++;
        else if (this.isExactType(element, 'Node')) counts.technologyNodes++;

        counts.total++;
      }
    }

    return counts;
  }

  /**
   * Validate response accuracy
   */
  validateBusinessActorResponse(claimedCount: number, listedActors: string[]): {
    isValid: boolean;
    actualCount: number;
    listedCount: number;
    missingActors: string[];
    extraItems: string[];
    accuracy: number;
  } {
    const actualActors = this.getBusinessActorsOnly();
    const actualNames = actualActors.map(a => a.name);

    const missingActors = actualNames.filter(name =>
      !listedActors.some(listed =>
        listed.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(listed.toLowerCase())
      )
    );

    const extraItems = listedActors.filter(listed =>
      !actualNames.some(name =>
        name.toLowerCase().includes(listed.toLowerCase()) ||
        listed.toLowerCase().includes(name.toLowerCase())
      )
    );

    const accuracy = (actualActors.length - missingActors.length) / actualActors.length;

    return {
      isValid: claimedCount === actualActors.length && missingActors.length === 0,
      actualCount: actualActors.length,
      listedCount: listedActors.length,
      missingActors,
      extraItems,
      accuracy
    };
  }

  /**
   * Remove duplicates based on element name
   */
  private deduplicateByName(elements: ArchiMateElement[]): ArchiMateElement[] {
    const unique = new Map<string, ArchiMateElement>();
    for (const element of elements) {
      if (!unique.has(element.name)) {
        unique.set(element.name, element);
      }
    }
    return Array.from(unique.values());
  }

  /**
   * Load and validate models with strict type checking
   */
  async loadModel(model: ArchiMateModel): Promise<void> {
    // Validate all elements have correct types
    for (const [elementId, element] of model.elements) {
      if (!this.isValidArchiMateType(element.type)) {
        logger.warn(`Invalid ArchiMate type: ${element.type} for element ${elementId}`);
      }
    }

    this.models.set(model.name, model);
    this.rebuildTypeCache();
  }

  /**
   * Check if a type string is a valid ArchiMate type
   */
  private isValidArchiMateType(type: string): boolean {
    const normalizedType = type.replace('archimate:', '').replace('xsi:type=', '');

    for (const layer of Object.values(this.ELEMENT_TYPES)) {
      for (const category of Object.values(layer)) {
        for (const [typeName, typeString] of Object.entries(category)) {
          if (String(typeString).includes(normalizedType) || normalizedType === typeName) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Rebuild element type cache for faster lookups
   */
  private rebuildTypeCache(): void {
    this.elementTypeCache.clear();

    for (const [modelName, model] of this.models) {
      const modelCache = new Map<string, ArchiMateElement>();

      for (const [elementId, element] of model.elements) {
        const typeKey = this.normalizeType(element.type);
        modelCache.set(typeKey, element);
      }

      this.elementTypeCache.set(modelName, modelCache);
    }
  }

  /**
   * Normalize type string for consistent comparison
   */
  private normalizeType(type: string): string {
    return type
      .toLowerCase()
      .replace('archimate:', '')
      .replace('xsi:type=', '')
      .replace(/["']/g, '')
      .trim();
  }

  /**
   * Clear all loaded models
   */
  clearModels(): void {
    this.models.clear();
    this.elementTypeCache.clear();
  }

  /**
   * Get models for inspection
   */
  getAllModels(): ArchiMateModel[] {
    return Array.from(this.models.values());
  }
}

export default new StrictArchiMateParser();