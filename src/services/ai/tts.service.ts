import { getAiClient } from './geminiClient';
import { Modality } from '@google/genai';

export const ttsService = {
  async generateSpeech(text: string): Promise<string | null> {
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' }
            }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio ?? null;
    } catch (err) {
      console.error('TTS generation failed', err);
      return null;
    }
  }
};
