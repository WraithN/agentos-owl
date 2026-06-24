/* 会话运行时 Context：在 ChatContainer 与右侧任务面板之间共享实时任务流 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AgentTaskView } from '@owl-os/core';

interface ChatRuntimeContextValue {
  tasks: AgentTaskView[];
  setTasks: (tasks: AgentTaskView[]) => void;
}

const ChatRuntimeContext = createContext<ChatRuntimeContextValue | null>(null);

export function ChatRuntimeProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AgentTaskView[]>([]);
  return <ChatRuntimeContext.Provider value={{ tasks, setTasks }}>{children}</ChatRuntimeContext.Provider>;
}

export function useChatRuntime() {
  const ctx = useContext(ChatRuntimeContext);
  if (!ctx) throw new Error('useChatRuntime 必须在 ChatRuntimeProvider 内使用');
  return ctx;
}
