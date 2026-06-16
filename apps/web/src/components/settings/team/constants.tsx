import type { ReactNode } from 'react';
import {
  GitBranch, Eye, MessageCircle, Network,
  Users, Crown, Shield, Zap, Star, Flame, Globe, Target, Cpu, Bot, Layers,
} from 'lucide-react';

/** 协作模式 */
export type CollabMode = 'pipeline' | 'supervisor' | 'brainstorming' | 'swarm';

/** 知识库引用 */
export interface KBRef { id: string; name: string }

/** Swarm 项目组 */
export interface SwarmGroup { id: string; leaderId: string; memberIds: string[] }

/** 模式元信息 */
export const MODE_META: Record<CollabMode, {
  icon: ReactNode; label: string; desc: string; color: string; accent: string;
}> = {
  pipeline: {
    icon: <GitBranch className="w-4 h-4" />,
    label: '流水线 Pipeline',
    desc: '智能体按选择顺序依次执行，上一步输出传给下一步',
    color: 'text-cyan-400', accent: 'border-cyan-500/40 bg-cyan-500/10',
  },
  supervisor: {
    icon: <Eye className="w-4 h-4" />,
    label: '监督者 Supervisor',
    desc: '监督者分配任务，协作者并行工作后汇报给监督者',
    color: 'text-violet-400', accent: 'border-violet-500/40 bg-violet-500/10',
  },
  brainstorming: {
    icon: <MessageCircle className="w-4 h-4" />,
    label: '头脑风暴 Brainstorm',
    desc: '智能体自由讨论，互相启发，产生创意与多样观点',
    color: 'text-amber-400', accent: 'border-amber-500/40 bg-amber-500/10',
  },
  swarm: {
    icon: <Network className="w-4 h-4" />,
    label: '层级模式 Hierarchy',
    desc: '一位 CTO 统筹若干项目组，每组有组长和组员并行作战',
    color: 'text-rose-400', accent: 'border-rose-500/40 bg-rose-500/10',
  },
};

/** 团队图标选项 */
export const TEAM_ICONS = [
  { id: 'users',   icon: <Users className="w-5 h-5" />,         label: '团队' },
  { id: 'crown',   icon: <Crown className="w-5 h-5" />,         label: '精英' },
  { id: 'shield',  icon: <Shield className="w-5 h-5" />,        label: '安全' },
  { id: 'zap',     icon: <Zap className="w-5 h-5" />,           label: '闪电' },
  { id: 'star',    icon: <Star className="w-5 h-5" />,          label: '明星' },
  { id: 'flame',   icon: <Flame className="w-5 h-5" />,         label: '火焰' },
  { id: 'globe',   icon: <Globe className="w-5 h-5" />,         label: '全球' },
  { id: 'target',  icon: <Target className="w-5 h-5" />,        label: '目标' },
  { id: 'cpu',     icon: <Cpu className="w-5 h-5" />,           label: '算法' },
  { id: 'bot',     icon: <Bot className="w-5 h-5" />,           label: '机器人' },
  { id: 'layers',  icon: <Layers className="w-5 h-5" />,        label: '层级' },
  { id: 'network', icon: <Network className="w-5 h-5" />,       label: '网络' },
];
