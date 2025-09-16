import logger from '../utils/logger.js';

interface ConversationContext {
  sessionId: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  currentProject?: string;
  archiMateModels?: string[];
}

class AIAgentService {
  private conversationContexts: Map<string, ConversationContext> = new Map();

  initializeContext(sessionId: string): void {
    if (!this.conversationContexts.has(sessionId)) {
      this.conversationContexts.set(sessionId, {
        sessionId,
        messageHistory: [],
        archiMateModels: []
      });
      logger.info(`Initialized AI context for session ${sessionId}`);
    }
  }

  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    this.initializeContext(sessionId);
    const context = this.conversationContexts.get(sessionId)!;

    // Add user message to history
    context.messageHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Generate intelligent response based on content
    const response = await this.generateResponse(userMessage, context);

    // Add assistant response to history
    context.messageHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    logger.info(`Generated AI response for session ${sessionId}`);
    return response;
  }

  private async generateResponse(userMessage: string, context: ConversationContext): Promise<string> {
    // First, analyze the message for specific scenarios and content
    const analysisResult = this.analyzeMessageContent(userMessage);

    // Handle specific ArchiMetal scenarios first (highest priority)
    if (analysisResult.isArchiMetalScenario) {
      return this.handleArchiMetalScenario(userMessage, analysisResult, context);
    }

    // Handle specific architecture change requests
    if (analysisResult.isArchitectureChangeRequest) {
      return this.handleArchitectureChangeRequest(userMessage, analysisResult, context);
    }

    // Handle model analysis requests
    if (analysisResult.isModelAnalysisRequest) {
      return this.handleModelAnalysisRequest(userMessage, analysisResult, context);
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
      'hot strip mill', 'procurement', 'logistics', 'enterprise architecture'
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
    const analysisKeywords = ['analyze', 'analyse', 'review', 'assess', 'evaluate', 'examine'];
    const modelKeywords = ['model', 'architecture', 'design', 'structure'];
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

  private handleModelAnalysisRequest(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `I'll perform a detailed model analysis for you...

[Model analysis would go here]`;
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
    // Try to provide a meaningful response based on extracted entities
    const { technologies, systems, processes } = analysisResult.extractedEntities;

    if (technologies.length > 0 || systems.length > 0) {
      return `I can see you're asking about ${technologies.concat(systems).join(', ')}. Let me provide specific guidance for your architectural context...

[Contextual response based on extracted entities]`;
    }

    return `I'd be happy to help with your architectural question. Could you provide more specific details about:

- Which ArchiMetal views or components you're interested in?
- What type of analysis or guidance you need?
- Any specific technologies or systems involved?

I have detailed knowledge of the ArchiMetal case study and can provide targeted architectural advice.`;
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

  private handleArchiMetalScenario(userMessage: string, analysisResult: any, context: ConversationContext): string {
    // Detect specific ArchiMetal scenario type
    if (userMessage.toLowerCase().includes('salesforce') && userMessage.toLowerCase().includes('crm')) {
      return this.handleArchiMetalCRMChange(userMessage, analysisResult, context);
    }

    if (userMessage.toLowerCase().includes('customer order') || userMessage.toLowerCase().includes('order process')) {
      return this.handleArchiMetalOrderProcess(userMessage, analysisResult, context);
    }

    if (userMessage.toLowerCase().includes('production') || userMessage.toLowerCase().includes('steel production')) {
      return this.handleArchiMetalProduction(userMessage, analysisResult, context);
    }

    // Default ArchiMetal response
    return this.handleArchiMetalGeneral(userMessage, analysisResult, context);
  }

  private handleArchiMetalCRMChange(userMessage: string, analysisResult: any, context: ConversationContext): string {
    return `## ArchiMetal CRM System Change Analysis

**🔍 IMPACT ASSESSMENT: Salesforce CRM Replacement**

Based on ArchiMetal's current architecture (Views 8, 17, 21-27), replacing the planned centralized CRM with Salesforce will have **significant cross-layer impacts**:

### **📊 AFFECTED ARCHIMATE VIEWS:**
- **View 8**: CRM Vision - Complete redesign required
- **View 17**: New Customer Service - Integration points changed
- **Views 21-27**: Customer order processes - API interfaces modified
- **Views 29-30**: Business cooperation models - External dependencies

### **🏗️ ARCHITECTURE IMPACT ANALYSIS:**

**BUSINESS LAYER CHANGES:**
- **Customer Relations Business Actor**: New Salesforce-specific processes
- **Customer Order Process**: Modified business services and interfaces
- **Customer Registration Process**: Salesforce workflow integration

**APPLICATION LAYER CHANGES:**
- **CRM Application Component**: Replace with Salesforce SaaS
- **Customer Data Service**: New Salesforce APIs and data model
- **Order Management Interface**: Salesforce integration layer required
- **DC Benelux/Spain Systems**: Modified customer data synchronization

**TECHNOLOGY LAYER IMPACTS:**
- **Integration Infrastructure**: New Salesforce connectors needed
- **Data Storage**: Customer data now external (Salesforce cloud)
- **Security Services**: SSO integration with Salesforce required
- **Network Services**: External API bandwidth and reliability considerations

### **⚠️ CRITICAL DEPENDENCIES AFFECTED:**
1. **Customer Order Processing** (Views 25-26): API redesign needed
2. **Distribution Centers** (DC Benelux, DC Spain): Customer sync protocols
3. **Steel Production Planning**: Customer demand data integration
4. **Financial Systems**: Salesforce billing integration

### **🎯 RECOMMENDED ARCHIMATE MODEL MODIFICATIONS:**

**1. Update Application Cooperation View (View 17):**
- Replace internal CRM component with Salesforce service
- Add Salesforce API gateway component
- Model new data flows and integration points

**2. Modify Customer Process Views (Views 21-27):**
- Update customer registration workflows
- Redesign order-to-contract business cooperation
- Add Salesforce-specific business services

**3. Create New Implementation View:**
- Migration timeline from centralized CRM to Salesforce
- Parallel running period architecture
- Data migration work packages

**4. Update Technology Infrastructure:**
- Add Salesforce cloud services
- Model new integration layer
- Document API dependencies and SLAs

### **📋 IMMEDIATE ACTIONS REQUIRED:**
1. **ADR Documentation**: Create decision record for CRM change
2. **Integration Design**: Define Salesforce API integration architecture
3. **Data Migration Plan**: Map customer data from current systems
4. **Security Review**: Assess data sovereignty and compliance impacts
5. **Testing Strategy**: Plan integration testing with DC systems

**Would you like me to elaborate on any specific aspect of this impact analysis or help design the integration architecture?**`;
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
}

export default new AIAgentService();