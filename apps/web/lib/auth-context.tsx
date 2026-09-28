'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, tokenStore } from './api-client';
import { demoData, DEMO_CREDENTIALS } from './demo-data';
import type { AccountOverview, User } from './types';

export type DataMode = 'live' | 'demo';

interface AuthContextValue {
  user: User | null;
  account: AccountOverview | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: DataMode;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; company?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
  enterDemoMode: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const FORCED_DEMO = process.env.NEXT_PUBLIC_AUTH_MODE === 'demo';

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<DataMode>(FORCED_DEMO ? 'demo' : 'live');
  const [error, setError] = useState<string | null>(null);

  const demoActivated = useRef(false);

  const activateDemo = useCallback((reason?: string) => {
    demoActivated.current = true;
    setMode('demo');
    setUser(demoData.user);
    setAccount(demoData.account());
    if (reason) setError(reason);
  }, []);

  const loadSession = useCallback(async () => {
    if (FORCED_DEMO) {
      activateDemo();
      setIsLoading(false);
      return;
    }

    // Optimistically restore the cached user so the shell paints instantly.
    const token = tokenStore.getAccess();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const overview = await api.auth.me();
      setUser(overview.user);
      setAccount(overview);
      setMode('live');
      setError(null);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'NETWORK_ERROR') {
        activateDemo('API unreachable — running on bundled demo data.');
      } else {
        tokenStore.clear();
      }
    } finally {
      setIsLoading(false);
    }
  }, [activateDemo]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);

      if (
        FORCED_DEMO ||
        demoActivated.current ||
        (email.trim().toLowerCase() === DEMO_CREDENTIALS.email && !tokenStore.getAccess())
      ) {
        if (email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          activateDemo();
          return;
        }
      }

      const result = await api.auth.login({ email, password });
      const overview = await api.auth.me();
      setUser(result.user);
      setAccount(overview);
      setMode('live');
    },
    [activateDemo],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; company?: string }) => {
      setError(null);
      const result = await api.auth.register(input);
      const overview = await api.auth.me();
      setUser(result.user);
      setAccount(overview);
      setMode('live');
    },
    [],
  );

  const logout = useCallback(async () => {
    if (mode === 'live') {
      try {
        await api.auth.logout();
      } catch {
        // Even if the API call fails, drop the local session.
      }
    }
    tokenStore.clear();
    setUser(null);
    setAccount(null);
  }, [mode]);

  const refresh = useCallback(async () => {
    if (mode === 'demo') {
      setAccount(demoData.account());
      return;
    }
    try {
      const overview = await api.auth.me();
      setUser(overview.user);
      setAccount(overview);
    } catch {
      // Keep the last known snapshot on refresh failure.
    }
  }, [mode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      account,
      isLoading,
      isAuthenticated: user !== null,
      mode,
      error,
      login,
      register,
      logout,
      refresh,
      updateUser: setUser,
      enterDemoMode: () => activateDemo(),
      clearError: () => setError(null),
    }),
    [user, account, isLoading, mode, error, login, register, logout, refresh, activateDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthProvider;
