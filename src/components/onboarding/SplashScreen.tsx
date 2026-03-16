import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Camera } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center pointer-events-none overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-3xl opacity-20 blur-xl" />
              <div className="relative bg-zinc-900 border border-white/10 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400" />
            </div>
            
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 tracking-tight">
              LensIQ
            </h1>
            <p className="text-zinc-400 mt-2 tracking-widest text-xs uppercase font-medium">
              World Explorer
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
