/* 主应用布局 */
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '@/components/global/CommandPalette';
import NotificationPanel from '@/components/global/NotificationPanel';
import { AppProvider, useApp } from '@/contexts/AppContext';

// 模块懒加载
import ChatModule from '@/components/chat/ChatModule';
import KnowledgeModule from '@/components/knowledge/KnowledgeModule';
import ToolsModule from '@/components/tools/ToolsModule';
import SettingsModule from '@/components/settings/SettingsModule';

/* 内层布局 — 必须在 AppProvider 内部渲染 */
function AppLayoutInner() {
  const { activeModule, darkMode } = useApp();

  // 模块映射在组件内定义，避免模块级 JSX 在 HMR 时引发的 context 竞态
  const moduleMap: Record<string, React.ReactElement> = {
    chat:      <ChatModule />,
    knowledge: <KnowledgeModule />,
    tools:     <ToolsModule />,
    settings:  <SettingsModule />,
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex min-h-screen w-full deep-space">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {moduleMap[activeModule] ?? <ChatModule />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 全局浮层 */}
      <CommandPalette />
      <NotificationPanel />
    </div>
  );
}

/* 外层导出 — 自带 AppProvider，HMR 时 context 始终有效 */
export default function AppLayout() {
  return (
    <AppProvider>
      <AppLayoutInner />
    </AppProvider>
  );
}
