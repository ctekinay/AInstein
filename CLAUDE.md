# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AInstein is an AI-powered architecture agent designed to replace Energy System Architect (ESA) bottlenecks at Alliander N.V., a Dutch Distribution System Operator. The project aims to automate architectural decision-making, ADR generation, and ArchiMate model processing for critical energy infrastructure.

The solution comprises:
1. **Frontend Implementation**: A chatbot interface allowing architects to communicate with the AI agent
2. **Backend Implementation**: AI agent flow including GitHub integration, ArchiMate model fetching, model adjustments, validation, and ADR generation

## Conversational Guidelines

### Welcome and Domain Expertise
When initiating conversations:
- Position yourself as the AInstein architecture agent with enterprise architecture expertise
- Focus on ArchiMetal-specific architectural challenges
- Maintain professional tone appropriate for enterprise architects

### Off-Topic Query Handling
When users ask questions outside the enterprise architecture domain (weather, personal topics, general chat), respond with this exact pattern:

"How about instead we start working on some of the ArchiMetal specific challenges you might be facing? I can help you with organizational analysis (like understanding team structures or reporting relationships), system analysis (such as application dependencies or data flows), impact analysis (evaluating how changes affect your architecture), or process optimization (identifying bottlenecks or inefficiencies)."

### Response Format Rules - STRICTLY ENFORCED
- **NEVER** use generic headers, titles, or emojis like "## 🏗️ **ArchiMetal Enterprise Architecture Analysis**" - These are robotic and inherent to AInstein usage
- **NEVER** repeat the user's query back to them with patterns like "**Your Query:** 'Can we talk about weather?'" - The query is already visible in chat
- **NEVER** include technical details like "**Available ArchiMetal Models:** 2 models with 346 total elements" when redirecting off-topic conversations - This is irrelevant noise
- **NEVER** list analysis types in bullet format when redirecting - Use conversational flow instead
- **ALWAYS** use the exact redirect response for off-topic queries (see above)
- **ALWAYS** maintain conversation history throughout architectural analysis sessions
- **ALWAYS** respond conversationally and educationally, not robotically
- When asked to "update the model," attempt the specific file modification rather than deflecting

### Response Completeness Requirements
- **Never** use placeholder text like "[Complete list]" or "[General information]"
- **Never** truncate dependency lists with "and X more elements" - architects need complete information
- **Always** provide the actual complete data when analyzing dependencies
- List ALL affected elements by name and type in impact analysis
- Group elements by architectural layer (Business, Application, Technology, Data Objects)
- Show complete element lists within each category with element counts
- Include element name and type for each dependency

## ArchiMate Analysis Requirements

### Core Processing Requirements
- Follow ArchiMate 3.2 specification compliance
- Load and parse actual .archimate XML files from `/ArchiMetal/` directory
- Extract element IDs, names, types, and relationship mappings
- Build dependency graph from actual model connections
- Validate element existence before referencing in responses
- Handle namespaces and prefixes correctly
- Preserve model integrity during updates

### Relationship Traversal Analysis
**Implementation**: Perform actual graph traversal of ArchiMate relationships for dependency analysis
- Filter relationships by source/target direction to distinguish "uses" vs "used by"
- Provide relationship type analysis (CompositionRelationship, ServingRelationship, RealizationRelationship)
- Generate impact chain analysis showing cascading dependencies
- Include business context with specific element names and types

**Queries Supported**:
- "what applications call the [System]?" - Shows direct usage relationships
- "what uses [Element]?" - Dependency analysis from source perspective
- "what depends on [Element]?" - Impact analysis for target dependencies

### ArchiMetal Case Study Requirements
- Reference actual Figure numbers (Figure 6, Figure 12, etc.), never fabricate "View" numbers
- Extract and use specific ArchiMate element names from the models
- Distinguish between baseline architecture (Figure 12) and target architecture (Figure 19)
- Trace actual relationships from the XML/visual models, not assumed enterprise patterns

### Organizational Analysis Requirements
When asked about organizational structure:
- Extract ALL BusinessActor elements from loaded models by name
- List ALL BusinessFunction elements and their relationships
- Show the actual organizational hierarchy using parsed relationship data
- Reference specific element IDs and names from the ArchiMate files
- Provide concrete data, never abstract descriptions

### Prohibited Behaviors
- Do not generate boilerplate EA advice without model evidence
- Do not reference non-existent views, elements, or relationships
- Do not assume standard integration patterns not shown in the source
- Do not use generic terminology when specific element names exist
- Do not fabricate "View 8" or similar non-existent references
- Do not provide responses that sound like generic consulting advice

## Technical Implementation

### Technology Stack

**Backend**
- **Runtime**: Node.js v22 (latest LTS)
- **Language**: TypeScript 5.x with strict mode
- **CLI Framework**: Commander.js for console interface
- **XML Processing**: fast-xml-parser for ArchiMate Model Exchange Format files
- **Git Integration**: simple-git for repository operations
- **File Operations**: fs-extra for enhanced file handling
- **Template Engine**: Handlebars for ADR generation
- **Testing**: Jest with TypeScript support
- **Validation**: Zod for schema validation
- **Logging**: Winston for structured logging

**Frontend**
- **Framework**: TBD (React/Vue/Svelte for chatbot interface)
- **Communication**: WebSocket/HTTP API for real-time chat
- **UI Components**: Modern chat interface with file upload capabilities

### Module Structure
```
src/
├── frontend/           # Chatbot interface implementation
│   ├── components/     # UI components
│   ├── services/      # API communication
│   └── types/         # Frontend TypeScript types
├── backend/           # Core AI agent implementation
│   ├── archimate/     # ArchiMate XML processing and validation
│   ├── adr/          # Architecture Decision Record generation
│   ├── git/          # Git operations and workflow management
│   ├── validation/   # Input validation and schema definitions
│   ├── chat/         # Chat interface and WebSocket handling
│   └── agent/        # AI agent orchestration and workflow
├── ArchiMetal/        # Test case data and models
│   ├── ArchiMetal_Transformation_Challenges/
│   ├── ArchiMetal_CRM_Vision/
│   ├── ArchiMetal_Transformation_Overview/
│   ├── Detail_Enterprise_Architecture/
│   └── Target_State_Scenario/
└── knowledge_base/    # Consolidated knowledge and documentation
    ├── archimetal/    # ArchiMetal case study documentation
    ├── project_docs/  # Project diagrams and progress tracking
    └── architecture_patterns/  # Architecture patterns (future use)
```

### Development Standards

**TypeScript Guidelines**
- Use interfaces over types for object shapes
- Avoid enums; use const assertions and union types
- Define strict types for ArchiMate elements and ADR structures
- Use generic types for reusable parsers and processors

**File Naming Conventions**
- Directories: lowercase with dashes (e.g., `archimate-processor/`)
- Files: camelCase (e.g., `archiMateParser.ts`, `adrTemplate.ts`)
- Constants: UPPER_CASE
- Prefer named exports for all functions and utilities

**Git Operations**
- Implement atomic operations for architecture artifact updates
- Use structured commit messages: `feat(archimate): add impact analysis for applications`
- Handle conflicts gracefully with user prompts
- Maintain audit trail for all architectural decisions

### API Design

**Frontend Design**
- **Chatbot Interface**: Modern conversational UI for architect interactions
- **File Upload**: Support for ArchiMate model file uploads (.archimate, .xml)
- **Real-time Communication**: WebSocket connection for live agent feedback
- **Progress Indicators**: Visual feedback for long-running operations
- **Error Handling**: Clear, actionable error messages with suggested fixes

**Backend API Design**
- **RESTful Endpoints**: Standard HTTP APIs for file operations and configuration
- **WebSocket**: Real-time bidirectional communication for chat interface
- **Agent Workflow**: Orchestrated flow for ArchiMate processing and ADR generation
- **GitHub Integration**: Automated repository operations and model fetching

### Performance Requirements
- Use lazy loading for ArchiMate model sections
- Stream large files instead of loading entirely into memory
- Implement caching for frequently accessed architectural patterns
- Use worker threads for CPU-intensive architecture analysis
- Optimize XML parsing with selective element processing

### Key Design Patterns
- **Command Pattern**: For chat command processing and AI agent operations
- **Strategy Pattern**: For different ArchiMate processors and model types
- **Factory Pattern**: For ADR template generation and response formatting
- **Observer Pattern**: For real-time chat updates and workflow notifications
- **Repository Pattern**: For architecture artifact and model management
- **Publisher-Subscriber**: For WebSocket communication and event handling

## Business Context

### Enterprise Environment
This system operates within Alliander's energy transition mission, supporting:
- Cross-keten (organizational chain) architectural alignment
- Integration with SCADA, DMS, and smart meter infrastructure
- Compliance with Dutch energy sector regulations (ACM)
- Support for renewable energy integration and smart grid evolution

### External Systems Integration
- **BiZZdesign Enterprise Studio**: Primary ArchiMate modeling tool
- **Confluence**: Architectural documentation and ADR storage
- **Jira**: Project management and initiative tracking
- **IDMS/IAM**: Enterprise identity and access management

### Security and Compliance
- Follow enterprise security standards for IDMS/IAM integration
- Validate all external inputs (ArchiMate files, user queries)
- Implement proper access controls for architectural artifacts
- Log security-relevant events for audit purposes
- Handle architecturally sensitive but not classified information

### ArchiMetal Test Environment
Due to the lack of production knowledge graphs from the company, the project uses **ArchiMetal** as a comprehensive test case located in `/ArchiMetal/`. This provides:
- **32 ArchiMate views** covering business, application, technology, and implementation perspectives
- Realistic ArchiMate model files organized by architectural views
- Complete enterprise architecture scenarios covering transformation challenges
- Baseline to target state transformation scenarios
- Business process cooperation and stakeholder views
- Comprehensive documentation for validation and testing

## Validation and Quality Assurance

### Model Response Validation Checklist
Every architectural analysis response must:
- [ ] Reference actual figure numbers from ArchiMetal case study
- [ ] Name specific ArchiMate elements (applications, processes, actors)
- [ ] Demonstrate understanding of current vs. target state
- [ ] Show evidence of parsing actual model relationships
- [ ] Avoid generic EA patterns not present in the source

### Test Queries for Model Validation
Before running complex scenarios, verify the model can:
1. "List all application components shown in Figure 12"
2. "Describe the data flows between DC Benelux and Production Center"
3. "What business processes are shown in the Register Order workflow?"
4. "Which applications connect to the EAI Bus in the target architecture?"

### Success Criteria
A valid response demonstrates:
- Specific element name usage from the ArchiMate models
- Understanding of actual relationships (not assumed ones)
- Reference to concrete figures and diagrams
- Evidence of parsing model structure, not pattern matching
- Complete dependency chains without truncation
- Proper grouping by architectural layers

### Model Understanding Verification
The AI must demonstrate it can:
- Identify parent-child relationships in organizational structure
- Map application-to-application dependencies via interfaces
- Trace business process flows and their supporting applications
- Understand data object relationships and flows
- Cross-reference XML model elements with PDF figure descriptions
- Validate consistency between visual models and XML structure
- Use case study context to understand business meaning of technical elements

### Error Handling Guidelines
- Provide clear error messages when parsing fails
- Suggest corrective actions for malformed ArchiMate files
- Handle missing elements gracefully with informative feedback
- Log parsing failures for debugging purposes
- Maintain partial results when complete analysis isn't possible

## Development Approach

This is an active development project focusing on building the complete technical infrastructure while using ArchiMetal as the test case for validation. The development priorities are:

1. **Frontend Development**: Implement chatbot interface for architect interactions
2. **Backend Agent Implementation**: Build the core AI workflow including:
   - GitHub integration and model fetching
   - ArchiMate model processing and validation
   - ADR generation and documentation
   - Real-time communication with frontend
3. **Testing and Validation**: Use ArchiMetal test case to validate solution accuracy and completeness

This test environment enables development and validation of the AInstein solution without requiring production data or knowledge graphs from the company.