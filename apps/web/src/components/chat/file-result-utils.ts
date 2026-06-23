/* 从 AI 消息内容中提取生成的本地文件（目前支持 .docx/.pptx/.xlsx/.csv/.pdf/.xmind/.md/.txt） */

const SUPPORTED_FILE_EXTENSIONS = ['docx', 'pptx', 'xlsx', 'csv', 'pdf', 'xmind', 'md', 'txt'] as const;
const FILE_EXTENSION_PATTERN = SUPPORTED_FILE_EXTENSIONS.join('|');
const GENERATED_FILE_PATTERN = new RegExp(`((?:file://|/|[A-Za-z]:[\\\\/]|~/)[^\\s]+\\.(?:${FILE_EXTENSION_PATTERN})|[A-Za-z0-9_\\-.\\u4e00-\\u9fa5]+\\.(?:${FILE_EXTENSION_PATTERN}))`, 'gi');

function resolveFilePath(value: string): string {
  if (/^(file:\/\/|\/|[A-Za-z]:[\\/]|~\/)/.test(value)) return value;
  return `~/.config/owl-os/workspace/${value}`;
}

function extractFilePathsFromText(text: string): string[] {
  const paths: string[] = [];
  for (const match of text.matchAll(GENERATED_FILE_PATTERN)) {
    const raw = match[1] ?? match[0];
    // 从可能包含中文动词/标点的匹配值中清洗出真正的文件名
    const cleaned = raw.match(new RegExp(`(?:^|[\\s:：])([^\\s/\\\\]*\\.(?:${FILE_EXTENSION_PATTERN}))$`, 'i'))?.[1] ?? raw;
    paths.push(resolveFilePath(cleaned));
  }
  return paths;
}

function extractTextFromToolResult(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.content)) {
      return r.content.map((part) => (typeof part === 'object' && part !== null ? (part as { text?: string }).text ?? '' : String(part))).join('\n');
    }
    return String(r.stdout ?? r.result ?? r.message ?? '');
  }
  return String(result ?? '');
}

export function extractGeneratedFilePaths(message: { content?: unknown }): string[] {
  const parts = Array.isArray(message.content) ? message.content : [{ type: 'text', text: typeof message.content === 'string' ? message.content : '' }];
  const paths: string[] = [];
  for (const part of parts as Array<Record<string, unknown>>) {
    if (part.type === 'text' && typeof part.text === 'string') {
      paths.push(...extractFilePathsFromText(part.text));
    }
    if (part.type === 'tool-call') {
      const resultText = extractTextFromToolResult(part.result ?? part.partialResult);
      paths.push(...extractFilePathsFromText(resultText));
    }
  }
  // 去重并保持顺序
  return [...new Set(paths)];
}
