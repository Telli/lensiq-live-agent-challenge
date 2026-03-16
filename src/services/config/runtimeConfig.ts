export const runtimeConfig = {
  get isAiStudio(): boolean {
    return typeof window !== 'undefined' && 'aistudio' in window;
  },

  get isDemoMode(): boolean {
    return import.meta.env.VITE_DEMO_MODE === 'true';
  },

  get hasGeminiKey(): boolean {
    if (this.isAiStudio) return true;
    return !!import.meta.env.VITE_GEMINI_API_KEY || !!import.meta.env.GEMINI_API_KEY || !!import.meta.env.API_KEY;
  },

  get enableCreativeTools(): boolean {
    return import.meta.env.VITE_ENABLE_CREATIVE_TOOLS === 'true';
  },

  get enableLiveStreaming(): boolean {
    return import.meta.env.VITE_USE_LIVE_STREAMING === 'true';
  }
};
