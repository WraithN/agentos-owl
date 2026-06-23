/* 工具调用（tool-call）展示与状态合并的共享逻辑 */

const TOOL_SUMMARY_MAX_LENGTH = 120;

/** 从工具事件中提取稳定 ID，用于合并同一工具调用的 start / end 事件 */
export function getToolEventId(event: any) {
  return event.toolCallId ?? event.id ?? event.toolName ?? event.name ?? 'tool';
}

/** 将单个工具事件转换为前端 tool-call part */
export function eventToToolPart(event: any) {
  return {
    type: 'tool-call',
    toolCallId: getToolEventId(event),
    toolName: event.toolName ?? event.name ?? '未知工具',
    args: event.args ?? {},
    argsText: JSON.stringify(event.args ?? {}, null, 2),
    result: event.type === 'tool_execution_end' ? event.result : undefined,
    isError: event.isError,
    startedAt: event.startedAt ?? Date.now(),
    endedAt: event.endedAt,
    durationMs: event.durationMs,
  };
}

/**
 * 合并同一 toolCallId 的多个 tool_event 事件。
 *
 * Pi Agent 运行时会分开发送 tool_execution_start 与 tool_execution_end；
 * 如果不合并，同一工具调用会渲染成“执行中”和“完成/报错”两条记录，
 * 导致用户误以为状态没有更新。
 */
export function mergeToolEvents(events: unknown[]): any[] {
  const byId = new Map<string, any>();
  for (const raw of events) {
    const event = raw as any;
    const id = getToolEventId(event);
    if (!byId.has(id)) {
      byId.set(id, eventToToolPart(event));
      continue;
    }

    const existing = byId.get(id);
    const isEnd = event.type === 'tool_execution_end';
    const endedAt = isEnd ? (event.endedAt ?? Date.now()) : existing.endedAt;
    const startedAt = existing.startedAt ?? event.startedAt ?? Date.now();
    const durationMs =
      typeof event.durationMs === 'number'
        ? event.durationMs
        : typeof endedAt === 'number' && typeof startedAt === 'number'
          ? endedAt - startedAt
          : existing.durationMs;

    byId.set(id, {
      ...existing,
      args: event.args ?? existing.args,
      argsText: event.args ? JSON.stringify(event.args, null, 2) : existing.argsText,
      toolName: event.toolName ?? event.name ?? existing.toolName,
      result: isEnd ? event.result : existing.result,
      isError: isEnd ? event.isError : existing.isError,
      startedAt,
      endedAt,
      durationMs,
    });
  }
  return Array.from(byId.values());
}

export function formatToolInput(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? {});
  }
}

export function formatToolOutput(value: unknown): string {
  if (value === undefined) return '暂无输出';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(formatToolOutput).filter(Boolean).join('\n');
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'output', 'stdout', 'stderr', 'message', 'error', 'result']) {
      if (key in record) return formatToolOutput(record[key]);
    }
    // 结构化的工具结果统一序列化，避免显示 [object Object]
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function formatToolSummary(value: unknown, formatter: (value: unknown) => string) {
  const text = formatter(value).replace(/\s+/g, ' ').trim();
  if (text.length <= TOOL_SUMMARY_MAX_LENGTH) return text;
  return `${text.slice(0, TOOL_SUMMARY_MAX_LENGTH)}…`;
}

/** 格式化工具耗时；未结束时返回 null，避免与状态文案重复显示“进行中”。 */
export function formatToolDuration(tool: any) {
  const ms =
    typeof tool.durationMs === 'number'
      ? tool.durationMs
      : typeof tool.startedAt === 'number' && typeof tool.endedAt === 'number'
        ? Math.max(0, tool.endedAt - tool.startedAt)
        : undefined;
  if (typeof ms !== 'number') return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** 格式化工具调用开始时间，例如 09:32:08。 */
export function formatToolTime(tool: any) {
  const ts = tool.startedAt ?? tool.endedAt;
  if (typeof ts !== 'number') return null;
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return null;
  }
}

function isToolComplete(tool: any) {
  return typeof tool.endedAt === 'number' || tool.result !== undefined || tool.isError === true;
}

export function getToolStatus(tool: any) {
  if (tool.isError) return { label: '执行报错', dot: 'bg-destructive' };
  if (isToolComplete(tool)) return { label: '完成', dot: 'bg-emerald-400' };
  return { label: '执行中', dot: 'bg-amber-400' };
}

export function getToolKey(tool: any, index: number) {
  return `${tool.toolCallId ?? tool.toolName ?? 'tool'}:${index}`;
}
