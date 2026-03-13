import { GoogleGenAI, Type, Modality, ThinkingLevel } from '@google/genai';

// Initialize the Gemini client
// Note: We use process.env.GEMINI_API_KEY as required by the instructions.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

const getPaidAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const aiService = {
  // 1. Explain what the camera sees (Image Understanding + TTS)
  async explainImage(imageBase64: string, prompt: string = "What are we looking at? Be concise and informative.") {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      }
    });
    return response.text;
  },

  // 2. Generate speech from text
  async generateSpeech(text: string) {
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
    return base64Audio;
  },

  // 3. Time Travel: Generate historical image
  async generateHistoricalImage(imageBase64: string, year: string, placeName: string) {
    const ai = getPaidAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: `Recreate this scene as it would have looked in the year ${year}. The location is ${placeName}. Make it look authentic to the era.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  },

  // 4. Nearby Attractions (Maps Grounding)
  async getNearbyAttractions(latitude: number, longitude: number) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "What are the most interesting historical landmarks or attractions nearby?",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude, longitude }
          }
        }
      }
    });
    
    // We need to parse the response or just return the text and grounding chunks
    return {
      text: response.text,
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  },

  // 5. Chatbot (Thinking Mode for complex queries)
  async chat(message: string, isComplex: boolean = false) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: message,
      config: isComplex ? {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      } : undefined
    });
    return response.text;
  },

  // 6. Fast AI Response
  async fastResponse(message: string) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: message
    });
    return response.text;
  },

  // 7. Video Generation (Veo 3)
  async generateVideo(imageBase64: string, prompt: string) {
    const ai = getPaidAiClient();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Animate this scene beautifully',
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/jpeg'
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video generated");

    const videoResponse = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': process.env.API_KEY || '',
      },
    });
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
  },

  // 8. Search Grounding
  async search(query: string) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text;
  },

  // 9. High Quality Image Generation (Nano Banana Pro)
  async generateHighQualityImage(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
    const ai = getPaidAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size
        }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  },

  // 10. Video Understanding
  async analyzeVideo(videoBase64: string, mimeType: string, prompt: string) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: videoBase64, mimeType } },
          { text: prompt }
        ]
      }
    });
    return response.text;
  }
};
