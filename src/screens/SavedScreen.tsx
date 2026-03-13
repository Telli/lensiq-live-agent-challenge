import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, MapPin, Clock, Search, Filter } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { TabSwitcher } from '@/src/components/layout/TabSwitcher';
import { useSavedPlaces } from '@/src/hooks/useSavedPlaces';
import { LoadingOverlay } from '@/src/components/ui/LoadingOverlay';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'historic', label: 'Historic' },
  { id: 'explained', label: 'Explained' },
  { id: 'time-travel', label: 'Time Travel' }
];

export function SavedScreen() {
  const { savedPlaces, isLoading, error } = useSavedPlaces();
  const [filter, setFilter] = useState('all');

  if (isLoading) return <LoadingOverlay message="Loading saved places..." />;
  if (error) return <ErrorState message={error} />;
  if (savedPlaces.length === 0) {
    return (
      <EmptyState 
        icon={Bookmark} 
        title="No saved places yet" 
        description="Explore the world and save places you want to remember."
        action={<Button onClick={() => {}}>Start Exploring</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 pb-24">
      <div className="px-6 pt-12 pb-6 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 z-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Saved</h1>
        
        <div className="flex space-x-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search saved places..." 
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        <TabSwitcher
          tabs={FILTER_TABS}
          activeTab={filter}
          onChange={setFilter}
          className="w-full overflow-x-auto scrollbar-hide"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {savedPlaces.map((place, i) => (
          <motion.div 
            key={place.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden flex shadow-lg"
          >
            <div className="w-1/3 relative">
              <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-[10px]">{place.category}</Badge>
              </div>
            </div>
            <div className="w-2/3 p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1 leading-tight">{place.name}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{place.description}</p>
                {place.notes && (
                  <div className="bg-zinc-800/50 rounded-lg p-2 mb-2 border border-zinc-700/50">
                    <p className="text-[10px] text-zinc-300 italic">"{place.notes}"</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(place.savedAt).toLocaleDateString()}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-400 hover:text-indigo-300">
                  Revisit
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
