import React from 'react';
import { Shield, Server, Sparkles, User } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { useAppShell } from '@/src/hooks/useAppShell';

function CapabilityRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
      <span className="text-zinc-200">{label}</span>
      <span className={`text-xs font-medium ${enabled ? 'text-emerald-300' : 'text-amber-300'}`}>
        {enabled ? 'Ready' : 'Unavailable'}
      </span>
    </div>
  );
}

export function ProfileScreen() {
  const { authSession, capabilities, refresh } = useAppShell();

  if (!authSession.authenticated || !authSession.user) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 pb-24 px-6 pt-16">
        <div className="max-w-xl mx-auto w-full space-y-6">
          <div className="bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Profile</h1>
            <p className="text-zinc-400 mb-6">
              Sign in with Google to save places, keep exploration history, and persist generated media.
            </p>
            <Button onClick={() => (window.location.href = '/api/auth/google/start?returnTo=/profile')}>
              Continue with Google
            </Button>
          </div>
          {capabilities && (
            <div className="space-y-3">
              <CapabilityRow label="Authentication" enabled={capabilities.auth} />
              <CapabilityRow label="Postgres persistence" enabled={capabilities.database} />
              <CapabilityRow label="Cloud storage" enabled={capabilities.storage} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 pb-24">
      <div className="px-6 pt-12 pb-6 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 z-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex items-center space-x-4 bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-lg">
          <img
            src={authSession.user.picture || 'https://www.gravatar.com/avatar/?d=mp'}
            alt={authSession.user.name}
            className="w-20 h-20 rounded-full object-cover bg-zinc-800"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{authSession.user.name}</h2>
            <p className="text-zinc-400 text-sm">{authSession.user.email}</p>
            <div className="mt-2 flex space-x-2">
              <span className="px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-300">Authenticated</span>
              <span className="px-2 py-1 bg-white/10 text-white rounded-md text-xs font-medium border border-white/20">
                Production Data
              </span>
            </div>
          </div>
        </div>

        {capabilities && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider px-2">
              <Server className="w-4 h-4" />
              System status
            </div>
            <CapabilityRow label="Gemini" enabled={capabilities.gemini} />
            <CapabilityRow label="Google Places / Routes" enabled={capabilities.places && capabilities.routes} />
            <CapabilityRow label="Historical sources" enabled={capabilities.historical} />
            <CapabilityRow label="Live voice mode" enabled={capabilities.live} />
            <CapabilityRow label="Creative media" enabled={capabilities.media} />
          </div>
        )}

        {capabilities?.limitations.length ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-3">
              <Shield className="w-4 h-4" />
              Current limitations
            </div>
            <ul className="space-y-2 text-sm text-amber-100/80">
              {capabilities.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3">
          <Button variant="secondary" onClick={() => refresh()}>
            <Sparkles className="w-4 h-4 mr-2" />
            Refresh capabilities
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
              });
              window.location.reload();
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
