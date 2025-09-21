import fs from 'fs-extra';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import logger from '../utils/logger.js';

export interface ArchiMateElement {
  id: string;
  name: string;
  type: string;
  documentation?: string;
  layer: 'business' | 'application' | 'technology' | 'strategy' | 'implementation';
  model?: string;
}

export interface ArchiMateRelationship {
  id: string;
  name?: string;
  type: string;
  source: string;
  target: string;
}

export interface ArchiMateView {
  id: string;
  name: string;
  viewpoint?: string;
  elements: string[]; // Element IDs
  connections: string[]; // Relationship IDs
}

export interface ArchiMateModel {
  id: string;
  name: string;
  version: string;
  path?: string;
  elements: Map<string, ArchiMateElement>;
  relationships: Map<string, ArchiMateRelationship>;
  views: Map<string, ArchiMateView>;
  folders: {
    strategy: ArchiMateElement[];
    business: ArchiMateElement[];
    application: ArchiMateElement[];
    technology: ArchiMateElement[];
    implementation: ArchiMateElement[];
  };
}

class ArchiMateParserService {
  private parser: XMLParser;
  private models: Map<string, ArchiMateModel> = new Map();
  private archiMetalPath: string;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
    });

    // Navigate to project root from backend directory
    this.archiMetalPath = path.join(process.cwd(), '..', '..', 'knowledge_base', 'ArchiMetal_models');
  }

  async loadAllArchiMetalModels(): Promise<void> {
    try {
      logger.info('Loading ArchiMetal models...');

      // Get all .archimate files in ArchiMetal directory
      const modelFiles = await this.findArchiMateFiles(this.archiMetalPath);

      for (const filePath of modelFiles) {
        try {
          const model = await this.parseArchiMateFile(filePath);
          this.models.set(model.name, model);
          logger.info(`Loaded model: ${model.name} with ${model.elements.size} elements`);
        } catch (error) {
          logger.error(`Failed to parse model ${filePath}:`, error);
        }
      }

      logger.info(`Successfully loaded ${this.models.size} ArchiMetal models`);
    } catch (error) {
      logger.error('Failed to load ArchiMetal models:', error);
      throw error;
    }
  }

  private async findArchiMateFiles(directory: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findArchiMateFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.archimate')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn(`Could not read directory ${directory}:`, error);
    }

    return files;
  }

  private async parseArchiMateFile(filePath: string): Promise<ArchiMateModel> {
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const parsed = this.parser.parse(xmlContent);

    const archiMateRoot = parsed['archimate:model'];
    if (!archiMateRoot) {
      throw new Error('Invalid ArchiMate file: missing archimate:model root element');
    }

    const model: ArchiMateModel = {
      id: archiMateRoot['@_id'] || path.basename(filePath, '.archimate'),
      name: archiMateRoot['@_name'] || path.basename(filePath, '.archimate'),
      version: archiMateRoot['@_version'] || '3.2',
      path: filePath,
      elements: new Map(),
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

    // Parse folders and elements
    if (archiMateRoot.folder && Array.isArray(archiMateRoot.folder)) {
      for (const folder of archiMateRoot.folder) {
        await this.parseFolder(folder, model);
      }
    } else if (archiMateRoot.folder) {
      await this.parseFolder(archiMateRoot.folder, model);
    }

    return model;
  }

  private async parseFolder(folder: any, model: ArchiMateModel): Promise<void> {
    const folderType = folder['@_type'] as string;
    const layer = this.mapFolderTypeToLayer(folderType);

    // Handle relationships folder
    if (folderType === 'relations') {
      await this.parseRelationships(folder, model);
      return;
    }

    // Parse elements in this folder
    if (folder.element) {
      const elements = Array.isArray(folder.element) ? folder.element : [folder.element];

      for (const elementData of elements) {
        const element: ArchiMateElement = {
          id: elementData['@_id'],
          name: elementData['@_name'] || 'Unnamed Element',
          type: elementData['@_xsi:type'] || elementData.type,
          layer,
          documentation: elementData.documentation,
          model: model.name
        };

        model.elements.set(element.id, element);

        if (layer && model.folders[layer]) {
          model.folders[layer].push(element);
        }
      }
    }

    // Parse sub-folders recursively
    if (folder.folder) {
      const subFolders = Array.isArray(folder.folder) ? folder.folder : [folder.folder];
      for (const subFolder of subFolders) {
        await this.parseFolder(subFolder, model);
      }
    }
  }

  private async parseRelationships(folder: any, model: ArchiMateModel): Promise<void> {
    if (folder.element) {
      const relationshipElements = Array.isArray(folder.element) ? folder.element : [folder.element];

      for (const relationshipData of relationshipElements) {
        const relationship: ArchiMateRelationship = {
          id: relationshipData['@_id'],
          name: relationshipData['@_name'],
          type: relationshipData['@_xsi:type'] || relationshipData.type,
          source: relationshipData['@_source'],
          target: relationshipData['@_target']
        };

        model.relationships.set(relationship.id, relationship);
      }
    }

    // Parse sub-folders recursively if any
    if (folder.folder) {
      const subFolders = Array.isArray(folder.folder) ? folder.folder : [folder.folder];
      for (const subFolder of subFolders) {
        await this.parseRelationships(subFolder, model);
      }
    }
  }

  private mapFolderTypeToLayer(folderType: string): 'business' | 'application' | 'technology' | 'strategy' | 'implementation' {
    switch (folderType?.toLowerCase()) {
      case 'strategy': return 'strategy';
      case 'business': return 'business';
      case 'application': return 'application';
      case 'technology': return 'technology';
      case 'implementation':
      case 'implementationmigration': return 'implementation';
      default: return 'business'; // Default fallback
    }
  }

  // Query methods for AI agent
  getAllModels(): ArchiMateModel[] {
    return Array.from(this.models.values());
  }

  getModelByName(name: string): ArchiMateModel | undefined {
    return this.models.get(name);
  }

  findElementsByName(searchTerm: string): ArchiMateElement[] {
    const results: ArchiMateElement[] = [];
    const lowerSearch = searchTerm.toLowerCase();

    for (const model of this.models.values()) {
      for (const element of model.elements.values()) {
        if (element.name.toLowerCase().includes(lowerSearch)) {
          results.push(element);
        }
      }
    }

    return results;
  }

  findElementsByType(elementType: string): ArchiMateElement[] {
    const results: ArchiMateElement[] = [];
    const lowerType = elementType.toLowerCase();

    for (const model of this.models.values()) {
      for (const element of model.elements.values()) {
        if (element.type.toLowerCase().includes(lowerType)) {
          results.push(element);
        }
      }
    }

    return results;
  }

  getBusinessActors(): ArchiMateElement[] {
    // Return all business actors but properly categorized
    const actors: ArchiMateElement[] = [];
    const seenNames = new Set<string>();

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessActor') &&
            !seenNames.has(element.name) &&
            element.name !== 'Business Actor') { // Exclude generic template element
          actors.push(element);
          seenNames.add(element.name);
        }
      }
    }

    return actors.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get business actors categorized as internal organizational entities
   * Logic: Actors that have CompositionRelationship children OR are at the root level
   */
  getInternalBusinessActors(): ArchiMateElement[] {
    const allActors = this.getBusinessActors();
    const orgStructure = this.getOrganizationalStructure();
    const internalActors: ArchiMateElement[] = [];

    // Find actors that compose other actors (have children in composition relationships)
    const parentActorIds = new Set(orgStructure.compositionRelationships.map(rel => rel.source));

    // Find root-level actors (not composed by anyone else)
    const childActorIds = new Set(orgStructure.compositionRelationships.map(rel => rel.target));
    const rootActorIds = new Set(
      allActors
        .filter(actor => !childActorIds.has(actor.id))
        .map(actor => actor.id)
    );

    // Internal actors are either parents OR roots (organizational entities)
    const internalActorIds = new Set([...parentActorIds, ...rootActorIds]);

    // Filter out those that are clearly departments (have a parent in composition)
    for (const actor of allActors) {
      if (internalActorIds.has(actor.id)) {
        // Check if this actor is composed by someone else
        const hasParent = orgStructure.compositionRelationships.some(rel => rel.target === actor.id);

        // If it has a parent, it's likely a department, not an organizational entity
        if (!hasParent || parentActorIds.has(actor.id)) {
          internalActors.push(actor);
        }
      }
    }

    return internalActors;
  }

  /**
   * Get business actors categorized as external entities
   * Logic: Actors that have NO composition relationships (not part of internal structure)
   */
  getExternalBusinessActors(): ArchiMateElement[] {
    const allActors = this.getBusinessActors();
    const orgStructure = this.getOrganizationalStructure();

    // Get all actors involved in composition relationships (internal structure)
    const internalActorIds = new Set([
      ...orgStructure.compositionRelationships.map(rel => rel.source),
      ...orgStructure.compositionRelationships.map(rel => rel.target)
    ]);

    // External actors are those NOT involved in any composition relationships
    return allActors.filter(actor => !internalActorIds.has(actor.id));
  }

  /**
   * Get internal departments/functions (modeled as business actors)
   * Logic: Actors that are composed BY other actors (have parents in composition)
   */
  getInternalDepartments(): ArchiMateElement[] {
    const allActors = this.getBusinessActors();
    const orgStructure = this.getOrganizationalStructure();

    // Find actors that are targets of composition (have parents)
    const departmentIds = new Set(orgStructure.compositionRelationships.map(rel => rel.target));

    // Also find actors that don't compose others (leaf nodes in hierarchy)
    const parentIds = new Set(orgStructure.compositionRelationships.map(rel => rel.source));

    return allActors.filter(actor =>
      departmentIds.has(actor.id) && !parentIds.has(actor.id)
    );
  }

  /**
   * Get comprehensive business actor analysis with proper categorization
   * Ensures no duplicates by using mutually exclusive logic
   */
  getBusinessActorAnalysis(): {
    internalActors: ArchiMateElement[];
    externalActors: ArchiMateElement[];
    departments: ArchiMateElement[];
    total: number;
    organizationalHierarchy: any;
  } {
    const allActors = this.getBusinessActors();
    const orgStructure = this.getOrganizationalStructure();

    // Get all actors involved in composition relationships (internal structure)
    const internalActorIds = new Set([
      ...orgStructure.compositionRelationships.map(rel => rel.source),
      ...orgStructure.compositionRelationships.map(rel => rel.target)
    ]);

    // Categorize with mutually exclusive logic
    const internalActors: ArchiMateElement[] = [];
    const externalActors: ArchiMateElement[] = [];
    const departments: ArchiMateElement[] = [];

    for (const actor of allActors) {
      if (!internalActorIds.has(actor.id)) {
        // External actors: NOT involved in any composition relationships
        externalActors.push(actor);
      } else {
        // Internal actors: involved in composition relationships
        const isParent = orgStructure.compositionRelationships.some(rel => rel.source === actor.id);
        const isChild = orgStructure.compositionRelationships.some(rel => rel.target === actor.id);

        if (isParent && !isChild) {
          // Top-level organizational entities (compose others, not composed by anyone)
          internalActors.push(actor);
        } else if (isChild && !isParent) {
          // Leaf departments (composed by others, don't compose anyone)
          departments.push(actor);
        } else if (isParent && isChild) {
          // Mid-level organizational entities (both compose and are composed)
          internalActors.push(actor);
        } else {
          // Fallback: shouldn't happen with proper model, but treat as internal
          internalActors.push(actor);
        }
      }
    }

    return {
      internalActors,
      externalActors,
      departments,
      total: internalActors.length + externalActors.length + departments.length,
      organizationalHierarchy: orgStructure
    };
  }

  getApplicationComponents(): ArchiMateElement[] {
    return this.findElementsByType('ApplicationComponent');
  }

  getBusinessProcesses(): ArchiMateElement[] {
    // Strict type checking - only return actual BusinessProcess elements
    const processes: ArchiMateElement[] = [];
    const seenNames = new Set<string>();

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessProcess') && !seenNames.has(element.name)) {
          processes.push(element);
          seenNames.add(element.name);
        }
      }
    }

    return processes.sort((a, b) => a.name.localeCompare(b.name));
  }

  getTechnologyServices(): ArchiMateElement[] {
    return this.findElementsByType('TechnologyService');
  }

  // Specific ArchiMetal queries
  getArchiMetalBusinessUnits(): ArchiMateElement[] {
    // Return actual parsed business actors, not hardcoded list
    return this.getBusinessActors();
  }

  getCRMRelatedElements(): ArchiMateElement[] {
    return this.findElementsByName('CRM').concat(
      this.findElementsByName('Customer'),
      this.findElementsByName('Salesforce')
    );
  }

  getOrderProcessElements(): ArchiMateElement[] {
    return this.findElementsByName('Order').concat(
      this.findElementsByName('Customer Order'),
      this.findElementsByName('Registration'),
      this.findElementsByName('Contract')
    );
  }

  // Relationship-based queries
  getElementRelationships(elementId: string): ArchiMateRelationship[] {
    const relationships: ArchiMateRelationship[] = [];

    for (const model of this.models.values()) {
      for (const relationship of model.relationships.values()) {
        if (relationship.source === elementId || relationship.target === elementId) {
          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  getRelatedElements(elementId: string): ArchiMateElement[] {
    const relatedElements: ArchiMateElement[] = [];
    const relationships = this.getElementRelationships(elementId);

    for (const relationship of relationships) {
      const relatedId = relationship.source === elementId ? relationship.target : relationship.source;

      for (const model of this.models.values()) {
        const element = model.elements.get(relatedId);
        if (element && !relatedElements.find(el => el.id === element.id)) {
          relatedElements.push(element);
        }
      }
    }

    return relatedElements;
  }

  getElementsByRelationshipType(relationshipType: string): { source: ArchiMateElement, target: ArchiMateElement, relationship: ArchiMateRelationship }[] {
    const results: { source: ArchiMateElement, target: ArchiMateElement, relationship: ArchiMateRelationship }[] = [];

    for (const model of this.models.values()) {
      for (const relationship of model.relationships.values()) {
        if (relationship.type.toLowerCase().includes(relationshipType.toLowerCase())) {
          const sourceElement = model.elements.get(relationship.source);
          const targetElement = model.elements.get(relationship.target);

          if (sourceElement && targetElement) {
            results.push({ source: sourceElement, target: targetElement, relationship });
          }
        }
      }
    }

    return results;
  }

  // Impact analysis through relationship traversal
  getImpactedElements(elementId: string, maxDepth: number = 3): ArchiMateElement[] {
    const visited = new Set<string>();
    const impacted: ArchiMateElement[] = [];

    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) return;

      visited.add(currentId);
      const relationships = this.getElementRelationships(currentId);

      for (const relationship of relationships) {
        const targetId = relationship.source === currentId ? relationship.target : relationship.source;

        for (const model of this.models.values()) {
          const targetElement = model.elements.get(targetId);
          if (targetElement && !impacted.find(el => el.id === targetElement.id)) {
            impacted.push(targetElement);
            traverse(targetId, depth + 1);
          }
        }
      }
    };

    traverse(elementId, 0);
    return impacted;
  }

  // Debugging and validation methods
  getModelSummary(): any {
    const summary: any = {};

    for (const [name, model] of this.models) {
      summary[name] = {
        elements: model.elements.size,
        relationships: model.relationships.size,
        views: model.views.size,
        folders: {
          strategy: model.folders.strategy.length,
          business: model.folders.business.length,
          application: model.folders.application.length,
          technology: model.folders.technology.length,
          implementation: model.folders.implementation.length,
        }
      };
    }

    return summary;
  }

  validateModelData(): string[] {
    const issues: string[] = [];

    if (this.models.size === 0) {
      issues.push('No ArchiMetal models loaded');
    }

    for (const [name, model] of this.models) {
      if (model.elements.size === 0) {
        issues.push(`Model ${name} has no elements`);
      }

      if (model.folders.business.length === 0 && model.folders.application.length === 0) {
        issues.push(`Model ${name} has no business or application elements`);
      }
    }

    return issues;
  }

  /**
   * Strict type checking with namespace handling
   */
  private isExactType(element: ArchiMateElement, typeName: string): boolean {
    const elementType = element.type.toLowerCase();
    const targetType = typeName.toLowerCase();

    // Handle various namespace formats
    const normalizedType = elementType
      .replace('archimate:', '')
      .replace('xsi:type=', '')
      .replace(/["']/g, '')
      .trim();

    return normalizedType === targetType;
  }

  /**
   * Get element counts for validation
   */
  getElementCounts(): {
    businessActors: number;
    businessProcesses: number;
    businessFunctions: number;
    applicationComponents: number;
    total: number;
  } {
    const counts = {
      businessActors: 0,
      businessProcesses: 0,
      businessFunctions: 0,
      applicationComponents: 0,
      total: 0
    };

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessActor')) counts.businessActors++;
        else if (this.isExactType(element, 'BusinessProcess')) counts.businessProcesses++;
        else if (this.isExactType(element, 'BusinessFunction')) counts.businessFunctions++;
        else if (this.isExactType(element, 'ApplicationComponent')) counts.applicationComponents++;
        counts.total++;
      }
    }

    return counts;
  }

  /**
   * Get business functions (distinct from processes)
   */
  getBusinessFunctions(): ArchiMateElement[] {
    const functions: ArchiMateElement[] = [];
    const seenNames = new Set<string>();

    for (const [modelName, model] of this.models) {
      for (const [elementId, element] of model.elements) {
        if (this.isExactType(element, 'BusinessFunction') && !seenNames.has(element.name)) {
          functions.push(element);
          seenNames.add(element.name);
        }
      }
    }

    return functions.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get organizational structure based on actual ArchiMate relationships
   * Parses CompositionRelationship and AssignmentRelationship elements
   */
  getOrganizationalStructure(): {
    compositionRelationships: { source: string; target: string; type: string }[];
    assignmentRelationships: { source: string; target: string; type: string }[];
  } {
    const compositionRelationships: { source: string; target: string; type: string }[] = [];
    const assignmentRelationships: { source: string; target: string; type: string }[] = [];

    for (const [modelName, model] of this.models) {
      for (const [relationshipId, relationship] of model.relationships) {

        // Check if both source and target are BusinessActors
        const sourceElement = model.elements.get(relationship.source);
        const targetElement = model.elements.get(relationship.target);

        if (sourceElement && targetElement &&
            this.isExactType(sourceElement, 'BusinessActor') &&
            this.isExactType(targetElement, 'BusinessActor')) {

          if (this.isRelationshipType(relationship, 'CompositionRelationship')) {
            compositionRelationships.push({
              source: relationship.source,
              target: relationship.target,
              type: relationship.type
            });
          } else if (this.isRelationshipType(relationship, 'AssignmentRelationship')) {
            assignmentRelationships.push({
              source: relationship.source,
              target: relationship.target,
              type: relationship.type
            });
          }
        }
      }
    }

    return {
      compositionRelationships,
      assignmentRelationships
    };
  }

  /**
   * Check if relationship is of specific type (handles namespaces)
   */
  private isRelationshipType(relationship: ArchiMateRelationship, typeName: string): boolean {
    const relationshipType = relationship.type.toLowerCase();
    const targetType = typeName.toLowerCase();

    const normalizedType = relationshipType
      .replace('archimate:', '')
      .replace('xsi:type=', '')
      .replace(/["']/g, '')
      .trim();

    return normalizedType === targetType;
  }
}

export default new ArchiMateParserService();