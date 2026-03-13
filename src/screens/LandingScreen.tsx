import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Clock, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

const FEATURES = [
  { icon: Camera, label: 'Explain' },
  { icon: Clock, label: 'Time Travel' },
  { icon: MapPin, label: 'Nearby' }
];

export function LandingScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col flex-1 p-6 pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col items-center justify-center text-center"
        >
          <div className="w-20 h-20 bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/10">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            LensIQ
          </h1>
          <p className="text-xl text-zinc-400 max-w-xs mx-auto mb-12 leading-relaxed">
            See the world. Hear its story. Explore its past.
          </p>

          <div className="w-full max-w-sm space-y-4">
            <Button 
              size="lg" 
              className="w-full text-lg h-14"
              onClick={() => navigate('/onboarding')}
            >
              Start Exploring
            </Button>
            <Button 
              variant="glass" 
              size="lg" 
              className="w-full text-lg h-14"
              onClick={() => navigate('/explore')}
            >
              Try Demo
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-3 gap-4 pb-8"
        >
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center p-4 rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50">
              <Icon className="w-6 h-6 text-indigo-400 mb-2" />
              <span className="text-xs font-medium text-zinc-300">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
