# AInstein

AI-powered architecture agent designed to replace Energy System Architect (ESA) bottlenecks at Alliander N.V., a Dutch Distribution System Operator. The project aims to automate architectural decision-making, ADR generation, and ArchiMate model processing for critical energy infrastructure.

## Overview

AInstein provides:
1. **Frontend Implementation**: A chatbot interface allowing architects to communicate with the AI agent
2. **Backend Implementation**: AI agent flow including GitHub integration, ArchiMate model fetching, model adjustments, validation, and ADR generation

## Test Environment

The project uses **ArchiMetal** as a comprehensive test case, providing realistic ArchiMate model files and complete enterprise architecture scenarios for validation and testing.

## Technology Stack

### Backend
- Node.js v22 (latest LTS)
- TypeScript 5.x with strict mode
- Commander.js for console interface
- fast-xml-parser for ArchiMate Model Exchange Format files
- simple-git for repository operations
- Handlebars for ADR generation
- Jest with TypeScript support
- Zod for schema validation
- Winston for structured logging

### Frontend
- Modern chat interface with file upload capabilities
- WebSocket/HTTP API for real-time communication
- Framework TBD (React/Vue/Svelte)

## Project Structure

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
└── ArchiMetal/        # Test case data and models
```

## Development Status

This is an active development project focusing on building the complete technical infrastructure while using ArchiMetal as the test case for validation.

## Business Context

This system operates within Alliander's energy transition mission, supporting:
- Cross-keten (organizational chain) architectural alignment
- Integration with SCADA, DMS, and smart meter infrastructure
- Compliance with Dutch energy sector regulations (ACM)
- Support for renewable energy integration and smart grid evolution

## License

[License TBD]

## Contributing

[Contributing guidelines TBD]