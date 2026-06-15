/* 全局应用状态 Context（Tauri 后端） */
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppMode, Conversation, Notification } from '../types';
import { listConversations, listNotifications, markNotificationRead as tauriMarkNotificationRead } from '../services/tauri';

export type Language = 'zh' | 'en' | 'ja' | 'ko';
export type FontSize = 'sm' | 'md' | 'lg';

interface AppContextValue {
  // 侧边栏
  sidebarExpanded: boolean;
  toggleSidebar: () => void;

  // 当前模块
  activeModule: string;
  setActiveModule: (m: string) => void;

  // 当前会话
  currentConversation: Conversation | null;
  setCurrentConversation: (c: Conversation | null) => void;

  // 对话模式
  chatMode: AppMode;
  setChatMode: (m: AppMode) => void;

  // 通知
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (v: boolean) => void;

  // 命令面板
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;

  // 深色模式
  darkMode: boolean;
  toggleDarkMode: () => void;

  // 主题设置
  primaryColor: string;
  setPrimaryColor: (c: string) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  animationLevel: number;
  setAnimationLevel: (v: number) => void;
  language: Language;
  setLanguage: (l: Language) => void;

  // 数据加载
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeModule, setActiveModule] = useState('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [chatMode, setChatMode] = useState<AppMode>('squad');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [primaryColor, setPrimaryColorState] = useState('#00b89a');
  const [fontSize, setFontSizeState] = useState<FontSize>('md');
  const [animationLevel, setAnimationLevelState] = useState(80);
  const [language, setLanguageState] = useState<Language>(() => {
    try { return (localStorage.getItem('acta_language') as Language) || 'zh'; } catch { return 'zh'; }
  });

  const refreshConversations = useCallback(async () => {
    try {
      const data = await listConversations();
      setConversations(data);
      if (data.length > 0 && !currentConversation) {
        setCurrentConversation(data[0]);
      }
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  }, [currentConversation]);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await listNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('加载通知失败:', error);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
    refreshNotifications();
  }, [refreshConversations, refreshNotifications]);

  const toggleSidebar = useCallback(() => setSidebarExpanded(p => !p), []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await tauriMarkNotificationRead(id);
    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(p => {
      const next = !p;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  }, []);

  const setPrimaryColor = useCallback((c: string) => {
    setPrimaryColorState(c);
    const toHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    try {
      const hsl = toHsl(c);
      document.documentElement.style.setProperty('--aurora-primary-hsl', hsl);
      document.documentElement.style.setProperty('--aurora-from', c);
    } catch { /* ignore */ }
  }, []);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    const sizeMap: Record<FontSize, string> = { sm: '13px', md: '15px', lg: '17px' };
    document.documentElement.style.fontSize = sizeMap[s];
  }, []);

  const setAnimationLevel = useCallback((v: number) => {
    setAnimationLevelState(v);
    document.documentElement.style.setProperty('--animation-speed', `${1 + (100 - v) / 100}`);
    document.documentElement.style.setProperty('--animation-opacity', `${v / 100}`);
  }, []);

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    document.documentElement.lang = l;
    try { localStorage.setItem('acta_language', l); } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.setProperty('--aurora-from', primaryColor);
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AppContext.Provider value={{
      sidebarExpanded, toggleSidebar,
      activeModule, setActiveModule,
      currentConversation, setCurrentConversation,
      chatMode, setChatMode,
      notifications, markNotificationRead,
      notificationPanelOpen, setNotificationPanelOpen,
      commandPaletteOpen, setCommandPaletteOpen,
      darkMode, toggleDarkMode,
      primaryColor, setPrimaryColor,
      fontSize, setFontSize,
      animationLevel, setAnimationLevel,
      language, setLanguage,
      conversations, refreshConversations, refreshNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      return new Proxy({} as AppContextValue, {
        get(_, prop: string) {
          if (prop === 'activeModule') return 'chat';
          if (prop === 'darkMode') return true;
          if (prop === 'sidebarExpanded') return true;
          if (prop === 'chatMode') return 'squad';
          if (prop === 'notifications') return [];
          if (prop === 'notificationPanelOpen') return false;
          if (prop === 'commandPaletteOpen') return false;
          if (prop === 'primaryColor') return '#00b89a';
          if (prop === 'fontSize') return 'md';
          if (prop === 'animationLevel') return 80;
          if (prop === 'language') return 'zh';
          if (prop === 'currentConversation') return null;
          if (prop === 'conversations') return [];
          return () => {};
        },
      });
    }
    throw new Error('useApp 必须在 AppProvider 内使用');
  }
  return ctx;
}
