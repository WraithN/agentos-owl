import { useCallback, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createHtmlPreviewTempFile, openExternal, openHtmlPreviewWindow, openLocalFilePreview, openPath, saveHtmlPreviewAs } from '@/services/electron';
import { getHtmlDefaultFileName, getHtmlTitle, isHtmlCode } from '@/components/html-preview/htmlPreviewUtils';

const CODE_BLOCK_COLLAPSE_LINE_COUNT = 100;
const CODE_BLOCK_PREVIEW_LINE_COUNT = 24;
const CODE_FENCE_PATTERN = /```([^\n`]*)\n?([\s\S]*?)```/g;
const DEFAULT_CODE_LANGUAGE = 'text';
const COPY_RESET_DELAY_MS = 2000;
const HTML_PREVIEW_TOO_LARGE_CODE = 'HTML_PREVIEW_TOO_LARGE';
const DOCX_PATH_PATTERN = /([^\s]+\.docx)/i;
const KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  python: ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'class', 'try', 'except', 'with', 'as', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'lambda', 'yield', 'async', 'await', 'pass', 'raise'],
  default: ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'new', 'this', 'typeof', 'instanceof', 'try', 'catch', 'throw', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'extends', 'implements'],
};

type MarkdownPart =
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; filename?: string; code: string };

type InlineToken = { type: 'text' | 'bold' | 'italic' | 'code' | 'link'; content: string; href?: string };

function parseCodeFenceInfo(info: string) {
  const [language = DEFAULT_CODE_LANGUAGE, filename] = info.trim().split(/\s+/);
  return { language: language || DEFAULT_CODE_LANGUAGE, filename };
}

function parseMarkdownParts(text: string): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CODE_FENCE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, index) });
    }

    const { language, filename } = parseCodeFenceInfo(match[1] ?? '');
    parts.push({ type: 'code', language, filename, code: (match[2] ?? '').replace(/\n$/, '') });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

function getCodeKeywords(language: string) {
  return KEYWORDS_BY_LANGUAGE[language.toLowerCase()] ?? KEYWORDS_BY_LANGUAGE.default;
}

function highlightCode(code: string, language: string) {
  const keywords = getCodeKeywords(language);

  return code.split('\n').map((line, lineIndex) => {
    const trimmedLine = line.trimStart();
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
      return <span key={lineIndex} className="block text-muted-foreground italic">{line}{'\n'}</span>;
    }

    const parts: ReactNode[] = [];
    let remaining = line;
    let partIndex = 0;

    while (remaining.length > 0) {
      const stringMatch = remaining.match(/^(["'`])(.*?)\1/);
      if (stringMatch) {
        parts.push(<span key={partIndex++} className="text-emerald-400">{stringMatch[0]}</span>);
        remaining = remaining.slice(stringMatch[0].length);
        continue;
      }

      const keywordMatch = keywords.find((keyword) => new RegExp(`^\\b${keyword}\\b`).test(remaining));
      if (keywordMatch) {
        parts.push(<span key={partIndex++} className="text-cyan-400 font-medium">{keywordMatch}</span>);
        remaining = remaining.slice(keywordMatch.length);
        continue;
      }

      const numberMatch = remaining.match(/^\b\d+\.?\d*\b/);
      if (numberMatch) {
        parts.push(<span key={partIndex++} className="text-amber-400">{numberMatch[0]}</span>);
        remaining = remaining.slice(numberMatch[0].length);
        continue;
      }

      parts.push(<span key={partIndex++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }

    return <span key={lineIndex} className="block">{parts}{'\n'}</span>;
  });
}

function isExternalHref(href: string) {
  return /^(https?:\/\/|mailto:)/.test(href);
}

function isLocalFileHref(href: string) {
  return /^(file:\/\/|\/|~\/|[A-Za-z]:[\\/])/.test(href);
}

function isDocxHref(href: string) {
  return /\.docx$/i.test(href);
}

function localPathFromHref(href: string) {
  if (!href.startsWith('file://')) return href;
  try {
    return decodeURIComponent(new URL(href).pathname);
  } catch {
    return href.replace(/^file:\/\//, '');
  }
}

function handleLinkClick(href: string, sessionId?: string) {
  if (isDocxHref(href) && sessionId) {
    if (!/^(file:\/\/|\/|[A-Za-z]:[\\/]|~\/)/.test(href)) {
      toast.error(`无法预览“${href}”：路径不完整，请在工具调用输出中查看完整路径`);
      return;
    }
    void openLocalFilePreview(sessionId, localPathFromHref(href))
      .catch((error: unknown) => {
        const detail = error as { code?: string; message?: string };
        if (detail.code === 'FILE_PREVIEW_FILE_NOT_FOUND' || detail.message?.includes('FILE_PREVIEW_FILE_NOT_FOUND')) {
          toast.error('文件不存在，请确认路径正确');
          return;
        }
        if (detail.code === 'FILE_PREVIEW_UNSUPPORTED_TYPE' || detail.message?.includes('FILE_PREVIEW_UNSUPPORTED_TYPE')) {
          toast.error('暂不支持该文件类型预览');
          return;
        }
        toast.error(`预览失败：${detail.message ?? '未知错误'}`);
      });
    return;
  }
  if (isLocalFileHref(href)) {
    openPath(localPathFromHref(href));
    return;
  }
  if (isExternalHref(href)) {
    openExternal(href);
  }
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\s)]+\)|((?:file:\/\/|\/|[A-Za-z]:[\\/]|~\/)[^\s]+\.docx))/gi;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const value = match[0];
    if (index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, index) });
    }

    if (value.startsWith('`')) {
      tokens.push({ type: 'code', content: value.slice(1, -1) });
    } else if (value.startsWith('**')) {
      tokens.push({ type: 'bold', content: value.slice(2, -2) });
    } else if (value.startsWith('*')) {
      tokens.push({ type: 'italic', content: value.slice(1, -1) });
    } else {
      const linkMatch = value.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
      if (linkMatch) {
        tokens.push({ type: 'link', content: linkMatch[1], href: linkMatch[2] });
      } else if (DOCX_PATH_PATTERN.test(value)) {
        tokens.push({ type: 'link', content: value, href: value });
      }
    }

    lastIndex = index + value.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens;
}

function renderInline(text: string, sessionId?: string) {
  return parseInline(text).map((token, index) => {
    if (token.type === 'bold') return <strong key={index} className="font-semibold">{renderInline(token.content, sessionId)}</strong>;
    if (token.type === 'italic') return <em key={index} className="italic">{renderInline(token.content, sessionId)}</em>;
    if (token.type === 'code') return <code key={index} className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300">{token.content}</code>;
    if (token.type === 'link' && token.href && (isExternalHref(token.href) || isLocalFileHref(token.href) || isDocxHref(token.href))) {
      return (
        <button
          key={index}
          type="button"
          className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
          onClick={() => handleLinkClick(token.href ?? '', sessionId)}
        >
          {token.content}
        </button>
      );
    }
    return <span key={index}>{token.content}</span>;
  });
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function getTableAlignments(separator: string) {
  return splitTableRow(separator).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'text-center';
    if (right) return 'text-right';
    return 'text-left';
  });
}

function isTableBlock(block: string) {
  const lines = block.split('\n').filter((line) => line.trim());
  return lines.length >= 3 && lines[0].includes('|') && isTableSeparator(lines[1]);
}

function renderTableBlock(block: string, index: number, sessionId?: string) {
  const lines = block.split('\n').filter((line) => line.trim());
  const headers = splitTableRow(lines[0]);
  const alignments = getTableAlignments(lines[1]);
  const rows = lines.slice(2).map(splitTableRow);

  return (
    <div key={index} className="my-3 max-w-full overflow-hidden rounded-xl border border-border/60 bg-background/50">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-max border-collapse text-left text-xs">
          <thead className="bg-muted/70 text-foreground">
            <tr>
              {headers.map((header, cellIndex) => (
                <th key={cellIndex} className={`border-b border-border/60 px-3 py-2 font-semibold ${alignments[cellIndex] ?? 'text-left'}`}>
                  {renderInline(header, sessionId)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/40 last:border-0 odd:bg-muted/20">
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className={`px-3 py-2 align-top text-foreground/90 ${alignments[cellIndex] ?? 'text-left'}`}>
                    {renderInline(row[cellIndex] ?? '', sessionId)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 p-2 md:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-lg border border-border/40 bg-muted/20 p-2 text-xs">
            {headers.map((header, cellIndex) => (
              <div key={cellIndex} className="grid grid-cols-[6rem_1fr] gap-2 border-b border-border/30 py-1 last:border-0">
                <span className="text-muted-foreground">{renderInline(header, sessionId)}</span>
                <span className="text-foreground/90">{renderInline(row[cellIndex] ?? '', sessionId)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderTextBlock(block: string, index: number, sessionId?: string) {
  const trimmed = block.trim();
  if (isTableBlock(block)) {
    return renderTableBlock(block, index, sessionId);
  }

  const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (heading) {
    const level = heading[1].length;
    const className = level <= 2
      ? 'mt-3 mb-2 font-semibold text-base leading-snug'
      : 'mt-2 mb-1 font-semibold text-sm leading-snug';
    const content = renderInline(heading[2], sessionId);
    if (level === 1) return <h1 key={index} className={className}>{content}</h1>;
    if (level === 2) return <h2 key={index} className={className}>{content}</h2>;
    if (level === 3) return <h3 key={index} className={className}>{content}</h3>;
    return <h4 key={index} className={className}>{content}</h4>;
  }

  if (/^[-*_]{3,}$/.test(trimmed)) {
    return <hr key={index} className="my-3 border-border/70" />;
  }

  if (block.split('\n').every((line) => /^\s*[-*+]\s+/.test(line))) {
    return (
      <ul key={index} className="my-2 list-disc space-y-1 pl-5">
        {block.split('\n').map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.replace(/^\s*[-*+]\s+/, ''), sessionId)}</li>)}
      </ul>
    );
  }

  if (block.split('\n').every((line) => /^\s*\d+\.\s+/.test(line))) {
    return (
      <ol key={index} className="my-2 list-decimal space-y-1 pl-5">
        {block.split('\n').map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.replace(/^\s*\d+\.\s+/, ''), sessionId)}</li>)}
      </ol>
    );
  }

  if (block.split('\n').every((line) => /^\s*>\s?/.test(line))) {
    return (
      <blockquote key={index} className="my-2 border-l-2 border-cyan-400/50 pl-3 text-muted-foreground">
        {block.split('\n').map((line, itemIndex) => <p key={itemIndex}>{renderInline(line.replace(/^\s*>\s?/, ''), sessionId)}</p>)}
      </blockquote>
    );
  }

  return <p key={index} className="whitespace-pre-wrap leading-relaxed">{renderInline(block, sessionId)}</p>;
}

function renderMarkdownText(text: string, sessionId?: string) {
  const blocks: string[] = [];
  const lines = text.split('\n');
  let buffer: string[] = [];
  let index = 0;

  const flushBuffer = () => {
    const block = buffer.join('\n').trimEnd();
    if (block.trim()) {
      blocks.push(block);
    }
    buffer = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const nextLine = lines[index + 1];

    if (!line.trim()) {
      flushBuffer();
      index += 1;
      continue;
    }

    if (nextLine && line.includes('|') && isTableSeparator(nextLine)) {
      flushBuffer();
      const tableLines = [line, nextLine];
      index += 2;

      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }

      blocks.push(tableLines.join('\n'));
      continue;
    }

    const isStandaloneBlock = /^(#{1,6}\s+|[-*_]{3,}\s*$|\s*>\s?)/.test(line);
    if (isStandaloneBlock) {
      flushBuffer();
      blocks.push(line);
      index += 1;
      continue;
    }

    buffer.push(line);
    index += 1;
  }

  flushBuffer();
  return blocks.map((block, index) => renderTextBlock(block, index, sessionId));
}

function FormattedCodeBlock({ data, sessionId }: { data: Extract<MarkdownPart, { type: 'code' }>; sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lines = data.code.split('\n');
  const shouldCollapse = lines.length > CODE_BLOCK_COLLAPSE_LINE_COUNT;
  const visibleCode = shouldCollapse && !expanded
    ? lines.slice(0, CODE_BLOCK_PREVIEW_LINE_COUNT).join('\n')
    : data.code;
  const isHtml = isHtmlCode(data.language, data.code);
  const defaultName = getHtmlDefaultFileName(data.code, data.filename);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }, [data.code]);

  const download = useCallback(async () => {
    if (isHtml) {
      await saveHtmlPreviewAs({ html: data.code, defaultName });
      return;
    }
    const blob = new Blob([data.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.filename ?? `code.${data.language || DEFAULT_CODE_LANGUAGE}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data.code, data.filename, data.language, defaultName, isHtml]);

  const executeHtml = useCallback(async () => {
    try {
      const result = await createHtmlPreviewTempFile({ sessionId, html: data.code, title: getHtmlTitle(data.code) ?? data.filename });
      await openHtmlPreviewWindow(result.previewId);
    } catch (error) {
      const detail = error as { code?: string; maxPreviewBytes?: number; message?: string };
      if (detail.code === HTML_PREVIEW_TOO_LARGE_CODE || detail.message?.includes(HTML_PREVIEW_TOO_LARGE_CODE)) {
        const maxMb = detail.maxPreviewBytes ? Math.floor(detail.maxPreviewBytes / 1024 / 1024) : undefined;
        toast.error(maxMb ? `HTML 超过预览大小限制（${maxMb}MB）` : 'HTML 超过预览大小限制');
        return;
      }
      toast.error('打开 HTML 预览失败');
    }
  }, [data.code, data.filename, sessionId]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/60 bg-background/70 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md border border-cyan-500/25 bg-cyan-500/15 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
            {data.language}
          </span>
          {data.filename && <span className="truncate font-mono text-xs text-muted-foreground">{data.filename}</span>}
          <span className="text-xs text-muted-foreground">{lines.length} 行</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {shouldCollapse && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded((value) => !value)}>
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {expanded ? '收起' : '展开'}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制'}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={download}>
            <Download className="h-3.5 w-3.5" />
            下载
          </Button>
          {isHtml && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={executeHtml}>
              <Eye className="h-3.5 w-3.5" />
              预览
            </Button>
          )}
        </div>
      </div>
      <pre className="max-w-full overflow-x-auto p-3 font-mono text-sm leading-relaxed text-slate-200">
        {highlightCode(visibleCode, data.language)}
      </pre>
      {isHtml && (
        <div className="border-t border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          HTML 内容将通过独立窗口与 iframe sandbox 安全预览。
        </div>
      )}
      {shouldCollapse && !expanded && (
        <div className="border-t border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          已折叠，显示前 {CODE_BLOCK_PREVIEW_LINE_COUNT} 行 / 共 {lines.length} 行
        </div>
      )}
    </div>
  );
}

export function MarkdownText({ text, sessionId }: { text: string; sessionId: string }) {
  return (
    <div className="space-y-2 break-words">
      {parseMarkdownParts(text).map((part, index) => part.type === 'code'
        ? <FormattedCodeBlock key={`${part.type}-${index}`} data={part} sessionId={sessionId} />
        : <div key={`${part.type}-${index}`} className="space-y-2">{renderMarkdownText(part.content, sessionId)}</div>)}
    </div>
  );
}
