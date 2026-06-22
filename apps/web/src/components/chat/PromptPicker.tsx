import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listPrompts, type Prompt } from '@/services/electron';
import { toast } from 'sonner';

const UNCATEGORIZED = '未分类';

interface PromptPickerProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

function groupFavoritePrompts(prompts: Prompt[]) {
  const favorites = prompts
    .filter((p) => p.isFavorite)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const categorized = new Map<string, Prompt[]>();
  for (const prompt of favorites) {
    const category = prompt.category.trim() || UNCATEGORIZED;
    if (!categorized.has(category)) categorized.set(category, []);
    categorized.get(category)!.push(prompt);
  }

  const sortedCategories = Array.from(categorized.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, 'zh-CN');
  });

  return { categories: sortedCategories, itemsByCategory: categorized };
}

export function PromptPicker({ inputRef }: PromptPickerProps) {
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listPrompts()
      .then(setPrompts)
      .catch((error: unknown) => {
        console.error('加载提示词失败:', error);
        toast.error('加载提示词失败');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const { categories, itemsByCategory } = useMemo(
    () => groupFavoritePrompts(prompts),
    [prompts]
  );

  const insertPrompt = (content: string) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = `${before}${content}${after}`;
    const cursor = start + content.length;
    textarea.setSelectionRange(cursor, cursor);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    setOpen(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                暂无常用提示词，去提示词市场添加
              </div>
            ) : (
              <Tabs defaultValue={categories[0]} className="w-full">
                <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent px-2 [&::-webkit-scrollbar]:hidden">
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {categories.map((category) => (
                  <TabsContent key={category} value={category} className="m-0">
                    <ScrollArea className="h-64">
                      <div className="py-1">
                        {itemsByCategory.get(category)?.map((prompt) => (
                          <button
                            key={prompt.id}
                            type="button"
                            onClick={() => insertPrompt(prompt.content)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="font-medium">{prompt.name}</div>
                            {prompt.description && (
                              <div className="truncate text-xs text-muted-foreground">
                                {prompt.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </PopoverContent>
        </Popover>
      </TooltipTrigger>
      <TooltipContent>
        <p>常用提示词</p>
      </TooltipContent>
    </Tooltip>
  );
}
