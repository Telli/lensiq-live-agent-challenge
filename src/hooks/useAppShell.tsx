import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession, CapabilityState } from '../types';

interface AppShellContextValue {
  capabilities: CapabilityState | null;
  authSession: AuthSession;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_AUTH: AuthSession = {
  authenticated: false,
  user: null,
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

async function fetchJson<T>(input: string) {
  const response = await fetch(input, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [capabilities, setCapabilities] = useState<CapabilityState | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession>(DEFAULT_AUTH);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [capabilityState, session] = await Promise.all([
        fetchJson<CapabilityState>('/api/capabilities'),
        fetchJson<AuthSession>('/api/auth/session').catch(() => DEFAULT_AUTH),
      ]);
      setCapabilities(capabilityState);
      setAuthSession(session);
    } catch (err: any) {
      setError(err.message || 'Failed to load application capabilities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      capabilities,
      authSession,
      isLoading,
      error,
      refresh,
    }),
    [capabilities, authSession, isLoading, error],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }
  return value;
}
