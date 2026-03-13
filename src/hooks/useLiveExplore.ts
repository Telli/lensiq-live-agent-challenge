import { useState, useCallback } from 'react';
import { Place, TranscriptMessage } from '../types';
import { aiService } from '../services/aiService';

export function useLiveExplore() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [detectedPlace, setDetectedPlace] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(async () => {
    setIsListening(true);
    setError(null);
    
    // In a real app, we would capture audio here.
    // For this demo, we'll just capture the camera frame and ask the AI to explain it.
    setTimeout(async () => {
      setIsListening(false);
      setIsThinking(true);
      
      try {
        const base64Image = (window as any).lastCapturedFrame;
        if (!base64Image) {
          throw new Error("No camera frame captured");
        }

        const explanation = await aiService.explainImage(base64Image, "Identify the main subject in this image. Provide a short name, a brief description, a fun historical fact, and a 1-sentence audio summary. Format as JSON: { name, description, historicalFact, audioSummary }");
        
        // Parse the JSON from the markdown block
        const jsonMatch = explanation.match(/```json\n([\s\S]*?)\n```/) || explanation.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : explanation.replace(/```json/g, '').replace(/```/g, '');
        const data = JSON.parse(jsonStr);

        const place: Place = {
          id: Math.random().toString(36).substr(2, 9),
          name: data.name || "Unknown Place",
          description: data.description || "No description available.",
          didYouKnow: data.historicalFact || "No historical fact available.",
          facts: [data.historicalFact || "No historical fact available."],
          audioSummary: data.audioSummary || "No audio summary available.",
          imageUrl: `data:image/jpeg;base64,${base64Image}`,
          category: 'Discovered',
          distance: 'Here',
          coordinates: { lat: 0, lng: 0 }
        };

        setDetectedPlace(place);
        setIsThinking(false);
        setIsSpeaking(true);

        // Generate and play speech
        const audioBase64 = await aiService.generateSpeech(place.audioSummary);
        if (audioBase64) {
          const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
          audio.onended = () => setIsSpeaking(false);
          await audio.play();
        } else {
          setIsSpeaking(false);
        }

      } catch (err) {
        console.error("Error in live explore:", err);
        setError("Failed to analyze the scene.");
        setIsThinking(false);
        setIsSpeaking(false);
      }
    }, 1000);
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const addTranscriptMessage = useCallback((message: Omit<TranscriptMessage, 'id' | 'timestamp'>) => {
    const newMessage: TranscriptMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTranscript(prev => [...prev, newMessage]);
  }, []);

  return {
    isListening,
    isThinking,
    isSpeaking,
    transcript,
    detectedPlace,
    error,
    startListening,
    stopListening,
    addTranscriptMessage
  };
}
