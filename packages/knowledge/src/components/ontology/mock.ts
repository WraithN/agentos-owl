/* Ontology 知识库 Mock 数据 */
import type { OntClass, OntEntity, OntRelation, OntRule } from './types.js';

export const INIT_CLASSES: OntClass[] = [
  { id: 'c1', name: 'Thing', parent: undefined, description: '所有实体的根类', properties: [] },
  { id: 'c2', name: 'Person', parent: 'c1', description: '人类实体', properties: [{ name: 'name', type: 'string', required: true }, { name: 'age', type: 'integer', required: false }] },
  { id: 'c3', name: 'Organization', parent: 'c1', description: '组织机构', properties: [{ name: 'name', type: 'string', required: true }, { name: 'founded', type: 'date', required: false }] },
  { id: 'c4', name: 'Employee', parent: 'c2', description: '员工（Person子类）', properties: [{ name: 'employeeId', type: 'string', required: true }, { name: 'department', type: 'string', required: false }] },
  { id: 'c5', name: 'Product', parent: 'c1', description: '产品实体', properties: [{ name: 'productId', type: 'string', required: true }, { name: 'price', type: 'decimal', required: false }] },
  { id: 'c6', name: 'Event', parent: 'c1', description: '事件类', properties: [{ name: 'title', type: 'string', required: true }, { name: 'startTime', type: 'datetime', required: true }] },
];

export const INIT_ENTITIES: OntEntity[] = [
  { id: 'e1', classId: 'c4', label: '张三', attributes: { employeeId: 'EMP001', department: '研发部', email: 'zhangsan@owl.io' } },
  { id: 'e2', classId: 'c4', label: '李四', attributes: { employeeId: 'EMP002', department: '产品部', email: 'lisi@owl.io' } },
  { id: 'e3', classId: 'c3', label: 'Owl Inc.', attributes: { name: 'Owl Inc.', founded: '2022-01-01' } },
  { id: 'e4', classId: 'c5', label: 'OwlOS v1', attributes: { productId: 'PROD001', price: '0', category: 'AI Platform' } },
];

export const INIT_RELATIONS: OntRelation[] = [
  { id: 'r1', name: 'worksFor', domain: 'Employee', range: 'Organization', cardinality: 'N:1', description: '员工就职于组织' },
  { id: 'r2', name: 'manages', domain: 'Employee', range: 'Employee', cardinality: 'N:M', description: '员工管理员工' },
  { id: 'r3', name: 'develops', domain: 'Organization', range: 'Product', cardinality: '1:N', description: '组织开发产品' },
  { id: 'r4', name: 'participates', domain: 'Person', range: 'Event', cardinality: 'N:M', description: '人参与事件' },
];

export const INIT_RULES: OntRule[] = [
  { id: 'ru1', name: '管理者推断', condition: 'Employee(?x) ∧ manages(?x, ?y) ∧ Employee(?y)', conclusion: 'isManagerOf(?x, ?y)', enabled: true },
  { id: 'ru2', name: '同部门推断', condition: 'Employee(?x) ∧ Employee(?y) ∧ department(?x, ?d) ∧ department(?y, ?d)', conclusion: 'sameTeam(?x, ?y)', enabled: true },
  { id: 'ru3', name: '产品负责人', condition: 'Employee(?x) ∧ develops(?org, ?p) ∧ worksFor(?x, ?org)', conclusion: 'contributesTo(?x, ?p)', enabled: false },
];

export const TYPE_COLORS: Record<string, string> = {
  string: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  integer: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  decimal: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  boolean: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  date: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  datetime: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export const BADGE = 'text-[10px] px-1.5 py-0.5 rounded font-medium border';
export const PROP_TYPES = ['string', 'integer', 'decimal', 'boolean', 'date', 'datetime'];
