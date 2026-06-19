/* 智能体列表共享 Hook（SQLite 数据源） */
import { useEffect, useMemo, useState } from 'react';
import type { Agent } from '@/types';
import { listAgents } from '@/services/electron';

const EVENT_NAME = 'owl:agents-changed';

/** 通知其它订阅者：智能体列表已更新 */
export function emitAgentsChanged(): void {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** 订阅 SQLite 中的智能体列表 */
export function useAgents(): { ready: boolean; agents: Agent[]; getAgent: (id: string) => Agent | undefined } {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const list = await listAgents();
        if (cancelled) return;
        setAgents(list);
      } catch (err) {
        if (!cancelled) {
          console.error('加载智能体失败:', err);
          setAgents([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    refresh();

    const onChange = () => {
      refresh();
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, onChange);
    };
  }, []);

  const map = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  return {
    ready,
    agents,
    getAgent: (id: string) => map.get(id),
  };
}
