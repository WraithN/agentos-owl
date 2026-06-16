/* Ontology 知识库类型 */

export type OntTab = 'classes' | 'entities' | 'relations' | 'rules' | 'graph' | 'dashboard';

export interface OntClass {
  id: string;
  name: string;
  parent?: string;
  properties: { name: string; type: string; required: boolean }[];
  description: string;
}

export interface OntEntity {
  id: string;
  classId: string;
  label: string;
  attributes: Record<string, string>;
}

export interface OntRelation {
  id: string;
  name: string;
  domain: string;
  range: string;
  cardinality: string;
  description: string;
}

export interface OntRule {
  id: string;
  name: string;
  condition: string;
  conclusion: string;
  enabled: boolean;
}

export interface OntKB {
  id: string;
  name: string;
  vectorDbUrl: string;
  docCount: number;
  chunkCount: number;
  storageSize: string;
  isGlobal: boolean;
}
