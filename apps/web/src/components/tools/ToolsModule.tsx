/* 扩展模块（apps/web 装配层）— 把 SQLite 数据接入纯 UI 组件 ToolsModule */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ToolsModule } from '@owl-os/tools';
import type { SkillItem, PromptItem, MarketTool as PkgMarketTool, ToolsModuleDataSource } from '@owl-os/tools';
import { toast } from 'sonner';
import {
  listSkills,
  saveSkill,
  deleteSkill,
  listPrompts,
  savePrompt,
  deletePrompt,
  listMarketTools,
  saveMarketTool,
  deleteMarketTool,
  listExtensionTags,
  saveExtensionTag,
  type Skill as DbSkill,
  type Prompt as DbPrompt,
  type ToolCategory,
  type ToolCategoryScope,
} from '@/services/electron';
import type { MarketTool as DbMarketTool } from '@/types';

const ALL_CATEGORY = '全部';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

export default function ToolsModuleContainer() {
  const [skills, setSkills] = useState<DbSkill[]>([]);
  const [prompts, setPrompts] = useState<DbPrompt[]>([]);
  const [tools, setTools] = useState<DbMarketTool[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);

  const reloadAll = useCallback(async () => {
    try {
      const [s, p, t, c] = await Promise.all([
        listSkills(),
        listPrompts(),
        listMarketTools(),
        listExtensionTags(),
      ]);
      setSkills(s);
      setPrompts(p);
      setTools(t);
      setCategories(c);
    } catch (err) {
      console.error('[ToolsModule] 加载数据失败', err);
      toast.error('扩展数据加载失败');
    }
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // ===== DB → 包内类型映射 =====
  const skillItems: SkillItem[] = useMemo(
    () => skills.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      stars: s.stars,
      installs: s.installs,
      official: s.official,
      iconBg: s.iconBg,
      icon: s.icon,
      tags: s.tags,
    })),
    [skills]
  );

  const promptItems: PromptItem[] = useMemo(
    () => prompts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      content: p.content,
      official: p.official,
      tags: p.tags,
    })),
    [prompts]
  );

  // 工具市场仅展示 mcp / cli（与原模块保持一致）
  const toolItems: PkgMarketTool[] = useMemo(
    () => tools
      .filter(t => t.toolType === 'mcp' || t.toolType === 'cli')
      .map(t => ({
        ...t,
        toolType: t.toolType as 'mcp' | 'cli',
        createdAt: toDate(t.createdAt),
        updatedAt: toDate(t.updatedAt),
      })),
    [tools]
  );

  const categoriesByScope = useMemo(() => {
    const group = (scope: ToolCategoryScope): string[] => {
      const names = categories.filter(c => c.scope === scope).map(c => c.name);
      return [ALL_CATEGORY, ...names];
    };
    return {
      skill: group('skill'),
      prompt: group('prompt'),
      tool: group('tool'),
    };
  }, [categories]);

  // ===== 写入回调 =====
  const onCreateSkill = useCallback(async (s: SkillItem) => {
    try {
      const saved = await saveSkill({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        icon: s.icon,
        iconBg: s.iconBg,
        stars: s.stars,
        installs: s.installs,
        official: s.official,
        tags: s.tags,
      });
      setSkills(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
    } catch {
      toast.error('保存技能失败');
    }
  }, []);

  const onUpdateSkill = useCallback(async (s: SkillItem) => {
    try {
      const existing = skills.find(x => x.id === s.id);
      const saved = await saveSkill({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        icon: s.icon,
        iconBg: s.iconBg,
        stars: s.stars,
        installs: s.installs,
        official: s.official,
        tags: s.tags,
        createdAt: existing?.createdAt,
      });
      setSkills(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    } catch {
      toast.error('更新技能失败');
    }
  }, [skills]);

  const onDeleteSkill = useCallback(async (id: string) => {
    try {
      await deleteSkill(id);
      setSkills(prev => prev.filter(x => x.id !== id));
    } catch {
      toast.error('删除技能失败');
    }
  }, []);

  const onCreatePrompt = useCallback(async (p: PromptItem) => {
    try {
      const saved = await savePrompt({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        content: p.content,
        official: p.official,
        tags: p.tags,
      });
      setPrompts(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
    } catch {
      toast.error('保存提示词失败');
    }
  }, []);

  const onUpdatePrompt = useCallback(async (p: PromptItem) => {
    try {
      const existing = prompts.find(x => x.id === p.id);
      const saved = await savePrompt({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        content: p.content,
        official: p.official,
        tags: p.tags,
        createdAt: existing?.createdAt,
      });
      setPrompts(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    } catch {
      toast.error('更新提示词失败');
    }
  }, [prompts]);

  const onDeletePrompt = useCallback(async (id: string) => {
    try {
      await deletePrompt(id);
      setPrompts(prev => prev.filter(x => x.id !== id));
    } catch {
      toast.error('删除提示词失败');
    }
  }, []);

  const onCreateTool = useCallback(async (t: PkgMarketTool) => {
    try {
      const dbTool: DbMarketTool = {
        ...t,
        createdAt: toDate(t.createdAt),
        updatedAt: toDate(t.updatedAt),
      };
      const saved = await saveMarketTool(dbTool);
      setTools(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
    } catch {
      toast.error('保存工具失败');
    }
  }, []);

  const onUpdateTool = useCallback(async (t: PkgMarketTool) => {
    try {
      const dbTool: DbMarketTool = {
        ...t,
        createdAt: toDate(t.createdAt),
        updatedAt: new Date(),
      };
      const saved = await saveMarketTool(dbTool);
      setTools(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    } catch {
      toast.error('更新工具失败');
    }
  }, []);

  const onDeleteTool = useCallback(async (id: string) => {
    try {
      await deleteMarketTool(id);
      setTools(prev => prev.filter(x => x.id !== id));
    } catch {
      toast.error('删除工具失败');
    }
  }, []);

  const onCreateCategory = useCallback(async (scope: ToolCategoryScope, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.some(c => c.scope === scope && c.name === trimmed)) {
      toast.info('该标签已存在');
      return;
    }
    try {
      const sortOrder = categories.filter(c => c.scope === scope).length;
      const saved = await saveExtensionTag({ scope, name: trimmed, sortOrder });
      setCategories(prev => [...prev, saved]);
    } catch {
      toast.error('新增标签失败');
    }
  }, [categories]);

  const dataSource: ToolsModuleDataSource = useMemo(() => ({
    skills: skillItems,
    prompts: promptItems,
    tools: toolItems,
    skillCategories: categoriesByScope.skill,
    promptCategories: categoriesByScope.prompt,
    toolCategories: categoriesByScope.tool,
    onCreateSkill,
    onUpdateSkill,
    onDeleteSkill,
    onCreatePrompt,
    onUpdatePrompt,
    onDeletePrompt,
    onCreateTool,
    onUpdateTool,
    onDeleteTool,
    onCreateCategory,
  }), [
    skillItems,
    promptItems,
    toolItems,
    categoriesByScope,
    onCreateSkill,
    onUpdateSkill,
    onDeleteSkill,
    onCreatePrompt,
    onUpdatePrompt,
    onDeletePrompt,
    onCreateTool,
    onUpdateTool,
    onDeleteTool,
    onCreateCategory,
  ]);

  return <ToolsModule dataSource={dataSource} />;
}
