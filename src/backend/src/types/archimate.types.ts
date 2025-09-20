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