/* 底部输入 Composer */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Command,
  Sparkles,
  X,
  Square,
} from 'lucide-react';
import { ComposerPrimitive, useComposerRuntime } from '@assistant-ui/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TeamSelector } from './TeamSelector';
import { PromptPicker } from './PromptPicker';

interface ChatComposerProps {
  initialText?: string;
  isRunning?: boolean;
  selectedTeam?: string;
  onTeamChange?: (teamId?: string) => void;
}

export function ChatComposer({
  initialText = '',
  isRunning = false,
  selectedTeam,
  onTeamChange,
}: ChatComposerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 通过 ComposerRuntime 设置文本，可同步 assistant-ui 内部状态并启用发送按钮
  const composer = useComposerRuntime();

  const setInputText = useCallback((text: string) => {
    composer.setText(text);
    // 设置值后将焦点移回输入框，提升交互体验
    inputRef.current?.focus();
  }, [composer]);

  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
  }, [initialText, setInputText]);

  const skills = [
    { id: 'coding', name: '代码助手', icon: '💻' },
    { id: 'writing', name: '写作助手', icon: '✍️' },
    { id: 'analysis', name: '数据分析', icon: '📊' },
    { id: 'translation', name: '翻译助手', icon: '🌐' },
  ];

  const commands = [
    { id: 'explain', name: '解释代码', description: '详细解释选中的代码' },
    { id: 'refactor', name: '重构代码', description: '优化代码结构和可读性' },
    { id: 'test', name: '生成测试', description: '为代码生成单元测试' },
    { id: 'doc', name: '生成文档', description: '生成代码注释和文档' },
  ];

  return (
    <TooltipProvider>
      <ComposerPrimitive.Root className="shrink-0 border-t border-border/50 p-3 glass-l1">
        {/* Selected File Preview */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />

        {/* Input Row */}
        <div className="flex items-end gap-2">
          {/* Text Input */}
          <div className="relative flex-1">
            <ComposerPrimitive.Input
              ref={inputRef}
              className="min-h-[72px] max-h-[160px] w-full resize-none rounded-xl border border-input bg-background px-3 pb-10 pr-12 pt-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入消息，按 Enter 发送，Shift+Enter 换行…"
              rows={2}
              submitMode="enter"
            />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRecording ? 'destructive' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>语音输入</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>附件</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Command className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>快捷指令</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start">
                  {commands.map((cmd) => (
                    <DropdownMenuItem
                      key={cmd.id}
                      onClick={() => {
                        const current = composer.getState().text;
                        setInputText(`${cmd.name}：${current}`);
                      }}
                    >
                      {cmd.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>技能</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start">
                  {skills.map((skill) => (
                    <DropdownMenuItem
                      key={skill.id}
                      onClick={() => {
                        const current = composer.getState().text;
                        setInputText(`使用「${skill.name}」技能：${current}`);
                      }}
                    >
                      {skill.icon} {skill.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <PromptPicker inputRef={inputRef} />
              <TeamSelector selected={selectedTeam} onSelect={onTeamChange} />
            </div>
            <div className="absolute bottom-1.5 right-2">
              {isRunning ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ComposerPrimitive.Cancel asChild>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
                      >
                        <Square className="h-3 w-3 fill-current" />
                      </button>
                    </ComposerPrimitive.Cancel>
                  </TooltipTrigger>
                  <TooltipContent>停止</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ComposerPrimitive.Send asChild>
                      <Button type="submit" size="icon" className="h-7 w-7">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </ComposerPrimitive.Send>
                  </TooltipTrigger>
                  <TooltipContent>发送</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-xs text-destructive animate-pulse">
            <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
            正在录音... 点击停止
          </div>
        )}
      </ComposerPrimitive.Root>
    </TooltipProvider>
  );
}
