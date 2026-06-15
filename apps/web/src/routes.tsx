import AppLayout from '@/components/layouts/AppLayout';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

// 用函数组件包装，避免模块级 JSX 在 HMR 时绕过 AppProvider 导致 context 丢失
const AppLayoutPage = () => <AppLayout />;

export const routes: RouteConfig[] = [
  {
    name: 'OwlOS',
    path: '/',
    element: <AppLayoutPage />,
    public: true,
  },
];
