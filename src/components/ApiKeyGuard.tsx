import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Key } from 'lucide-react';

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        // @ts-ignore
        const keySelected = await window.aistudio.hasSelectedApiKey();
        setHasKey(keySelected);
      } catch (e) {
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success to mitigate race condition
      setHasKey(true);
    } catch (e) {
      console.error("Failed to select key", e);
    }
  };

  if (hasKey === null) {
    return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!hasKey) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <Key className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-4">API Key Required</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          To use advanced features like Veo Video Generation and Pro Image Generation, you must select a paid Google Cloud API key.
          <br /><br />
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
            Learn more about billing
          </a>
        </p>
        <Button size="lg" onClick={handleSelectKey}>
          Select API Key
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
