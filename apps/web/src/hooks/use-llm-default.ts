/* 跨组件订阅 LLM 模型配置 */
import { useEffect, useState } from 'react';
import type { LlmModelConfig } from '@owl-os/core';
import { hasDefaultLlm, parseLlmModels } from '@owl-os/core';
import { getSettings } from '@/services/electron';

const EVENT_NAME = 'owl:llm-models-changed';

export type { LlmModelConfig };

/** 订阅 LLM 模型元数据，跨组件自动同步 */
export function useLlmModels(): { ready: boolean; models: LlmModelConfig[] } {
  const [ready, setReady] = useState(false);
  const [models, setModels] = useState<LlmModelConfig[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const settings = await getSettings();
        if (cancelled) return;
        setModels(parseLlmModels(typeof settings['llmModels'] === 'string' ? settings['llmModels'] : undefined));
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    refresh();

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ metadata?: LlmModelConfig[] }>).detail;
      if (detail?.metadata) {
        setModels(parseLlmModels(JSON.stringify(detail.metadata)));
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
  models: LlmModelConfig[];
  defaultModel?: LlmModelConfig;
} {
  const { ready, models } = useLlmModels();
  const chatModels = models.filter((m) => m.category === 'llm');
  const defaultModel = chatModels.find((m) => m.isDefault) ?? chatModels[0];
  return { ready, models: chatModels, defaultModel };
}
