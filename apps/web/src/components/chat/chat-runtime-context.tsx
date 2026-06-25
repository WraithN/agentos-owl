/* 会话运行时 Context：在 ChatContainer、AgentChat 与右侧面板之间共享实时执行状态 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AgentTaskView, TeammateStatus } from '@owl-os/core';
import type { AgentOutput } from './useOwleryRuntime';

interface ChatRuntimeContextValue {
  tasks: AgentTaskView[];
  setTasks: (tasks: AgentTaskView[]) => void;
  agentOutputs: Record<string, AgentOutput>;
  setAgentOutputs: (agentOutputs: Record<string, AgentOutput>) => void;
  rounds: number[];
  setRounds: (rounds: number[]) => void;
  teamStatus: TeammateStatus | null;
  setTeamStatus: (status: TeammateStatus | null) => void;
  generatedFiles: string[];
  setGeneratedFiles: (files: string[]) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

const ChatRuntimeContext = createContext<ChatRuntimeContextValue | null>(null);

export function ChatRuntimeProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AgentTaskView[]>([]);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, AgentOutput>>({});
  const [rounds, setRounds] = useState<number[]>([]);
  const [teamStatus, setTeamStatus] = useState<TeammateStatus | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <ChatRuntimeContext.Provider
      value={{
        tasks,
        setTasks,
        agentOutputs,
        setAgentOutputs,
        rounds,
        setRounds,
        teamStatus,
        setTeamStatus,
        generatedFiles,
        setGeneratedFiles,
        isRunning,
        setIsRunning,
      }}
    >
      {children}
    </ChatRuntimeContext.Provider>
  );
}

export function useChatRuntime() {
  const ctx = useContext(ChatRuntimeContext);
  if (!ctx) throw new Error('useChatRuntime 必须在 ChatRuntimeProvider 内使用');
  return ctx;
}
