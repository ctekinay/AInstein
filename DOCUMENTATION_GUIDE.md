# AInstein Documentation Guide

This guide clarifies the purpose and usage of different documentation files in the AInstein project.

## Documentation File Structure

### Root Level Documentation

#### `CLAUDE.md` (Primary Instructions)
- **Purpose**: Primary instructions for Claude Code AI assistant
- **Usage**: Active configuration file used by Claude during development
- **Content**:
  - Project overview and architecture guidelines
  - Conversational guidelines for AInstein agent
  - Response format rules and restrictions
  - ArchiMate analysis requirements
  - Technology stack and development standards
- **Audience**: Claude Code AI assistant
- **Status**: ACTIVE - Referenced during all Claude interactions

#### `README.md` (Project Overview)
- **Purpose**: Public-facing project documentation
- **Usage**: Repository overview for developers and stakeholders
- **Content**:
  - High-level project description
  - Technology stack overview
  - Project structure outline
  - Business context summary
- **Audience**: Developers, stakeholders, new team members
- **Status**: ACTIVE - Public project documentation

#### `DOCUMENTATION_GUIDE.md` (This File)
- **Purpose**: Clarifies documentation structure and usage
- **Usage**: Reference for understanding document hierarchy
- **Content**: Documentation file purposes and relationships
- **Audience**: Developers and documentation maintainers
- **Status**: ACTIVE - Documentation meta-guide

### Knowledge Base Documentation

#### `knowledge_base/AInsteinKB.md` (Domain Knowledge)
- **Purpose**: ArchiMetal business context and scenarios for AI processing
- **Usage**: Referenced by `ai-agent.service.ts` for business context
- **Content**:
  - ArchiMetal case study details
  - Business scenarios and use cases
  - Domain-specific architectural knowledge
  - Enterprise architecture patterns from ArchiMetal
- **Audience**: AI agent for contextual understanding
- **Status**: ACTIVE - Loaded by backend service
- **Code Reference**:
  ```typescript
  // src/backend/src/services/ai-agent.service.ts:28
  const kbPath = path.join(process.cwd(), '../../knowledge_base/AInsteinKB.md');
  ```

#### `knowledge_base/enhanced_claude_md.md` (Extended Guidelines)
- **Purpose**: Additional guidelines and context for Claude
- **Usage**: Supplementary instructions and best practices
- **Content**:
  - Enhanced conversational patterns
  - Extended architectural analysis guidelines
  - Additional ArchiMetal context
  - Advanced response formatting rules
- **Audience**: Claude AI assistant (supplementary)
- **Status**: REFERENCE - Not actively loaded but provides context

#### `knowledge_base/README.md` (Knowledge Base Guide)
- **Purpose**: Documents knowledge base structure and contents
- **Usage**: Guide for understanding knowledge organization
- **Content**:
  - Knowledge base folder structure
  - File descriptions and purposes
  - Usage instructions for knowledge files
- **Audience**: Developers working with knowledge base
- **Status**: ACTIVE - Knowledge base documentation

### Architecture Patterns Documentation

#### `knowledge_base/architecture_patterns/README.md` (Pattern Guide)
- **Purpose**: Documents knowledge graph structure and usage
- **Usage**: Guide for working with architectural patterns
- **Content**:
  - Pattern categories and organization
  - SPARQL query examples
  - Integration instructions
  - Pattern discovery methodology
- **Audience**: Developers implementing pattern-aware features
- **Status**: ACTIVE - Knowledge graph documentation

#### `knowledge_base/architecture_patterns/KNOWLEDGE_GRAPH_DOCUMENTATION.tex` (Comprehensive Guide)
- **Purpose**: Complete technical documentation for knowledge graph
- **Usage**: Generate PDF documentation using LaTeX
- **Content**:
  - Technology stack details
  - Implementation architecture
  - Algorithms and techniques
  - Performance metrics
  - Use cases and advantages
- **Audience**: End users, developers, stakeholders
- **Status**: ACTIVE - Primary technical documentation

#### `knowledge_base/architecture_patterns/extraction-guide.md` (Implementation Guide)
- **Purpose**: Technical guide for pattern extraction and maintenance
- **Usage**: Developer reference for extending pattern capabilities
- **Content**:
  - Automated extraction algorithms
  - Manual validation processes
  - Integration code examples
  - Quality assurance procedures
- **Audience**: Developers implementing pattern features
- **Status**: ACTIVE - Technical implementation guide

## Documentation Hierarchy and Relationships

```
AInstein Documentation Structure
├── CLAUDE.md                          # Primary Claude instructions
├── README.md                          # Public project overview
├── DOCUMENTATION_GUIDE.md             # This file - documentation guide
└── knowledge_base/
    ├── AInsteinKB.md                  # Domain knowledge (LOADED BY BACKEND)
    ├── enhanced_claude_md.md          # Extended Claude guidelines
    ├── README.md                      # Knowledge base guide
    └── architecture_patterns/
        ├── README.md                  # Pattern system guide
        ├── KNOWLEDGE_GRAPH_DOCUMENTATION.tex  # Complete technical docs
        └── extraction-guide.md       # Implementation guide
```

## Usage Guidelines

### For Developers
1. **Start with**: `README.md` for project overview
2. **Reference**: `CLAUDE.md` to understand AI assistant guidelines
3. **Implement**: Use `knowledge_base/architecture_patterns/extraction-guide.md` for pattern features
4. **Generate**: LaTeX documentation for comprehensive technical reference

### For AI Assistant (Claude)
1. **Primary**: `CLAUDE.md` - Always active and referenced
2. **Domain Context**: `knowledge_base/AInsteinKB.md` - Loaded by backend service
3. **Supplementary**: `knowledge_base/enhanced_claude_md.md` - Additional context

### For End Users
1. **Overview**: `README.md` for project understanding
2. **Technical Details**: Generate PDF from `KNOWLEDGE_GRAPH_DOCUMENTATION.tex`
3. **Pattern Usage**: `knowledge_base/architecture_patterns/README.md`

## File Status Legend

- **ACTIVE**: Actively used by system or regularly referenced
- **REFERENCE**: Available for reference but not automatically loaded
- **LOADED BY BACKEND**: Automatically loaded by backend services

## Maintenance Guidelines

### When to Update Each File

1. **CLAUDE.md**: When changing AI behavior, response patterns, or project guidelines
2. **README.md**: When project scope, technology stack, or structure changes
3. **AInsteinKB.md**: When adding new business scenarios or domain knowledge
4. **enhanced_claude_md.md**: When adding supplementary AI guidelines
5. **Pattern documentation**: When extending or modifying knowledge graph capabilities

### Consistency Requirements

- Keep `CLAUDE.md` and `AInsteinKB.md` aligned on business context
- Ensure `README.md` reflects current project structure
- Update pattern documentation when knowledge graph changes
- Maintain version consistency across all documentation