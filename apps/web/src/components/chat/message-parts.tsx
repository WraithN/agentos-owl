/* 消息内部可复用的折叠面板、推理块、工具调用卡片等 UI 片段 */
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownText } from './MarkdownText';
import {
  formatToolDuration,
  formatToolInput,
  formatToolOutput,
  formatToolSummary,
  formatToolTime,
  getToolKey,
  getToolStatus,
} from './tool-call-utils';

export function CollapsiblePanel({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/50 bg-background/35 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((prev) => !prev)}
        className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </Button>
      {open && <div className="border-t border-border/40 px-3 py-2">{children}</div>}
    </div>
  );
}

export function ReasoningPanel({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <CollapsiblePanel title="AI思考推理">
      <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
    </CollapsiblePanel>
  );
}

export function ToolCallCard({ tool, sessionId }: { tool: any; sessionId: string }) {
  const [open, setOpen] = useState(false);
  const status = getToolStatus(tool);
  const duration = formatToolDuration(tool);
  const time = formatToolTime(tool);
  const inputValue = tool.args ?? {};
  const inputText = tool.argsText ?? formatToolInput(inputValue);
  const outputText = formatToolOutput(tool.result);
  const inputSummary = formatToolSummary(inputValue, formatToolInput);
  const outputSummary = formatToolSummary(tool.result, formatToolOutput);

  return (
    <div className="w-full rounded-lg border border-border/40 bg-muted/30 font-mono text-[11px]">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2 border-b border-border/40 p-2">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
            <span className="truncate font-medium text-foreground">{tool.toolName ?? '未知工具'}</span>
            <span className="shrink-0 text-muted-foreground">{status.label}</span>
            {duration && <span className="shrink-0 text-muted-foreground">{duration}</span>}
            {time && <span className="shrink-0 text-muted-foreground">{time}</span>}
          </div>
          <div className="truncate text-muted-foreground">输入：{inputSummary}</div>
          <div className="truncate text-muted-foreground">输出：{outputSummary}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen((prev) => !prev)}
          className="h-7 w-[5.5rem] justify-center gap-1 rounded-md px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? '关闭' : '展开'}
        </Button>
      </div>
      {open && (
        <div className="grid gap-2 p-2">
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">输入</div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] text-foreground">{inputText}</pre>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">输出</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] text-foreground">{outputText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolLogPanel({ tools, sessionId }: { tools: any[]; sessionId: string }) {
  if (tools.length === 0) return null;
  return (
    <div className="grid w-full gap-1">
      {tools.map((tool, index) => <ToolCallCard key={getToolKey(tool, index)} tool={tool} sessionId={sessionId} />)}
    </div>
  );
}


