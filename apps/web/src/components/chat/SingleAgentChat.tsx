/* 单 Agent 对话界面 —— 基于 assistant-ui 与 Pi Agent IPC */
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePiAgentRuntime } from './usePiAgentRuntime';

export interface SingleAgentChatProps {
  conversationId: string;
  agentId?: string;
}

export default function SingleAgentChat({ conversationId, agentId }: SingleAgentChatProps) {
  const runtime = usePiAgentRuntime(conversationId);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="h-full flex flex-col overflow-hidden">
        {/* 消息滚动区 */}
        <ThreadPrimitive.Viewport
          autoScroll
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        >
          <ThreadPrimitive.Messages>
            {({ message }) => (
              <MessagePrimitive.Root
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <MessagePrimitive.Parts
                    components={{
                      Text: ({ text }) => <p className="whitespace-pre-wrap">{text}</p>,
                      Reasoning: ({ text }) => (
                        <div className="text-xs text-muted-foreground italic border-l-2 border-current/30 pl-2 my-1">
                          {text}
                        </div>
                      ),
                      tools: {
                        Fallback: ({ toolName, argsText, result, isError }) => (
                          <div className="my-2 rounded-md border border-border/50 p-2 text-xs bg-background/40">
                            <div className="font-semibold">🔧 {toolName}</div>
                            <pre className="mt-1 overflow-x-auto opacity-80">{argsText}</pre>
                            {result !== undefined && (
                              <pre
                                className={`mt-1 overflow-x-auto ${
                                  isError ? 'text-destructive' : 'text-emerald-400'
                                }`}
                              >
                                {JSON.stringify(result, null, 2)}
                              </pre>
                            )}
                          </div>
                        ),
                      },
                    }}
                  />
                </div>
              </MessagePrimitive.Root>
            )}
          </ThreadPrimitive.Messages>

          <ThreadPrimitive.Empty>
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <p className="text-base">开始与 Agent 对话</p>
              {agentId && <p className="text-xs mt-1">Agent ID: {agentId}</p>}
            </div>
          </ThreadPrimitive.Empty>
        </ThreadPrimitive.Viewport>

        {/* 输入区 */}
        <ComposerPrimitive.Root className="shrink-0 border-t border-border/50 p-4 flex items-end gap-2 glass-l1">
          <ComposerPrimitive.Input
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] max-h-[160px]"
            placeholder="输入消息，按 Enter 发送…"
            rows={1}
            submitMode="enter"
          />
          <ComposerPrimitive.Send asChild>
            <Button type="submit" size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </ComposerPrimitive.Send>
          <ComposerPrimitive.Cancel asChild>
            <Button type="reset" variant="secondary" size="icon" className="shrink-0">
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
