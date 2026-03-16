import { GoogleGenAI } from '@google/genai';
import { runtimeConfig } from '../config/runtimeConfig';

export type LiveClientState = 'disconnected' | 'connecting' | 'connected' | 'error';

class GeminiLiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private state: LiveClientState = 'disconnected';
  
  private listeners: {
    onMessage?: (text: string, isFinal: boolean) => void;
    onAudioChunk?: (base64Pcm: string) => void;
    onStateChange?: (state: LiveClientState) => void;
    onError?: (err: Error) => void;
  } = {};

  constructor() {
    // We instantiate the client but connection is manual
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  setListeners(listeners: typeof this.listeners) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  async connect() {
    if (this.state === 'connected' || this.state === 'connecting') return;
    this.updateState('connecting');

    try {
      // Create a websocket live session using the gemini-2.0-flash-exp model
      // We cast to any to bypass the package types if it doesn't expose clients yet
      this.session = await (this.ai as any).clients.createLiveClient({
        model: 'models/gemini-2.0-flash-exp',
        config: {
          generationConfig: {
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede', // A friendly voice
                }
              }
            }
          }
        }
      });

      // Hook up message handling
      this.session.on('message', (data: any) => this.handleMessage(data));
      this.session.on('close', () => {
        this.updateState('disconnected');
        this.session = null;
      });
      this.session.on('error', (err: any) => {
         console.error("Live Client Error:", err);
         this.updateState('error');
         this.listeners.onError?.(err);
      });

      await this.session.connect();
      this.updateState('connected');

    } catch (err: any) {
      console.error("Failed to connect live client:", err);
      this.updateState('error');
      this.listeners.onError?.(err);
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.updateState('disconnected');
  }

  sendAudioChunk(base64Pcm: string) {
    if (this.state !== 'connected' || !this.session) return;
    this.session.send({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Pcm
        }]
      }
    });
  }

  sendVideoFrame(base64Jpeg: string) {
    if (this.state !== 'connected' || !this.session) return;
    this.session.send({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'image/jpeg',
          data: base64Jpeg
        }]
      }
    });
  }

  private handleMessage(data: any) {
    // The Live API returns ServerContent containing parts.
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.text) {
           this.listeners.onMessage?.(part.text, false);
        }
        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
           this.listeners.onAudioChunk?.(part.inlineData.data);
        }
      }
    }
    // Turn complete
    if (data.serverContent?.turnComplete) {
       this.listeners.onMessage?.('', true);
    }
  }

  private updateState(newState: LiveClientState) {
    this.state = newState;
    this.listeners.onStateChange?.(newState);
  }
}

export const geminiLiveClient = new GeminiLiveClient();
