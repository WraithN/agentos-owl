/* 工作流编排页 — 极光渐变 + 升级玻璃拟态 */
import React, {
  useState, useRef, useCallback, useEffect,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play, Square, RotateCcw, X, Save, Settings2,
  ZoomIn, ZoomOut, Maximize2,
  ChevronDown, ChevronUp, Plus,
  Zap, Bot, Wrench, GitBranch, Flag, ArrowRightCircle,
  LayoutGrid, List, Check, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputCls as globalInputCls } from '@/lib/ui-styles';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type NodeType = 'input' | 'agent' | 'tool' | 'condition' | 'output';

interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

// ─── 节点尺寸常量 ─────────────────────────────────────────────────────────────

const NODE_W = 168;
const NODE_H = 72;

// ─── 节点类型配置（极光渐变版） ───────────────────────────────────────────────

const NODE_DEFS: Record<NodeType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
  text: string;
  gradFrom: string;
  gradTo: string;
  glowRgb: string;
  hasInput: boolean;
  hasOutput: boolean;
  configFields: { key: string; label: string; placeholder: string; multiline?: boolean }[];
}> = {
  input: {
    label: '输入节点',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: '#00F5A0',
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-400/8',
    text: 'text-emerald-500',
    gradFrom: '#00F5A0',
    gradTo: '#00D4FF',
    glowRgb: '0,245,160',
    hasInput: false,
    hasOutput: true,
    configFields: [
      { key: 'triggerEvent', label: '触发事件', placeholder: '如：schedule, webhook, manual' },
      { key: 'cronExpr',    label: 'Cron 表达式', placeholder: '0 9 * * 1-5' },
    ],
  },
  agent: {
    label: 'Agent 节点',
    icon: <Bot className="w-3.5 h-3.5" />,
    color: '#A855F7',
    border: 'border-purple-400/40',
    bg: 'bg-purple-400/8',
    text: 'text-purple-500',
    gradFrom: '#A855F7',
    gradTo: '#6366F1',
    glowRgb: '168,85,247',
    hasInput: true,
    hasOutput: true,
    configFields: [
      { key: 'agentName', label: 'Agent 名称', placeholder: '如：Aria, Coder, Analyst' },
      { key: 'model',     label: '模型',        placeholder: 'GPT-4o / Claude 3.5' },
      { key: 'prompt',    label: '系统提示词',  placeholder: '输入 Agent 的系统提示...', multiline: true },
    ],
  },
  tool: {
    label: '工具节点',
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: '#3B82F6',
    border: 'border-blue-400/40',
    bg: 'bg-blue-400/8',
    text: 'text-blue-500',
    gradFrom: '#3B82F6',
    gradTo: '#06B6D4',
    glowRgb: '59,130,246',
    hasInput: true,
    hasOutput: true,
    configFields: [
      { key: 'toolName', label: '工具名称', placeholder: '如：web-search, code-runner' },
      { key: 'params',   label: '调用参数', placeholder: 'JSON 格式参数', multiline: true },
    ],
  },
  condition: {
    label: '条件节点',
    icon: <GitBranch className="w-3.5 h-3.5" />,
    color: '#F59E0B',
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/8',
    text: 'text-amber-500',
    gradFrom: '#F59E0B',
    gradTo: '#EF4444',
    glowRgb: '245,158,11',
    hasInput: true,
    hasOutput: true,
    configFields: [
      { key: 'expression', label: '判断表达式', placeholder: '如：output.score > 0.8' },
      { key: 'trueLabel',  label: 'True 分支标签', placeholder: 'True' },
      { key: 'falseLabel', label: 'False 分支标签', placeholder: 'False' },
    ],
  },
  output: {
    label: '输出节点',
    icon: <Flag className="w-3.5 h-3.5" />,
    color: '#F43F5E',
    border: 'border-rose-400/40',
    bg: 'bg-rose-400/8',
    text: 'text-rose-500',
    gradFrom: '#F43F5E',
    gradTo: '#EC4899',
    glowRgb: '244,63,94',
    hasInput: true,
    hasOutput: false,
    configFields: [
      { key: 'format',   label: '输出格式',  placeholder: 'JSON / Markdown / Plain' },
      { key: 'target',   label: '发送目标',  placeholder: '如：notification, webhook' },
    ],
  },
};

// ─── 初始画布数据 ─────────────────────────────────────────────────────────────

const INIT_NODES: CanvasNode[] = [
  { id: 'n1', type: 'input',     name: '定时触发',     x: 80,  y: 80,  config: { triggerEvent: 'schedule', cronExpr: '0 9 * * 1-5' } },
  { id: 'n2', type: 'agent',     name: 'Analyst 分析', x: 340, y: 60,  config: { agentName: 'Analyst', model: 'GPT-4o', prompt: '分析竞品动态并提取关键信息' } },
  { id: 'n3', type: 'tool',      name: '网页搜索',     x: 340, y: 200, config: { toolName: 'web-search', params: '{"query": "{{input}}"}' } },
  { id: 'n4', type: 'condition', name: '结果评分',     x: 600, y: 120, config: { expression: 'score > 0.7', trueLabel: '高质量', falseLabel: '重试' } },
  { id: 'n5', type: 'output',    name: '发送报告',     x: 860, y: 120, config: { format: 'Markdown', target: 'notification' } },
];

const INIT_EDGES: CanvasEdge[] = [
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n1', target: 'n3' },
  { id: 'e3', source: 'n2', target: 'n4' },
  { id: 'e4', source: 'n3', target: 'n4' },
  { id: 'e5', source: 'n4', target: 'n5' },
];

// ─── 布局算法常量 ─────────────────────────────────────────────────────────────

const LAYOUT_H_GAP = 220;   // 层间水平间距
const LAYOUT_V_GAP = 100;   // 同层节点垂直间距
const LAYOUT_PAD_X = 60;    // 左边距
const LAYOUT_PAD_Y = 60;    // 上边距（绝对坐标偏移）

// ─── 已保存工作流类型 ─────────────────────────────────────────────────────────

interface SavedWorkflow {
  id: string;
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  savedAt: Date;
}

// 预置两条已保存的工作流（mock）
const PRESET_WORKFLOWS: SavedWorkflow[] = [
  {
    id: 'wf-preset-1',
    name: '每日竞品监控',
    savedAt: new Date('2026-06-10T09:00:00'),
    nodes: INIT_NODES,
    edges: INIT_EDGES,
  },
  {
    id: 'wf-preset-2',
    name: '代码审查自动化',
    savedAt: new Date('2026-06-08T14:30:00'),
    nodes: [
      { id: 'p2n1', type: 'input',  name: 'PR 触发',    x: 80,  y: 80,  config: { triggerEvent: 'webhook', cronExpr: '' } },
      { id: 'p2n2', type: 'agent',  name: 'Coder 审查', x: 340, y: 80,  config: { agentName: 'Coder', model: 'Claude 3.5 Sonnet', prompt: '审查代码质量与安全性' } },
      { id: 'p2n3', type: 'output', name: '输出评论',   x: 600, y: 80,  config: { format: 'Markdown', target: 'github-comment' } },
    ],
    edges: [
      { id: 'p2e1', source: 'p2n1', target: 'p2n2' },
      { id: 'p2e2', source: 'p2n2', target: 'p2n3' },
    ],
  },
];

/**
 * Kahn's 拓扑排序 + 层次化布局
 * 返回 nodeId -> {x, y} 的新坐标映射
 */
function computeAutoLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): Map<string, { x: number; y: number }> {
  const nodeIds = nodes.map(n => n.id);
  const inDegree = new Map<string, number>(nodeIds.map(id => [id, 0]));
  const outAdj   = new Map<string, string[]>(nodeIds.map(id => [id, []]));

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    outAdj.get(e.source)?.push(e.target);
  }

  // BFS 分层
  let queue = nodeIds.filter(id => (inDegree.get(id) ?? 0) === 0);
  const layers: string[][] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    layers.push([...queue]);
    queue.forEach(id => visited.add(id));
    const next: string[] = [];
    for (const id of queue) {
      for (const tgt of (outAdj.get(id) ?? [])) {
        const deg = (inDegree.get(tgt) ?? 1) - 1;
        inDegree.set(tgt, deg);
        if (deg === 0 && !visited.has(tgt)) next.push(tgt);
      }
    }
    queue = next;
  }

  // 孤立节点（循环依赖或断连）放到末层
  const unvisited = nodeIds.filter(id => !visited.has(id));
  if (unvisited.length > 0) layers.push(unvisited);

  // 计算总高度用于垂直居中
  const layerHeights = layers.map(
    layer => layer.length * NODE_H + (layer.length - 1) * LAYOUT_V_GAP
  );
  const maxLayerH = Math.max(...layerHeights);

  const positions = new Map<string, { x: number; y: number }>();

  layers.forEach((layer, li) => {
    const layerH = layerHeights[li];
    const startY  = LAYOUT_PAD_Y + (maxLayerH - layerH) / 2;
    layer.forEach((id, ni) => {
      positions.set(id, {
        x: LAYOUT_PAD_X + li * (NODE_W + LAYOUT_H_GAP),
        y: startY + ni * (NODE_H + LAYOUT_V_GAP),
      });
    });
  });

  return positions;
}

/**
 * 根据所有节点包围盒计算 fit-to-view 的 transform
 */
function computeFitView(
  nodes: CanvasNode[],
  canvasW: number,
  canvasH: number,
): { x: number; y: number; scale: number } {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 };

  const padding = 64;
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x + NODE_W));
  const maxY = Math.max(...nodes.map(n => n.y + NODE_H));

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const scaleX = (canvasW - padding * 2) / contentW;
  const scaleY = (canvasH - padding * 2) / contentH;
  const scale   = Math.min(scaleX, scaleY, 1.4);

  return {
    x: (canvasW - contentW * scale) / 2 - minX * scale,
    y: (canvasH - contentH * scale) / 2 - minY * scale,
    scale,
  };
}

function inputPort(node: CanvasNode) {
  return { x: node.x, y: node.y + NODE_H / 2 };
}
function outputPort(node: CanvasNode) {
  return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
}

// ─── 辅助：贝塞尔路径 ─────────────────────────────────────────────────────────

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function WorkflowSettings() {
  const [nodes, setNodes] = useState<CanvasNode[]>(INIT_NODES);
  const [edges, setEdges] = useState<CanvasEdge[]>(INIT_EDGES);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [varPanelOpen, setVarPanelOpen] = useState(false);
  const [layouting, setLayouting] = useState(false);

  // ── 工作流列表 & 保存状态 ─────────────────────────────────────────────────
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>(PRESET_WORKFLOWS);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>('wf-preset-1');
  const [isDirty, setIsDirty] = useState(false);
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [listPage, setListPage] = useState(0);
  const LIST_PAGE_SIZE = 5;
  // 内联标题编辑状态（无弹窗保存）
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  // 删除二次确认
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // 拖拽节点状态
  const dragging = useRef<{ nodeId: string; ox: number; oy: number } | null>(null);
  // 连线绘制状态
  const connecting = useRef<{ sourceId: string; curX: number; curY: number } | null>(null);
  const [connectingState, setConnectingState] = useState<{ sourceId: string; curX: number; curY: number } | null>(null);
  // 画布平移状态
  const panning = useRef<{ startMouseX: number; startMouseY: number; startTx: number; startTy: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ── 选中节点时同步 config ──────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  useEffect(() => {
    if (selectedNode) {
      setConfigValues({ name: selectedNode.name, ...selectedNode.config });
      setConfigPanelOpen(true);
    }
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 画布坐标转换 ──────────────────────────────────────────────────────────
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top  - transform.y) / transform.scale,
    };
  }, [transform]);

  // ── 滚轮缩放 ──────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(prev => {
      const ns = Math.min(3, Math.max(0.3, prev.scale * factor));
      return {
        scale: ns,
        x: mx - (mx - prev.x) * (ns / prev.scale),
        y: my - (my - prev.y) * (ns / prev.scale),
      };
    });
  }, []);

  // ── 鼠标按下：节点拖拽 / 连线 / 画布平移 ─────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // 点击空白区域：清空选中 + 关闭配置面板 + 开始平移
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConfigPanelOpen(false);
    panning.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startTx: transform.x,
      startTy: transform.y,
    };
  }, [transform]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
    const pos = toCanvas(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragging.current = { nodeId, ox: pos.x - node.x, oy: pos.y - node.y };
  }, [nodes, toCanvas]);

  const handleOutputPortMouseDown = useCallback((e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    const pos = toCanvas(e.clientX, e.clientY);
    connecting.current = { sourceId, curX: pos.x, curY: pos.y };
    setConnectingState({ sourceId, curX: pos.x, curY: pos.y });
  }, [toCanvas]);

  const handleInputPortMouseUp = useCallback((e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!connecting.current) return;
    const { sourceId } = connecting.current;
    if (sourceId !== targetId) {
      // 避免重复连线
      const exists = edges.some(ed => ed.source === sourceId && ed.target === targetId);
      if (!exists) {
        touchEdges(prev => [...prev, { id: `e${Date.now()}`, source: sourceId, target: targetId }]);
      }
    }
    connecting.current = null;
    setConnectingState(null);
  }, [edges]);

  // ── 全局鼠标移动 ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 节点拖拽
    if (dragging.current) {
      const pos = toCanvas(e.clientX, e.clientY);
      const { nodeId, ox, oy } = dragging.current;
      touchNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, x: pos.x - ox, y: pos.y - oy } : n
      ));
      return;
    }
    // 连线绘制
    if (connecting.current) {
      const pos = toCanvas(e.clientX, e.clientY);
      connecting.current.curX = pos.x;
      connecting.current.curY = pos.y;
      setConnectingState({ ...connecting.current });
      return;
    }
    // 画布平移
    if (panning.current) {
      const pan = panning.current; // 捕获引用，防止 state 更新回调执行时已被置 null
      const dx = e.clientX - pan.startMouseX;
      const dy = e.clientY - pan.startMouseY;
      setTransform(prev => ({
        ...prev,
        x: pan.startTx + dx,
        y: pan.startTy + dy,
      }));
    }
  }, [toCanvas]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
    panning.current = null;
    if (connecting.current) {
      connecting.current = null;
      setConnectingState(null);
    }
  }, []);

  // ── 删除选中节点 / 边 ──────────────────────────────────────────────────────
  const deleteNode = useCallback((nodeId: string) => {
    touchNodes(prev => prev.filter(n => n.id !== nodeId));
    touchEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setConfigPanelOpen(false);
    }
  }, [selectedNodeId]);

  const deleteEdge = useCallback((edgeId: string) => {
    touchEdges(prev => prev.filter(e => e.id !== edgeId));
    setSelectedEdgeId(null);
  }, []);

  // ── 悬浮按钮添加节点 ──────────────────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);

  const addNodeByType = useCallback((type: NodeType) => {
    const def = NODE_DEFS[type];
    // 将节点放在当前画布可见区域中央
    const canvas = canvasRef.current;
    let cx = 400, cy = 250;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      cx = (rect.width / 2 - transform.x) / transform.scale;
      cy = (rect.height / 2 - transform.y) / transform.scale;
    }
    const newNode: CanvasNode = {
      id: `n${Date.now()}`,
      type,
      name: def.label,
      x: cx - NODE_W / 2 + (Math.random() - 0.5) * 80,
      y: cy - NODE_H / 2 + (Math.random() - 0.5) * 60,
      config: {},
    };
    touchNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setFabOpen(false);
  }, [transform, touchNodes]);

  // ── 保存节点配置 ──────────────────────────────────────────────────────────
  const saveConfig = useCallback(() => {
    if (!selectedNodeId) return;
    const { name, ...rest } = configValues;
    touchNodes(prev => prev.map(n =>
      n.id === selectedNodeId ? { ...n, name: name ?? n.name, config: rest } : n
    ));
  }, [selectedNodeId, configValues]);

  // ── 重置视图 ──────────────────────────────────────────────────────────────
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  // ── 加载已有工作流 ────────────────────────────────────────────────────────
  function loadWorkflow(wf: SavedWorkflow) {
    setNodes(wf.nodes);
    setEdges(wf.edges);
    setTransform({ x: 0, y: 0, scale: 1 });
    setCurrentWorkflowId(wf.id);
    setIsDirty(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConfigPanelOpen(false);
  }

  // ── 删除工作流 ────────────────────────────────────────────────────────────
  function deleteWorkflow(id: string) {
    setSavedWorkflows(prev => {
      const next = prev.filter(w => w.id !== id);
      // 如果删除的是当前工作流，切换到第一个或清空
      if (id === currentWorkflowId) {
        if (next.length > 0) {
          setNodes(next[0].nodes);
          setEdges(next[0].edges);
          setCurrentWorkflowId(next[0].id);
        } else {
          setNodes(INIT_NODES);
          setEdges(INIT_EDGES);
          setCurrentWorkflowId('');
        }
        setIsDirty(false);
        setSelectedNodeId(null);
        setConfigPanelOpen(false);
      }
      return next;
    });
    setDeleteConfirmId(null);
  }

  // ── 打开内联标题编辑 ───────────────────────────────────────────────────────
  function startEditTitle() {
    const current = savedWorkflows.find(w => w.id === currentWorkflowId);
    setTitleDraft(current?.name ?? '未命名工作流');
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 30);
  }

  // ── 执行保存（内联，无弹窗） ───────────────────────────────────────────────
  function commitSave(nameOverride?: string) {
    const name = (nameOverride ?? titleDraft ?? savedWorkflows.find(w => w.id === currentWorkflowId)?.name ?? '未命名工作流').trim() || '未命名工作流';
    const now = new Date();
    setSavedWorkflows(prev => {
      const idx = prev.findIndex(w => w.id === currentWorkflowId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], name, nodes, edges, savedAt: now };
        return updated;
      }
      const newId = `wf-${Date.now()}`;
      setCurrentWorkflowId(newId);
      return [...prev, { id: newId, name, nodes, edges, savedAt: now }];
    });
    setIsDirty(false);
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { commitSave(); }
    if (e.key === 'Escape') { setEditingTitle(false); }
  }

  // ── 节点/边变化时标记 dirty ───────────────────────────────────────────────
  // （通过包装 setNodes / setEdges）
  function touchNodes(updater: (prev: CanvasNode[]) => CanvasNode[]) {
    setNodes(updater);
    setIsDirty(true);
  }
  function touchEdges(updater: (prev: CanvasEdge[]) => CanvasEdge[]) {
    setEdges(updater);
    setIsDirty(true);
  }

  // ── 自动布局 ──────────────────────────────────────────────────────────────
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0 || layouting) return;
    setLayouting(true);

    const positions = computeAutoLayout(nodes, edges);

    // 更新节点坐标（motion.div 的 animate 会平滑过渡）
    const newNodes = nodes.map(n => {
      const pos = positions.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });
    setNodes(newNodes);
    setIsDirty(true);

    // 布局完成后 fit-to-view（延迟 50ms 让 canvas rect 稳定）
    setTimeout(() => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setTransform(computeFitView(newNodes, rect.width, rect.height));
      }
      setLayouting(false);
    }, 50);
  }, [nodes, edges, layouting]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden select-none">

      {/* ── 中央画布 ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">

        {/* 工具栏 — 极光渐变风格 */}
        <div
          className="h-10 shrink-0 flex items-center gap-0.5 px-3 border-b"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(148,163,184,0.15)',
          }}
        >
          {/* 组1：内联标题（可编辑）+ 保存按钮紧跟其后 */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={() => commitSave()}
                className="text-xs font-semibold text-slate-700 bg-white border border-cyan-400/60 rounded-lg px-2 py-0.5 outline-none max-w-[200px] shadow-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={startEditTitle}
                className="flex items-center gap-1.5 group max-w-[200px] hover:bg-slate-100 rounded-lg px-2 py-0.5 transition-colors"
                title="点击编辑标题"
              >
                <span className="text-xs font-semibold text-slate-600 truncate">
                  {savedWorkflows.find(w => w.id === currentWorkflowId)?.name ?? '未命名工作流'}
                </span>
                {isDirty
                  ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="有未保存的更改" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 opacity-60" title="已保存" />
                }
              </button>
            )}
            {/* 保存按钮紧跟标题 */}
            <button
              onClick={() => commitSave()}
              className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0',
                isDirty
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
              )}
              title={isDirty ? '保存更改' : '已保存'}
            >
              <Save className="w-3 h-3" />
              {isDirty ? '保存' : '已保存'}
            </button>
          </div>

          {/* 组2：运行/停止 */}
          <div className="flex items-center gap-0.5">
            {/* 运行 / 停止 — 极光主按钮 */}
            <button
              onClick={() => setWorkflowRunning(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: workflowRunning
                  ? 'linear-gradient(135deg, #F43F5E, #EC4899)'
                  : 'linear-gradient(135deg, #00F5A0, #00D4FF)',
                boxShadow: workflowRunning
                  ? '0 3px 12px rgba(244,63,94,0.35)'
                  : '0 3px 12px rgba(0,245,160,0.35)',
              }}
              title={workflowRunning ? '停止' : '运行'}
            >
              {workflowRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {workflowRunning ? '停止' : '运行'}
            </button>
          </div>

          {/* 分隔线 */}
          <div className="w-px h-4 bg-slate-200 mx-1.5 shrink-0" />

          {/* 组3：视图控制 */}
          <div className="flex items-center gap-0.5">
            <button onClick={resetView} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="重置视图">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTransform(p => ({ ...p, scale: Math.min(3, p.scale * 1.2) }))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="放大">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.3, p.scale * 0.83) }))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="缩小">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setNodes(INIT_NODES); setEdges(INIT_EDGES); setTransform({ x: 0, y: 0, scale: 1 }); setIsDirty(false); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="重置画布"
            ><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* 画布区域 — 横纵滚动 + 极光渐变背景 */}
        <div className="flex-1 min-h-0 overflow-auto">
        <div
          ref={canvasRef}
          className="relative cursor-grab active:cursor-grabbing aurora-canvas"
          style={{
            minWidth: '2200px',
            minHeight: '1600px',
            background: 'linear-gradient(135deg, #F0F9FF 0%, #EEF2FF 50%, #F5F3FF 100%)',
            backgroundSize: '200% 200%',
            backgroundImage: `
              linear-gradient(135deg, #F0F9FF 0%, #EEF2FF 50%, #F5F3FF 100%),
              radial-gradient(ellipse at 15% 20%, rgba(0,245,160,0.12) 0%, transparent 55%),
              radial-gradient(ellipse at 85% 80%, rgba(168,85,247,0.1) 0%, transparent 55%),
              radial-gradient(ellipse at 70% 15%, rgba(59,130,246,0.08) 0%, transparent 45%)
            `,
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDrop={e => {
              e.preventDefault();
              const type = e.dataTransfer.getData('nodeType') as NodeType;
              if (!type) return;
              const pos = toCanvas(e.clientX, e.clientY);
              const def = NODE_DEFS[type];
              const newNode: CanvasNode = {
                id: `n${Date.now()}`,
                type,
                name: def.label,
                x: pos.x - NODE_W / 2,
                y: pos.y - NODE_H / 2,
                config: {},
              };
              touchNodes(prev => [...prev, newNode]);
              setSelectedNodeId(newNode.id);
            }}
          onDragOver={e => e.preventDefault()}
        >
          {/* 网格 SVG 叠加层 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <pattern id="aurora-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(100,116,139,0.09)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#aurora-grid)" />
          </svg>
          {/* SVG 连线层 */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <defs>
              {/* 渐变定义 — 每种节点类型对应一条连线渐变 */}
              <linearGradient id="edge-grad-input"     x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#00F5A0" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="edge-grad-agent"     x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#A855F7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="edge-grad-tool"      x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="edge-grad-condition" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="edge-grad-default"   x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#00D4FF" stopOpacity="0.8" />
                <stop offset="50%"  stopColor="#6366F1" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="edge-grad-sel"       x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#00F5A0" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
              {/* 箭头 */}
              <marker id="arrow"     markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="url(#edge-grad-default)" />
              </marker>
              <marker id="arrow-sel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="url(#edge-grad-sel)" />
              </marker>
            </defs>

            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              {/* 已有连线 */}
              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.source);
                const tgt = nodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;
                const op = outputPort(src);
                const ip = inputPort(tgt);
                const isSel = selectedEdgeId === edge.id;
                const gradId = isSel ? 'edge-grad-sel' : `edge-grad-${src.type}`;
                const glowRgb = NODE_DEFS[src.type].glowRgb;
                return (
                  <g key={edge.id}>
                    {/* 发光描边（模拟外发光） */}
                    <path
                      d={bezierPath(op.x, op.y, ip.x, ip.y)}
                      fill="none"
                      stroke={`rgba(${glowRgb},0.25)`}
                      strokeWidth={isSel ? 8 : 5}
                      strokeLinecap="round"
                    />
                    {/* 宽透明路径用于点击检测 */}
                    <path
                      d={bezierPath(op.x, op.y, ip.x, ip.y)}
                      fill="none" stroke="transparent" strokeWidth={12}
                      className="cursor-pointer pointer-events-auto"
                      onClick={e => { e.stopPropagation(); setSelectedEdgeId(isSel ? null : edge.id); setSelectedNodeId(null); }}
                    />
                    {/* 主连线 */}
                    <path
                      d={bezierPath(op.x, op.y, ip.x, ip.y)}
                      fill="none"
                      stroke={`url(#${gradId})`}
                      strokeWidth={isSel ? 3 : 2.2}
                      strokeLinecap="round"
                      strokeDasharray={workflowRunning ? '8 4' : undefined}
                      markerEnd={isSel ? 'url(#arrow-sel)' : 'url(#arrow)'}
                      style={workflowRunning ? { animation: 'dash-flow 1.2s linear infinite' } : undefined}
                    />
                  </g>
                );
              })}

              {/* 正在绘制的临时连线 */}
              {connectingState && (() => {
                const src = nodes.find(n => n.id === connectingState.sourceId);
                if (!src) return null;
                const op = outputPort(src);
                return (
                  <path
                    d={bezierPath(op.x, op.y, connectingState.curX, connectingState.curY)}
                    fill="none" stroke={`url(#edge-grad-${src.type})`} strokeWidth={2}
                    strokeDasharray="6 4" strokeLinecap="round" opacity={0.75}
                  />
                );
              })()}
            </g>
          </svg>

          {/* 节点层 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 2 }}
          >
            <div
              className="absolute"
              style={{
                transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
                transformOrigin: '0 0',
              }}
            >
              {nodes.map(node => {
                const def = NODE_DEFS[node.type];
                const isSel = selectedNodeId === node.id;
                return (
                  <motion.div
                    key={node.id}
                    animate={{ x: node.x, y: node.y }}
                    transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                    whileHover={{ y: node.y - 2 }}
                    className="absolute pointer-events-auto"
                    style={{
                      left: 0, top: 0,
                      width: NODE_W, height: NODE_H,
                      borderRadius: 16,
                      border: '2px solid transparent',
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), linear-gradient(135deg, ${def.gradFrom}, ${def.gradTo})`,
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      backdropFilter: 'blur(16px) saturate(180%)',
                      boxShadow: isSel
                        ? `0 0 0 3px rgba(${def.glowRgb},0.35), 0 8px 32px rgba(${def.glowRgb},0.25), inset 0 0 0 1px rgba(255,255,255,0.7)`
                        : `0 4px 20px rgba(0,0,0,0.07), 0 0 22px rgba(${def.glowRgb},0.16), inset 0 0 0 1px rgba(255,255,255,0.55)`,
                      cursor: dragging.current?.nodeId === node.id ? 'grabbing' : 'grab',
                      transition: 'box-shadow 0.2s ease',
                    }}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                  >
                    {/* 输入端口 */}
                    {def.hasInput && (
                      <div
                        className="absolute w-3 h-3 rounded-full border-2 bg-white transition-transform hover:scale-125 pointer-events-auto"
                        style={{
                          left: -6, top: NODE_H / 2 - 6, cursor: 'crosshair',
                          borderColor: def.gradFrom,
                          boxShadow: `0 0 6px rgba(${def.glowRgb},0.5)`,
                        }}
                        onMouseUp={e => handleInputPortMouseUp(e, node.id)}
                        title="输入端口"
                      />
                    )}

                    {/* 节点内容 */}
                    <div className="absolute inset-0 px-3 py-2 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0" style={{ color: def.gradFrom }}>
                          {def.icon}
                          <span className="text-[11px] font-semibold truncate text-slate-700">{node.name}</span>
                        </div>
                        <button
                          className="shrink-0 w-4 h-4 rounded-md hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors pointer-events-auto"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-semibold"
                          style={{
                            color: def.gradFrom,
                            background: `rgba(${def.glowRgb},0.1)`,
                            border: `1px solid rgba(${def.glowRgb},0.2)`,
                          }}
                        >
                          {node.type}
                        </span>
                        {workflowRunning && (
                          <span className="text-[9px] font-semibold animate-pulse" style={{ color: '#00D4FF' }}>● 运行中</span>
                        )}
                      </div>
                    </div>

                    {/* 输出端口 */}
                    {def.hasOutput && (
                      <div
                        className="absolute w-3 h-3 rounded-full border-2 bg-white transition-transform hover:scale-125 pointer-events-auto"
                        style={{
                          right: -6, top: NODE_H / 2 - 6, cursor: 'crosshair',
                          borderColor: def.gradTo,
                          boxShadow: `0 0 6px rgba(${def.glowRgb},0.5)`,
                        }}
                        onMouseDown={e => handleOutputPortMouseDown(e, node.id)}
                        title="输出端口，拖拽连线"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 删除边按钮 */}
          {selectedEdgeId && (() => {
            const edge = edges.find(e => e.id === selectedEdgeId);
            if (!edge) return null;
            const src = nodes.find(n => n.id === edge.source);
            const tgt = nodes.find(n => n.id === edge.target);
            if (!src || !tgt) return null;
            const op = outputPort(src);
            const ip = inputPort(tgt);
            const mx = ((op.x + ip.x) / 2) * transform.scale + transform.x;
            const my = ((op.y + ip.y) / 2) * transform.scale + transform.y;
            return (
              <button
                className="absolute z-10 w-6 h-6 rounded-full bg-rose-500/80 border border-rose-400/60 flex items-center justify-center text-white hover:bg-rose-500 transition-colors shadow-lg"
                style={{ left: mx - 12, top: my - 12 }}
                onClick={() => deleteEdge(selectedEdgeId)}
                title="删除连线"
              >
                <X className="w-3 h-3" />
              </button>
            );
          })()}

          {/* 空画布提示 */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
              <div className="text-center space-y-2">
                <ArrowRightCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-400 font-medium">点击右下角 <span className="text-cyan-400">+</span> 添加节点</p>
                <p className="text-xs text-slate-300">拖拽节点端口可创建连线</p>
              </div>
            </div>
          )}

        </div>{/* 关闭canvasRef */}
        </div>{/* 关闭滚动外层 */}

        {/* ── 右侧工作流列表抽屉 ──────────────────────────────────────────── */}
        <AnimatePresence>
          {listDrawerOpen && (() => {
            const totalPages = Math.max(1, Math.ceil(savedWorkflows.length / LIST_PAGE_SIZE));
            const safePage = Math.min(listPage, totalPages - 1);
            const pageItems = savedWorkflows.slice(safePage * LIST_PAGE_SIZE, (safePage + 1) * LIST_PAGE_SIZE);
            return (
              <>
                {/* 遮罩 */}
                <motion.div
                  key="drawer-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20"
                  onClick={() => setListDrawerOpen(false)}
                />
                {/* 右侧抽屉本体 */}
                <motion.div
                  key="workflow-list-drawer"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  className="absolute top-0 right-0 bottom-0 z-30 flex flex-col overflow-hidden"
                  style={{
                    width: 300,
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(24px)',
                    borderLeft: '1px solid rgba(148,163,184,0.18)',
                    boxShadow: '-8px 0 40px rgba(99,102,241,0.10)',
                  }}
                >
                  {/* 抽屉头 */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
                    <List className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 flex-1">工作流列表 · {savedWorkflows.length} 个</span>
                    <button onClick={() => setListDrawerOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 列表项 */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {savedWorkflows.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">暂无已保存的工作流</p>
                    )}
                    {pageItems.map(wf => {
                      const isActive = wf.id === currentWorkflowId;
                      return (
                        <div
                          key={wf.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group cursor-pointer border',
                            isActive ? 'border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                          )}
                          style={isActive ? { background: 'rgba(99,102,241,0.06)' } : {}}
                          onClick={() => {
                            if (isDirty && currentWorkflowId !== wf.id) {
                              if (window.confirm('当前工作流有未保存的更改，切换后将丢失。是否继续？')) loadWorkflow(wf);
                            } else {
                              loadWorkflow(wf);
                            }
                          }}
                        >
                          {/* 选中标记 */}
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={isActive ? { background: 'rgba(99,102,241,0.2)' } : { background: 'rgba(148,163,184,0.12)' }}>
                            {isActive && <Check className="w-2.5 h-2.5" style={{ color: '#6366F1' }} />}
                          </div>
                          {/* 名称 + 时间 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: isActive ? '#6366F1' : '#374151' }}>{wf.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {wf.nodes.length} 节点 · {wf.savedAt.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {isActive && isDirty && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>未保存</span>
                          )}
                          {/* 执行 + 删除按钮 */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-colors"
                              onClick={e => { e.stopPropagation(); loadWorkflow(wf); setWorkflowRunning(true); setListDrawerOpen(false); }}
                              title="执行"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                            <button
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              onClick={e => { e.stopPropagation(); setDeleteConfirmId(wf.id); }}
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 分页栏 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t shrink-0" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
                      <span className="text-[10px] text-slate-400">第 {safePage + 1} / {totalPages} 页</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setListPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                          className={cn('p-1 rounded-lg transition-colors', safePage === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}>
                          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <button key={i} onClick={() => setListPage(i)}
                            className="w-5 h-5 rounded text-[10px] font-semibold transition-colors"
                            style={i === safePage ? { background: 'rgba(99,102,241,0.15)', color: '#6366F1' } : { color: '#94A3B8' }}>
                            {i + 1}
                          </button>
                        ))}
                        <button onClick={() => setListPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1}
                          className={cn('p-1 rounded-lg transition-colors', safePage === totalPages - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}>
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>

        {/* ── 底部状态栏 ──────────────────────────────────────────────────────── */}
        <div
          className="shrink-0 h-7 flex items-center gap-2 px-3 border-t text-[11px] text-slate-400"
          style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', borderColor: 'rgba(148,163,184,0.15)' }}
        >
          {/* 左侧：自动布局按钮 */}
          <button
            onClick={handleAutoLayout}
            disabled={layouting || nodes.length === 0}
            className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors', layouting ? 'text-cyan-300 cursor-not-allowed' : 'text-cyan-500 hover:bg-cyan-50')}
            title="自动布局"
          >
            <motion.span
              animate={layouting ? { rotate: 360 } : { rotate: 0 }}
              transition={layouting ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              className="inline-flex"
            ><LayoutGrid className="w-3 h-3" /></motion.span>
            <span>调整</span>
          </button>
          <div className="w-px h-3.5 bg-slate-200 shrink-0" />
          <span>共 <b className="text-slate-600">{savedWorkflows.length}</b> 个工作流</span>
          <span className="text-slate-300">·</span>
          <span>当前 <b className="text-slate-600">{nodes.length}</b> 个节点</span>
          <div className="flex-1" />
          <span className="font-mono text-slate-300">{Math.round(transform.scale * 100)}%</span>
          <div className="w-px h-3.5 bg-slate-200 shrink-0" />
          {/* 右侧：列表按钮 */}
          <button
            onClick={() => setListDrawerOpen(v => !v)}
            className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors', listDrawerOpen ? 'text-violet-600 bg-violet-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}
            title="工作流列表"
          >
            <List className="w-3 h-3" />
            <span>列表</span>
          </button>
        </div>

        {/* ── 悬浮添加节点按钮（FAB）───────────────────────────────────────── */}
        <div className="absolute bottom-10 right-5 z-30 flex flex-col items-end gap-2">
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-1 p-2 rounded-2xl border border-white/15 shadow-2xl"
                style={{ background: 'rgba(12,12,24,0.92)', backdropFilter: 'blur(20px)' }}
              >
                {(Object.entries(NODE_DEFS) as [NodeType, typeof NODE_DEFS[NodeType]][]).map(([type, def]) => (
                  <button
                    key={type}
                    onClick={() => addNodeByType(type)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                    style={{
                      border: `1.5px solid rgba(${def.glowRgb},0.35)`,
                      background: `rgba(${def.glowRgb},0.08)`,
                      color: def.gradFrom,
                    }}
                  >
                    {def.icon}
                    <span>{def.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 圆形 + 按钮 */}
          <motion.button
            onClick={() => setFabOpen(v => !v)}
            animate={{ rotate: fabOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl text-white transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
              boxShadow: '0 4px 20px rgba(0,245,160,0.45)',
            }}
            title="添加节点"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </div>

      {/* ── 右侧节点配置面板（极光玻璃风） ──────────────────────────────────── */}
      <AnimatePresence>
        {configPanelOpen && selectedNode && (
          <motion.div
            key="config-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="shrink-0 border-l flex flex-col overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(148,163,184,0.15)',
            }}
          >
            {/* 面板头 */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">节点配置</span>
              </div>
              <button
                onClick={() => setConfigPanelOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* 节点类型标签 */}
              <div
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wider"
                style={{
                  color: NODE_DEFS[selectedNode.type].gradFrom,
                  background: `rgba(${NODE_DEFS[selectedNode.type].glowRgb},0.1)`,
                  border: `1px solid rgba(${NODE_DEFS[selectedNode.type].glowRgb},0.25)`,
                }}
              >
                {NODE_DEFS[selectedNode.type].icon}
                {NODE_DEFS[selectedNode.type].label}
              </div>

              {/* 节点名称 */}
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">节点名称</label>
                <input
                  value={configValues.name ?? selectedNode.name}
                  onChange={e => setConfigValues(v => ({ ...v, name: e.target.value }))}
                  className={globalInputCls}
                  onFocus={e => (e.target.style.borderColor = NODE_DEFS[selectedNode.type].gradFrom)}
                  onBlur={e => (e.target.style.borderColor = '')}
                />
              </div>

              {/* 动态字段 */}
              {NODE_DEFS[selectedNode.type].configFields.map(field => (
                <div key={field.key}>
                  <label className="text-xs text-slate-500 font-medium block mb-1">{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      value={configValues[field.key] ?? ''}
                      onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={3}
                      className={cn(globalInputCls, 'resize-none leading-relaxed font-mono')}
                      onFocus={e => (e.target.style.borderColor = NODE_DEFS[selectedNode.type].gradFrom)}
                      onBlur={e => (e.target.style.borderColor = '')}
                    />
                  ) : (
                    <input
                      value={configValues[field.key] ?? ''}
                      onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={globalInputCls}
                      onFocus={e => (e.target.style.borderColor = NODE_DEFS[selectedNode.type].gradFrom)}
                      onBlur={e => (e.target.style.borderColor = '')}
                    />
                  )}
                </div>
              ))}

              {/* 节点位置（只读） */}
              <div className="pt-1 border-t border-slate-100">
                <label className="text-xs text-slate-400 font-medium block mb-1">位置</label>
                <div className="flex gap-2">
                  <span className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-400">
                    X: {Math.round(selectedNode.x)}
                  </span>
                  <span className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-400">
                    Y: {Math.round(selectedNode.y)}
                  </span>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="p-4 border-t border-slate-100 shrink-0">
              <button
                onClick={saveConfig}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${NODE_DEFS[selectedNode.type].gradFrom}, ${NODE_DEFS[selectedNode.type].gradTo})`,
                  boxShadow: `0 4px 14px rgba(${NODE_DEFS[selectedNode.type].glowRgb},0.35)`,
                }}
              >
                <Save className="w-3.5 h-3.5" />
                保存节点配置
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 连线流动动画 + 极光画布动画 */}
      <style>{`
        @keyframes dash-flow { to { stroke-dashoffset: -24; } }
        @keyframes aurora-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .aurora-canvas { animation: aurora-shift 18s ease infinite; }
      `}</style>

      {/* ── 删除确认弹窗 ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (() => {
          const wf = savedWorkflows.find(w => w.id === deleteConfirmId);
          return (
            <motion.div
              key="delete-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
              onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}
            >
              <motion.div
                key="delete-modal"
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="w-full max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(148,163,184,0.2)' }}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.1)' }}>
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">删除工作流</span>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* 内容 */}
                <div className="px-5 py-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    确定要删除工作流 <span className="font-semibold text-slate-800">「{wf?.name}」</span> 吗？
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">此操作不可撤销。</p>
                </div>
                {/* 操作 */}
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => deleteWorkflow(deleteConfirmId)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #F43F5E, #EC4899)', boxShadow: '0 4px 14px rgba(244,63,94,0.35)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    确认删除
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
