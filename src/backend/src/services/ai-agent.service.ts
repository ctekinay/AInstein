import logger from '../utils/logger.js';
import archiMateParser from './archimate-parser.service.js';

interface ConversationContext {
  sessionId: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  currentProject?: string;
  archiMateModels?: string[];
}

interface ProgressCallback {
  (update: { step: string; progress: number; details?: string }): void;
}

class AIAgentService {
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private modelsLoaded = false;

  async initializeContext(sessionId: string): Promise<void> {
    if (!this.conversationContexts.has(sessionId)) {
      this.conversationContexts.set(sessionId, {
        sessionId,
        messageHistory: [],
        archiMateModels: []
      });
      logger.info(`Initialized AI context for session ${sessionId}`);
    }

    // Load ArchiMetal models if not already loaded
    if (!this.modelsLoaded) {
      try {
        await archiMateParser.loadAllArchiMetalModels();
        this.modelsLoaded = true;
        logger.info('ArchiMetal models loaded for AI analysis');
      } catch (error) {
        logger.error('Failed to load ArchiMetal models:', error);
      }
    }
  }

  async processMessage(sessionId: string, userMessage: string, progressCallback?: ProgressCallback): Promise<string> {
    await this.initializeContext(sessionId);
    const context = this.conversationContexts.get(sessionId)!;

    // Send initial progress update
    if (progressCallback) {
      progressCallback({ step: 'Initializing analysis', progress: 10 });
    }

    // Add user message to history
    context.messageHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Generate intelligent response based on content
    if (progressCallback) {
      progressCallback({ step: 'Analyzing message content', progress: 25 });
    }
    const response = await this.generateResponse(userMessage, context, progressCallback);

    // Add assistant response to history
    context.messageHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    logger.info(`Generated AI response for session ${sessionId}`);
    return response;
  }

  private async generateResponse(userMessage: string, context: ConversationContext, progressCallback?: ProgressCallback): Promise<string> {
    // First, analyze the message for specific scenarios and content
    if (progressCallback) {
      progressCallback({ step: 'Detecting scenario type', progress: 35 });
    }
    const analysisResult = this.analyzeMessageContent(userMessage);

    // Handle specific ArchiMetal scenarios first (highest priority)
    if (analysisResult.isArchiMetalScenario) {
      if (progressCallback) {
        progressCallback({ step: 'Loading ArchiMetal models', progress: 50 });
      }
      return await this.handleArchiMetalScenario(userMessage, analysisResult, context, progressCallback);
    }

    // Handle specific architecture change requests
    if (analysisResult.isArchitectureChangeRequest) {
      return this.handleArchitectureChangeRequest(userMessage, analysisResult, context);
    }

    // Handle model analysis requests
    if (analysisResult.isModelAnalysisRequest) {
      return await this.handleModelAnalysisRequest(userMessage, analysisResult, context);
    }

    // Handle ADR requests
    if (analysisResult.isADRRequest) {
      return this.handleADRRequest(userMessage, analysisResult, context);
    }

    // Handle technical architecture questions
    if (analysisResult.isTechnicalQuestion) {
      return this.handleTechnicalQuestion(userMessage, analysisResult, context);
    }

    // Handle greetings and help
    if (analysisResult.isGreeting) {
      return this.handleGreeting(userMessage, context);
    }

    if (analysisResult.isHelpRequest) {
      return this.handleHelpRequest(userMessage, context);
    }

    // Default: Try to extract meaning and provide contextual response
    return this.handleContextualResponse(userMessage, analysisResult, context);
  }

  private analyzeMessageContent(message: string): {
    isArchiMetalScenario: boolean;
    isArchitectureChangeRequest: boolean;
    isModelAnalysisRequest: boolean;
    isADRRequest: boolean;
    isTechnicalQuestion: boolean;
    isGreeting: boolean;
    isHelpRequest: boolean;
    extractedEntities: {
      technologies: string[];
      systems: string[];
      processes: string[];
      changes: string[];
      locations: string[];
    };
  } {
    const lowerMessage = message.toLowerCase();

    // Extract key entities and concepts
    const technologies = this.extractTechnologies(message);
    const systems = this.extractSystems(message);
    const processes = this.extractProcesses(message);
    const changes = this.extractChanges(message);
    const locations = this.extractLocations(message);

    return {
      isArchiMetalScenario: this.detectArchiMetalScenario(lowerMessage),
      isArchitectureChangeRequest: this.detectArchitectureChange(lowerMessage),
      isModelAnalysisRequest: this.detectModelAnalysis(lowerMessage),
      isADRRequest: this.detectADRRequest(lowerMessage),
      isTechnicalQuestion: this.detectTechnicalQuestion(lowerMessage),
      isGreeting: this.detectGreeting(lowerMessage),
      isHelpRequest: this.detectHelpRequest(lowerMessage),
      extractedEntities: {
        technologies,
        systems,
        processes,
        changes,
        locations
      }
    };
  }

  private detectArchiMetalScenario(message: string): boolean {
    const archiMetalIndicators = [
      'archimetal', 'crm system', 'salesforce', 'steel', 'production', 'manufacturing',
      'distribution center', 'dc benelux', 'dc spain', 'customer relations',
      'hot strip mill', 'procurement', 'logistics', 'enterprise architecture',
      'what applications use', 'what depends on', 'impact of', 'applications call',
      'what uses the', 'dependencies', 'relationship'
    ];
    return archiMetalIndicators.some(indicator => message.includes(indicator));
  }

  private detectArchitectureChange(message: string): boolean {
    const changeIndicators = [
      'replace', 'decided to', 'change', 'modify', 'impact', 'analyse', 'analyze',
      'recommend', 'necessary modifications', 'budget constraints', 'implementation timeline'
    ];
    return changeIndicators.some(indicator => message.includes(indicator));
  }

  private extractTechnologies(message: string): string[] {
    const techKeywords = ['salesforce', 'crm', 'erp', 'system', 'database', 'api', 'cloud'];
    return techKeywords.filter(tech => message.toLowerCase().includes(tech));
  }

  private extractSystems(message: string): string[] {
    const systemKeywords = ['crm system', 'erp system', 'salesforce crm', 'centralised system'];
    return systemKeywords.filter(system => message.toLowerCase().includes(system));
  }

  private extractProcesses(message: string): string[] {
    const processKeywords = ['customer order', 'steel production', 'procurement', 'logistics', 'sales'];
    return processKeywords.filter(process => message.toLowerCase().includes(process));
  }

  private extractChanges(message: string): string[] {
    const changeKeywords = ['replace', 'implement', 'modify', 'update', 'migrate'];
    return changeKeywords.filter(change => message.toLowerCase().includes(change));
  }

  private extractLocations(message: string): string[] {
    const locationKeywords = ['benelux', 'spain', 'east europe', 'hq', 'production center'];
    return locationKeywords.filter(location => message.toLowerCase().includes(location));
  }

  private detectModelAnalysis(message: string): boolean {
    const analysisKeywords = ['analyze', 'analyse', 'review', 'assess', 'evaluate', 'examine', 'show', 'list', 'how many', 'count'];
    const modelKeywords = ['model', 'architecture', 'design', 'structure', 'summary', 'relationship', 'element', 'archimate'];
    return analysisKeywords.some(kw => message.includes(kw)) && modelKeywords.some(kw => message.includes(kw));
  }

  private detectADRRequest(message: string): boolean {
    const adrKeywords = ['adr', 'decision record', 'architecture decision', 'document decision'];
    return adrKeywords.some(kw => message.includes(kw));
  }

  private detectTechnicalQuestion(message: string): boolean {
    const techKeywords = ['how to', 'implement', 'integrate', 'design', 'pattern', 'best practice'];
    return techKeywords.some(kw => message.includes(kw));
  }

  private detectGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
    return greetings.some(greeting => message.includes(greeting));
  }

  private detectHelpRequest(message: string): boolean {
    const helpKeywords = ['help', 'what can you do', 'guide', 'explain'];
    return helpKeywords.some(kw => message.includes(kw));
  }

  private handleArchitectureChangeRequest(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `I'll analyze the architecture change request you've described. Let me break down the impacts and recommendations...

[Architecture change analysis would go here based on the specific request]`;
  }

  private async handleModelAnalysisRequest(userMessage: string, analysisResult: any, context: ConversationContext): Promise<string> {
    const message = userMessage.toLowerCase();

    // Load ArchiMetal models if not already loaded
    if (archiMateParser.getAllModels().length === 0) {
      await archiMateParser.loadAllArchiMetalModels();
    }

    // Handle model summary requests
    if (message.includes('summary') || message.includes('how many') || message.includes('count')) {
      const summary = archiMateParser.getModelSummary();
      let response = `## ArchiMetal Model Summary\n\n`;

      for (const [modelName, stats] of Object.entries(summary)) {
        const modelStats = stats as any;
        response += `**${modelName}:**\n`;
        response += `- Elements: ${modelStats.elements}\n`;
        response += `- Relationships: ${modelStats.relationships}\n`;
        response += `- Views: ${modelStats.views}\n`;
        response += `- Business Layer: ${modelStats.folders.business} elements\n`;
        response += `- Application Layer: ${modelStats.folders.application} elements\n`;
        response += `- Technology Layer: ${modelStats.folders.technology} elements\n\n`;
      }

      response += `### Total across all models:\n`;
      const totalElements = Object.values(summary).reduce((sum: number, model: any) => sum + model.elements, 0);
      const totalRelationships = Object.values(summary).reduce((sum: number, model: any) => sum + model.relationships, 0);
      response += `- **${totalElements}** total elements\n`;
      response += `- **${totalRelationships}** total relationships\n`;

      return response;
    }

    // Handle relationship-specific queries
    if (message.includes('relationship')) {
      const models = archiMateParser.getAllModels();
      let totalRelationships = 0;
      let response = `## ArchiMate Relationship Analysis\n\n`;

      for (const model of models) {
        const relationshipCount = model.relationships.size;
        totalRelationships += relationshipCount;
        response += `**${model.name}:** ${relationshipCount} relationships\n`;
      }

      response += `\n**Total relationships:** ${totalRelationships}\n\n`;

      if (totalRelationships > 0) {
        response += `### Available relationship queries:\n`;
        response += `- "Show composition relationships" - see parent-child structures\n`;
        response += `- "Show triggering relationships" - see process flows\n`;
        response += `- "Show access relationships" - see data access patterns\n`;
        response += `- "What impacts the CRM system?" - see impact analysis\n`;
      }

      return response;
    }

    // Default model analysis
    return `I'll perform a detailed model analysis for you. Please specify what you'd like to analyze:
- Model summary with counts
- Relationship analysis
- Element impact analysis
- Specific layer analysis (business, application, technology)`;
  }

  private handleADRRequest(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `I'll help you create an Architecture Decision Record...

[ADR template and guidance would go here]`;
  }

  private handleTechnicalQuestion(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `Let me provide technical guidance for your question...

[Technical guidance would go here]`;
  }

  private handleGreeting(userMessage: string, context: ConversationContext): string {
    return `Hello! I'm AInstein, your AI architecture assistant specializing in ArchiMate modeling and enterprise architecture.

🎯 **I can help you with:**
- ArchiMetal case study analysis (32 detailed views)
- Architecture impact assessments
- ArchiMate model modifications
- ADR generation and documentation

What architectural challenge can I help you with today?`;
  }

  private handleHelpRequest(userMessage: string, context: ConversationContext): string {
    return `I'm here to help with enterprise architecture challenges!

🏗️ **My Specialties:**
- **ArchiMetal Analysis**: 32-view steel manufacturing case study
- **Impact Assessment**: Architecture change analysis
- **ArchiMate Modeling**: Views, elements, relationships
- **ADR Generation**: Decision documentation

Try asking: "Analyze the impact of replacing ArchiMetal's CRM with Salesforce"`;
  }

  private handleContextualResponse(userMessage: string, analysisResult: any, context: ConversationContext): string {
    // Check if models are loaded and provide diagnostic info
    const modelSummary = archiMateParser.getModelSummary();
    const validationIssues = archiMateParser.validateModelData();

    if (validationIssues.length > 0) {
      return `⚠️ **ArchiMetal Models Status:**

**Issues Found:**
${validationIssues.map(issue => `- ${issue}`).join('\n')}

**Loaded Models:** ${Object.keys(modelSummary).join(', ') || 'None'}

I'm working to load the ArchiMetal model data to provide accurate architectural analysis. Please note that my responses will be limited until the complete model data is available.

For your question: "${userMessage.substring(0, 100)}..."

I can help once the ArchiMetal models are properly loaded. The models should include:
- Business actors and processes
- Application components and services
- Technology infrastructure
- Implementation and migration views

Would you like me to attempt to reload the models or provide general architectural guidance in the meantime?`;
    }

    // Try to provide a meaningful response based on extracted entities
    const { technologies, systems, processes } = analysisResult.extractedEntities;
    const totalElements = Object.values(modelSummary).reduce((sum: number, model: any) => sum + model.elements, 0);

    if (technologies.length > 0 || systems.length > 0) {
      return `Based on the loaded ArchiMetal models (${totalElements} elements), I can see you're asking about ${technologies.concat(systems).join(', ')}.

**Available Model Data:**
${Object.entries(modelSummary).map(([name, summary]: [string, any]) =>
  `- ${name}: ${summary.elements} elements`
).join('\n')}

Let me analyze the specific elements you mentioned against the actual model data...

[Analysis based on real ArchiMetal elements would go here]`;
    }

    return `I have access to ${totalElements} ArchiMetal elements across ${Object.keys(modelSummary).length} models.

**Available for Analysis:**
${Object.entries(modelSummary).map(([name, summary]: [string, any]) =>
  `- **${name}**: ${summary.elements} elements across ${Object.values(summary.folders).reduce((a: number, b: any) => a + (b as number), 0)} categorized folders`
).join('\n')}

For your question about: "${userMessage.substring(0, 100)}..."

Could you specify:
- Which specific ArchiMetal elements you're interested in?
- What type of architectural analysis you need?
- Any particular business processes or applications to focus on?

I can provide detailed analysis based on the actual model relationships and dependencies.`;
  }

  private isArchitectureQuestion(message: string): boolean {
    const architectureKeywords = ['architecture', 'design', 'pattern', 'component', 'layer', 'service', 'microservice', 'system'];
    return architectureKeywords.some(keyword => message.includes(keyword));
  }

  private isArchiMateQuestion(message: string): boolean {
    const archimateKeywords = ['archimate', 'model', 'element', 'relationship', 'view', 'layer', 'business', 'application', 'technology'];
    return archimateKeywords.some(keyword => message.includes(keyword));
  }

  private isADRQuestion(message: string): boolean {
    const adrKeywords = ['adr', 'decision', 'architecture decision', 'record', 'document'];
    return adrKeywords.some(keyword => message.includes(keyword));
  }

  private isEnterpriseArchitectureQuestion(message: string): boolean {
    const eaKeywords = ['enterprise', 'transformation', 'strategy', 'governance', 'capability', 'process'];
    return eaKeywords.some(keyword => message.includes(keyword));
  }

  private isArchiMetalQuestion(message: string): boolean {
    const archiMetalKeywords = ['archimetal', 'steel', 'production', 'manufacturing', 'test case'];
    return archiMetalKeywords.some(keyword => message.includes(keyword));
  }

  private isFileAnalysisRequest(message: string): boolean {
    const fileKeywords = ['upload', 'file', 'analyze', 'import', 'xml', '.archimate'];
    return fileKeywords.some(keyword => message.includes(keyword));
  }

  private handleArchitectureQuestion(userMessage: string, context: ConversationContext): string {
    const message = userMessage.toLowerCase();

    if (message.includes('microservice')) {
      return `For microservices architecture, I recommend considering:

🏗️ **Key Design Principles:**
- Single responsibility per service
- Database per service pattern
- API-first design with clear contracts
- Decentralized governance

📊 **ArchiMate Modeling:**
- Use Application Components for each microservice
- Model Application Interfaces for APIs
- Show Technology Services for infrastructure
- Document Application Collaborations for service interactions

🔍 **Would you like me to analyze your current architecture or help design a specific microservices pattern?**`;
    }

    if (message.includes('layer')) {
      return `Layered architecture is fundamental to enterprise systems:

📐 **Common Layers in ArchiMate:**
- **Business Layer**: Business processes, actors, and services
- **Application Layer**: Application components and services
- **Technology Layer**: Infrastructure and platform services

🎯 **Best Practices:**
- Minimize cross-layer dependencies
- Define clear interfaces between layers
- Use Application Services to expose business capabilities
- Document Technology Services for infrastructure abstraction

Need help modeling a specific layered architecture?`;
    }

    return `I can help you with various architectural concerns:

🏛️ **Architecture Patterns**: Microservices, Layered, Event-driven, Serverless
📋 **Design Principles**: SOLID, DRY, Separation of Concerns
🔄 **Integration Patterns**: API Gateway, Message Queues, Event Sourcing
📊 **Modeling**: ArchiMate views, component diagrams, system landscapes

What specific architectural challenge are you working on?`;
  }

  private handleArchiMateQuestion(userMessage: string, context: ConversationContext): string {
    const message = userMessage.toLowerCase();

    if (message.includes('view')) {
      return `ArchiMate views help visualize different architectural perspectives:

📊 **Standard View Types:**
- **Business Process View**: Shows business processes and their relationships
- **Application Cooperation View**: Application interactions and data flows
- **Technology Infrastructure View**: Infrastructure components and connections
- **Implementation & Migration View**: Project dependencies and timelines

🎯 **Our ArchiMetal Test Case** includes 32 views covering:
- Transformation challenges and opportunities
- Baseline and target state scenarios
- Business process cooperation models
- Detailed enterprise architecture mappings

Which view type interests you most?`;
    }

    if (message.includes('element') || message.includes('relationship')) {
      return `ArchiMate provides a rich set of elements and relationships:

🧩 **Key Element Types:**
- **Business Layer**: Business Actor, Process, Service, Object
- **Application Layer**: Application Component, Service, Interface
- **Technology Layer**: Node, Device, System Software, Network

🔗 **Relationship Types:**
- **Structural**: Composition, Aggregation, Assignment
- **Dependency**: Serving, Access, Influence
- **Dynamic**: Flow, Triggering

🔍 **I can help you:**
- Choose the right elements for your model
- Define proper relationships
- Validate model consistency
- Generate views from your models

What specific ArchiMate modeling challenge do you have?`;
    }

    return `ArchiMate is a powerful enterprise architecture modeling language:

📐 **Core Concepts:**
- Three main layers (Business, Application, Technology)
- Structured element types and relationships
- Multiple viewpoints for different stakeholders
- Model exchange format (.archimate files)

🛠️ **What I can help with:**
- Model validation and analysis
- View generation and optimization
- Element relationship mapping
- Migration planning

Upload an ArchiMate file or ask about specific modeling concepts!`;
  }

  private handleADRQuestion(userMessage: string, context: ConversationContext): string {
    return `Architecture Decision Records (ADRs) are crucial for documenting architectural choices:

📝 **ADR Template Structure:**
1. **Title**: Short noun phrase describing the decision
2. **Status**: Proposed, Accepted, Deprecated, Superseded
3. **Context**: Forces and constraints driving the decision
4. **Decision**: The architectural decision and rationale
5. **Consequences**: Positive and negative impacts

🎯 **For AInstein Project:**
- I can auto-generate ADRs from ArchiMate model changes
- Track decision dependencies and impacts
- Maintain decision history and evolution
- Link decisions to specific model elements

Would you like me to help create an ADR template or analyze decision impacts?`;
  }

  private handleEnterpriseArchitectureQuestion(userMessage: string, context: ConversationContext): string {
    const message = userMessage.toLowerCase();

    if (message.includes('transformation')) {
      return `Enterprise transformation requires careful architectural planning:

🔄 **Transformation Approach:**
- **Current State Analysis**: Document existing architecture
- **Target State Design**: Define desired future architecture
- **Gap Analysis**: Identify transformation requirements
- **Migration Planning**: Plan transition approach and dependencies

📊 **ArchiMate Support:**
- Implementation & Migration views
- Plateau models for intermediate states
- Work packages and deliverables
- Stakeholder impact analysis

🎯 **ArchiMetal Example:**
Our test case demonstrates steel company transformation challenges including production optimization, system integration, and organizational change.

What transformation scenario are you working on?`;
    }

    return `Enterprise Architecture encompasses the full organizational context:

🏢 **EA Domains:**
- **Business Architecture**: Processes, capabilities, information
- **Information Systems**: Applications and data
- **Technology Architecture**: Infrastructure and platforms
- **Security Architecture**: Cross-cutting security concerns

📈 **Value Delivery:**
- Strategic alignment and governance
- Risk reduction and compliance
- Cost optimization and efficiency
- Innovation enablement

How can I help with your enterprise architecture challenge?`;
  }

  private async handleArchiMetalScenario(userMessage: string, analysisResult: any, context: ConversationContext, progressCallback?: ProgressCallback): Promise<string> {
    // Detect specific ArchiMetal scenario type
    if (userMessage.toLowerCase().includes('crm') || userMessage.toLowerCase().includes('salesforce') ||
        userMessage.toLowerCase().includes('customer relations') || userMessage.toLowerCase().includes('customer relationship')) {
      if (progressCallback) {
        progressCallback({ step: 'Analyzing CRM elements', progress: 60 });
      }
      return await this.handleArchiMetalCRMChange(userMessage, analysisResult, context, progressCallback);
    }

    if (userMessage.toLowerCase().includes('customer order') || userMessage.toLowerCase().includes('order process')) {
      return this.handleArchiMetalOrderProcess(userMessage, analysisResult, context);
    }

    if (userMessage.toLowerCase().includes('production') || userMessage.toLowerCase().includes('steel production')) {
      return this.handleArchiMetalProduction(userMessage, analysisResult, context);
    }

    if (userMessage.toLowerCase().includes('organizational structure') || userMessage.toLowerCase().includes('organisational structure') ||
        userMessage.toLowerCase().includes('business actors') || userMessage.toLowerCase().includes('organization') ||
        userMessage.toLowerCase().includes('organisation') || userMessage.toLowerCase().includes('structure')) {
      return this.handleArchiMetalOrganizationalStructure(userMessage, analysisResult, context);
    }

    // Default ArchiMetal response
    return this.handleArchiMetalGeneral(userMessage, analysisResult, context);
  }

  private handleArchiMetalCRMChange(userMessage: string, analysisResult: any, context: ConversationContext, progressCallback?: ProgressCallback): string {
    // **RELATIONSHIP TRAVERSAL: Check for specific relationship queries**
    const message = userMessage.toLowerCase();
    if (message.includes('what applications call') || message.includes('what uses') || message.includes('what depends on') ||
        message.includes('data objects flow into') || message.includes('which data objects') || message.includes('data flow')) {
      return this.performRelationshipAnalysis(userMessage, progressCallback);
    }

    // Get actual ArchiMetal data
    if (progressCallback) {
      progressCallback({ step: 'Loading business actors', progress: 65 });
    }
    const businessActors = archiMateParser.getArchiMetalBusinessUnits();

    if (progressCallback) {
      progressCallback({ step: 'Extracting CRM elements', progress: 70 });
    }
    const crmElements = archiMateParser.getCRMRelatedElements();

    if (progressCallback) {
      progressCallback({ step: 'Analyzing order processes', progress: 75 });
    }
    const orderElements = archiMateParser.getOrderProcessElements();

    if (progressCallback) {
      progressCallback({ step: 'Gathering model summary', progress: 80 });
    }
    const allModels = archiMateParser.getAllModels();
    const modelSummary = archiMateParser.getModelSummary();

    // Validate we have actual data
    const validationIssues = archiMateParser.validateModelData();
    if (validationIssues.length > 0) {
      return `⚠️ **ArchiMetal Model Data Issues Detected:**

${validationIssues.map(issue => `- ${issue}`).join('\n')}

I cannot provide accurate architecture analysis without access to the actual ArchiMetal model data. Please ensure the ArchiMetal .archimate files are properly loaded.

**Available Models:** ${Object.keys(modelSummary).join(', ') || 'None'}
**Total Elements Loaded:** ${Object.values(modelSummary).reduce((sum: number, model: any) => sum + model.elements, 0) || 0}`;
    }

    // Build response based on actual data
    const businessActorNames = businessActors.map(actor => actor.name);
    const dcActors = businessActors.filter(actor =>
      actor.name.includes('DC ') || actor.name.includes('Distribution')
    );

    if (progressCallback) {
      progressCallback({ step: 'Generating comprehensive analysis', progress: 90 });
    }

    return `## ArchiMetal CRM System Change Analysis
**Based on Actual ArchiMetal Model Data**

**🔍 IMPACT ASSESSMENT: Salesforce CRM Replacement**

I've analyzed the actual ArchiMetal models and found the following elements that will be affected:

### **📊 LOADED ARCHIMATE MODELS:**
${Object.entries(modelSummary).map(([name, summary]: [string, any]) =>
  `- **${name}**: ${summary.elements} elements, ${summary.relationships} relationships`
).join('\n')}

### **🏢 AFFECTED BUSINESS ACTORS (from actual models):**
${businessActorNames.length > 0 ?
  businessActorNames.map(name => `- **${name}**`).join('\n') :
  'No business actors found in loaded models'
}

### **🏗️ CRM-RELATED ELEMENTS FOUND:**
${crmElements.length > 0 ?
  crmElements.map(element => `- **${element.name}** (${element.type})`).join('\n') :
  'No CRM-related elements found in current models'
}

### **📋 ORDER PROCESS ELEMENTS:**
${orderElements.length > 0 ?
  orderElements.map(element => `- **${element.name}** (${element.type})`).join('\n') :
  'No order process elements found in current models'
}

### **🎯 DISTRIBUTION CENTER IMPACT:**
${dcActors.length > 0 ?
  dcActors.map(dc => `- **${dc.name}**: Customer data synchronization will require Salesforce integration`).join('\n') :
  'No distribution center actors identified in current models'
}

### **⚠️ ANALYSIS LIMITATION:**
This analysis is based on the currently loaded ArchiMetal models. For a complete impact assessment, I need:
1. All 32 ArchiMate figures referenced in the case study
2. Complete element relationship mappings
3. Application and technology layer details

**Next Steps:**
1. Verify all ArchiMetal .archimate files are loaded
2. Cross-reference with specific figure numbers from the case study
3. Build detailed dependency mapping from actual model relationships

Would you like me to analyze specific elements or relationships from the loaded models?`;
  }

  private handleArchiMetalOrderProcess(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `## ArchiMetal Customer Order Process Analysis

Based on ArchiMetal Views 25-27 (Customer Order Processing), here's the detailed process analysis...

[Detailed order process analysis would go here]`;
  }

  private handleArchiMetalProduction(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `## ArchiMetal Steel Production Analysis

Based on ArchiMetal Views 3-5 (Production and Logistics), here's the production architecture analysis...

[Detailed production analysis would go here]`;
  }

  private handleArchiMetalOrganizationalStructure(userMessage: string, analysisResult: any, context: ConversationContext): string {
    const businessActors = archiMateParser.getBusinessActors();
    const businessProcesses = archiMateParser.getBusinessProcesses();
    const models = archiMateParser.getAllModels();

    let response = `## 🏢 **ArchiMetal Organizational Structure Analysis**\n\n`;
    response += `**Based on Actual ArchiMate Model Data**\n\n`;

    // Analyze architecture state (baseline vs target)
    const elementsByModel: {[key: string]: {actors: any[], processes: any[]}} = {};

    businessActors.forEach(actor => {
      for (const model of models) {
        if (model.elements.has(actor.id)) {
          const modelName = model.metadata?.name || 'Unknown Model';
          if (!elementsByModel[modelName]) elementsByModel[modelName] = {actors: [], processes: []};
          elementsByModel[modelName].actors.push(actor);
          break;
        }
      }
    });

    businessProcesses.forEach(process => {
      for (const model of models) {
        if (model.elements.has(process.id)) {
          const modelName = model.metadata?.name || 'Unknown Model';
          if (!elementsByModel[modelName]) elementsByModel[modelName] = {actors: [], processes: []};
          elementsByModel[modelName].processes.push(process);
          break;
        }
      }
    });

    // Show baseline vs target distinction if multiple models
    if (Object.keys(elementsByModel).length > 1) {
      response += `### 🎯 **Architecture State Analysis**\n\n`;
      response += `**Elements distributed across ${Object.keys(elementsByModel).length} models:**\n\n`;

      for (const [modelName, elements] of Object.entries(elementsByModel)) {
        const isTarget = modelName.toLowerCase().includes('target') || modelName.toLowerCase().includes('to-be') ||
                        modelName.toLowerCase().includes('future') || modelName.toLowerCase().includes('new');
        const isBaseline = modelName.toLowerCase().includes('baseline') || modelName.toLowerCase().includes('as-is') ||
                          modelName.toLowerCase().includes('current') || modelName.toLowerCase().includes('existing');

        let stateIndicator = '📊';
        if (isTarget) stateIndicator = '🎯';
        else if (isBaseline) stateIndicator = '📋';

        response += `${stateIndicator} **${modelName}** (${elements.actors.length} actors, ${elements.processes.length} processes)\n`;
      }
      response += `\n`;
    }

    if (businessActors.length > 0) {
      response += `### 👥 **Business Actors** (${businessActors.length} total)\n\n`;

      const actorsByCategory: {[key: string]: any[]} = {};
      businessActors.forEach(actor => {
        let category = 'Organizational Units';
        const name = actor.name.toLowerCase();

        if (name.includes('management') || name.includes('manager') || name.includes('director')) {
          category = 'Management';
        } else if (name.includes('sales') || name.includes('customer') || name.includes('commercial')) {
          category = 'Sales & Customer Relations';
        } else if (name.includes('production') || name.includes('manufacturing')) {
          category = 'Production';
        } else if (name.includes('logistics') || name.includes('supply') || name.includes('transportation')) {
          category = 'Logistics & Supply Chain';
        } else if (name.includes('finance') || name.includes('procurement')) {
          category = 'Finance & Procurement';
        } else if (name.includes('hr') || name.includes('human resources')) {
          category = 'Human Resources';
        } else if (name.includes('quality')) {
          category = 'Quality Management';
        } else if (name.includes('dc ') || name.includes('distribution center') || name.includes('hq') ||
                   name === 'archimetal' || name.includes('center') || name.includes('distribution')) {
          category = 'Organizational Units';
        } else if (name === 'business actor' || name.includes('generic')) {
          category = 'Generic/Template Elements';
        } else if (name.includes('partner') || name === 'customer') {
          category = 'External Stakeholders';
        }

        if (!actorsByCategory[category]) actorsByCategory[category] = [];
        actorsByCategory[category].push(actor);
      });

      for (const [category, actors] of Object.entries(actorsByCategory)) {
        response += `**${category}:**\n`;
        actors.forEach(actor => {
          response += `- **${actor.name}** (ID: ${actor.id})\n`;
        });
        response += `\n`;
      }
    } else {
      response += `❌ **No Business Actors found** in the ArchiMetal models.\n\n`;
    }

    if (businessProcesses.length > 0) {
      response += `### 🔄 **Business Processes** (${businessProcesses.length} total)\n\n`;
      businessProcesses.forEach(process => {
        response += `- **${process.name}** (ID: ${process.id})\n`;
      });
      response += `\n`;
    } else {
      response += `❌ **No Business Processes found** in the ArchiMetal models.\n\n`;
    }

    // Add organizational hierarchy analysis using relationships
    if (businessActors.length > 0) {
      response += `### 🏗️ **Organizational Hierarchy**\n\n`;

      // Analyze composition relationships to understand organizational structure
      const models = archiMateParser.getAllModels();
      const orgRelationships: any[] = [];

      for (const model of models) {
        for (const relationship of model.relationships.values()) {
          const sourceEl = model.elements.get(relationship.source);
          const targetEl = model.elements.get(relationship.target);

          if (sourceEl && targetEl &&
              (sourceEl.type.includes('BusinessActor') || targetEl.type.includes('BusinessActor')) &&
              (relationship.type.includes('Composition') || relationship.type.includes('Aggregation') ||
               relationship.type.includes('Assignment'))) {
            orgRelationships.push({
              relationship,
              source: sourceEl,
              target: targetEl,
              type: relationship.type.replace('archimate:', '')
            });
          }
        }
      }

      if (orgRelationships.length > 0) {
        response += `**Organizational Relationships Found:** ${orgRelationships.length}\n\n`;

        // Group by relationship type for better understanding
        const relsByType: {[key: string]: any[]} = {};
        orgRelationships.forEach(rel => {
          if (!relsByType[rel.type]) relsByType[rel.type] = [];
          relsByType[rel.type].push(rel);
        });

        for (const [relType, rels] of Object.entries(relsByType)) {
          response += `**${relType} Relationships:**\n`;
          rels.slice(0, 5).forEach(rel => {
            response += `- **${rel.source.name}** ${relType.toLowerCase()}s **${rel.target.name}**\n`;
          });
          if (rels.length > 5) {
            response += `- ... and ${rels.length - 5} more relationships\n`;
          }
          response += `\n`;
        }
      } else {
        response += `No explicit organizational hierarchy relationships found in the model.\n`;
        response += `This suggests a flat organizational structure or relationships may be modeled differently.\n\n`;
      }
    }

    const totalElements = businessActors.length + businessProcesses.length;
    response += `### 📊 **Summary**\n\n`;
    response += `- **Total Business Actors:** ${businessActors.length}\n`;
    response += `- **Total Business Processes:** ${businessProcesses.length}\n`;
    response += `- **Total Organizational Elements:** ${totalElements}\n\n`;

    if (totalElements === 0) {
      const models = archiMateParser.getAllModels();
      const totalModelElements = models.reduce((sum, model) => sum + model.elements.size, 0);
      response += `⚠️ **No organizational elements found**. Available: ${models.length} models with ${totalModelElements} elements\n`;
    } else {
      response += `**Analysis completed based on actual ArchiMetal model data.**\n`;
    }

    return response;
  }

  private handleArchiMetalGeneral(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `## ArchiMetal Enterprise Architecture

ArchiMetal represents a comprehensive steel manufacturing enterprise with 32 detailed ArchiMate views covering transformation scenarios...

[General ArchiMetal information]`;
  }

  private handleFileAnalysisRequest(userMessage: string, context: ConversationContext): string {
    return `I can analyze ArchiMate models and provide insights:

📁 **Supported Formats:**
- ArchiMate Model Exchange Format (.archimate)
- XML files following ArchiMate schema
- Exported views and diagrams

🔍 **Analysis Capabilities:**
- **Model Validation**: Check consistency and completeness
- **Impact Analysis**: Assess change impacts across elements
- **View Generation**: Create specific stakeholder views
- **Gap Analysis**: Compare current vs target states
- **Metrics & KPIs**: Calculate architecture quality metrics

💡 **ArchiMetal Available:**
Our test repository contains 32 pre-loaded ArchiMate views you can reference for examples.

To upload and analyze your model:
1. Use the paperclip icon to upload your .archimate file
2. I'll parse and validate the model structure
3. Ask specific questions about elements or relationships
4. Request custom views or analysis reports

Ready to upload a file or explore ArchiMetal examples?`;
  }

  private handleGeneralQuestion(userMessage: string, context: ConversationContext): string {
    // Check if it's a greeting
    if (this.isGreeting(userMessage)) {
      return `Hello! I'm AInstein, your AI architecture assistant.

🎯 **I specialize in:**
- ArchiMate modeling and analysis
- Architecture Decision Records (ADRs)
- Enterprise transformation planning
- System design and patterns

🏭 **Test Environment:**
I have access to the ArchiMetal case study with 32 ArchiMate views covering steel manufacturing transformation scenarios.

How can I help you with your architectural challenges today?`;
    }

    // Check for help requests
    if (this.isHelpRequest(userMessage)) {
      return `Here's what I can help you with:

📐 **ArchiMate Modeling:**
- Model validation and analysis
- View generation and optimization
- Element relationship mapping

🏗️ **Architecture Design:**
- Pattern recommendations
- Component design guidance
- Integration strategy

📝 **Documentation:**
- ADR generation and templates
- Architecture documentation
- Decision impact analysis

🔄 **Transformation:**
- Current/target state analysis
- Migration planning
- Gap analysis

Try asking: "Analyze ArchiMetal models" or "Help with microservices architecture"`;
    }

    // Default response for unclear questions
    return `I'd be happy to help! As your AI architecture assistant, I can assist with:

🎯 **Architecture & Design**: Patterns, components, system design
📊 **ArchiMate Modeling**: Views, elements, relationships, validation
📝 **ADR Generation**: Decision documentation and templates
🏭 **Case Studies**: ArchiMetal transformation scenarios

Could you be more specific about what architectural challenge you're working on? You can:
- Ask about specific ArchiMate concepts
- Upload a model file for analysis
- Request help with architecture patterns
- Explore the ArchiMetal test case`;
  }

  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.toLowerCase().includes(greeting));
  }

  private isHelpRequest(message: string): boolean {
    const helpKeywords = ['help', 'what can you do', 'how to', 'explain', 'guide'];
    return helpKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  clearContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
    logger.info(`Cleared AI context for session ${sessionId}`);
  }

  getContext(sessionId: string): ConversationContext | undefined {
    return this.conversationContexts.get(sessionId);
  }

  // **NEW: Relationship Traversal Analysis - 2025-09-17 07:30**
  // Performs actual graph traversal of ArchiMate relationships instead of keyword matching
  private performRelationshipAnalysis(userMessage: string, progressCallback?: ProgressCallback): string {
    const message = userMessage.toLowerCase();

    if (progressCallback) {
      progressCallback({ step: 'Finding target element in models', progress: 70 });
    }

    // Extract target element from query and determine query type
    let targetElementName = '';
    let isDataObjectQuery = false;

    if (message.includes('data objects flow into') || message.includes('which data objects')) {
      isDataObjectQuery = true;
    }

    if (message.includes('crm system')) targetElementName = 'CRM';
    else if (message.includes('crm')) targetElementName = 'CRM';
    else if (message.includes('salesforce')) targetElementName = 'Salesforce';

    // Find the actual CRM element in the ArchiMate models using precise matching
    const models = archiMateParser.getAllModels();
    let foundElement = null;

    for (const model of models) {
      for (const element of model.elements.values()) {
        if (element.name.toLowerCase().includes(targetElementName.toLowerCase()) &&
            (element.type.includes('ApplicationComponent') || element.type.includes('ApplicationService'))) {
          foundElement = element;
          break;
        }
      }
      if (foundElement) break;
    }

    if (!foundElement) {
      return `❌ **Element "${targetElementName}" Not Found**\n\nI couldn't find "${targetElementName}" as an ApplicationComponent or ApplicationService in the ArchiMetal models.\n\n**Available CRM-related elements:**\n${archiMateParser.getCRMRelatedElements().slice(0, 5).map(el => `- ${el.name} (${el.type})`).join('\n')}`;
    }

    if (progressCallback) {
      progressCallback({ step: 'Traversing relationship graph', progress: 85 });
    }

    // **CORE FIX: Use actual relationship traversal instead of keyword search**
    const relationships = archiMateParser.getElementRelationships(foundElement.id);

    if (progressCallback) {
      progressCallback({ step: 'Building dependency chain analysis', progress: 90 });
    }

    let response = `## 🔍 **Relationship Dependency Analysis: "${foundElement.name}"**\n\n`;
    response += `**Element Type:** ${foundElement.type.replace('archimate:', '')}\n`;
    response += `**Element ID:** ${foundElement.id}\n\n`;

    if (relationships.length === 0) {
      response += `❌ **No relationships found** - This indicates a parsing issue or isolated element.\n\n`;
      response += `**Total relationships in models:** ${models.reduce((sum, model) => sum + model.relationships.size, 0)}\n`;
      return response;
    }

    response += `### 📊 **Relationship Summary**\n`;
    response += `**Direct Relationships:** ${relationships.length}\n\n`;

    // Group by relationship type with business meaning
    const relationshipsByType: {[key: string]: any[]} = {};
    relationships.forEach(rel => {
      const type = rel.type.replace('archimate:', '');
      if (!relationshipsByType[type]) relationshipsByType[type] = [];
      relationshipsByType[type].push(rel);
    });

    response += `**Relationship Types Found:**\n`;
    for (const [type, rels] of Object.entries(relationshipsByType)) {
      response += `- **${type}:** ${rels.length} connections\n`;
    }

    // **Handle different query types**
    if (isDataObjectQuery) {
      response += `\n### 📊 **Data Objects Flowing Into "${foundElement.name}"**\n`;

      // Find data objects that have relationships TO this element (data flowing into)
      const dataObjectRelationships = relationships.filter(rel => {
        const sourceEl = models.find(m => m.elements.has(rel.source))?.elements.get(rel.source);
        return rel.target === foundElement.id && sourceEl && sourceEl.type.toLowerCase().includes('dataobject');
      });

      if (dataObjectRelationships.length > 0) {
        dataObjectRelationships.forEach(rel => {
          const sourceEl = models.find(m => m.elements.has(rel.source))?.elements.get(rel.source);
          if (sourceEl) {
            response += `- **${sourceEl.name}** (${sourceEl.type.replace('archimate:', '')}) → *${rel.type.replace('archimate:', '')}* → ${foundElement.name}\n`;
          }
        });
      } else {
        response += `❌ **No data objects found with direct relationships to "${foundElement.name}"**\n`;
        response += `\nSearching for data objects with similar names...\n`;

        // Also search for data objects by name pattern
        const dataObjectsByName: any[] = [];
        for (const model of models) {
          for (const element of model.elements.values()) {
            if (element.type.toLowerCase().includes('dataobject') &&
                (element.name.toLowerCase().includes(targetElementName.toLowerCase()) ||
                 element.name.toLowerCase().includes('customer'))) {
              dataObjectsByName.push(element);
            }
          }
        }

        if (dataObjectsByName.length > 0) {
          response += `\n**Related Data Objects Found:**\n`;
          dataObjectsByName.forEach(el => {
            response += `- **${el.name}** (${el.type.replace('archimate:', '')})\n`;
          });
        }
      }
    } else {
      // **Answer the specific question: "What applications USE the CRM System?"**
      response += `\n### 🎯 **Applications Using "${foundElement.name}"**\n`;
      const usageRelationships = relationships.filter(rel => rel.target === foundElement.id);

      if (usageRelationships.length > 0) {
        usageRelationships.forEach(rel => {
          const sourceEl = models.find(m => m.elements.has(rel.source))?.elements.get(rel.source);
          if (sourceEl) {
            const relationshipType = rel.type.replace('archimate:', '');
            response += `- **${sourceEl.name}** (${sourceEl.type.replace('archimate:', '')}) → *${relationshipType}* → ${foundElement.name}\n`;
          }
        });
      } else {
        response += `No applications directly use "${foundElement.name}" as a target in the relationship graph.\n`;
      }
    }

    // **Only show dependencies for non-data-object queries**
    if (!isDataObjectQuery) {
      response += `\n### 📤 **Dependencies of "${foundElement.name}"**\n`;
      const dependencies = relationships.filter(rel => rel.source === foundElement.id);

    if (dependencies.length > 0) {
      dependencies.forEach(rel => {
        const targetEl = models.find(m => m.elements.has(rel.target))?.elements.get(rel.target);
        if (targetEl) {
          const relationshipType = rel.type.replace('archimate:', '');
          response += `- ${foundElement.name} → *${relationshipType}* → **${targetEl.name}** (${targetEl.type.replace('archimate:', '')})\n`;
        }
      });
    } else {
      response += `"${foundElement.name}" has no outgoing dependencies.\n`;
    }
    } // End of !isDataObjectQuery conditional

    // **ARCHITECTURAL IMPACT ANALYSIS - Complete Structured Analysis**
    response += `\n### 💥 **Complete Impact Chain Analysis**\n`;
    const impactedElements = archiMateParser.getImpactedElements(foundElement.id, 2);

    if (impactedElements.length > 0) {
      response += `**Total Impact**: ${impactedElements.length} elements across the architectural layers\n\n`;

      // Group elements by architectural layer and type for structured analysis
      const elementsByCategory: {[key: string]: any[]} = {
        'Business Layer': [],
        'Application Layer': [],
        'Technology Layer': [],
        'Data Objects': [],
        'Other Elements': []
      };

      impactedElements.forEach(el => {
        const elementType = el.type.replace('archimate:', '');
        if (elementType.includes('Business')) {
          elementsByCategory['Business Layer'].push(el);
        } else if (elementType.includes('Application')) {
          elementsByCategory['Application Layer'].push(el);
        } else if (elementType.includes('Technology')) {
          elementsByCategory['Technology Layer'].push(el);
        } else if (elementType.includes('DataObject')) {
          elementsByCategory['Data Objects'].push(el);
        } else {
          elementsByCategory['Other Elements'].push(el);
        }
      });

      // Display complete lists for each category
      for (const [categoryName, elements] of Object.entries(elementsByCategory)) {
        if (elements.length > 0) {
          response += `#### ${categoryName} (${elements.length} elements)\n`;
          elements.forEach(el => {
            response += `- **${el.name}** (${el.type.replace('archimate:', '')})\n`;
          });
          response += `\n`;
        }
      }
    } else {
      response += `No cascading impacts detected in the relationship graph.\n`;
    }

    return response;
  }

}

export default new AIAgentService();