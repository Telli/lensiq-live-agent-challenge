import React from 'react';
import { NavLink } from 'react-router-dom';
import { Camera, Bookmark, Clock, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const NAV_ITEMS = [
  { to: '/explore', icon: Camera, label: 'Explore' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 pb-safe">
      <div className="flex justify-around items-center h-16 px-4">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )
            }
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
