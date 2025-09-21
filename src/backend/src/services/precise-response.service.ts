import archiMateParser from './archimate-parser.service';\nimport archiMateUpdater from './archimate-model-updater.service';
import logger from '../utils/logger';

/**
 * Precise Response Service
 * Ensures AI responses exactly match what was asked
 */
export class PreciseResponseService {
  constructor() {
    // Use the main archimate parser that has the loaded models
  }

  /**
   * Handle request for business actors with precision
   */
  async handleBusinessActorsQuery(query: string): Promise<string> {
    // Determine exactly what was asked
    const queryIntent = this.analyzeQueryIntent(query);

    if (queryIntent.wantsCount && queryIntent.wantsList) {
      return this.getBusinessActorsWithCount();
    } else if (queryIntent.wantsCount) {
      return this.getBusinessActorsCountOnly();
    } else if (queryIntent.wantsList) {
      return this.getBusinessActorsListOnly();
    } else {
      // Default to list with count
      return this.getBusinessActorsWithCount();
    }
  }

  /**
   * Analyze what the user is actually asking for
   */
  private analyzeQueryIntent(query: string): {
    elementType: 'actor' | 'process' | 'function' | 'service' | 'all' | 'impact' | 'execution';
    wantsList: boolean;
    wantsCount: boolean;
    wantsRelationships: boolean;
    wantsDetails: boolean;
    wantsImpactAnalysis: boolean;
    wantsExecution: boolean;
    impactTarget?: string;
    executionTarget?: string;
  } {
    const lowerQuery = query.toLowerCase();

    // Check for execution/apply keywords FIRST (highest priority)
    const isExecutionRequest = lowerQuery.includes('go ahead') || lowerQuery.includes('apply') ||
                               lowerQuery.includes('execute') || lowerQuery.includes('implement') ||
                               (lowerQuery.includes('update') && lowerQuery.includes('accordingly')) ||
                               (lowerQuery.includes('make') && lowerQuery.includes('change')) ||
                               (lowerQuery.includes('update') && lowerQuery.includes('model'));

    // Check for impact analysis keywords (only if not execution)
    const isImpactAnalysis = !isExecutionRequest && (
                             lowerQuery.includes('impact') || lowerQuery.includes('affect') ||
                             lowerQuery.includes('change') || lowerQuery.includes('add') ||
                             lowerQuery.includes('new') || lowerQuery.includes('analyse') ||
                             lowerQuery.includes('analyze') || lowerQuery.includes('implications') ||
                             lowerQuery.includes('distribution center') || lowerQuery.includes('dc france'));

    // Extract targets
    let impactTarget: string | undefined;
    let executionTarget: string | undefined;
    if (lowerQuery.includes('dc france') || (lowerQuery.includes('distribution center') && lowerQuery.includes('france'))) {
      if (isExecutionRequest) {
        executionTarget = 'DC France';
      } else {
        impactTarget = 'DC France';
      }
    }

    return {
      elementType: isExecutionRequest ? 'execution' : (isImpactAnalysis ? 'impact' : this.detectElementType(lowerQuery)),
      wantsList: lowerQuery.includes('list') || lowerQuery.includes('all') ||
                 lowerQuery.includes('show') || lowerQuery.includes('what are'),
      wantsCount: lowerQuery.includes('how many') || lowerQuery.includes('count') ||
                  lowerQuery.includes('number of'),
      wantsRelationships: lowerQuery.includes('relationship') || lowerQuery.includes('structure') ||
                          lowerQuery.includes('hierarchy') || lowerQuery.includes('reports to'),
      wantsDetails: lowerQuery.includes('detail') || lowerQuery.includes('describe') ||
                    lowerQuery.includes('explain') || lowerQuery.includes('comprehensive'),
      wantsImpactAnalysis: isImpactAnalysis,
      wantsExecution: isExecutionRequest,
      impactTarget,
      executionTarget
    };
  }

  /**
   * Detect which ArchiMate element type is being asked about
   */
  private detectElementType(query: string): 'actor' | 'process' | 'function' | 'service' | 'all' {
    if (query.includes('actor') || query.includes('organization') ||
        query.includes('unit') || query.includes('department')) {
      return 'actor';
    } else if (query.includes('process')) {
      return 'process';
    } else if (query.includes('function')) {
      return 'function';
    } else if (query.includes('service')) {
      return 'service';
    }
    return 'all';
  }

  /**
   * Get business actors with accurate count using proper categorization
   */
  private getBusinessActorsWithCount(): string {
    const businessActorAnalysis = archiMateParser.getBusinessActorAnalysis();

    let response = `I found **${businessActorAnalysis.total} business actors** in the ArchiMetal models:\n\n`;

    // Show proper categorization instead of heuristic grouping
    response += `**Internal Organizational Actors (${businessActorAnalysis.internalActors.length}):**\n`;
    businessActorAnalysis.internalActors.forEach(actor => {
      response += `- ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
    });
    response += '\n';

    response += `**External Business Partners (${businessActorAnalysis.externalActors.length}):**\n`;
    businessActorAnalysis.externalActors.forEach(actor => {
      response += `- ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
    });
    response += '\n';

    response += `**Internal Departments/Functions (${businessActorAnalysis.departments.length}):**\n`;
    businessActorAnalysis.departments.forEach(actor => {
      response += `- ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
    });
    response += '\n';

    response += `**Total: ${businessActorAnalysis.total} business actors**\n\n`;

    // Add transparency note about data source
    response += `*Note: Organization structure based on actual ArchiMate CompositionRelationship elements in the parsed models.*`;

    return response;
  }

  /**
   * Get only the count of business actors
   */
  private getBusinessActorsCountOnly(): string {
    const businessActorAnalysis = archiMateParser.getBusinessActorAnalysis();
    return `There are **${businessActorAnalysis.total} business actors** in the ArchiMetal models (${businessActorAnalysis.internalActors.length} internal actors, ${businessActorAnalysis.externalActors.length} external partners, ${businessActorAnalysis.departments.length} departments).`;
  }

  /**
   * Get only the list of business actors with proper categorization
   */
  private getBusinessActorsListOnly(): string {
    const businessActorAnalysis = archiMateParser.getBusinessActorAnalysis();

    let response = 'Business actors in ArchiMetal:\n\n';

    response += `**Internal Actors (${businessActorAnalysis.internalActors.length}):**\n`;
    businessActorAnalysis.internalActors.forEach(actor => {
      response += `- ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
    });

    response += `\n**External Actors (${businessActorAnalysis.externalActors.length}):**\n`;
    businessActorAnalysis.externalActors.forEach(actor => {
      response += `- ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
    });

    response += `\n**Departments/Functions (${businessActorAnalysis.departments.length}):**\n`;
    businessActorAnalysis.departments.forEach(actor => {
      response += `- ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
    });

    return response;
  }

  /**
   * Categorize business actors based on actual ArchiMate relationships
   * Uses CompositionRelationship and AssignmentRelationship from parsed models
   */
  private categorizeBusinessActors(actors: any[]): {
    hierarchicalGroups: { parent: string | null; children: any[] }[];
    uncategorized: any[];
  } {
    // Get actual relationship data from the parser
    const organizationalStructure = archiMateParser.getOrganizationalStructure();

    const categorized = {
      hierarchicalGroups: [] as { parent: string | null; children: any[] }[],
      uncategorized: [] as any[]
    };

    // Build groups based on actual parsed relationships
    const actorIdMap = new Map(actors.map(actor => [actor.id, actor]));

    // Group actors by their hierarchical relationships
    const groupMap = new Map<string | null, any[]>();

    for (const actor of actors) {
      // Find this actor's parent through CompositionRelationship
      const parentRelation = organizationalStructure.compositionRelationships.find(
        rel => rel.target === actor.id
      );

      const parentId = parentRelation?.source || null;
      const parentName = parentId ? actorIdMap.get(parentId)?.name || parentId : null;

      if (!groupMap.has(parentName)) {
        groupMap.set(parentName, []);
      }
      groupMap.get(parentName)!.push(actor);
    }

    // Convert to final structure
    for (const [parent, children] of groupMap) {
      if (children.length > 0) {
        categorized.hierarchicalGroups.push({ parent, children });
      }
    }

    // If no relationships found, mark all as uncategorized
    if (categorized.hierarchicalGroups.length === 0) {
      categorized.uncategorized = actors;
    }

    return categorized;
  }

  /**
   * Validate response before sending
   */
  validateResponse(response: string, queryType: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for count accuracy
    const countMatch = response.match(/\*\*(\d+) business actors\*\*/);
    if (countMatch) {
      const claimedCount = parseInt(countMatch[1]);
      const actualCount = archiMateParser.getBusinessActors().length;

      if (claimedCount !== actualCount) {
        issues.push(`Count mismatch: claimed ${claimedCount}, actual ${actualCount}`);
        suggestions.push(`Update count to ${actualCount}`);
      }
    }

    // Check for mixing element types
    if (queryType === 'actor' && response.includes('process')) {
      issues.push('Response includes processes when only actors were requested');
      suggestions.push('Remove process information from response');
    }

    // Check for response length appropriateness
    const lines = response.split('\n').length;
    if (queryType === 'count' && lines > 3) {
      issues.push('Response too verbose for a count query');
      suggestions.push('Simplify to just the count');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Generate focused response based on specific query
   */
  async generatePreciseResponse(query: string, context?: any): Promise<string> {
    const intent = this.analyzeQueryIntent(query);
    let response = '';

    switch (intent.elementType) {
      case 'actor':
        if (intent.wantsCount && !intent.wantsList) {
          response = this.getBusinessActorsCountOnly();
        } else if (intent.wantsList && !intent.wantsRelationships) {
          response = this.getBusinessActorsListOnly();
        } else if (intent.wantsRelationships) {
          response = this.getBusinessActorsWithRelationships();
        } else {
          response = this.getBusinessActorsWithCount();
        }
        break;

      case 'process':
        response = this.getBusinessProcesses(intent);
        break;

      case 'function':
        response = this.getBusinessFunctions(intent);
        break;

      case 'impact':
        response = this.analyzeImpact(query, intent);
        break;

      case 'execution':
        response = this.executeModelChanges(query, intent, context);
        break;

      default:
        response = this.getComprehensiveOverview(intent);
    }

    // Validate before returning
    const validation = this.validateResponse(response, intent.elementType);
    if (!validation.isValid) {
      logger.warn('Response validation failed:', validation.issues);
      // Auto-correct if possible
      response = this.attemptAutoCorrection(response, validation);
    }

    return response;
  }

  /**
   * Get business actors with their actual ArchiMate relationships
   */
  private getBusinessActorsWithRelationships(): string {
    const actors = archiMateParser.getBusinessActors();
    const organizationalStructure = archiMateParser.getOrganizationalStructure();

    let response = `**Business Actor Organizational Structure (${actors.length} actors):**\n\n`;

    if (organizationalStructure.compositionRelationships.length > 0) {
      response += `**Composition Relationships (${organizationalStructure.compositionRelationships.length}):**\n`;
      response += 'Showing actual parent-child relationships from ArchiMate model:\n\n';

      // Build hierarchy visualization from actual relationships
      const actorMap = new Map(actors.map(actor => [actor.id, actor]));

      for (const rel of organizationalStructure.compositionRelationships) {
        const parent = actorMap.get(rel.source);
        const child = actorMap.get(rel.target);

        if (parent && child) {
          response += `└── ${parent.name}\n`;
          response += `    ├── ${child.name}\n`;
        }
      }
      response += '\n';
    }

    if (organizationalStructure.assignmentRelationships.length > 0) {
      response += `**Assignment Relationships (${organizationalStructure.assignmentRelationships.length}):**\n`;
      response += 'Showing actual role assignments from ArchiMate model:\n\n';

      const actorMap = new Map(actors.map(actor => [actor.id, actor]));

      for (const rel of organizationalStructure.assignmentRelationships) {
        const assignee = actorMap.get(rel.source);
        const assigned = actorMap.get(rel.target);

        if (assignee && assigned) {
          response += `• ${assignee.name} → ${assigned.name}\n`;
        }
      }
      response += '\n';
    }

    if (organizationalStructure.compositionRelationships.length === 0 &&
        organizationalStructure.assignmentRelationships.length === 0) {
      response += `**No organizational relationships found in the ArchiMate models.**\n`;
      response += `The business actors exist as individual elements without defined hierarchical or assignment relationships.\n\n`;

      response += `**All Business Actors (alphabetical):**\n`;
      actors.sort((a, b) => a.name.localeCompare(b.name)).forEach(actor => {
        response += `• ${actor.name} <span class="element-id" data-element-id="${actor.id}" data-model="${actor.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${actor.id}</span>\n`;
      });
    }

    response += `\n*Based on actual parsed ArchiMate relationships, not naming assumptions.*`;

    return response;
  }

  /**
   * Get business processes with appropriate detail
   */
  private getBusinessProcesses(intent: any): string {
    const processes = archiMateParser.getBusinessProcesses();

    if (intent.wantsCount && !intent.wantsList) {
      return `There are **${processes.length} business processes** in the ArchiMetal models.`;
    }

    let response = `**Business Processes (${processes.length} total):**\n\n`;
    processes.forEach(process => {
      response += `- ${process.name}\n`;
    });

    return response;
  }

  /**
   * Get business functions with appropriate detail
   */
  private getBusinessFunctions(intent: any): string {
    const functions = archiMateParser.getBusinessFunctions();

    if (intent.wantsCount && !intent.wantsList) {
      return `There are **${functions.length} business functions** in the ArchiMetal models.`;
    }

    let response = `**Business Functions (${functions.length} total):**\n\n`;
    functions.forEach(func => {
      response += `- ${func.name}\n`;
    });

    return response;
  }

  /**
   * Get comprehensive overview when requested
   */
  private getComprehensiveOverview(intent: any): string {
    const counts = archiMateParser.getElementCounts();
    const organizationalStructure = archiMateParser.getOrganizationalStructure();

    let response = '**ArchiMetal Model Element Summary:**\n\n';
    response += `- Business Actors: ${counts.businessActors}\n`;
    response += `- Business Processes: ${counts.businessProcesses}\n`;
    response += `- Business Functions: ${counts.businessFunctions}\n`;
    response += `- Application Components: ${counts.applicationComponents}\n`;
    response += `\n**Total Elements: ${counts.total}**\n\n`;

    // Add relationship information
    response += '**Model Relationship Data:**\n';
    response += `- Composition Relationships: ${organizationalStructure.compositionRelationships.length}\n`;
    response += `- Assignment Relationships: ${organizationalStructure.assignmentRelationships.length}\n\n`;

    // Data transparency indicator
    if (organizationalStructure.compositionRelationships.length > 0 ||
        organizationalStructure.assignmentRelationships.length > 0) {
      response += '✅ **Data Quality**: Organizational structure based on actual ArchiMate relationships\n';
    } else {
      response += '⚠️ **Data Quality**: No organizational relationships found - elements exist as individuals\n';
    }

    response += '\n*All counts and structures derived from parsed ArchiMate XML models.*';

    return response;
  }

  /**
   * Analyze impact of architectural changes with detailed ArchiMate analysis
   */
  private analyzeImpact(query: string, intent: any): string {
    const lowerQuery = query.toLowerCase();

    // Extract key entities from query
    const isDistributionCenter = lowerQuery.includes('distribution center') || lowerQuery.includes('dc ');
    const isFranceRelated = lowerQuery.includes('france') || lowerQuery.includes('french');
    const isNewAddition = lowerQuery.includes('add') || lowerQuery.includes('new');

    let response = '';

    if (isDistributionCenter && isFranceRelated && isNewAddition) {
      response = this.analyzeDCFranceImpact();
    } else if (lowerQuery.includes('new') && lowerQuery.includes('center')) {
      response = this.analyzeNewCenterImpact(query);
    } else {
      // Generic architectural change impact analysis
      response = this.analyzeGenericArchitecturalImpact(query);
    }

    return response;
  }

  /**
   * Specific analysis for adding DC France based on existing ArchiMetal distribution centers
   */
  private analyzeDCFranceImpact(): string {
    // Get actual data from ArchiMetal models
    const actors = archiMateParser.getBusinessActors();
    const applications = archiMateParser.getApplicationComponents();
    const processes = archiMateParser.getBusinessProcesses();

    // Find existing distribution centers
    const distributionCenters = actors.filter(actor =>
      actor.name.toLowerCase().includes('dc ') ||
      actor.name.toLowerCase().includes('distribution center')
    );

    // Find EAI Bus and integration components
    const eaiBus = applications.find(app =>
      app.name.toLowerCase().includes('eai') ||
      app.name.toLowerCase().includes('integration')
    );

    // Find CRM-related applications
    const crmApps = applications.filter(app =>
      app.name.toLowerCase().includes('crm') ||
      app.name.toLowerCase().includes('customer') ||
      app.name.toLowerCase().includes('salesforce')
    );

    // Find order-related processes
    const orderProcesses = processes.filter(proc =>
      proc.name.toLowerCase().includes('order')
    );

    let response = `# Impact Analysis: Adding DC France to ArchiMetal Architecture\n\n`;

    // Business Context Section
    response += `## Business Context\n\n`;
    response += `DC France supports ArchiMetal's automotive market entry strategy. French automotive manufacturers require local presence for flat steel products. This aligns with the transformation program's goal of 'improving CRM capability and developing new customer services.'\n\n`;

    // Critical Architectural Decision
    response += `## Critical Architectural Decision\n\n`;
    response += `**Are we adding DC France to:**\n\n`;
    response += `• **Baseline Architecture** (Figure 12): Perpetuates existing data silos and customer fragmentation\n`;
    response += `• **Target Architecture** (Figure 19): Leverages centralized CRM via EAI Bus integration\n\n`;
    response += `**✅ Recommendation**: Implement DC France using Target Architecture patterns to avoid technical debt and support the transformation program.\n\n`;

    // Current State Analysis
    response += `## Current State Analysis\n\n`;
    response += `### Distribution Infrastructure (Figure 12)\n\n`;
    if (distributionCenters.length > 0) {
      response += `Found **${distributionCenters.length} existing distribution centers** in ArchiMetal's current baseline architecture:\n\n`;
      distributionCenters.forEach(dc => {
        response += `- ${dc.name} <span class="element-id" data-element-id="${dc.id}" data-model="${dc.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${dc.id}</span>\n`;
      });
      response += `\n**⚠️ Customer Data Fragmentation Risk**\n\n`;
      response += `Adding DC France exacerbates ArchiMetal's core business challenge where 'customer databases and applications of different DCs do not work together'.\n\n`;
    } else {
      response += `No existing distribution centers found in current model.\n\n`;
    }

    // EAI Bus Integration
    response += `## Target State Design\n\n`;
    response += `### EAI Bus Integration Requirements (Figure 12 → Figure 19)\n\n`;
    if (eaiBus) {
      response += `Based on Figure 12's Application Landscape, DC France must integrate with ArchiMetal's Enterprise Application Integration (EAI) Bus <span class="element-id" data-element-id="${eaiBus.id}" data-model="${eaiBus.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${eaiBus.id}</span>.\n\n`;
      response += `**DC France → EAI Bus Integration Pattern:**\n\n`;
      response += `- Order Management Application → EAI Bus → PC System\n`;
      response += `- Customer Data Management → EAI Bus → Central CRM (Target State)\n`;
      response += `- Financial Application → EAI Bus → HQ Finance\n`;
      response += `- Shipping Application → EAI Bus → Logistics Coordination\n\n`;
      response += `**⚠️ Data Transformation Logic**\n\n`;
      response += `Each DC-to-EAI Bus connection requires unique transformation logic (current pain point that DC France must address).\n\n`;
    } else {
      response += `EAI Bus component not found in current model - integration architecture needs definition.\n\n`;
    }

    // CRM Integration
    response += `### CRM Integration for Customer Data Unification\n\n`;
    if (crmApps.length > 0) {
      response += `**${crmApps.length} CRM applications** identified for DC France integration:\n\n`;
      crmApps.forEach(app => {
        response += `- ${app.name} <span class="element-id" data-element-id="${app.id}" data-model="${app.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${app.id}</span>\n`;
      });
      response += `\n**Target State Benefits**\n\n`;
      response += `DC France will leverage centralized CRM via EAI Bus, solving the customer data fragmentation problem.\n\n`;
    } else {
      response += `**Missing CRM Components**: No CRM applications found - critical for Target Architecture implementation.\n\n`;
    }

    // Order Process Impact
    response += `### Order Management Process Impact\n\n`;
    if (orderProcesses.length > 0) {
      response += `**${orderProcesses.length} order-related processes** require DC France integration:\n\n`;
      orderProcesses.forEach(proc => {
        response += `- ${proc.name} <span class="element-id" data-element-id="${proc.id}" data-model="${proc.model || 'ArchiMetal'}" title="Click to view element details and open in Archi">${proc.id}</span>\n`;
      });
      response += `\n**ArchiMetal-Specific Requirements:**\n\n`;
      response += `- French automotive customer workflows\n`;
      response += `- Flat steel product specifications and pricing\n`;
      response += `- Local French delivery and logistics coordination\n`;
      response += `- Integration with existing DC order routing logic\n\n`;
    } else {
      response += `Order processes not found in current model - process architecture needs definition.\n\n`;
    }

    // Required Changes Section
    response += `## Required Changes\n\n`;
    response += `### New ArchiMate Elements Required (Target Architecture)\n\n`;
    response += `**Business Layer:**\n\n`;
    response += `- **Business Actor**: DC France *(to be created)*\n`;
    response += `- **Business Location**: France Regional Service Area *(to be created)*\n\n`;
    response += `**Application Layer:**\n\n`;
    response += `- French Order Management (EAI Bus connected) *(to be created)*\n`;
    response += `- French Customer Data Management (CRM integrated) *(to be created)*\n`;
    response += `- French Financial Application (HQ integrated) *(to be created)*\n\n`;
    response += `**Data Layer:**\n\n`;
    response += `- French Customer Database (unified via CRM) *(to be created)*\n`;
    response += `- French Automotive Product Catalog *(to be created)*\n`;
    response += `- EUR Pricing and Contract Data *(to be created)*\n\n`;
    response += `**Technology Layer:**\n\n`;
    response += `- French Data Center Infrastructure *(to be created)*\n\n`;

    // Implementation Strategy
    response += `## Implementation Strategy\n\n`;
    response += `### Phased Approach (Baseline → Target)\n\n`;
    response += `**Phase 1**: Establish DC France with minimal EAI Bus connectivity\n`;
    response += `**Phase 2**: Integrate with centralized CRM system (Figure 19 pattern)\n`;
    response += `**Phase 3**: Full Target Architecture implementation with data unification\n\n`;

    // ArchiMate Model Updates
    response += `### Required ArchiMate Model Updates\n\n`;
    response += `- Update Application Landscape view (Figure 12) with DC France applications\n`;
    response += `- Extend EAI Bus relationship model for DC France connectivity\n`;
    response += `- Add DC France to Target CRM Architecture (Figure 19)\n`;
    response += `- Generate ADR documenting architectural decision rationale\n\n`;

    // Critical Success Factors
    response += `### Critical Success Factors\n\n`;
    response += `**Customer Data Strategy**\n`;
    response += `Implement Target Architecture to prevent further fragmentation\n\n`;
    response += `**EAI Bus Scalability**\n`;
    response += `Ensure integration pattern supports additional DCs\n\n`;
    response += `**Automotive Market Focus**\n`;
    response += `Design processes specifically for French automotive customers\n\n`;
    response += `**Transformation Alignment**\n`;
    response += `Support overall CRM capability improvement program\n`;

    return response;
  }

  /**
   * Generic analysis for new centers or facilities
   */
  private analyzeNewCenterImpact(query: string): string {
    const actors = archiMateParser.getBusinessActors();
    const applications = archiMateParser.getApplicationComponents();

    let response = `### **Architectural Impact Analysis**\n\n`;
    response += `**Current ArchiMetal Architecture Overview:**\n`;
    response += `- **${actors.length} Business Actors** in organizational structure\n`;
    response += `- **${applications.length} Application Components** in technology stack\n\n`;

    response += `**Adding New Facility Impact:**\n`;
    response += `• **Organizational Structure**: New business actor and location elements\n`;
    response += `• **Application Layer**: System replication or extension requirements\n`;
    response += `• **Process Layer**: Geographic process variations\n`;
    response += `• **Data Layer**: Regional data management considerations\n`;
    response += `• **Technology Layer**: Infrastructure duplication needs\n\n`;

    response += `**Recommended Analysis Steps:**\n`;
    response += `1. **Current State Mapping**: Document existing similar facilities\n`;
    response += `2. **Gap Analysis**: Identify location-specific requirements\n`;
    response += `3. **Integration Planning**: Design system connectivity\n`;
    response += `4. **Compliance Review**: Address local regulations\n`;
    response += `5. **Implementation Roadmap**: Phase rollout planning\n`;

    return response;
  }

  /**
   * Execute actual model changes based on previous analysis
   */
  private executeModelChanges(query: string, intent: any, context?: any): string {
    const lowerQuery = query.toLowerCase();

    // Check if this is for DC France (most common execution request)
    if (intent.executionTarget === 'DC France' || lowerQuery.includes('dc france') ||
        (lowerQuery.includes('suggested') && lowerQuery.includes('change'))) {
      return this.executeDCFranceModelChanges();
    }

    // If no specific target, provide execution confirmation
    return this.executeGenericModelChanges(query);
  }

  /**
   * Provide honest guidance for DC France model changes
   */
  private executeDCFranceModelChanges(): string {
    let response = `# Implementation Guide: DC France ArchiMate Model Updates\n\n`;

    response += `## ⚠️ Important Note\n\n`;
    response += `I cannot directly modify ArchiMate files or execute actual model changes. However, I can provide detailed guidance for implementing these changes in your modeling environment.\n\n`;

    response += `## Required ArchiMate Model Changes\n\n`;
    response += `Based on the previous analysis, here are the specific changes you need to implement:\n\n`;

    response += `### 1. Business Layer Elements to Create\n\n`;
    response += `**Business Actor**: DC France\n`;
    response += `- **Type**: \`archimate:BusinessActor\`\n`;
    response += `- **Name**: \`DC France\`\n`;
    response += `- **Documentation**: Distribution center serving French automotive market\n\n`;

    response += `**Business Location**: France Regional Service Area\n`;
    response += `- **Type**: \`archimate:Location\`\n`;
    response += `- **Name**: \`France Regional Service Area\`\n`;
    response += `- **Documentation**: Geographic service area for French customers\n\n`;

    response += `### 2. Application Layer Elements to Create\n\n`;
    response += `**Application Component**: French Order Management\n`;
    response += `- **Type**: \`archimate:ApplicationComponent\`\n`;
    response += `- **Name**: \`French Order Management\`\n`;
    response += `- **Documentation**: Order processing system for DC France\n\n`;

    response += `**Application Component**: French Customer Data Management\n`;
    response += `- **Type**: \`archimate:ApplicationComponent\`\n`;
    response += `- **Name**: \`French Customer Data Management\`\n`;
    response += `- **Documentation**: Customer data system integrated with central CRM\n\n`;

    response += `### 3. Required Relationships\n\n`;
    response += `**DC France → EAI Bus**\n`;
    response += `- **Type**: \`archimate:ServingRelationship\`\n`;
    response += `- **Source**: DC France\n`;
    response += `- **Target**: EAI Bus \`id-b67b02752ebc4b929c9a9fc76211cff9\`\n\n`;

    response += `**French Order Management → EAI Bus**\n`;
    response += `- **Type**: \`archimate:FlowRelationship\`\n`;
    response += `- **Source**: French Order Management\n`;
    response += `- **Target**: EAI Bus\n\n`;

    response += `## Implementation Steps\n\n`;
    response += `### Using Archi (ArchiMate Modeling Tool)\n\n`;
    response += `1. **Open your ArchiMate model** in Archi or your preferred modeling tool\n`;
    response += `2. **Navigate to the Business Layer** view\n`;
    response += `3. **Create DC France business actor** using the specifications above\n`;
    response += `4. **Add to Application Layer** - create the French applications\n`;
    response += `5. **Establish relationships** with existing EAI Bus and CRM systems\n`;
    response += `6. **Update views**: Add DC France to Figure 12 and Figure 19 equivalent views\n\n`;

    response += `### Files to Modify\n\n`;
    response += `You will need to update these model files (or equivalent in your environment):\n\n`;
    response += `- Application Landscape view (equivalent to Figure 12)\n`;
    response += `- Target CRM Architecture view (equivalent to Figure 19)\n`;
    response += `- Business actor organization charts\n`;
    response += `- EAI Bus integration diagrams\n\n`;

    response += `## Documentation to Generate\n\n`;
    response += `### Architecture Decision Record (ADR)\n\n`;
    response += `Create an ADR with these sections:\n\n`;
    response += `**Title**: Adding DC France to ArchiMetal Target Architecture\n\n`;
    response += `**Context**: French automotive market expansion requirements\n\n`;
    response += `**Decision**: Implement DC France using Target Architecture pattern (Figure 19)\n\n`;
    response += `**Rationale**:\n`;
    response += `- Prevents customer data fragmentation\n`;
    response += `- Aligns with CRM transformation program\n`;
    response += `- Leverages EAI Bus for integration\n\n`;

    response += `**Consequences**:\n`;
    response += `- Requires EAI Bus capacity planning\n`;
    response += `- Need for French-specific data transformation logic\n`;
    response += `- Implementation phases required\n\n`;

    response += `## Next Actions Required\n\n`;
    response += `1. **Model Updates**: Implement the above changes in your ArchiMate tool\n`;
    response += `2. **Review**: Validate with architecture board before proceeding\n`;
    response += `3. **Capacity Planning**: Assess EAI Bus capacity for additional DC\n`;
    response += `4. **Implementation Planning**: Schedule phased rollout\n`;
    response += `5. **ADR Creation**: Document the architectural decision\n\n`;

    response += `## Integration with Your Workflow\n\n`;
    response += `This analysis provides the foundation for actual implementation. The specific technical steps will depend on your:\n\n`;
    response += `- ArchiMate modeling tool (Archi, BiZZdesign, etc.)\n`;
    response += `- Version control system for models\n`;
    response += `- ADR documentation process\n`;
    response += `- Architecture governance workflow\n`;

    return response;
  }

  /**
   * Execute generic model changes
   */
  private executeGenericModelChanges(query: string): string {
    let response = `# Implementation Guidance Required\n\n`;
    response += `## System Limitations\n\n`;
    response += `I cannot directly modify ArchiMate files, execute model changes, or create actual documentation. However, I can provide detailed implementation guidance.\n\n`;
    response += `## Available Assistance\n\n`;
    response += `I can help you with:\n\n`;
    response += `1. **Detailed element specifications** for your modeling tool\n`;
    response += `2. **Relationship mapping** between new and existing elements\n`;
    response += `3. **Implementation step-by-step guides**\n`;
    response += `4. **ADR template creation** with decision rationale\n`;
    response += `5. **Validation checklists** for model integrity\n\n`;

    response += `## To Get Specific Guidance\n\n`;
    response += `Please specify:\n\n`;
    response += `- **What elements** you want to add/modify\n`;
    response += `- **Which relationships** need to be established\n`;
    response += `- **What views/models** need updating\n`;
    response += `- **Your modeling tool** (Archi, BiZZdesign, etc.)\n\n`;

    response += `## Example Request\n\n`;
    response += `"Provide implementation guide for adding DC France with EAI Bus integration to the ArchiMetal model using Archi tool"\n\n`;

    response += `This approach ensures you get actionable guidance while maintaining transparency about system capabilities.\n`;

    return response;
  }

  /**
   * Generic architectural change impact analysis - DEPRECATED, should not be used
   */
  private analyzeGenericArchitecturalImpact(query: string): string {
    // This should rarely be called now with improved intent detection
    // Provide a more helpful response instead of generic framework
    const counts = archiMateParser.getElementCounts();

    let response = `# Architectural Analysis\n\n`;
    response += `I can help you analyze specific architectural changes in the ArchiMetal models.\n\n`;
    response += `**Current Model Contains:**\n`;
    response += `- ${counts.businessActors} Business Actors\n`;
    response += `- ${counts.businessProcesses} Business Processes\n`;
    response += `- ${counts.businessFunctions} Business Functions\n`;
    response += `- ${counts.applicationComponents} Application Components\n\n`;

    response += `**To get a detailed analysis, please specify:**\n\n`;
    response += `- What element or system you want to analyze (e.g., "analyze impact of replacing CRM")\n`;
    response += `- What type of change you're considering (e.g., "add new distribution center")\n`;
    response += `- What dependencies you need to understand (e.g., "what depends on EAI Bus")\n\n`;

    response += `**Example requests:**\n`;
    response += `- "Analyze impact of adding DC France"\n`;
    response += `- "What systems depend on the CRM?"\n`;
    response += `- "Show me all order management processes"\n`;

    return response;
  }

  /**
   * Attempt to auto-correct response based on validation issues
   */
  private attemptAutoCorrection(response: string, validation: any): string {
    let corrected = response;

    for (const suggestion of validation.suggestions) {
      if (suggestion.includes('Update count')) {
        const actualCount = archiMateParser.getBusinessActors().length;
        corrected = corrected.replace(/\*\*\d+ business actors\*\*/, `**${actualCount} business actors**`);
      }
    }

    return corrected;
  }
}

export default new PreciseResponseService();