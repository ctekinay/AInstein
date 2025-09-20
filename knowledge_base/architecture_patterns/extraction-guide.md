# Pattern Extraction Guide

This guide explains how to extract architectural patterns from ArchiMetal models and documentation using both automated and manual approaches.

## Automated Pattern Extraction

### 1. ArchiMate Model Parser Integration

Extend the existing `archimate-parser.service.ts` to identify patterns:

```typescript
class PatternExtractor {
  extractPatternsFromModel(model: ArchiMateModel): Pattern[] {
    const patterns: Pattern[] = [];

    // Extract integration patterns
    patterns.push(...this.extractIntegrationPatterns(model));

    // Extract business patterns
    patterns.push(...this.extractBusinessPatterns(model));

    // Extract technology patterns
    patterns.push(...this.extractTechnologyPatterns(model));

    return patterns;
  }

  private extractIntegrationPatterns(model: ArchiMateModel): Pattern[] {
    // Look for EAI Bus pattern: central component with many serving relationships
    const eaiBusComponents = this.findCentralIntegrationComponents(model);

    // Look for API Gateway pattern: interface with multiple access relationships
    const apiGateways = this.findAPIGatewayComponents(model);

    return [...eaiBusComponents, ...apiGateways];
  }
}
```

### 2. Pattern Recognition Heuristics

#### Integration Patterns
- **EAI Bus**: ApplicationComponent with ≥3 serving relationships to other components
- **API Gateway**: ApplicationInterface with multiple access relationships
- **Data Sync**: DataObject with access relationships from ≥2 components

#### Business Patterns
- **Distributed Units**: BusinessActor with aggregation relationships to other actors
- **Process Chain**: BusinessProcess with triggering relationships in sequence
- **Stakeholder Network**: BusinessActor with serving/influence relationships to external actors

#### Technology Patterns
- **Layered Architecture**: Components with realization relationships across layers
- **Shared Infrastructure**: Node with assignment relationships to multiple components

### 3. Confidence Scoring

```typescript
calculatePatternConfidence(pattern: Pattern, model: ArchiMateModel): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on:
  // - Number of participating elements
  // - Strength of relationships
  // - Consistency with known patterns
  // - Documentation quality

  if (pattern.participants.length >= 3) confidence += 0.2;
  if (pattern.hasDocumentation) confidence += 0.1;
  if (pattern.matchesKnownSignature) confidence += 0.2;

  return Math.min(confidence, 1.0);
}
```

## Manual Pattern Validation

### 1. Expert Review Process

For each extracted pattern:

1. **Validate Intent**: Does the pattern address a clear architectural concern?
2. **Check Applicability**: Is the context clearly defined?
3. **Verify Consequences**: Are trade-offs properly documented?
4. **Assess Quality**: Does it address specific quality attributes?

### 2. Pattern Template

Use this template for manual pattern definition:

```turtle
ampattern:NewPattern a ampattern:PatternType ;
    rdfs:label "Pattern Name" ;
    ampattern:intent "Clear statement of purpose" ;
    ampattern:description "Detailed description of the pattern" ;
    ampattern:applicability "When to use this pattern" ;
    ampattern:consequences "Trade-offs and implications" ;
    ampattern:implementation "How to implement" ;
    ampattern:extractedFrom "Source ArchiMetal model/document" ;
    ampattern:archiMetalFigure "Figure reference" ;
    ampattern:businessScenario "Business context" ;
    ampattern:maturityLevel "experimental|proven|established" ;
    ampattern:complexity "low|medium|high" ;
    ampattern:impactLevel "low|medium|high|critical" ;
    ampattern:confidence "0.0-1.0"^^xsd:decimal ;
    ampattern:addressesQuality ampattern:QualityAttribute ;
    ampattern:hasKeyRole ampattern:KeyElement ;
    ampattern:hasParticipant ampattern:ParticipatingElement .
```

## Integration with AInstein

### 1. Pattern-Aware Query Processing

```typescript
class PatternAwareAIAgent {
  async processArchitecturalQuery(query: string): Promise<string> {
    // 1. Extract architectural intent from query
    const intent = this.extractArchitecturalIntent(query);

    // 2. Find relevant patterns
    const patterns = await this.findRelevantPatterns(intent);

    // 3. Generate pattern-aware response
    return this.generatePatternAwareResponse(query, patterns);
  }

  private async findRelevantPatterns(intent: ArchitecturalIntent): Promise<Pattern[]> {
    // SPARQL query to find matching patterns
    const query = `
      SELECT ?pattern ?confidence WHERE {
        ?pattern a ampattern:Pattern .
        ?pattern ampattern:addressesQuality ?quality .
        ?pattern ampattern:confidence ?confidence .
        FILTER(?quality IN (${intent.qualityAttributes.join(', ')}))
      }
      ORDER BY DESC(?confidence)
    `;

    return this.sparqlQuery(query);
  }
}
```

### 2. Pattern Recommendation Engine

```typescript
class PatternRecommendationEngine {
  recommendPatterns(context: ArchitecturalContext): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    // Find patterns matching context
    const candidatePatterns = this.findMatchingPatterns(context);

    // Score and rank patterns
    for (const pattern of candidatePatterns) {
      const score = this.calculateRecommendationScore(pattern, context);
      recommendations.push({ pattern, score, reasoning: this.generateReasoning(pattern, context) });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }
}
```

## Validation and Quality Assurance

### 1. Pattern Consistency Checks

Use SHACL shapes to validate pattern consistency:

```turtle
ampattern:PatternShape a sh:NodeShape ;
    sh:targetClass ampattern:Pattern ;
    sh:property [
        sh:path rdfs:label ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:string ;
    ] ;
    sh:property [
        sh:path ampattern:confidence ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:decimal ;
        sh:minInclusive 0.0 ;
        sh:maxInclusive 1.0 ;
    ] .
```

### 2. Pattern Coverage Analysis

Track pattern coverage across ArchiMetal models:

```sparql
# Find models without pattern coverage
SELECT ?model WHERE {
  ?model a am:ArchiMateModel .
  FILTER NOT EXISTS {
    ?pattern ampattern:extractedFrom ?model .
  }
}
```

### 3. Pattern Evolution Tracking

Monitor how patterns evolve across transformation phases:

```sparql
# Track pattern evolution
SELECT ?baselinePattern ?targetPattern ?relationship WHERE {
  ?baselinePattern ampattern:transformationPhase "baseline" .
  ?targetPattern ampattern:transformationPhase "target" .
  ?baselinePattern ?relationship ?targetPattern .
  FILTER(?relationship IN (ampattern:complementedBy, ampattern:dependsOn))
}
```

## Continuous Improvement

### 1. Pattern Feedback Loop

1. **Usage Analytics**: Track which patterns are most queried/recommended
2. **Success Metrics**: Monitor pattern implementation success rates
3. **User Feedback**: Collect architect feedback on pattern relevance and quality
4. **Pattern Refinement**: Update patterns based on feedback and new insights

### 2. Pattern Library Expansion

1. **New Model Analysis**: Extract patterns from new ArchiMetal models
2. **Industry Patterns**: Incorporate standard enterprise architecture patterns
3. **Domain Patterns**: Add manufacturing and energy sector specific patterns
4. **Anti-Pattern Detection**: Identify and document architectural anti-patterns

### 3. Knowledge Graph Maintenance

1. **Regular Validation**: Run SHACL validation on pattern knowledge graph
2. **Consistency Checks**: Ensure pattern relationships are logically consistent
3. **Performance Optimization**: Optimize SPARQL queries for pattern discovery
4. **Version Management**: Track pattern evolution and maintain version history