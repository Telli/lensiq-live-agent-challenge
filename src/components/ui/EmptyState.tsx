import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 mb-6">
        <Icon className="h-10 w-10 text-zinc-400" />
      </div>
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-zinc-400 max-w-sm mb-8">{description}</p>
      {action}
    </div>
  );
}
