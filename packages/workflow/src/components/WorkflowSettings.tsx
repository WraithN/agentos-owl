/* 工作流编排页 — 极光渐变 + 升级玻璃拟态 */
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  NODE_W,
  NODE_H,
  NODE_DEFS,
  INIT_NODES,
  INIT_EDGES,
  PRESET_WORKFLOWS,
} from "../constants.js";
import { computeAutoLayout, computeFitView } from "../layout.js";
import type {
  NodeType,
  CanvasNode,
  CanvasEdge,
  Transform,
  SavedWorkflow,
  WorkflowStore,
} from "../types.js";
import { WorkflowToolbar } from "./WorkflowToolbar.js";
import { WorkflowCanvas } from "./WorkflowCanvas.js";
import { WorkflowDrawer } from "./WorkflowDrawer.js";
import { WorkflowStatusBar } from "./WorkflowStatusBar.js";
import { WorkflowFAB } from "./WorkflowFAB.js";
import { WorkflowSidebar } from "./WorkflowSidebar.js";

const LIST_PAGE_SIZE = 5;
const DEFAULT_VIEWPORT: Transform = { x: 0, y: 0, scale: 1 };

interface WorkflowSettingsProps {
  /**
   * 持久化数据源；未提供时使用预置 mock，仅本次会话有效（用于 Storybook / 独立预览）。
   */
  store?: WorkflowStore;
}

export default function WorkflowSettings({ store }: WorkflowSettingsProps = {}) {
  const [nodes, setNodes] = useState<CanvasNode[]>(INIT_NODES);
  const [edges, setEdges] = useState<CanvasEdge[]>(INIT_EDGES);
  const [transform, setTransform] = useState<Transform>(DEFAULT_VIEWPORT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [layouting, setLayouting] = useState(false);

  // 工作流列表 & 保存状态
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>(
    store ? [] : PRESET_WORKFLOWS
  );
  const [currentWorkflowId, setCurrentWorkflowId] = useState(
    store ? "" : "wf-preset-1"
  );
  const [isDirty, setIsDirty] = useState(false);
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [listPage, setListPage] = useState(0);
  // 内联标题编辑状态（无弹窗保存）
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  // 删除二次确认
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // 拖拽节点状态
  const dragging = useRef<{ nodeId: string; ox: number; oy: number } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  // 连线绘制状态
  const connecting = useRef<{ sourceId: string; curX: number; curY: number } | null>(null);
  const [connectingState, setConnectingState] = useState<{ sourceId: string; curX: number; curY: number } | null>(null);
  // 画布平移状态
  const panning = useRef<{ startMouseX: number; startMouseY: number; startTx: number; startTy: number } | null>(null);
  // 添加节点菜单
  const [fabOpen, setFabOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 选中节点时同步 config
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  useEffect(() => {
    if (selectedNode) {
      setConfigValues({ name: selectedNode.name, ...selectedNode.config });
      setConfigPanelOpen(true);
    }
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 画布坐标转换
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - transform.x) / transform.scale,
        y: (clientY - rect.top - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((prev) => {
      const ns = Math.min(3, Math.max(0.3, prev.scale * factor));
      return {
        scale: ns,
        x: mx - (mx - prev.x) * (ns / prev.scale),
        y: my - (my - prev.y) * (ns / prev.scale),
      };
    });
  }, []);

  // 鼠标按下：节点拖拽 / 连线 / 画布平移
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [transform]
  );

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setSelectedEdgeId(null);
      setSelectedNodeId(nodeId);
      const pos = toCanvas(e.clientX, e.clientY);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dragging.current = { nodeId, ox: pos.x - node.x, oy: pos.y - node.y };
      setDraggingNodeId(nodeId);
    },
    [nodes, toCanvas]
  );

  const handleOutputPortMouseDown = useCallback(
    (e: React.MouseEvent, sourceId: string) => {
      e.stopPropagation();
      const pos = toCanvas(e.clientX, e.clientY);
      connecting.current = { sourceId, curX: pos.x, curY: pos.y };
      setConnectingState({ sourceId, curX: pos.x, curY: pos.y });
    },
    [toCanvas]
  );

  const handleInputPortMouseUp = useCallback(
    (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
      if (!connecting.current) return;
      const { sourceId } = connecting.current;
      if (sourceId !== targetId) {
        // 避免重复连线
        const exists = edges.some(
          (ed) => ed.source === sourceId && ed.target === targetId
        );
        if (!exists) {
          touchEdges((prev) => [
            ...prev,
            { id: `e${Date.now()}`, source: sourceId, target: targetId },
          ]);
        }
      }
      connecting.current = null;
      setConnectingState(null);
    },
    [edges]
  );

  // 全局鼠标移动
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 节点拖拽
      if (dragging.current) {
        const pos = toCanvas(e.clientX, e.clientY);
        const { nodeId, ox, oy } = dragging.current;
        touchNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, x: pos.x - ox, y: pos.y - oy } : n
          )
        );
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
        const pan = panning.current;
        const dx = e.clientX - pan.startMouseX;
        const dy = e.clientY - pan.startMouseY;
        setTransform((prev) => ({
          ...prev,
          x: pan.startTx + dx,
          y: pan.startTy + dy,
        }));
      }
    },
    [toCanvas]
  );

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
    setDraggingNodeId(null);
    panning.current = null;
    if (connecting.current) {
      connecting.current = null;
      setConnectingState(null);
    }
  }, []);

  // 删除选中节点 / 边
  const deleteNode = useCallback(
    (nodeId: string) => {
      touchNodes((prev) => prev.filter((n) => n.id !== nodeId));
      touchEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
        setConfigPanelOpen(false);
      }
    },
    [selectedNodeId]
  );

  const deleteEdge = useCallback((edgeId: string) => {
    touchEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
  }, []);

  // 悬浮按钮添加节点
  const addNodeByType = useCallback(
    (type: NodeType) => {
      const def = NODE_DEFS[type];
      // 将节点放在当前画布可见区域中央
      const canvas = canvasRef.current;
      let cx = 400;
      let cy = 250;
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
      touchNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setFabOpen(false);
    },
    [transform]
  );

  // 保存节点配置
  const saveConfig = useCallback(() => {
    if (!selectedNodeId) return;
    const { name, ...rest } = configValues;
    touchNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId ? { ...n, name: name ?? n.name, config: rest } : n
      )
    );
  }, [selectedNodeId, configValues]);

  // 重置视图
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  // 加载已有工作流
  const loadWorkflow = useCallback((wf: SavedWorkflow) => {
    setNodes(wf.nodes);
    setEdges(wf.edges);
    // 恢复上次离开时的视口；老数据缺省时回到原点
    setTransform(wf.viewport ?? DEFAULT_VIEWPORT);
    setCurrentWorkflowId(wf.id);
    setIsDirty(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConfigPanelOpen(false);
  }, []);

  // 首次加载：从 store 拉取列表，并选中最近一条
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await store.list();
        if (cancelled) return;
        setSavedWorkflows(list);
        if (list.length > 0) {
          loadWorkflow(list[0]);
        } else {
          // 空库：保留 INIT 节点作为新建草稿
          setCurrentWorkflowId("");
          setIsDirty(false);
        }
      } catch (err) {
        console.error("[workflow] 加载列表失败:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, loadWorkflow]);

  // 离开页面前提示未保存（仅 dirty 时启用）
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // 删除工作流
  const deleteWorkflow = useCallback(
    (id: string) => {
      // 先在内存里移除以提供即时反馈
      setSavedWorkflows((prev) => {
        const next = prev.filter((w) => w.id !== id);
        if (id === currentWorkflowId) {
          if (next.length > 0) {
            // 切换到列表第一条（含 viewport）
            loadWorkflow(next[0]);
          } else {
            setNodes(INIT_NODES);
            setEdges(INIT_EDGES);
            setTransform(DEFAULT_VIEWPORT);
            setCurrentWorkflowId("");
            setIsDirty(false);
            setSelectedNodeId(null);
            setConfigPanelOpen(false);
          }
        }
        return next;
      });
      setDeleteConfirmId(null);

      // 异步同步到持久层；失败时只记日志，不回滚 UI（避免列表抖动）
      if (store) {
        store.remove(id).catch((err) => {
          console.error("[workflow] 删除失败:", err);
        });
      }
    },
    [currentWorkflowId, store, loadWorkflow]
  );

  // 打开内联标题编辑
  const startEditTitle = useCallback(() => {
    const current = savedWorkflows.find((w) => w.id === currentWorkflowId);
    setTitleDraft(current?.name ?? "未命名工作流");
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 30);
  }, [currentWorkflowId, savedWorkflows]);

  // 执行保存（内联，无弹窗）
  const commitSave = useCallback(
    (nameOverride?: string) => {
      const name =
        (
          nameOverride ??
          titleDraft ??
          savedWorkflows.find((w) => w.id === currentWorkflowId)?.name ??
          "未命名工作流"
        )
          .trim() || "未命名工作流";
      const now = new Date();
      // 新建/已存在统一处理：先确定 id，再构造 SavedWorkflow
      const isNew = !currentWorkflowId;
      const id = isNew ? `wf-${Date.now()}` : currentWorkflowId;
      const draft: SavedWorkflow = {
        id,
        name,
        nodes,
        edges,
        viewport: transform,
        savedAt: now,
      };

      // 先乐观更新本地 state，避免画布闪烁
      setSavedWorkflows((prev) => {
        const idx = prev.findIndex((w) => w.id === id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = draft;
          return updated;
        }
        return [draft, ...prev];
      });
      if (isNew) setCurrentWorkflowId(id);
      setIsDirty(false);
      setEditingTitle(false);

      // 持久化；后端可能调整 id（如 uuid 替换）或时间戳，按返回值回填
      if (store) {
        store
          .save(draft)
          .then((saved) => {
            setSavedWorkflows((prev) =>
              prev.map((w) => (w.id === id ? saved : w))
            );
            if (saved.id !== id) setCurrentWorkflowId(saved.id);
          })
          .catch((err) => {
            console.error("[workflow] 保存失败:", err);
            setIsDirty(true);
          });
      }
    },
    [
      currentWorkflowId,
      nodes,
      edges,
      transform,
      savedWorkflows,
      titleDraft,
      store,
    ]
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitSave();
      if (e.key === "Escape") setEditingTitle(false);
    },
    [commitSave]
  );

  // 节点/边变化时标记 dirty
  // （通过包装 setNodes / setEdges）
  const touchNodes = useCallback(
    (updater: (prev: CanvasNode[]) => CanvasNode[]) => {
      setNodes(updater);
      setIsDirty(true);
    },
    []
  );
  const touchEdges = useCallback(
    (updater: (prev: CanvasEdge[]) => CanvasEdge[]) => {
      setEdges(updater);
      setIsDirty(true);
    },
    []
  );

  // 自动布局
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0 || layouting) return;
    setLayouting(true);

    const positions = computeAutoLayout(nodes, edges);

    // 更新节点坐标（motion.div 的 animate 会平滑过渡）
    const newNodes = nodes.map((n) => {
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

  // 处理画布拖放添加节点
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("nodeType") as NodeType;
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
      touchNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
    },
    [toCanvas]
  );

  // 处理连线点击
  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      setSelectedEdgeId((prev) => (prev === edgeId ? null : edgeId));
      setSelectedNodeId(null);
    },
    []
  );

  // 运行并关闭抽屉
  const handleRunFromDrawer = useCallback(
    (wf: (typeof savedWorkflows)[number]) => {
      loadWorkflow(wf);
      setWorkflowRunning(true);
      setListDrawerOpen(false);
    },
    [loadWorkflow]
  );

  const currentTitle =
    savedWorkflows.find((w) => w.id === currentWorkflowId)?.name ?? "未命名工作流";

  return (
    <div className="flex h-full overflow-hidden select-none">
      {/* ── 中央画布区 ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        <WorkflowToolbar
          title={currentTitle}
          isDirty={isDirty}
          editingTitle={editingTitle}
          titleDraft={titleDraft}
          workflowRunning={workflowRunning}
          onTitleClick={startEditTitle}
          onTitleChange={setTitleDraft}
          onTitleKeyDown={handleTitleKeyDown}
          onTitleBlur={() => commitSave()}
          titleInputRef={titleInputRef}
          onSave={() => commitSave()}
          onToggleRun={() => setWorkflowRunning((v) => !v)}
          onResetView={resetView}
          onZoomIn={() =>
            setTransform((p) => ({ ...p, scale: Math.min(3, p.scale * 1.2) }))
          }
          onZoomOut={() =>
            setTransform((p) => ({ ...p, scale: Math.max(0.3, p.scale * 0.83) }))
          }
          onResetCanvas={() => {
            setNodes(INIT_NODES);
            setEdges(INIT_EDGES);
            setTransform({ x: 0, y: 0, scale: 1 });
            setIsDirty(false);
          }}
        />

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          transform={transform}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          workflowRunning={workflowRunning}
          connectingState={connectingState}
          draggingNodeId={draggingNodeId}
          canvasRef={canvasRef}
          onCanvasMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDrop={handleDrop}
          onNodeMouseDown={handleNodeMouseDown}
          onInputPortMouseUp={handleInputPortMouseUp}
          onOutputPortMouseDown={handleOutputPortMouseDown}
          onEdgeClick={handleEdgeClick}
          onDeleteNode={deleteNode}
          onDeleteEdge={deleteEdge}
        />

        <WorkflowDrawer
          open={listDrawerOpen}
          workflows={savedWorkflows}
          currentId={currentWorkflowId}
          isDirty={isDirty}
          page={listPage}
          pageSize={LIST_PAGE_SIZE}
          onClose={() => setListDrawerOpen(false)}
          onLoad={loadWorkflow}
          onRun={handleRunFromDrawer}
          onDeleteRequest={setDeleteConfirmId}
          onPageChange={setListPage}
        />

        <WorkflowStatusBar
          savedCount={savedWorkflows.length}
          nodeCount={nodes.length}
          scale={transform.scale}
          layouting={layouting}
          listOpen={listDrawerOpen}
          nodesEmpty={nodes.length === 0}
          onAutoLayout={handleAutoLayout}
          onToggleList={() => setListDrawerOpen((v) => !v)}
        />

        <WorkflowFAB
          open={fabOpen}
          onToggle={() => setFabOpen((v) => !v)}
          onAdd={addNodeByType}
        />
      </div>

      {/* ── 右侧配置面板与删除弹窗 ─────────────────────────────────────────────── */}
      <WorkflowSidebar
        configPanelOpen={configPanelOpen}
        selectedNode={selectedNode}
        configValues={configValues}
        onConfigChange={setConfigValues}
        onConfigPanelClose={() => setConfigPanelOpen(false)}
        onSaveConfig={saveConfig}
        deleteConfirmId={deleteConfirmId}
        workflowToDeleteName={
          savedWorkflows.find((w) => w.id === deleteConfirmId)?.name ?? ""
        }
        onConfirmDelete={() => {
          if (deleteConfirmId) deleteWorkflow(deleteConfirmId);
        }}
        onCancelDelete={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
