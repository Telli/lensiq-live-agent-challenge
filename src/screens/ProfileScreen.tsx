import React from 'react';
import { User, Settings, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

const SETTINGS_ITEMS = [
  { icon: User, label: 'Personal Information' },
  { icon: Settings, label: 'Preferences' },
  { icon: Shield, label: 'Privacy & Security' },
  { icon: HelpCircle, label: 'Help & Support' }
];

export function ProfileScreen() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 pb-24">
      <div className="px-6 pt-12 pb-6 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 z-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex items-center space-x-4 bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-lg">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-3xl font-bold text-black shadow-inner">
            JD
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Jane Doe</h2>
            <p className="text-zinc-400 text-sm">jane.doe@example.com</p>
            <div className="mt-2 flex space-x-2">
              <span className="px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-300">Explorer Level 5</span>
              <span className="px-2 py-1 bg-white/10 text-white rounded-md text-xs font-medium border border-white/20">Pro Member</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Account Settings</h3>
          
          {SETTINGS_ITEMS.map(({ icon: Icon, label }) => (
            <button key={label} className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-zinc-400" />
                </div>
                <span className="font-medium text-zinc-200">{label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
          ))}
        </div>

        <div className="pt-4">
          <Button variant="outline" className="w-full h-14 text-red-400 border-red-900/30 hover:bg-red-950/30 hover:text-red-300">
            <LogOut className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
