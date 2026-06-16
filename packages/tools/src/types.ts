import type { ReactNode, ComponentType } from 'react';

export type NewToolType = 'skill' | 'mcp' | 'cli';

export type TabId = 'skills' | 'prompts' | 'tools';

export type ToolTypeFilter = 'all' | 'mcp' | 'cli';

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
  stars: number;
  installs: number;
  official: boolean;
  iconBg: string;
  icon: string;
  tags: string[];
}

export interface PromptItem {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  official: boolean;
  tags: string[];
}

export interface MarketTool {
  id: string;
  name: string;
  description: string;
  category: string;
  toolType: 'mcp' | 'skill' | 'cli';
  icon: string;
  iconBg: string;
  version: string;
  developer: string;
  rating: number;
  installs: number;
  tags: string[];
  installed: boolean;
  needsApiKey: boolean;
  official: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolTypeOption {
  id: NewToolType;
  label: string;
  icon: ComponentType<{ className?: string }>;
  desc: string;
  badge: string;
  badgeColor: string;
  fields: FieldDef[];
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'code';
  placeholder?: string;
  options?: string[];
  hint?: string;
  required?: boolean;
  allowCreate?: boolean;
}

export interface TabItem {
  id: TabId;
  label: string;
  icon: ReactNode;
}
