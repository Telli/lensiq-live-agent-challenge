import React from 'react';
import { AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { AppShellProvider, useAppShell } from '@/src/hooks/useAppShell';

function AppShellGate({ children }: { children: React.ReactNode }) {
  const { capabilities, isLoading, error, refresh } = useAppShell();

  if (isLoading) {
    return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-white">Loading LensIQ…</div>;
  }

  if (error || !capabilities) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <Server className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Backend Unavailable</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          LensIQ now depends on the backend for capabilities, data providers, and authentication.
          Start the API server and verify your environment configuration.
        </p>
        <Button size="lg" onClick={() => refresh()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {capabilities.limitations.length > 0 && (
        <div className="fixed top-4 left-4 right-4 z-50 pointer-events-auto">
          <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <div className="bg-amber-500/20 p-2 rounded-full shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-500 font-semibold text-sm mb-1">Limited Configuration</h3>
              <p className="text-amber-200/70 text-xs leading-relaxed">
                {capabilities.limitations.join(' ')}
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  return (
    <AppShellProvider>
      <AppShellGate>{children}</AppShellGate>
    </AppShellProvider>
  );
}
