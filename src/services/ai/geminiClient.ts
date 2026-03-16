import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client
export const getAiClient = () => {
  const apiKey = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || 
                 (import.meta.env && import.meta.env.GEMINI_API_KEY) || 
                 (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY);
  return new GoogleGenAI({ apiKey: apiKey as string });
};

export const getPaidAiClient = () => {
  const apiKey = (import.meta.env && import.meta.env.VITE_API_KEY) || 
                 (import.meta.env && import.meta.env.API_KEY) || 
                 (typeof process !== 'undefined' && process.env && process.env.API_KEY);
  return new GoogleGenAI({ apiKey: apiKey as string });
};
