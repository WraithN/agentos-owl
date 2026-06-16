import { Zap, Bot, Wrench, GitBranch, Flag } from "lucide-react";
import type { NodeType, NodeDef, CanvasNode, CanvasEdge, SavedWorkflow } from "./types.js";

export const NODE_W = 168;
export const NODE_H = 72;

// ─── 节点类型配置（极光渐变版） ───────────────────────────────────────────────
export const NODE_DEFS: Record<NodeType, NodeDef> = {
  input: {
    label: "输入节点",
    icon: <Zap className="w-3.5 h-3.5" />,
    color: "#00F5A0",
    border: "border-emerald-400/40",
    bg: "bg-emerald-400/8",
    text: "text-emerald-500",
    gradFrom: "#00F5A0",
    gradTo: "#00D4FF",
    glowRgb: "0,245,160",
    hasInput: false,
    hasOutput: true,
    configFields: [
      { key: "triggerEvent", label: "触发事件", placeholder: "如：schedule, webhook, manual" },
      { key: "cronExpr", label: "Cron 表达式", placeholder: "0 9 * * 1-5" },
    ],
  },
  agent: {
    label: "Agent 节点",
    icon: <Bot className="w-3.5 h-3.5" />,
    color: "#A855F7",
    border: "border-purple-400/40",
    bg: "bg-purple-400/8",
    text: "text-purple-500",
    gradFrom: "#A855F7",
    gradTo: "#6366F1",
    glowRgb: "168,85,247",
    hasInput: true,
    hasOutput: true,
    configFields: [
      { key: "agentName", label: "Agent 名称", placeholder: "如：Aria, Coder, Analyst" },
      { key: "model", label: "模型", placeholder: "GPT-4o / Claude 3.5" },
      { key: "prompt", label: "系统提示词", placeholder: "输入 Agent 的系统提示...", multiline: true },
    ],
  },
  tool: {
    label: "工具节点",
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: "#3B82F6",
    border: "border-blue-400/40",
    bg: "bg-blue-400/8",
    text: "text-blue-500",
    gradFrom: "#3B82F6",
    gradTo: "#06B6D4",
    glowRgb: "59,130,246",
    hasInput: true,
    hasOutput: true,
    configFields: [
      { key: "toolName", label: "工具名称", placeholder: "如：web-search, code-runner" },
      { key: "params", label: "调用参数", placeholder: "JSON 格式参数", multiline: true },
    ],
  },
  condition: {
    label: "条件节点",
    icon: <GitBranch className="w-3.5 h-3.5" />,
    color: "#F59E0B",
    border: "border-amber-400/40",
    bg: "bg-amber-400/8",
    text: "text-amber-500",
    gradFrom: "#F59E0B",
    gradTo: "#EF4444",
    glowRgb: "245,158,11",
    hasInput: true,
    hasOutput: true,
    configFields: [
      { key: "expression", label: "判断表达式", placeholder: "如：output.score > 0.8" },
      { key: "trueLabel", label: "True 分支标签", placeholder: "True" },
      { key: "falseLabel", label: "False 分支标签", placeholder: "False" },
    ],
  },
  output: {
    label: "输出节点",
    icon: <Flag className="w-3.5 h-3.5" />,
    color: "#F43F5E",
    border: "border-rose-400/40",
    bg: "bg-rose-400/8",
    text: "text-rose-500",
    gradFrom: "#F43F5E",
    gradTo: "#EC4899",
    glowRgb: "244,63,94",
    hasInput: true,
    hasOutput: false,
    configFields: [
      { key: "format", label: "输出格式", placeholder: "JSON / Markdown / Plain" },
      { key: "target", label: "发送目标", placeholder: "如：notification, webhook" },
    ],
  },
};

// ─── 初始画布数据 ─────────────────────────────────────────────────────────────
export const INIT_NODES: CanvasNode[] = [
  { id: "n1", type: "input", name: "定时触发", x: 80, y: 80, config: { triggerEvent: "schedule", cronExpr: "0 9 * * 1-5" } },
  { id: "n2", type: "agent", name: "Analyst 分析", x: 340, y: 60, config: { agentName: "Analyst", model: "GPT-4o", prompt: "分析竞品动态并提取关键信息" } },
  { id: "n3", type: "tool", name: "网页搜索", x: 340, y: 200, config: { toolName: "web-search", params: '{"query": "{{input}}"}' } },
  { id: "n4", type: "condition", name: "结果评分", x: 600, y: 120, config: { expression: "score > 0.7", trueLabel: "高质量", falseLabel: "重试" } },
  { id: "n5", type: "output", name: "发送报告", x: 860, y: 120, config: { format: "Markdown", target: "notification" } },
];

export const INIT_EDGES: CanvasEdge[] = [
  { id: "e1", source: "n1", target: "n2" },
  { id: "e2", source: "n1", target: "n3" },
  { id: "e3", source: "n2", target: "n4" },
  { id: "e4", source: "n3", target: "n4" },
  { id: "e5", source: "n4", target: "n5" },
];

// ─── 布局算法常量 ─────────────────────────────────────────────────────────────
export const LAYOUT_H_GAP = 220; // 层间水平间距
export const LAYOUT_V_GAP = 100; // 同层节点垂直间距
export const LAYOUT_PAD_X = 60; // 左边距
export const LAYOUT_PAD_Y = 60; // 上边距（绝对坐标偏移）

// 预置两条已保存的工作流（mock）
export const PRESET_WORKFLOWS: SavedWorkflow[] = [
  {
    id: "wf-preset-1",
    name: "每日竞品监控",
    savedAt: new Date("2026-06-10T09:00:00"),
    nodes: INIT_NODES,
    edges: INIT_EDGES,
  },
  {
    id: "wf-preset-2",
    name: "代码审查自动化",
    savedAt: new Date("2026-06-08T14:30:00"),
    nodes: [
      { id: "p2n1", type: "input", name: "PR 触发", x: 80, y: 80, config: { triggerEvent: "webhook", cronExpr: "" } },
      { id: "p2n2", type: "agent", name: "Coder 审查", x: 340, y: 80, config: { agentName: "Coder", model: "Claude 3.5 Sonnet", prompt: "审查代码质量与安全性" } },
      { id: "p2n3", type: "output", name: "输出评论", x: 600, y: 80, config: { format: "Markdown", target: "github-comment" } },
    ],
    edges: [
      { id: "p2e1", source: "p2n1", target: "p2n2" },
      { id: "p2e2", source: "p2n2", target: "p2n3" },
    ],
  },
];
