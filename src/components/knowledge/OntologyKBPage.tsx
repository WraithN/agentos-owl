import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Plus, Pencil, Trash2, X, Save, Search,
  ChevronRight, GitBranch, Box, ArrowRight, Layers,
  Brain, Eye, AlertCircle, BarChart2, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import KBPageShell from './KBPageShell';

/* ── 类型 ─────────────────────────────────────────────── */
type OntTab = 'classes' | 'entities' | 'relations' | 'rules' | 'graph' | 'dashboard';

interface OntClass { id: string; name: string; parent?: string; properties: { name: string; type: string; required: boolean }[]; description: string; }
interface OntEntity { id: string; classId: string; label: string; attributes: Record<string, string>; }
interface OntRelation { id: string; name: string; domain: string; range: string; cardinality: string; description: string; }
interface OntRule { id: string; name: string; condition: string; conclusion: string; enabled: boolean; }
interface OntKB { id: string; name: string; vectorDbUrl: string; docCount: number; chunkCount: number; storageSize: string; isGlobal: boolean; }

/* ── Mock ── */
const INIT_CLASSES: OntClass[] = [
  { id: 'c1', name: 'Thing',        parent: undefined,  description: '所有实体的根类', properties: [] },
  { id: 'c2', name: 'Person',       parent: 'c1',       description: '人类实体', properties: [{ name: 'name', type: 'string', required: true }, { name: 'age', type: 'integer', required: false }] },
  { id: 'c3', name: 'Organization', parent: 'c1',       description: '组织机构', properties: [{ name: 'name', type: 'string', required: true }, { name: 'founded', type: 'date', required: false }] },
  { id: 'c4', name: 'Employee',     parent: 'c2',       description: '员工（Person子类）', properties: [{ name: 'employeeId', type: 'string', required: true }, { name: 'department', type: 'string', required: false }] },
  { id: 'c5', name: 'Product',      parent: 'c1',       description: '产品实体', properties: [{ name: 'productId', type: 'string', required: true }, { name: 'price', type: 'decimal', required: false }] },
  { id: 'c6', name: 'Event',        parent: 'c1',       description: '事件类', properties: [{ name: 'title', type: 'string', required: true }, { name: 'startTime', type: 'datetime', required: true }] },
];
const INIT_ENTITIES: OntEntity[] = [
  { id: 'e1', classId: 'c4', label: '张三',       attributes: { employeeId: 'EMP001', department: '研发部', email: 'zhangsan@acta.io' } },
  { id: 'e2', classId: 'c4', label: '李四',       attributes: { employeeId: 'EMP002', department: '产品部', email: 'lisi@acta.io' } },
  { id: 'e3', classId: 'c3', label: 'Acta Inc.', attributes: { name: 'Acta Inc.', founded: '2022-01-01' } },
  { id: 'e4', classId: 'c5', label: 'ActaOS v1', attributes: { productId: 'PROD001', price: '0', category: 'AI Platform' } },
];
const INIT_RELATIONS: OntRelation[] = [
  { id: 'r1', name: 'worksFor',     domain: 'Employee',     range: 'Organization', cardinality: 'N:1', description: '员工就职于组织' },
  { id: 'r2', name: 'manages',      domain: 'Employee',     range: 'Employee',     cardinality: 'N:M', description: '员工管理员工' },
  { id: 'r3', name: 'develops',     domain: 'Organization', range: 'Product',      cardinality: '1:N', description: '组织开发产品' },
  { id: 'r4', name: 'participates', domain: 'Person',       range: 'Event',        cardinality: 'N:M', description: '人参与事件' },
];
const INIT_RULES: OntRule[] = [
  { id: 'ru1', name: '管理者推断',   condition: 'Employee(?x) ∧ manages(?x, ?y) ∧ Employee(?y)', conclusion: 'isManagerOf(?x, ?y)',    enabled: true },
  { id: 'ru2', name: '同部门推断',   condition: 'Employee(?x) ∧ Employee(?y) ∧ department(?x, ?d) ∧ department(?y, ?d)', conclusion: 'sameTeam(?x, ?y)', enabled: true },
  { id: 'ru3', name: '产品负责人',   condition: 'Employee(?x) ∧ develops(?org, ?p) ∧ worksFor(?x, ?org)', conclusion: 'contributesTo(?x, ?p)', enabled: false },
];

const TYPE_COLORS: Record<string, string> = {
  string:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  integer:  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  decimal:  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  boolean:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  date:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  datetime: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};
const BADGE = 'text-[10px] px-1.5 py-0.5 rounded font-medium border';
const PROP_TYPES = ['string','integer','decimal','boolean','date','datetime'];

/* ── 弹窗基础 ─────────────────────────────────────────── */
function Modal({ title, icon, onClose, children, footer }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--panel-bg-solid)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">{icon}<h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>
      </motion.div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors';
const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';
const btnCancel = 'px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity';

/* ── 类定义弹窗 ─────────────────────────────────────────── */
function ClassModal({ initial, allClasses, onClose, onSave }: {
  initial?: OntClass; allClasses: OntClass[];
  onClose: () => void; onSave: (c: Omit<OntClass, 'id'>) => void;
}) {
  const [name, setName]     = useState(initial?.name ?? '');
  const [parent, setParent] = useState(initial?.parent ?? '');
  const [desc, setDesc]     = useState(initial?.description ?? '');
  const [props, setProps]   = useState(initial?.properties ?? []);

  function addProp() { setProps(p => [...p, { name: '', type: 'string', required: false }]); }
  function removeProp(i: number) { setProps(p => p.filter((_, j) => j !== i)); }
  function updateProp(i: number, k: string, v: string | boolean) { setProps(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x)); }

  return (
    <Modal title={initial ? '编辑类定义' : '新建类'} icon={<Box className="w-4 h-4 text-violet-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), parent: parent || undefined, description: desc, properties: props.filter(p => p.name.trim()) }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '创建'}</button></>}>
      <div><label className={labelCls}>类名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="如 Person" className={inputCls} /></div>
      <div>
        <label className={labelCls}>父类</label>
        <select value={parent} onChange={e => setParent(e.target.value)} className={inputCls}>
          <option value="">无（根类）</option>
          {allClasses.filter(c => c.id !== initial?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>描述</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} /></div>
      <div>
        <div className="flex items-center justify-between mb-2"><label className={labelCls + ' !mb-0'}>属性定义</label><button onClick={addProp} className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"><Plus className="w-3 h-3" />添加</button></div>
        {props.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={p.name} onChange={e => updateProp(i, 'name', e.target.value)} placeholder="属性名" className={cn(inputCls, 'flex-1')} />
            <select value={p.type} onChange={e => updateProp(i, 'type', e.target.value)} className={cn(inputCls, 'w-24')}>
              {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => updateProp(i, 'required', !p.required)} className={cn('text-[10px] px-2 py-1 rounded border transition-all shrink-0', p.required ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' : 'text-slate-500 border-[var(--border-subtle)] hover:border-rose-500/25')}>必填</button>
            <button onClick={() => removeProp(i)} className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {props.length === 0 && <p className="text-[11px] text-slate-500 text-center py-2">暂无属性，点击添加</p>}
      </div>
    </Modal>
  );
}

/* ── 实体弹窗 ─────────────────────────────────────────── */
function EntityModal({ initial, classes, onClose, onSave }: {
  initial?: OntEntity; classes: OntClass[];
  onClose: () => void; onSave: (e: Omit<OntEntity, 'id'>) => void;
}) {
  const [classId, setClassId] = useState(initial?.classId ?? classes[0]?.id ?? '');
  const [label, setLabel]     = useState(initial?.label ?? '');
  const [attrs, setAttrs]     = useState<{ k: string; v: string }[]>(
    initial ? Object.entries(initial.attributes).map(([k, v]) => ({ k, v })) : []
  );
  const cls = classes.find(c => c.id === classId);

  return (
    <Modal title={initial ? '编辑实体' : '新建实体实例'} icon={<Layers className="w-4 h-4 text-cyan-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!label.trim()) return; const a: Record<string, string> = {}; attrs.filter(x => x.k.trim()).forEach(x => { a[x.k] = x.v; }); onSave({ classId, label: label.trim(), attributes: a }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '创建'}</button></>}>
      <div>
        <label className={labelCls}>所属类 *</label>
        <select value={classId} onChange={e => setClassId(e.target.value)} className={inputCls}>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>实体标签 *</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="如 张三" className={inputCls} /></div>
      <div>
        <div className="flex items-center justify-between mb-2"><label className={labelCls + ' !mb-0'}>属性值</label><button onClick={() => setAttrs(a => [...a, { k: '', v: '' }])} className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors"><Plus className="w-3 h-3" />添加</button></div>
        {cls?.properties.map(p => {
          const idx = attrs.findIndex(a => a.k === p.name);
          const val = idx >= 0 ? attrs[idx].v : '';
          const setVal = (v: string) => {
            if (idx >= 0) setAttrs(a => a.map((x, i) => i === idx ? { ...x, v } : x));
            else setAttrs(a => [...a, { k: p.name, v }]);
          };
          return (
            <div key={p.name} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{p.name}</span>
              <input value={val} onChange={e => setVal(e.target.value)} placeholder={p.type} className={cn(inputCls, 'flex-1')} />
            </div>
          );
        })}
        {attrs.filter(a => !cls?.properties.find(p => p.name === a.k)).map((a, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={a.k} onChange={e => setAttrs(arr => arr.map((x, j) => j === i ? { ...x, k: e.target.value } : x))} placeholder="属性名" className={cn(inputCls, 'flex-1')} />
            <input value={a.v} onChange={e => setAttrs(arr => arr.map((x, j) => j === i ? { ...x, v: e.target.value } : x))} placeholder="属性值" className={cn(inputCls, 'flex-1')} />
            <button onClick={() => setAttrs(arr => arr.filter((_, j) => j !== i))} className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ── 关系弹窗 ─────────────────────────────────────────── */
function RelationModal({ initial, classes, onClose, onSave }: {
  initial?: OntRelation; classes: OntClass[];
  onClose: () => void; onSave: (r: Omit<OntRelation, 'id'>) => void;
}) {
  const [name, setName]   = useState(initial?.name ?? '');
  const [domain, setDomain] = useState(initial?.domain ?? classes[0]?.name ?? '');
  const [range, setRange]   = useState(initial?.range  ?? classes[0]?.name ?? '');
  const [card, setCard]     = useState(initial?.cardinality ?? '1:N');
  const [desc, setDesc]     = useState(initial?.description ?? '');
  const cardOptions = ['1:1','1:N','N:1','N:M'];
  const classNames = classes.map(c => c.name);

  return (
    <Modal title={initial ? '编辑关系' : '定义关系'} icon={<GitBranch className="w-4 h-4 text-violet-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), domain, range, cardinality: card, description: desc }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '定义'}</button></>}>
      <div><label className={labelCls}>关系名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="如 worksFor" className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>主语（Domain）</label><select value={domain} onChange={e => setDomain(e.target.value)} className={inputCls}>{classNames.map(n => <option key={n}>{n}</option>)}</select></div>
        <div><label className={labelCls}>宾语（Range）</label><select value={range} onChange={e => setRange(e.target.value)} className={inputCls}>{classNames.map(n => <option key={n}>{n}</option>)}</select></div>
      </div>
      <div>
        <label className={labelCls}>基数约束</label>
        <div className="grid grid-cols-4 gap-2">{cardOptions.map(o => (
          <button key={o} onClick={() => setCard(o)} className={cn('py-1.5 text-xs rounded-xl border transition-all', card === o ? 'border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold' : 'border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 hover:border-violet-500/30')}>{o}</button>
        ))}</div>
      </div>
      <div><label className={labelCls}>描述</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} /></div>
    </Modal>
  );
}

/* ── 规则弹窗 ─────────────────────────────────────────── */
function RuleModal({ initial, onClose, onSave }: {
  initial?: OntRule; onClose: () => void; onSave: (r: Omit<OntRule, 'id' | 'enabled'>) => void;
}) {
  const [name, setName]   = useState(initial?.name ?? '');
  const [cond, setCond]   = useState(initial?.condition ?? '');
  const [concl, setConcl] = useState(initial?.conclusion ?? '');

  return (
    <Modal title={initial ? '编辑规则' : '添加推理规则'} icon={<Brain className="w-4 h-4 text-violet-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!name.trim() || !cond.trim() || !concl.trim()) return; onSave({ name: name.trim(), condition: cond.trim(), conclusion: concl.trim() }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '添加'}</button></>}>
      <div><label className={labelCls}>规则名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="如 管理者推断" className={inputCls} /></div>
      <div><label className={labelCls}>前提条件 *（SWRL/伪逻辑语法）</label><textarea value={cond} onChange={e => setCond(e.target.value)} rows={3} placeholder="Employee(?x) ∧ manages(?x, ?y)" className={cn(inputCls, 'resize-none font-mono')} /></div>
      <div className="flex items-center gap-2 px-3"><div className="flex-1 h-px bg-violet-500/20" /><ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" /><div className="flex-1 h-px bg-violet-500/20" /></div>
      <div><label className={labelCls}>结论 *</label><textarea value={concl} onChange={e => setConcl(e.target.value)} rows={2} placeholder="isManagerOf(?x, ?y)" className={cn(inputCls, 'resize-none font-mono')} /></div>
    </Modal>
  );
}

/* ── 知识图谱 SVG ─────────────────────────────────────── */
const GRAPH_NODES = [
  { id: 'c1', label: 'Thing',        type: 'class',  x: 380, y: 50,  color: '#6366f1' },
  { id: 'c2', label: 'Person',       type: 'class',  x: 180, y: 150, color: '#06b6d4' },
  { id: 'c3', label: 'Organization', type: 'class',  x: 580, y: 150, color: '#10b981' },
  { id: 'c4', label: 'Employee',     type: 'class',  x: 120, y: 280, color: '#8b5cf6' },
  { id: 'c5', label: 'Product',      type: 'class',  x: 580, y: 280, color: '#f59e0b' },
  { id: 'c6', label: 'Event',        type: 'class',  x: 380, y: 280, color: '#ec4899' },
  { id: 'e1', label: '张三',          type: 'entity', x: 50,  y: 390, color: '#8b5cf6' },
  { id: 'e3', label: 'Acta Inc.',    type: 'entity', x: 540, y: 390, color: '#10b981' },
];
const GRAPH_EDGES = [
  { from: 'c2', to: 'c1', label: 'subClassOf' }, { from: 'c3', to: 'c1', label: 'subClassOf' },
  { from: 'c4', to: 'c2', label: 'subClassOf' }, { from: 'c5', to: 'c1', label: 'subClassOf' },
  { from: 'c6', to: 'c1', label: 'subClassOf' }, { from: 'e1', to: 'c4', label: 'instanceOf' },
  { from: 'e3', to: 'c3', label: 'instanceOf' }, { from: 'e1', to: 'e3', label: 'worksFor' },
];

function KnowledgeGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="w-full h-full overflow-auto">
      <svg width={750} height={460} className="min-w-full">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#64748b" /></marker>
          <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" /></marker>
        </defs>
        {GRAPH_EDGES.map((e, i) => {
          const f = GRAPH_NODES.find(n => n.id === e.from)!; const t = GRAPH_NODES.find(n => n.id === e.to)!;
          const dx = t.x - f.x; const dy = t.y - f.y; const len = Math.sqrt(dx*dx+dy*dy);
          const r = 26;
          return (
            <g key={i}>
              <line x1={f.x+(dx/len)*r} y1={f.y+(dy/len)*r} x2={t.x-(dx/len)*r} y2={t.y-(dy/len)*r}
                stroke={e.label==='instanceOf'?'#94a3b8':'#64748b'} strokeWidth={1.5}
                strokeDasharray={e.label==='instanceOf'?'4,3':undefined} markerEnd={e.label==='instanceOf'?'url(#arr2)':'url(#arr)'}
                opacity={hovered&&hovered!==e.from&&hovered!==e.to?0.2:0.7} />
              <text x={(f.x+t.x)/2} y={(f.y+t.y)/2-4} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>{e.label}</text>
            </g>
          );
        })}
        {GRAPH_NODES.map(node => {
          const isEnt = node.type === 'entity';
          const isHov = hovered === node.id;
          const dimmed = hovered !== null && !isHov && !GRAPH_EDGES.some(e => (e.from===hovered&&e.to===node.id)||(e.to===hovered&&e.from===node.id));
          return (
            <g key={node.id} transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer', opacity: dimmed?0.25:1, transition:'opacity 0.15s' }}
              onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)}>
              {isEnt ? <rect x={-28} y={-16} width={56} height={32} rx={6} fill={node.color+'18'} stroke={node.color} strokeWidth={isHov?2:1.5} />
                     : <circle r={26} fill={node.color+'18'} stroke={node.color} strokeWidth={isHov?2:1.5} />}
              <text textAnchor="middle" dy="0.35em" style={{ fontSize: 11, fontWeight: 600, fill: isHov ? node.color : '#cbd5e1', transition: 'fill 0.1s' }}>{node.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── 类树节点 ─────────────────────────────────────────── */
function ClassTreeNode({ cls, all, selected, onSelect, depth }: { cls: OntClass; all: OntClass[]; selected: OntClass | null; onSelect: (c: OntClass) => void; depth: number; }) {
  const children = all.filter(c => c.parent === cls.id);
  const [open, setOpen] = useState(depth < 2);
  const isSelected = selected?.id === cls.id;
  return (
    <div>
      <div className="flex items-center">
        <button onClick={() => { onSelect(cls); if (children.length) setOpen(v => !v); }}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={cn('flex-1 flex items-center gap-1.5 py-1.5 pr-3 text-xs transition-colors',
            isSelected ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-black/4 dark:hover:bg-white/4')}>
          {children.length > 0
            ? <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-90')} />
            : <div className="w-3 h-3 shrink-0" />}
          <Box className={cn('w-3 h-3 shrink-0', isSelected ? 'text-violet-400' : 'text-slate-400')} />
          <span className="truncate">{cls.name}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && children.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }} className="overflow-hidden">
            {children.map(child => <ClassTreeNode key={child.id} cls={child} all={all} selected={selected} onSelect={onSelect} depth={depth + 1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── OntologyKBPage ─────────────────────────────────────── */
export default function OntologyKBPage({ kb: initialKb, isGlobal: initialGlobal, onBack, onRename, onSetGlobal }: {
  kb: OntKB; isGlobal: boolean; onBack: () => void; onRename: (n: string) => void; onSetGlobal: () => void;
}) {
  const [kb, setKb] = useState(initialKb);
  const [isGlobal, setIsGlobal] = useState(initialGlobal);
  const [activeTab, setActiveTab] = useState<OntTab>('classes');
  const [classes, setClasses]     = useState<OntClass[]>(INIT_CLASSES);
  const [entities, setEntities]   = useState<OntEntity[]>(INIT_ENTITIES);
  const [relations, setRelations] = useState<OntRelation[]>(INIT_RELATIONS);
  const [rules, setRules]         = useState<OntRule[]>(INIT_RULES);
  const [selectedClass, setSelectedClass] = useState<OntClass | null>(INIT_CLASSES[0]);
  const [entitySearch, setEntitySearch]   = useState('');

  // modal state
  const [classModal,    setClassModal]    = useState<'new' | OntClass | null>(null);
  const [entityModal,   setEntityModal]   = useState<'new' | OntEntity | null>(null);
  const [relationModal, setRelationModal] = useState<'new' | OntRelation | null>(null);
  const [ruleModal,     setRuleModal]     = useState<'new' | OntRule | null>(null);

  function handleRename(name: string) { setKb(k => ({ ...k, name })); onRename(name); }
  function handleSetGlobal() { setIsGlobal(v => !v); onSetGlobal(); }

  function saveClass(data: Omit<OntClass, 'id'>) {
    if (classModal === 'new') setClasses(p => [...p, { ...data, id: `c-${Date.now()}` }]);
    else if (classModal) setClasses(p => p.map(c => c.id === classModal.id ? { ...c, ...data } : c));
    setClassModal(null);
  }
  function deleteClass(id: string) { setClasses(p => p.filter(c => c.id !== id)); if (selectedClass?.id === id) setSelectedClass(null); }

  function saveEntity(data: Omit<OntEntity, 'id'>) {
    if (entityModal === 'new') setEntities(p => [...p, { ...data, id: `e-${Date.now()}` }]);
    else if (entityModal) setEntities(p => p.map(e => e.id === entityModal.id ? { ...e, ...data } : e));
    setEntityModal(null);
  }
  function deleteEntity(id: string) { setEntities(p => p.filter(e => e.id !== id)); }

  function saveRelation(data: Omit<OntRelation, 'id'>) {
    if (relationModal === 'new') setRelations(p => [...p, { ...data, id: `r-${Date.now()}` }]);
    else if (relationModal) setRelations(p => p.map(r => r.id === relationModal.id ? { ...r, ...data } : r));
    setRelationModal(null);
  }
  function deleteRelation(id: string) { setRelations(p => p.filter(r => r.id !== id)); }

  function saveRule(data: Omit<OntRule, 'id' | 'enabled'>) {
    if (ruleModal === 'new') setRules(p => [...p, { ...data, id: `ru-${Date.now()}`, enabled: true }]);
    else if (ruleModal) setRules(p => p.map(r => r.id === ruleModal.id ? { ...r, ...data } : r));
    setRuleModal(null);
  }
  function deleteRule(id: string) { setRules(p => p.filter(r => r.id !== id)); }
  function toggleRule(id: string) { setRules(p => p.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)); }

  const filteredEntities = entities.filter(e =>
    e.label.toLowerCase().includes(entitySearch.toLowerCase()) ||
    classes.find(c => c.id === e.classId)?.name.toLowerCase().includes(entitySearch.toLowerCase())
  );
  function getClassName(id: string) { return classes.find(c => c.id === id)?.name ?? id; }

  const TABS = [
    { id: 'classes',   label: '类定义',   icon: <Box className="w-4 h-4" /> },
    { id: 'entities',  label: '实体实例', icon: <Layers className="w-4 h-4" /> },
    { id: 'relations', label: '关系体系', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'rules',     label: '推理规则', icon: <Brain className="w-4 h-4" /> },
    { id: 'graph',     label: '知识图谱', icon: <Eye className="w-4 h-4" /> },
    { id: 'dashboard', label: '数据大盘', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <>
      <KBPageShell name={kb.name} isGlobal={isGlobal}
        icon={<div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shrink-0"><Network className="w-4 h-4 text-white" /></div>}
        tabs={TABS} activeTab={activeTab} onTabChange={id => setActiveTab(id as OntTab)}
        onBack={onBack} onRename={handleRename} onSetGlobal={handleSetGlobal}>

        {/* ── 类定义 ── */}
        {activeTab === 'classes' && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="w-52 shrink-0 border-r border-[var(--border-subtle)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">类层次</span>
                <button onClick={() => setClassModal('new')} title="新建类"
                  className="p-1 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {classes.filter(c => !c.parent).map(root => <ClassTreeNode key={root.id} cls={root} all={classes} selected={selectedClass} onSelect={setSelectedClass} depth={0} />)}
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto p-5">
              {selectedClass ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedClass.name}</h2>
                      {selectedClass.parent && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><ChevronRight className="w-3 h-3" />子类于 {getClassName(selectedClass.parent)}</p>}
                      <p className="text-sm text-slate-500 mt-1 text-pretty">{selectedClass.description}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setClassModal(selectedClass)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteClass(selectedClass.id)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">属性定义</h3>
                      <button onClick={() => setClassModal(selectedClass)} className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"><Plus className="w-3 h-3" />添加属性</button>
                    </div>
                    {selectedClass.properties.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3 text-center">暂无属性定义</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                        <table className="w-full text-xs whitespace-nowrap">
                          <thead><tr className="border-b border-[var(--border-subtle)] bg-black/3 dark:bg-white/3">
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">属性名</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">类型</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">必填</th>
                          </tr></thead>
                          <tbody>{selectedClass.properties.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-black/3 dark:hover:bg-white/3">
                              <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-100">{p.name}</td>
                              <td className="px-3 py-2"><span className={cn(BADGE, TYPE_COLORS[p.type] ?? '')}>{p.type}</span></td>
                              <td className="px-3 py-2"><span className={cn(BADGE, p.required ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20')}>{p.required?'必填':'可选'}</span></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">实例预览</h3>
                    <div className="flex flex-wrap gap-2">
                      {entities.filter(e => e.classId === selectedClass.id).map(ent => (
                        <span key={ent.id} className="text-xs px-2 py-1 rounded-lg border border-violet-500/20 bg-violet-500/8 text-violet-600 dark:text-violet-400 font-medium">{ent.label}</span>
                      ))}
                      {entities.filter(e => e.classId === selectedClass.id).length === 0 && <p className="text-xs text-slate-500">暂无实例</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">选择左侧类查看详情</div>
              )}
            </div>
          </div>
        )}

        {/* ── 实体实例 ── */}
        {activeTab === 'entities' && (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-5 gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={entitySearch} onChange={e => setEntitySearch(e.target.value)} placeholder="搜索实体..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-violet-500/40" />
              </div>
              <button onClick={() => setEntityModal('new')} className={btnPrimary}><Plus className="w-3.5 h-3.5" />新建实体</button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead><tr className="border-b border-[var(--border-subtle)] bg-black/3 dark:bg-white/3">
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium">标签</th>
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium">类型</th>
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium">属性摘要</th>
                    <th className="px-4 py-2.5" />
                  </tr></thead>
                  <tbody>{filteredEntities.map(ent => (
                    <tr key={ent.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-black/3 dark:hover:bg-white/3">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{ent.label}</td>
                      <td className="px-4 py-2.5"><span className={cn(BADGE, 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20')}>{getClassName(ent.classId)}</span></td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{Object.entries(ent.attributes).map(([k,v]) => `${k}: ${v}`).join(' · ')}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-0.5 justify-end">
                          <button onClick={() => setEntityModal(ent)} className="p-1.5 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => deleteEntity(ent.id)} className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 关系体系 ── */}
        {activeTab === 'relations' && (
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{relations.length} 条关系定义</h2>
              <button onClick={() => setRelationModal('new')} className={btnPrimary}><Plus className="w-3.5 h-3.5" />定义关系</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relations.map(rel => (
                <div key={rel.id} className="glass rounded-xl p-4 group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">{rel.name}</span>
                      <span className={cn(BADGE, 'bg-slate-500/10 text-slate-500 border-slate-500/20')}>{rel.cardinality}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setRelationModal(rel)} className="p-1 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => deleteRelation(rel.id)} className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className={cn(BADGE, 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20')}>{rel.domain}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className={cn(BADGE, 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20')}>{rel.range}</span>
                  </div>
                  <p className="text-xs text-slate-500 text-pretty">{rel.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 推理规则 ── */}
        {activeTab === 'rules' && (
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{rules.length} 条推理规则</h2>
                <p className="text-xs text-slate-500 mt-0.5">{rules.filter(r => r.enabled).length} 条已启用</p>
              </div>
              <button onClick={() => setRuleModal('new')} className={btnPrimary}><Plus className="w-3.5 h-3.5" />添加规则</button>
            </div>
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.id} className={cn('glass rounded-xl p-4 group border-l-2 transition-all', rule.enabled ? 'border-violet-500/50' : 'border-[var(--border-subtle)]')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className={cn('w-4 h-4 shrink-0', rule.enabled ? 'text-violet-400' : 'text-slate-400')} />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleRule(rule.id)}
                        className={cn('w-9 h-5 rounded-full relative transition-all duration-200', rule.enabled ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-black/15 dark:bg-white/15')}>
                        <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow', rule.enabled ? 'left-[calc(100%-1.25rem)]' : 'left-0.5')} />
                      </button>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setRuleModal(rule)} className="p-1 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => deleteRule(rule.id)} className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-black/8 dark:bg-white/5 px-3 py-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />前提条件</p>
                      <code className="text-xs font-mono text-cyan-600 dark:text-cyan-400 leading-relaxed break-all whitespace-pre-wrap">{rule.condition}</code>
                    </div>
                    <div className="flex items-center gap-2 px-1"><div className="flex-1 h-px bg-violet-500/20" /><ArrowRight className="w-3 h-3 text-violet-400 shrink-0" /><div className="flex-1 h-px bg-violet-500/20" /></div>
                    <div className="rounded-lg bg-violet-500/8 px-3 py-2">
                      <p className="text-[10px] text-violet-400 uppercase tracking-wide font-medium mb-1">结论</p>
                      <code className="text-xs font-mono text-violet-600 dark:text-violet-300 leading-relaxed break-all">{rule.conclusion}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 知识图谱 ── */}
        {activeTab === 'graph' && (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-5">
            <div className="flex items-center gap-3 mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">知识图谱可视化</h2>
              <span className="text-xs text-slate-500">{GRAPH_NODES.length} 节点 · {GRAPH_EDGES.length} 边</span>
            </div>
            <div className="flex-1 min-h-0 glass rounded-xl overflow-hidden p-3">
              <KnowledgeGraph />
            </div>
          </div>
        )}

        {/* ── 数据大盘 ── */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto min-h-0 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '类定义数', value: String(classes.length),   sub: '个', icon: <Box         className="w-5 h-5 text-violet-400" />, color: 'from-violet-500/20 to-purple-500/10' },
                { label: '实体数',   value: String(entities.length),  sub: '个', icon: <Layers      className="w-5 h-5 text-cyan-400"   />, color: 'from-cyan-500/20 to-blue-500/10' },
                { label: '关系数',   value: String(relations.length), sub: '条', icon: <GitBranch   className="w-5 h-5 text-emerald-400"/>, color: 'from-emerald-500/20 to-teal-500/10' },
                { label: '推理规则', value: String(rules.length),     sub: '条', icon: <Brain       className="w-5 h-5 text-amber-400"  />, color: 'from-amber-500/20 to-orange-500/10' },
              ].map(s => (
                <div key={s.label} className={cn('glass rounded-2xl p-4 bg-gradient-to-br', s.color)}>
                  <div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-500">{s.label}</span>{s.icon}</div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}<span className="text-sm font-normal text-slate-400 ml-1">{s.sub}</span></p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Box className="w-4 h-4 text-violet-400" />各类实例数</h3>
                {classes.map(c => { const cnt = entities.filter(e => e.classId === c.id).length; return (
                  <div key={c.id} className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{c.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: cnt > 0 ? `${(cnt / entities.length) * 100}%` : '0%' }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-violet-500" />
                    </div>
                    <span className="text-xs text-slate-400 w-4 text-right">{cnt}</span>
                  </div>
                );})}
              </div>
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" />规则启用状态</h3>
                {rules.map(r => (
                  <div key={r.id} className="flex items-center gap-2 mb-3">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', r.enabled ? 'bg-emerald-400' : 'bg-slate-500')} />
                    <span className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">{r.name}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', r.enabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20')}>{r.enabled ? '启用' : '停用'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </KBPageShell>

      {/* ── 弹窗 ── */}
      <AnimatePresence>
        {classModal !== null && <ClassModal initial={classModal === 'new' ? undefined : classModal} allClasses={classes} onClose={() => setClassModal(null)} onSave={saveClass} />}
        {entityModal !== null && <EntityModal initial={entityModal === 'new' ? undefined : entityModal} classes={classes} onClose={() => setEntityModal(null)} onSave={saveEntity} />}
        {relationModal !== null && <RelationModal initial={relationModal === 'new' ? undefined : relationModal} classes={classes} onClose={() => setRelationModal(null)} onSave={saveRelation} />}
        {ruleModal !== null && <RuleModal initial={ruleModal === 'new' ? undefined : ruleModal} onClose={() => setRuleModal(null)} onSave={saveRule} />}
      </AnimatePresence>
    </>
  );
}
