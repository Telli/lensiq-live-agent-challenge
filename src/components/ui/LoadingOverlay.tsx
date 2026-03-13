import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md"
    >
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
      <p className="text-zinc-300 font-medium">{message}</p>
    </motion.div>
  );
}
