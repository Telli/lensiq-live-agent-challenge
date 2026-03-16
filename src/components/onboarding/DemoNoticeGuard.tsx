import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { useDemoMode } from '../../hooks/demo/useDemoMode';

export function DemoNoticeGuard() {
  const { showDemoNotice, dismissNotice } = useDemoMode();

  return (
    <AnimatePresence>
      {showDemoNotice && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-50 pointer-events-auto"
        >
          <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <div className="bg-amber-500/20 p-2 rounded-full shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-500 font-semibold text-sm mb-1">Running in Demo Mode</h3>
              <p className="text-amber-200/70 text-xs leading-relaxed">
                LensIQ is using curated offline data because no Gemini API key was found in the environment. All features (Explain, Time Travel, Nearby) will use the mock Seattle landmarks dataset.
              </p>
            </div>
            <button 
              onClick={dismissNotice}
              className="text-amber-500/50 hover:text-amber-500 transition-colors p-1"
            >
               <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
