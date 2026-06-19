/* 本地认证 Context（Tauri） */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { signIn as electronSignIn, signUp as electronSignUp, getProfile } from '@/services/electron';
import type { AuthInfo } from '@/services/electron';
import { toast } from 'sonner';

interface AuthContextType {
  user: AuthInfo | null;
  profile: AuthInfo | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const STORAGE_KEY = 'owl_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setUser(null);
        return;
      }
      const parsed: AuthInfo = JSON.parse(stored);
      const profile = await getProfile(parsed.id);
      if (profile) {
        setUser(profile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const auth = await electronSignIn({ username, password });
      setUser(auth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      return { error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(`登录失败: ${err.message}`);
      return { error: err };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    try {
      const auth = await electronSignUp({ username, password });
      setUser(auth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      return { error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(`注册失败: ${err.message}`);
      return { error: err };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, signInWithUsername, signUpWithUsername, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
