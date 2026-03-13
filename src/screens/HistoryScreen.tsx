import React from 'react';
import { motion } from 'motion/react';
import { Clock, Calendar, ChevronRight, MapPin } from 'lucide-react';
import { useSession } from '@/src/hooks/useSession';
import { LoadingOverlay } from '@/src/components/ui/LoadingOverlay';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Badge } from '@/src/components/ui/Badge';

export function HistoryScreen() {
  const { sessions, isLoading, error } = useSession();

  if (isLoading) return <LoadingOverlay message="Loading history..." />;
  if (error) return <ErrorState message={error} />;
  if (sessions.length === 0) {
    return (
      <EmptyState 
        icon={Clock} 
        title="No history yet" 
        description="Your exploration history will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 pb-24">
      <div className="px-6 pt-12 pb-6 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 z-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Exploration History</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {sessions.map((session, i) => (
          <motion.div 
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-zinc-200">{session.date}</h2>
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
              {session.placesExplored.map((place, j) => (
                <div key={place.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <MapPin className="w-4 h-4" />
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-white">{place.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{session.transcript.length} interactions</Badge>
                    </div>
                    <div className="flex space-x-2 overflow-x-auto scrollbar-hide mb-3">
                      <img src={place.imageUrl} alt={place.name} className="w-16 h-16 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      {place.historicalImageUrl && (
                        <img src={place.historicalImageUrl} alt="Historical" className="w-16 h-16 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <button className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center">
                      View Session Summary <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
