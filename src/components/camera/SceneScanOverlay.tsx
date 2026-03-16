import React from 'react';
import { motion } from 'motion/react';
import { Scan } from 'lucide-react';

export function SceneScanOverlay({ isThinking }: { isThinking: boolean }) {
  if (!isThinking) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Scanning Line */}
      <motion.div
        initial={{ y: '-10%' }}
        animate={{ y: '110%' }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute left-0 right-0 h-1 bg-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.8)]"
      />
      
      {/* Central Search Indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 rounded-full border border-teal-500/50 flex items-center justify-center mb-4"
        >
           <Scan className="w-8 h-8 text-teal-400" />
        </motion.div>
        
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <span className="text-xs font-mono font-medium tracking-wider text-teal-100">
            ANALYZING SCENE...
          </span>
        </div>
      </div>
    </div>
  );
}
