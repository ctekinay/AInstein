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
    const message = userMessage.toLowerCase();

    // Architecture-related responses
    if (this.isArchitectureQuestion(message)) {
      return this.handleArchitectureQuestion(userMessage, context);
    }

    // ArchiMate-related responses
    if (this.isArchiMateQuestion(message)) {
      return this.handleArchiMateQuestion(userMessage, context);
    }

    // ADR (Architecture Decision Record) related
    if (this.isADRQuestion(message)) {
      return this.handleADRQuestion(userMessage, context);
    }

    // General enterprise architecture questions
    if (this.isEnterpriseArchitectureQuestion(message)) {
      return this.handleEnterpriseArchitectureQuestion(userMessage, context);
    }

    // ArchiMetal test case questions
    if (this.isArchiMetalQuestion(message)) {
      return this.handleArchiMetalQuestion(userMessage, context);
    }

    // File upload or model analysis
    if (this.isFileAnalysisRequest(message)) {
      return this.handleFileAnalysisRequest(userMessage, context);
    }

    // Default intelligent response
    return this.handleGeneralQuestion(userMessage, context);
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

  private handleArchiMetalQuestion(userMessage: string, context: ConversationContext): string {
    return `ArchiMetal is our comprehensive test case for steel manufacturing:

🏭 **Business Context:**
- Steel production and processing company
- Multiple production centers and distribution centers
- Complex supply chain and customer relationships
- Digital transformation challenges

📊 **32 ArchiMate Views Include:**
- **Transformation Challenges** (Views 1-8): Business units, value streams, production processes
- **Transformation Overview** (Views 9-20): Application landscapes, infrastructure, migration planning
- **Detail Enterprise Architecture** (Views 21-27): Customer processes, order management
- **Target State Scenario** (Views 28-32): Stakeholder views, business cooperation

🔍 **What I can analyze:**
- Business process optimization opportunities
- Application portfolio rationalization
- Technology infrastructure improvements
- Organizational transformation impacts

Which aspect of ArchiMetal interests you most?`;
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