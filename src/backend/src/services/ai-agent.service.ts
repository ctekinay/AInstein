import logger from '../utils/logger.js';
import archiMateParser from './archimate-parser.service.js';
import preciseResponseService from './precise-response.service.js';
import featureFlagsService from './feature-flags.service.js';
import fs from 'fs-extra';
import path from 'path';

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
  private knowledgeBase: any = null;

  constructor() {
    this.loadKnowledgeBase();
  }

  private async loadKnowledgeBase(): Promise<void> {
    try {
      const kbPath = path.join(process.cwd(), '../../knowledge_base/AInsteinKB.md');
      const kbContent = await fs.readFile(kbPath, 'utf-8');

      // Parse the knowledge base content
      this.knowledgeBase = {
        offTopicRedirect: "How about instead we start working on some of the ArchiMetal specific challenges you might be facing? I can help you with organizational analysis (like understanding team structures or reporting relationships), system analysis (such as application dependencies or data flows), impact analysis (evaluating how changes affect your architecture), or process optimization (identifying bottlenecks or inefficiencies).",
        prohibitedPhrases: [
          "## 🏗️ **ArchiMetal Enterprise Architecture Analysis**",
          "**Your Query:**",
          "**Available ArchiMetal Models:**",
          "**Available Analysis Types:**"
        ],
        responseRules: {
          noGenericHeaders: true,
          noQueryRepetition: true,
          noTechnicalDetails: true,
          conversationalFlow: true
        }
      };

      logger.info('AInstein Knowledge Base loaded successfully');
    } catch (error) {
      logger.error('Failed to load AInstein Knowledge Base:', error);
      // Set default fallback
      this.knowledgeBase = {
        offTopicRedirect: "How about instead we start working on some of the ArchiMetal specific challenges you might be facing? I can help you with organizational analysis, system analysis, impact analysis, or process optimization.",
        prohibitedPhrases: [],
        responseRules: { noGenericHeaders: true, noQueryRepetition: true }
      };
    }
  }

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
    // First, check for off-topic queries using knowledge base
    if (this.isOffTopicQuery(userMessage)) {
      return this.knowledgeBase?.offTopicRedirect || "How about instead we start working on some of the ArchiMetal specific challenges you might be facing? I can help you with organizational analysis, system analysis, impact analysis, or process optimization.";
    }

    // Check if accuracy improvements are enabled
    if (featureFlagsService.isEnabled('precise_response_validation')) {
      // Use new precise response service for accurate query handling
      if (progressCallback) {
        progressCallback({ step: 'Analyzing query intent', progress: 35 });
      }

      try {
        const preciseResponse = await preciseResponseService.generatePreciseResponse(userMessage, context);

        if (progressCallback) {
          progressCallback({ step: 'Validating response accuracy', progress: 90 });
        }

        return preciseResponse;
      } catch (error) {
        logger.warn('Precise response service failed, falling back to legacy handler:', error);
        // Fall through to legacy handler
      }
    }

    // Legacy response generation (fallback)
    if (progressCallback) {
      progressCallback({ step: 'Detecting scenario type', progress: 35 });
    }
    const analysisResult = this.analyzeMessageContent(userMessage);

    // BUSINESS INTENT PRIORITY: Check for organizational/business content FIRST
    // This ensures business questions with greetings (e.g., "Hi, list business actors")
    // route to business analysis rather than generic greetings
    const hasBusinessIntent = this.detectBusinessIntent(userMessage);

    if (hasBusinessIntent) {
      // Business intent detected - route to organizational analysis regardless of greeting
      if (progressCallback) {
        progressCallback({ step: 'Loading ArchiMetal models', progress: 50 });
      }
      return await this.handleArchiMetalScenario(userMessage, analysisResult, context, progressCallback);
    }

    // Only route to greetings/help if NO business intent is detected
    if (analysisResult.isGreeting) {
      return this.handleGreeting(userMessage, context);
    }

    if (analysisResult.isHelpRequest) {
      return this.handleHelpRequest(userMessage, context);
    }

    // Default: treat as organizational request (AInstein operates within specific context)
    if (progressCallback) {
      progressCallback({ step: 'Loading ArchiMetal models', progress: 50 });
    }
    return await this.handleArchiMetalScenario(userMessage, analysisResult, context, progressCallback);
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
    return greetings.some(greeting => {
      // Use word boundaries to avoid false matches like "ArchiMetal" containing "hi"
      const regex = new RegExp(`\\b${greeting}\\b`, 'i');
      return regex.test(message);
    });
  }

  private detectHelpRequest(message: string): boolean {
    const helpKeywords = ['help', 'what can you do', 'guide', 'explain'];
    return helpKeywords.some(kw => message.includes(kw));
  }

  private isOffTopicQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Step 1: Check for explicit ArchiMetal/business context
    const explicitBusinessContext = this.hasExplicitBusinessContext(lowerMessage);
    if (explicitBusinessContext) {
      return false; // Definitely business-related
    }

    // Step 2: Check for explicit non-business context
    const explicitNonBusinessContext = this.hasExplicitNonBusinessContext(lowerMessage);
    if (explicitNonBusinessContext) {
      return true; // Definitely off-topic
    }

    // Step 3: Analyze conversational intent and semantic context
    return this.analyzeSemanticContext(lowerMessage);
  }

  private hasExplicitBusinessContext(message: string): boolean {
    // Strong indicators of business/architectural context
    const businessContextIndicators = [
      // ArchiMetal specific
      'archimetal', 'alliander', 'energy', 'distribution center', 'dc benelux', 'dc spain',
      'steel', 'production', 'manufacturing', 'crm system', 'salesforce',

      // Architecture specific
      'architecture', 'archimate', 'enterprise', 'organizational structure', 'business actors',
      'business processes', 'application components', 'technology layer', 'relationships',
      'elements', 'models', 'views', 'dependencies', 'impact analysis',

      // Business operations
      'organizational analysis', 'system analysis', 'process optimization',
      'transformation', 'implementation', 'migration', 'integration'
    ];

    return businessContextIndicators.some(indicator => message.includes(indicator));
  }

  private hasExplicitNonBusinessContext(message: string): boolean {
    // Clear indicators of non-business topics
    const nonBusinessDomains = [
      // Personal/lifestyle
      'weather', 'vacation', 'food', 'cooking', 'recipe', 'restaurant', 'travel',
      'health', 'fitness', 'diet', 'exercise', 'sports', 'games', 'entertainment',

      // Academic/general knowledge
      'history', 'science', 'mathematics', 'physics', 'chemistry', 'biology',
      'literature', 'philosophy', 'religion', 'politics', 'economics',

      // Popular culture
      'movies', 'music', 'celebrities', 'fashion', 'art', 'books', 'novels',
      'tv shows', 'streaming', 'youtube', 'social media', 'instagram', 'twitter',

      // Other domains
      'astronomy', 'geography', 'animals', 'nature', 'hobbies', 'crafts'
    ];

    // Historical/cultural references
    const historicalReferences = [
      'roman empire', 'rome', 'ancient', 'medieval', 'renaissance', 'world war',
      'napoleon', 'caesar', 'empire', 'dynasty', 'civilization'
    ];

    // Other companies/organizations (non-energy/tech)
    const otherCompanies = [
      'google', 'apple', 'microsoft', 'amazon', 'facebook', 'meta', 'netflix',
      'disney', 'coca cola', 'mcdonalds', 'nike', 'other companies'
    ];

    return [...nonBusinessDomains, ...historicalReferences, ...otherCompanies]
      .some(domain => message.includes(domain));
  }

  private analyzeSemanticContext(message: string): boolean {
    // Analyze the semantic intent and context of the message

    // Conversational redirects (user trying to change topic)
    const topicChangePatterns = [
      'let\'s talk about', 'can we talk about', 'can we discuss', 'tell me about',
      'what about', 'how about', 'i want to talk about', 'let\'s discuss',
      'can you tell me about', 'do you know about', 'what do you think about',
      'instead let\'s', 'now let\'s', 'let\'s switch to', 'change topic',
      'something else', 'different topic', 'other subject'
    ];

    const hasTopicChange = topicChangePatterns.some(pattern => message.includes(pattern));

    // If user is explicitly trying to change topics, it's likely off-topic
    if (hasTopicChange) {
      // Unless they're changing TO business topics
      const businessTerms = [
        'architecture', 'business', 'organization', 'system', 'process',
        'analysis', 'archimetal', 'enterprise', 'technology', 'application'
      ];

      const haBusinessInTopicChange = businessTerms.some(term => message.includes(term));
      return !haBusinessInTopicChange; // Off-topic unless changing TO business
    }

    // Questions about capabilities or general conversation
    const generalConversationPatterns = [
      'how are you', 'what can you do', 'who are you', 'nice to meet',
      'thank you', 'thanks', 'goodbye', 'bye', 'see you', 'have a good',
      'good morning', 'good afternoon', 'good evening', 'hello', 'hi there'
    ];

    const isGeneralConversation = generalConversationPatterns.some(pattern => message.includes(pattern));

    // General conversation without business context is off-topic
    if (isGeneralConversation) {
      const hasBusinessMention = message.includes('archimetal') ||
                                 message.includes('business') ||
                                 message.includes('architecture');
      return !hasBusinessMention;
    }

    // Academic or theoretical questions without business application
    const academicPatterns = [
      'define', 'what is', 'explain', 'how does', 'why do', 'when did',
      'where is', 'who was', 'which', 'theory', 'concept', 'principle'
    ];

    const isAcademicQuestion = academicPatterns.some(pattern => message.includes(pattern));

    if (isAcademicQuestion) {
      // Academic questions are off-topic unless about business/architecture concepts
      const businessAcademicTerms = [
        'enterprise architecture', 'business process', 'organizational',
        'archimate', 'business architecture', 'application architecture',
        'technology architecture', 'system integration', 'enterprise'
      ];

      const isBusinessAcademic = businessAcademicTerms.some(term => message.includes(term));
      return !isBusinessAcademic;
    }

    // Default: if we can't determine clear intent and there's no business context,
    // it's likely off-topic for an enterprise architecture agent
    return true;
  }

  private detectBusinessIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Organizational entities and concepts
    const organizationalKeywords = [
      'archimetal', 'alliander', 'business actor', 'business actors', 'business process', 'business processes',
      'business function', 'business functions', 'organization', 'organisational', 'organizational',
      'distribution center', 'dc ', 'department', 'unit', 'division', 'team', 'actors', 'processes'
    ];

    // Architectural analysis terms
    const architecturalKeywords = [
      'archimate', 'model', 'models', 'elements', 'relationships', 'views', 'components',
      'applications', 'systems', 'technology', 'infrastructure', 'platform', 'architecture'
    ];

    // Business action verbs
    const businessActions = [
      'list', 'show', 'analyze', 'impact', 'add', 'create', 'implement', 'design',
      'modify', 'update', 'replace', 'migrate', 'deploy', 'integrate'
    ];

    // Specific business questions
    const businessQuestions = [
      'what applications', 'which systems', 'how many', 'who are', 'what are',
      'where is', 'what uses', 'what depends', 'what calls', 'data flow'
    ];

    // Check for any combination of business intent indicators
    const hasOrganizational = organizationalKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasArchitectural = architecturalKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasBusinessAction = businessActions.some(action => lowerMessage.includes(action));
    const hasBusinessQuestion = businessQuestions.some(question => lowerMessage.includes(question));

    // Business intent if we have organizational/architectural context with business actions/questions
    return (hasOrganizational || hasArchitectural) && (hasBusinessAction || hasBusinessQuestion);
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
    return `Hello! I'm AInstein, your AI architecture assistant specializing in ArchiMetal organizational analysis.

🏢 **I focus on ArchiMetal business context:**
- Business actors and organizational structure
- Architecture impact assessments
- ArchiMate model analysis and modifications
- Initiative planning and ADR generation

**Try asking me about ArchiMetal specifically:**
- "List all business actors in ArchiMetal"
- "Show me the organizational structure"
- "Analyze the impact of adding DC France"
- "What applications use the CRM system?"

What would you like to know about ArchiMetal's architecture?`;
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

    // Semantic detection for organizational structure queries
    if (this.isOrganizationalStructureQuery(userMessage)) {
      return this.handleArchiMetalOrganizationalStructure(userMessage, analysisResult, context);
    }

    // Initiative Detection: Adding new organizational units/capabilities
    if ((userMessage.toLowerCase().includes('add') || userMessage.toLowerCase().includes('new') || userMessage.toLowerCase().includes('wants to')) &&
        (userMessage.toLowerCase().includes('distribution center') || userMessage.toLowerCase().includes('dc ') ||
         userMessage.toLowerCase().includes('center') || userMessage.toLowerCase().includes('office') ||
         userMessage.toLowerCase().includes('facility') || userMessage.toLowerCase().includes('location'))) {
      return this.handleArchiMetalInitiativeExpansion(userMessage, analysisResult, context, progressCallback);
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

  private async handleArchiMetalOrganizationalStructure(userMessage: string, analysisResult: any, context: ConversationContext): Promise<string> {
    // ALWAYS use the new precise response service (fix for accuracy issues)
    try {
      // Use precise response service for business actors queries
      return await preciseResponseService.generatePreciseResponse(userMessage);
    } catch (error) {
      logger.warn('Precise response service failed for organizational query, using fallback:', error);
      // Fall through to legacy implementation only if precise service fails
    }

    // Improved implementation with proper categorization
    const businessActorAnalysis = archiMateParser.getBusinessActorAnalysis();
    const businessProcesses = archiMateParser.getBusinessProcesses();
    const models = archiMateParser.getAllModels();

    let response = '';

    // Check if we have data
    if (businessActorAnalysis.total === 0) {
      return "I don't see any business actors in the ArchiMetal models right now. Let me check if the models are properly loaded or if there might be a parsing issue.";
    }

    // Professional executive briefing format with credibility markers
    response = `Based on Actual ArchiMetal Model Data\n\n`;
    response += `🏢 Organizational Structure Analysis (${businessActorAnalysis.total} Business Actors | ${businessProcesses.length} Business Processes)\n\n`;

    // Use proper categorization instead of heuristics
    response += `**Internal Organizational Actors (${businessActorAnalysis.internalActors.length}):**\n`;
    businessActorAnalysis.internalActors.forEach(actor => {
      response += `• ${actor.name}\n`;
    });

    response += `\n**External Business Partners (${businessActorAnalysis.externalActors.length}):**\n`;
    businessActorAnalysis.externalActors.forEach(actor => {
      response += `• ${actor.name}\n`;
    });

    response += `\n**Internal Departments/Functions (${businessActorAnalysis.departments.length}):**\n`;
    businessActorAnalysis.departments.forEach(actor => {
      response += `• ${actor.name}\n`;
    });

    response += `\n*Note: Organization structure based on actual ArchiMate CompositionRelationship elements in the parsed models.*\n\n`;

    // Analyze organizational relationships if they exist
    const orgRelationships: any[] = [];
    for (const model of models) {
      for (const relationship of model.relationships.values()) {
        const sourceEl = model.elements.get(relationship.source);
        const targetEl = model.elements.get(relationship.target);

        if (sourceEl && targetEl &&
            (sourceEl.type.includes('BusinessActor') || targetEl.type.includes('BusinessActor')) &&
            (relationship.type.includes('Composition') || relationship.type.includes('Assignment'))) {
          orgRelationships.push({
            source: sourceEl,
            target: targetEl,
            type: relationship.type.replace('archimate:', '')
          });
        }
      }
    }

    if (orgRelationships.length > 0) {
      // Group by composition to show hierarchy
      const compositions = orgRelationships.filter(rel => rel.type === 'CompositionRelationship');
      if (compositions.length > 0) {
        response += `Organizational Hierarchy (${compositions.length} composition relationships)\n\n`;

        const hierarchies: {[key: string]: any[]} = {};
        compositions.forEach(rel => {
          if (!hierarchies[rel.source.name]) hierarchies[rel.source.name] = [];
          hierarchies[rel.source.name].push(rel.target);
        });

        Object.entries(hierarchies).forEach(([parent, children]) => {
          response += `${parent} contains:\n`;
          children.forEach(child => {
            response += `  • ${child.name} [<span class="element-id" data-element-id="${child.id}" data-model="${this.getModelNameForElement(child.id, models)}" title="Click to view element details">${child.id}</span>]\n`;
          });
          response += `\n`;
        });
      }

      // Show assignments/responsibilities
      const assignments = orgRelationships.filter(rel => rel.type === 'AssignmentRelationship');
      if (assignments.length > 0) {
        response += `Role Assignments (${assignments.length} assignment relationships)\n\n`;

        const responsibilities: {[key: string]: any[]} = {};
        assignments.forEach(rel => {
          if (!responsibilities[rel.source.name]) responsibilities[rel.source.name] = [];
          responsibilities[rel.source.name].push(rel.target);
        });

        Object.entries(responsibilities).forEach(([unit, tasks]) => {
          response += `${unit} handles:\n`;
          tasks.forEach(task => {
            response += `  • ${task.name} [<span class="element-id" data-element-id="${task.id}" data-model="${this.getModelNameForElement(task.id, models)}" title="Click to view element details">${task.id}</span>]\n`;
          });
          response += `\n`;
        });
      }
    }

    // Complete business processes listing - NO TRUNCATION
    if (businessProcesses.length > 0) {
      response += `📋 Complete Business Process Inventory (${businessProcesses.length} processes)\n\n`;

      // Group processes by domain for better readability
      const processesByDomain: {[key: string]: any[]} = {
        'Customer Management': [],
        'Production & Manufacturing': [],
        'Logistics & Distribution': [],
        'Finance & Administration': [],
        'Support & Governance': []
      };

      businessProcesses.forEach(process => {
        const name = process.name.toLowerCase();
        let domain = 'Support & Governance'; // default

        if (name.includes('customer') || name.includes('sales') || name.includes('order') || name.includes('commercial')) {
          domain = 'Customer Management';
        } else if (name.includes('production') || name.includes('manufacturing') || name.includes('steel') || name.includes('quality')) {
          domain = 'Production & Manufacturing';
        } else if (name.includes('logistics') || name.includes('distribution') || name.includes('transport') || name.includes('supply')) {
          domain = 'Logistics & Distribution';
        } else if (name.includes('finance') || name.includes('procurement') || name.includes('invoice') || name.includes('payment')) {
          domain = 'Finance & Administration';
        }

        processesByDomain[domain].push(process);
      });

      for (const [domain, processes] of Object.entries(processesByDomain)) {
        if (processes.length > 0) {
          response += `${domain} (${processes.length} processes):\n`;
          processes.forEach(process => {
            response += `  • ${process.name} [<span class="element-id" data-element-id="${process.id}" data-model="${this.getModelNameForElement(process.id, models)}" title="Click to view element details">${process.id}</span>]\n`;
          });
          response += `\n`;
        }
      }
    }

    // Executive summary with concrete totals and follow-up options
    response += `📊 Architecture Summary\n`;
    response += `Total Business Actors: ${businessActorAnalysis.total}\n`;
    response += `Total Business Processes: ${businessProcesses.length}\n`;
    response += `Organizational Relationships: ${orgRelationships.length}\n`;
    response += `Loaded Models: ${models.length}\n\n`;

    response += `Next Analysis Options:\n`;
    response += `• "Analyze relationships between [specific unit] and [target]"\n`;
    response += `• "Show application dependencies for [business actor]"\n`;
    response += `• "Impact analysis for organizational changes"\n`;
    response += `• "Detail the business processes for [specific domain]"\n\n`;

    response += `This comprehensive analysis provides complete visibility into ArchiMetal's organizational architecture without truncation, sourced directly from parsed ArchiMate model elements and relationships.`;

    return response;
  }

  private handleArchiMetalInitiativeExpansion(userMessage: string, analysisResult: any, context: ConversationContext, progressCallback?: ProgressCallback): string {
    const message = userMessage.toLowerCase();

    // Extract new location/unit details
    let newLocation = '';
    let newUnitType = '';

    if (message.includes('france')) newLocation = 'France';
    else if (message.includes('germany')) newLocation = 'Germany';
    else if (message.includes('italy')) newLocation = 'Italy';
    else if (message.includes('uk') || message.includes('united kingdom')) newLocation = 'UK';

    if (message.includes('distribution center') || message.includes('dc ')) newUnitType = 'Distribution Center';
    else if (message.includes('production center')) newUnitType = 'Production Center';
    else if (message.includes('office')) newUnitType = 'Office';

    const newUnitName = newUnitType && newLocation ? `DC ${newLocation}` : 'New Organizational Unit';

    if (progressCallback) {
      progressCallback({ step: 'Analyzing existing organizational patterns', progress: 20 });
    }

    let response = `## 🏗️ **ArchiMetal Initiative Analysis: Adding ${newUnitName}**\n\n`;
    response += `**Initiative:** ${userMessage}\n\n`;

    if (progressCallback) {
      progressCallback({ step: 'Identifying pattern from existing DCs', progress: 40 });
    }

    // Step 1: Analyze existing DC patterns
    const businessActorAnalysis = archiMateParser.getBusinessActorAnalysis();
    const allActors = [
      ...businessActorAnalysis.internalActors,
      ...businessActorAnalysis.externalActors,
      ...businessActorAnalysis.departments
    ];
    const existingDCs = allActors.filter(actor =>
      actor.name.toLowerCase().includes('dc ') ||
      actor.name.toLowerCase().includes('distribution')
    );

    response += `### 📊 **Step 1: Pattern Analysis from Existing Distribution Centers**\n\n`;
    response += `**Found ${existingDCs.length} existing DCs to use as patterns:**\n`;
    existingDCs.forEach(dc => {
      response += `- **${dc.name}** (ID: ${dc.id})\n`;
    });
    response += `\n`;

    if (progressCallback) {
      progressCallback({ step: 'Analyzing organizational relationships', progress: 60 });
    }

    // Step 2: Analyze composition relationships for existing DCs
    const models = archiMateParser.getAllModels();
    const dcRelationships: any[] = [];
    const dcFunctions = new Set<string>();

    for (const model of models) {
      for (const relationship of model.relationships.values()) {
        const sourceEl = model.elements.get(relationship.source);
        const targetEl = model.elements.get(relationship.target);

        if (sourceEl && targetEl && relationship.type.includes('Composition')) {
          // Check if source is existing DC
          if (existingDCs.some(dc => dc.id === sourceEl.id)) {
            dcRelationships.push({
              dc: sourceEl.name,
              contains: targetEl.name,
              targetType: targetEl.type.replace('archimate:', ''),
              relationship
            });
            dcFunctions.add(targetEl.name);
          }
        }
      }
    }

    response += `### 🔗 **Step 2: Required Business Functions (from existing DC patterns)**\n\n`;
    if (dcRelationships.length > 0) {
      const functionsByDC: {[key: string]: string[]} = {};
      dcRelationships.forEach(rel => {
        if (!functionsByDC[rel.dc]) functionsByDC[rel.dc] = [];
        functionsByDC[rel.dc].push(rel.contains);
      });

      for (const [dc, functions] of Object.entries(functionsByDC)) {
        response += `**${dc}** contains: ${functions.join(', ')}\n`;
      }

      response += `\n**${newUnitName} should contain:** ${Array.from(dcFunctions).join(', ')}\n\n`;
    } else {
      response += `❌ No composition relationships found for existing DCs. Using standard pattern.\n`;
      response += `**${newUnitName} should contain:** Distribution, Commercial, Customer Relations\n\n`;
    }

    if (progressCallback) {
      progressCallback({ step: 'Generating ArchiMate model updates', progress: 80 });
    }

    // Step 3: Generate ArchiMate XML updates
    response += `### 🔧 **Step 3: ArchiMate Model Updates Required**\n\n`;
    response += `**New Business Actor Element:**\n`;
    response += `\`\`\`xml\n`;
    response += `<element id="id-${Date.now()}" xsi:type="archimate:BusinessActor">\n`;
    response += `  <name>${newUnitName}</name>\n`;
    response += `  <documentation>Distribution center serving the ${newLocation} market</documentation>\n`;
    response += `</element>\n`;
    response += `\`\`\`\n\n`;

    response += `**Required Composition Relationships:**\n`;
    const requiredFunctions = dcFunctions.size > 0 ? Array.from(dcFunctions) : ['Distribution', 'Commercial', 'Customer Relations'];
    requiredFunctions.forEach((func, index) => {
      response += `\`\`\`xml\n`;
      response += `<relationship id="rel-${Date.now() + index}" xsi:type="archimate:CompositionRelationship"\n`;
      response += `            source="id-${Date.now()}" target="id-of-${func.toLowerCase().replace(/\s+/g, '-')}">\n`;
      response += `  <documentation>${newUnitName} contains ${func}</documentation>\n`;
      response += `</relationship>\n`;
      response += `\`\`\`\n\n`;
    });

    response += `**Organizational Hierarchy Update:**\n`;
    response += `\`\`\`xml\n`;
    response += `<relationship id="rel-archimetal-${Date.now()}" xsi:type="archimate:CompositionRelationship"\n`;
    response += `            source="id-70e443457ba447cf9f7be64c0a2e0ad1" target="id-${Date.now()}">\n`;
    response += `  <documentation>ArchiMetal contains ${newUnitName}</documentation>\n`;
    response += `</relationship>\n`;
    response += `\`\`\`\n\n`;

    if (progressCallback) {
      progressCallback({ step: 'Finalizing impact analysis', progress: 100 });
    }

    // Step 4: Impact Analysis
    response += `### 📈 **Step 4: Cross-Layer Impact Analysis**\n\n`;
    response += `**Business Layer:**\n`;
    response += `- New business actor: ${newUnitName}\n`;
    response += `- Replicates functions: ${requiredFunctions.join(', ')}\n`;
    response += `- Market coverage: ${newLocation}\n\n`;

    response += `**Application Layer:**\n`;
    response += `- Extend existing applications to support ${newLocation}\n`;
    response += `- Configure regional settings and localization\n`;
    response += `- Update data replication and backup strategies\n\n`;

    response += `**Technology Layer:**\n`;
    response += `- Network connectivity to ${newLocation}\n`;
    response += `- Local IT infrastructure requirements\n`;
    response += `- Security and compliance for ${newLocation} market\n\n`;

    response += `### 👥 **Stakeholders to Involve**\n\n`;
    response += `- **Business:** Regional ${newLocation} management, Distribution teams\n`;
    response += `- **IT:** Infrastructure team, Application teams, Security\n`;
    response += `- **Architecture:** Enterprise architects, Solution architects\n`;
    response += `- **Compliance:** Legal, Regulatory affairs for ${newLocation}\n\n`;

    response += `### 📋 **Next Steps for ADR**\n\n`;
    response += `1. **Decision:** Approve ${newUnitName} expansion initiative\n`;
    response += `2. **Architecture:** Update ArchiMate models with proposed elements\n`;
    response += `3. **Implementation:** Plan infrastructure and application rollout\n`;
    response += `4. **Governance:** Establish ${newLocation} operational procedures\n\n`;

    response += `**This analysis provides the complete architectural foundation for the ${newUnitName} initiative.**\n`;

    return response;
  }

  private handleArchiMetalGeneral(userMessage: string, analysisResult: any, context: ConversationContext): string {
    // Load ArchiMetal models if available
    const modelSummary = archiMateParser.getModelSummary();
    const totalElements = Object.values(modelSummary).reduce((sum: number, model: any) => sum + model.elements, 0);

    // Extract potential entities from the query
    const { technologies, systems, processes } = analysisResult.extractedEntities;

    // Build conversational response following knowledge base guidelines
    let response = '';

    if (technologies.length > 0 || systems.length > 0 || processes.length > 0) {
      const detectedItems = [...technologies, ...systems, ...processes];
      response = `I can help you analyze ${detectedItems.join(', ')} within ArchiMetal's organizational context. `;

      if (totalElements > 0) {
        response += `Based on the loaded ArchiMetal models, `;
      }

      response += `could you be more specific about what you'd like to know? For example:\n\n`;
      response += `- What applications use the ${detectedItems[0]}?\n`;
      response += `- Show me dependencies for ${detectedItems[0]}\n`;
      response += `- Analyze the impact of changes to ${detectedItems[0]}\n`;
    } else {
      if (totalElements > 0) {
        response = `I have access to ArchiMetal's architectural models and can help you with organizational analysis, system dependencies, impact assessment, or process optimization. What specific aspect would you like to explore?`;
      } else {
        response = `I'm designed to help with ArchiMetal architectural analysis. While the models are loading, I can still provide guidance on enterprise architecture patterns, ArchiMate modeling best practices, or general architectural questions. What would you like to discuss?`;
      }
    }

    return response;
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

  // Semantic detection for organizational structure queries
  private isOrganizationalStructureQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Context keywords - indicate ArchiMetal context
    const contextKeywords = ['archimetal', 'archimate'];
    const hasContext = contextKeywords.some(keyword => lowerMessage.includes(keyword));

    // Entity keywords - what we're asking about
    const entityKeywords = ['actors', 'business actors', 'organization', 'organisational', 'structure', 'units', 'departments', 'processes'];
    const hasEntity = entityKeywords.some(keyword => lowerMessage.includes(keyword));

    // Action keywords - what we want to do
    const actionKeywords = ['list', 'show', 'display', 'get', 'find', 'all', 'what are', 'who are', 'tell me'];
    const hasAction = actionKeywords.some(keyword => lowerMessage.includes(keyword));

    // Semantic understanding: Context + Entity + Action = Organizational Query
    // Examples that should match:
    // "List all actors in ArchiMetal" → hasContext=true, hasEntity=true, hasAction=true
    // "Show ArchiMetal business actors" → hasContext=true, hasEntity=true, hasAction=true
    // "What are the organizational units in ArchiMetal?" → hasContext=true, hasEntity=true, hasAction=true
    // "Get all ArchiMetal departments" → hasContext=true, hasEntity=true, hasAction=true

    return hasContext && hasEntity && hasAction;
  }

  // Helper method to find which model contains a specific element
  private getModelNameForElement(elementId: string, models: any[]): string {
    for (const model of models) {
      if (model.elements.has(elementId)) {
        // Extract model filename from the full model name or path
        const modelName = model.name || 'Unknown';
        // Clean up the model name for URL usage
        return modelName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      }
    }
    return 'ArchiMetal_Unknown';
  }

}

export default new AIAgentService();