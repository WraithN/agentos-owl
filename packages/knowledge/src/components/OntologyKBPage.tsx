import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Plus, Pencil, Trash2, Search,
  ChevronRight, Box, ArrowRight,
  Brain, Eye, AlertCircle, BarChart2, Check,
} from 'lucide-react';
import { cn } from '@owl-os/core';
import KBPageShell from './KBPageShell.js';
import ClassModal from './ontology/ClassModal.js';
import EntityModal from './ontology/EntityModal.js';
import RelationModal from './ontology/RelationModal.js';
import RuleModal from './ontology/RuleModal.js';
import KnowledgeGraph from './ontology/KnowledgeGraph.js';
import ClassTreeNode from './ontology/ClassTreeNode.js';
import type { OntTab, OntClass, OntEntity, OntRelation, OntRule, OntKB } from './ontology/types.js';
import { INIT_CLASSES, INIT_ENTITIES, INIT_RELATIONS, INIT_RULES, TYPE_COLORS, BADGE } from './ontology/mock.js';

export default function OntologyKBPage({ kb: initialKb, isGlobal: initialGlobal, onBack, onRename, onSetGlobal }: {
  kb: OntKB; isGlobal: boolean; onBack: () => void; onRename: (n: string) => void; onSetGlobal: () => void;
}) {
  const [kb, setKb] = useState(initialKb);
  const [isGlobal, setIsGlobal] = useState(initialGlobal);
  const [activeTab, setActiveTab] = useState<OntTab>('classes');
  const [classes, setClasses] = useState<OntClass[]>(INIT_CLASSES);
  const [entities, setEntities] = useState<OntEntity[]>(INIT_ENTITIES);
  const [relations, setRelations] = useState<OntRelation[]>(INIT_RELATIONS);
  const [rules, setRules] = useState<OntRule[]>(INIT_RULES);
  const [selectedClass, setSelectedClass] = useState<OntClass | null>(INIT_CLASSES[0]);
  const [entitySearch, setEntitySearch] = useState('');

  const [classModal, setClassModal] = useState<'new' | OntClass | null>(null);
  const [entityModal, setEntityModal] = useState<'new' | OntEntity | null>(null);
  const [relationModal, setRelationModal] = useState<'new' | OntRelation | null>(null);
  const [ruleModal, setRuleModal] = useState<'new' | OntRule | null>(null);

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
    { id: 'classes', label: '类定义', icon: <Box className="w-4 h-4" /> },
    { id: 'entities', label: '实体实例', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg> },
    { id: 'relations', label: '关系体系', icon: <ArrowRight className="w-4 h-4" /> },
    { id: 'rules', label: '推理规则', icon: <Brain className="w-4 h-4" /> },
    { id: 'graph', label: '知识图谱', icon: <Eye className="w-4 h-4" /> },
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
                              <td className="px-3 py-2"><span className={cn(BADGE, p.required ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20')}>{p.required ? '必填' : '可选'}</span></td>
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
              <button onClick={() => setEntityModal('new')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity"><Plus className="w-3.5 h-3.5" />新建实体</button>
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
                      <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{Object.entries(ent.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}</td>
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
              <button onClick={() => setRelationModal('new')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity"><Plus className="w-3.5 h-3.5" />定义关系</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relations.map(rel => (
                <div key={rel.id} className="glass rounded-xl p-4 group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-violet-400 shrink-0" />
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
              <button onClick={() => setRuleModal('new')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity"><Plus className="w-3.5 h-3.5" />添加规则</button>
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
              <span className="text-xs text-slate-500">8 节点 · 8 边</span>
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
                { label: '类定义数', value: String(classes.length), sub: '个', icon: <Box className="w-5 h-5 text-violet-400" />, color: 'from-violet-500/20 to-purple-500/10' },
                { label: '实体数', value: String(entities.length), sub: '个', icon: <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>, color: 'from-cyan-500/20 to-blue-500/10' },
                { label: '关系数', value: String(relations.length), sub: '条', icon: <ArrowRight className="w-5 h-5 text-emerald-400" />, color: 'from-emerald-500/20 to-teal-500/10' },
                { label: '推理规则', value: String(rules.length), sub: '条', icon: <Brain className="w-5 h-5 text-amber-400" />, color: 'from-amber-500/20 to-orange-500/10' },
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
                ); })}
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
