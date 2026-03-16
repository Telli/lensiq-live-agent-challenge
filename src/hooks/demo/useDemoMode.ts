import { useState, useEffect } from 'react';
import { runtimeConfig } from '../../services/config/runtimeConfig';

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoNotice, setShowDemoNotice] = useState(false);

  useEffect(() => {
    // Check if we need to force demo mode due to missing keys or explicit config
    if (runtimeConfig.isDemoMode || !runtimeConfig.hasGeminiKey) {
      setIsDemoMode(true);
      // Only show the notice once per session
      if (!sessionStorage.getItem('demo_notice_shown')) {
        setShowDemoNotice(true);
        sessionStorage.setItem('demo_notice_shown', 'true');
      }
    }
  }, []);

  const dismissNotice = () => setShowDemoNotice(false);

  return {
    isDemoMode,
    showDemoNotice,
    dismissNotice
  };
}
