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
    this.archiMetalPath = path.join(process.cwd(), '..', '..', 'ArchiMetal');
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
          documentation: elementData.documentation
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
    return this.findElementsByType('BusinessActor');
  }

  getApplicationComponents(): ArchiMateElement[] {
    return this.findElementsByType('ApplicationComponent');
  }

  getBusinessProcesses(): ArchiMateElement[] {
    return this.findElementsByType('BusinessProcess');
  }

  getTechnologyServices(): ArchiMateElement[] {
    return this.findElementsByType('TechnologyService');
  }

  // Specific ArchiMetal queries
  getArchiMetalBusinessUnits(): ArchiMateElement[] {
    const businessActors = this.getBusinessActors();
    return businessActors.filter(actor =>
      ['ArchiMetal', 'Commercial', 'Customer Relations', 'DC Benelux', 'DC Spain', 'DC East Europe',
       'Distribution', 'Finance', 'HQ', 'HR', 'Logistics', 'Procurement', 'Production',
       'Production Center', 'Quality Mgmt', 'Sales'].includes(actor.name)
    );
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
}

export default new ArchiMateParserService();