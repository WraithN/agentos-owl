/* 跨组件订阅 LLM 模型配置 */
import { useEffect, useState } from 'react';
import { getSettings } from '@/services/electron';

const EVENT_NAME = 'owl:llm-models-changed';

export interface LlmModelMeta {
  id: string;
  name: string;
  baseUrl: string;
  provider?: string;
  category: 'llm' | 'embedding' | 'voice';
  isDefault?: boolean;
}

function parseModels(value: unknown): LlmModelMeta[] {
  if (!Array.isArray(value)) return [];
  return value.filter((m): m is LlmModelMeta => {
    if (!m || typeof m !== 'object') return false;
    const v = m as Record<string, unknown>;
    return (
      typeof v.id === 'string' &&
      typeof v.name === 'string' &&
      typeof v.baseUrl === 'string' &&
      (v.category === 'llm' || v.category === 'embedding' || v.category === 'voice')
    );
  });
}

function hasDefaultLlm(models: LlmModelMeta[]): boolean {
  return models.some((m) => m.category === 'llm' && m.isDefault === true);
}

/** 订阅 LLM 模型元数据，跨组件自动同步 */
export function useLlmModels(): { ready: boolean; models: LlmModelMeta[] } {
  const [ready, setReady] = useState(false);
  const [models, setModels] = useState<LlmModelMeta[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const settings = await getSettings();
        if (cancelled) return;
        setModels(parseModels(settings['llmModels']));
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    refresh();

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ metadata?: LlmModelMeta[] }>).detail;
      if (detail?.metadata) {
        setModels(parseModels(detail.metadata));
      } else {
        refresh();
      }
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, onChange);
    };
  }, []);

  return { ready, models };
}

/** 是否已存在默认对话模型（用于侧栏红点 / 横幅提醒） */
export function useHasDefaultLlmModel(): { ready: boolean; hasDefault: boolean } {
  const { ready, models } = useLlmModels();
  return { ready, hasDefault: hasDefaultLlm(models) };
}

/** 仅返回对话类（category==='llm'）模型，便于「智能体配置」下拉选择 */
export function useChatLlmModels(): {
  ready: boolean;
  models: LlmModelMeta[];
  defaultModel?: LlmModelMeta;
} {
  const { ready, models } = useLlmModels();
  const chatModels = models.filter((m) => m.category === 'llm');
  const defaultModel = chatModels.find((m) => m.isDefault) ?? chatModels[0];
  return { ready, models: chatModels, defaultModel };
}
