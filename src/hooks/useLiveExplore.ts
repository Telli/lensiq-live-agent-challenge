import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveSessionEvent } from '../types';
import {
  AudioCaptureService,
  type AudioCaptureDiagnostics,
} from '../utils/audioCapture';
import { PlaybackService } from '../audio/playbackService';
import { frameStore } from '../services/session/frameStore';
import {
  CLIENT_AUDIO_OPCODE,
  SERVER_AUDIO_OPCODE,
  buildBinaryAudioFrame,
  evaluateSocketBackpressure,
  parseBinaryAudioFrame,
} from '../services/live/liveAudioProtocol';
import { AdaptiveVad, type VadState } from '../services/live/liveVad';

type LiveConnectionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'error';

interface SocketCloseOutcome {
  nextState: 'idle' | 'error';
  message: string | null;
  emitDisconnectedEvent: boolean;
}

export interface LiveDebugDiagnostics {
  inputSampleRate: number | null;
  outputSampleRate: number;
  bufferedAmount: number;
  vadState: VadState;
  playbackQueueDepth: number;
  overflow: boolean;
}

const OUTPUT_SAMPLE_RATE = AudioCaptureService.OUTPUT_SAMPLE_RATE;
const DEBUG_DIAGNOSTIC_INTERVAL_MS = 200;
const VIDEO_FRAME_INTERVAL_MS = 1200;
const MAX_TRANSCRIPT_EVENTS = 100;
const DEFAULT_CLOSE_OUTCOME: SocketCloseOutcome = {
  nextState: 'idle',
  message: null,
  emitDisconnectedEvent: true,
};

function buildEvent(
  type: LiveSessionEvent['type'],
  payload?: unknown,
): LiveSessionEvent {
  return {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
  };
}

function isConnectedState(state: LiveConnectionState) {
  return (
    state === 'listening' ||
    state === 'thinking' ||
    state === 'speaking' ||
    state === 'interrupted'
  );
}

function logLiveClient(event: string, payload: Record<string, unknown> = {}) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info('[LensIQ Live]', event, payload);
}

export function useLiveExplore() {
  const [connectionState, setConnectionState] =
    useState<LiveConnectionState>('idle');
  const [partialUserTranscript, setPartialUserTranscript] = useState('');
  const [partialAiTranscript, setPartialAiTranscript] = useState('');
  const [transcriptEvents, setTranscriptEvents] = useState<LiveSessionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<LiveDebugDiagnostics>({
    inputSampleRate: null,
    outputSampleRate: OUTPUT_SAMPLE_RATE,
    bufferedAmount: 0,
    vadState: 'warming',
    playbackQueueDepth: 0,
    overflow: false,
  });

  const audioCaptureRef = useRef<AudioCaptureService | null>(null);
  const playbackServiceRef = useRef<PlaybackService | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const connectResolveRef = useRef<(() => void) | null>(null);
  const connectRejectRef = useRef<((error: Error) => void) | null>(null);
  const stateRef = useRef<LiveConnectionState>('idle');
  const aiTextBufferRef = useRef('');
  const userActivityRef = useRef(false);
  const sessionConnectedRef = useRef(false);
  const socketClosingRef = useRef(false);
  const socketCloseOutcomeRef = useRef<SocketCloseOutcome>(DEFAULT_CLOSE_OUTCOME);
  const vadRef = useRef(new AdaptiveVad());
  const audioPausedRef = useRef(false);
  const speechFallbackMsRef = useRef(0);
  const silenceFallbackMsRef = useRef(0);
  const diagnosticsRef = useRef<LiveDebugDiagnostics>({
    inputSampleRate: null,
    outputSampleRate: OUTPUT_SAMPLE_RATE,
    bufferedAmount: 0,
    vadState: 'warming',
    playbackQueueDepth: 0,
    overflow: false,
  });
  const lastDiagnosticsPublishAtRef = useRef(0);
  const telemetryCountersRef = useRef({
    micStartSuccess: 0,
    micStartFailure: 0,
    overflowEvents: 0,
    activityStart: 0,
    activityEnd: 0,
    bargeInAccepted: 0,
    bargeInIgnored: 0,
    decodeFailures: 0,
    jitterUnderruns: 0,
  });

  const clearPartialBuffers = useCallback(() => {
    setPartialUserTranscript('');
    setPartialAiTranscript('');
    aiTextBufferRef.current = '';
  }, []);

  const getPlaybackQueueDepth = useCallback(() => {
    return (
      (playbackServiceRef.current?.bufferDepth ?? 0) +
      (playbackServiceRef.current?.scheduledSourceCount ?? 0)
    );
  }, []);

  const pushEvent = useCallback((event: LiveSessionEvent) => {
    setTranscriptEvents((current) => {
      const next = [...current, event];
      return next.length > MAX_TRANSCRIPT_EVENTS
        ? next.slice(next.length - MAX_TRANSCRIPT_EVENTS)
        : next;
    });
  }, []);

  const syncState = useCallback((next: LiveConnectionState) => {
    stateRef.current = next;
    setConnectionState(next);
  }, []);

  const publishDiagnostics = useCallback(
    (partial: Partial<LiveDebugDiagnostics>, force = false) => {
      const next = { ...diagnosticsRef.current, ...partial };
      diagnosticsRef.current = next;

      if (!import.meta.env.DEV) {
        return;
      }

      const now = Date.now();
      if (
        !force &&
        now - lastDiagnosticsPublishAtRef.current < DEBUG_DIAGNOSTIC_INTERVAL_MS
      ) {
        return;
      }

      lastDiagnosticsPublishAtRef.current = now;
      setDiagnostics(next);
    },
    [],
  );

  const updateStatusMessage = useCallback((message: string | null) => {
    setStatusMessage((current) => (current === message ? current : message));
  }, []);

  const settleConnectPromise = useCallback(
    (result: 'resolve' | 'reject', errorInstance?: Error) => {
      if (result === 'resolve') {
        connectResolveRef.current?.();
      } else if (errorInstance) {
        connectRejectRef.current?.(errorInstance);
      }

      connectResolveRef.current = null;
      connectRejectRef.current = null;
      connectPromiseRef.current = null;
    },
    [],
  );

  const cleanupLocalResources = useCallback(() => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (audioCaptureRef.current) {
      audioCaptureRef.current.stopCapture();
      audioCaptureRef.current = null;
    }

    if (playbackServiceRef.current) {
      playbackServiceRef.current.destroy();
      playbackServiceRef.current = null;
    }

    userActivityRef.current = false;
    audioPausedRef.current = false;
    speechFallbackMsRef.current = 0;
    silenceFallbackMsRef.current = 0;
    vadRef.current.reset();

    publishDiagnostics(
      {
        inputSampleRate: null,
        bufferedAmount: 0,
        vadState: 'warming',
        playbackQueueDepth: 0,
        overflow: false,
      },
      true,
    );
  }, [publishDiagnostics]);

  const getPlaybackService = useCallback(() => {
    if (!playbackServiceRef.current) {
      playbackServiceRef.current = new PlaybackService(2, 24000, {
        onDecodeError: () => {
          telemetryCountersRef.current.decodeFailures += 1;
          logLiveClient('playback_decode_failure', {
            count: telemetryCountersRef.current.decodeFailures,
          });
        },
        onUnderrun: () => {
          telemetryCountersRef.current.jitterUnderruns += 1;
          logLiveClient('playback_jitter_underrun', {
            count: telemetryCountersRef.current.jitterUnderruns,
          });
        },
      });
    }

    return playbackServiceRef.current;
  }, []);

  const requestSocketClose = useCallback(
    (socket: WebSocket | null, outcome: SocketCloseOutcome) => {
      if (!socket || socketClosingRef.current) {
        return;
      }

      socketClosingRef.current = true;
      socketCloseOutcomeRef.current = outcome;

      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        try {
          socket.close(
            outcome.nextState === 'error' ? 1011 : 1000,
            outcome.nextState === 'error' ? 'live_error' : 'client_disconnect',
          );
        } catch {
          socketClosingRef.current = false;
        }
      }
    },
    [],
  );

  const emitActivityStart = useCallback(
    (socket?: WebSocket | null) => {
      const liveSocket = socket ?? websocketRef.current;
      if (
        !liveSocket ||
        liveSocket.readyState !== WebSocket.OPEN ||
        userActivityRef.current
      ) {
        telemetryCountersRef.current.bargeInIgnored += 1;
        return false;
      }

      const shouldOptimisticallyInterrupt =
        stateRef.current === 'speaking' || stateRef.current === 'thinking';

      userActivityRef.current = true;
      speechFallbackMsRef.current = 0;
      silenceFallbackMsRef.current = 0;
      getPlaybackService().interrupt();
      setPartialAiTranscript('');
      aiTextBufferRef.current = '';
      liveSocket.send(JSON.stringify({ type: 'activity_start' }));
      telemetryCountersRef.current.activityStart += 1;
      if (shouldOptimisticallyInterrupt) {
        pushEvent(buildEvent('interrupted'));
        syncState('interrupted');
        updateStatusMessage('Interrupted — listening again');
      }
      logLiveClient('activity_start', {
        bufferedAmount: liveSocket.bufferedAmount,
        count: telemetryCountersRef.current.activityStart,
      });
      publishDiagnostics({
        bufferedAmount: liveSocket.bufferedAmount,
        playbackQueueDepth: getPlaybackQueueDepth(),
      });
      return true;
    },
    [
      getPlaybackQueueDepth,
      getPlaybackService,
      publishDiagnostics,
      pushEvent,
      syncState,
      updateStatusMessage,
    ],
  );

  const emitActivityEnd = useCallback(
    (socket?: WebSocket | null) => {
      const liveSocket = socket ?? websocketRef.current;
      if (
        !liveSocket ||
        liveSocket.readyState !== WebSocket.OPEN ||
        !userActivityRef.current
      ) {
        return false;
      }

      userActivityRef.current = false;
      speechFallbackMsRef.current = 0;
      silenceFallbackMsRef.current = 0;
      liveSocket.send(JSON.stringify({ type: 'activity_end' }));
      telemetryCountersRef.current.activityEnd += 1;
      logLiveClient('activity_end', {
        bufferedAmount: liveSocket.bufferedAmount,
        count: telemetryCountersRef.current.activityEnd,
      });
      syncState('thinking');
      publishDiagnostics({ bufferedAmount: liveSocket.bufferedAmount });
      return true;
    },
    [publishDiagnostics, syncState],
  );

  const failSocket = useCallback(
    (message: string, socket?: WebSocket | null) => {
      const liveSocket = socket ?? websocketRef.current;
      if (liveSocket && socketClosingRef.current) {
        return;
      }
      setError(message);
      updateStatusMessage(message);
      pushEvent(buildEvent('error', message));
      syncState('error');

      if (!liveSocket) {
        cleanupLocalResources();
        settleConnectPromise('reject', new Error(message));
        return;
      }

      requestSocketClose(liveSocket, {
        nextState: 'error',
        message,
        emitDisconnectedEvent: false,
      });
    },
    [
      cleanupLocalResources,
      pushEvent,
      requestSocketClose,
      settleConnectPromise,
      syncState,
      updateStatusMessage,
    ],
  );

  const finalizeSocketClose = useCallback(
    (socket: WebSocket) => {
      if (websocketRef.current === socket) {
        websocketRef.current = null;
      }

      const outcome = socketCloseOutcomeRef.current;
      const hadConnected = sessionConnectedRef.current;
      sessionConnectedRef.current = false;
      socketClosingRef.current = false;
      socketCloseOutcomeRef.current = DEFAULT_CLOSE_OUTCOME;

      cleanupLocalResources();
      clearPartialBuffers();

      if (outcome.nextState === 'error') {
        settleConnectPromise(
          'reject',
          new Error(outcome.message || 'Live session failed'),
        );
        syncState('error');
        return;
      }

      updateStatusMessage(null);
      setError(null);

      if (connectPromiseRef.current) {
        const connectMessage = 'Live session disconnected while connecting';
        setError(connectMessage);
        updateStatusMessage(connectMessage);
        pushEvent(buildEvent('error', connectMessage));
        settleConnectPromise(
          'reject',
          new Error(connectMessage),
        );
        syncState('error');
        return;
      }

      if (hadConnected && outcome.emitDisconnectedEvent) {
        pushEvent(buildEvent('disconnected'));
      }

      syncState('idle');
    },
    [
      cleanupLocalResources,
      clearPartialBuffers,
      pushEvent,
      settleConnectPromise,
      syncState,
      updateStatusMessage,
    ],
  );

  const connect = useCallback(() => {
    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    if (websocketRef.current && isConnectedState(stateRef.current)) {
      return Promise.resolve();
    }

    setError(null);
    clearPartialBuffers();
    updateStatusMessage(null);
    sessionConnectedRef.current = false;
    speechFallbackMsRef.current = 0;
    silenceFallbackMsRef.current = 0;
    socketCloseOutcomeRef.current = DEFAULT_CLOSE_OUTCOME;
    socketClosingRef.current = false;
    syncState('connecting');

    const promise = new Promise<void>((resolve, reject) => {
      connectResolveRef.current = resolve;
      connectRejectRef.current = reject;

      const ws = new WebSocket(
        `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${
          window.location.host
        }/api/live`,
      );
      void getPlaybackService().prime().catch((primeError) => {
        logLiveClient('playback_prime_failed', {
          message:
            primeError instanceof Error
              ? primeError.message
              : 'Failed to prime playback',
        });
      });
      ws.binaryType = 'arraybuffer';
      websocketRef.current = ws;

      const processAudioChunk = (pcmBuffer: ArrayBuffer) => {
        if (websocketRef.current !== ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const sampleCount = pcmBuffer.byteLength / Int16Array.BYTES_PER_ELEMENT;
        const chunkDurationMs = (sampleCount / OUTPUT_SAMPLE_RATE) * 1000;
        const nowMs = performance.now();
        const vad = vadRef.current.processChunk(pcmBuffer, chunkDurationMs, nowMs);

        publishDiagnostics({
          bufferedAmount: ws.bufferedAmount,
          vadState: vad.state,
          overflow: audioPausedRef.current,
          playbackQueueDepth: getPlaybackQueueDepth(),
        });

        if (vad.shouldStart) {
          speechFallbackMsRef.current = 0;
          emitActivityStart(ws);
        } else if (!userActivityRef.current) {
          if (vad.rms >= Math.max(vad.threshold * 0.45, 120)) {
            speechFallbackMsRef.current += chunkDurationMs;
            if (speechFallbackMsRef.current >= 120) {
              emitActivityStart(ws);
              speechFallbackMsRef.current = 0;
            }
          } else {
            speechFallbackMsRef.current = 0;
          }
          silenceFallbackMsRef.current = 0;
        } else if (vad.shouldEnd) {
          silenceFallbackMsRef.current = 0;
          emitActivityEnd(ws);
        } else if (vad.rms <= Math.max(vad.threshold * 0.4, 80)) {
          silenceFallbackMsRef.current += chunkDurationMs;
          if (silenceFallbackMsRef.current >= 700) {
            emitActivityEnd(ws);
            silenceFallbackMsRef.current = 0;
          }
        } else {
          silenceFallbackMsRef.current = 0;
        }

        const backpressure = evaluateSocketBackpressure(
          ws.bufferedAmount,
          audioPausedRef.current,
        );

        if (backpressure.audioPaused !== audioPausedRef.current) {
          telemetryCountersRef.current.overflowEvents += 1;
          logLiveClient(
            backpressure.audioPaused
              ? 'audio_overflow'
              : 'audio_overflow_recovered',
            {
              bufferedAmount: ws.bufferedAmount,
              count: telemetryCountersRef.current.overflowEvents,
            },
          );
        }

        audioPausedRef.current = backpressure.audioPaused;
        updateStatusMessage(backpressure.statusMessage);
        publishDiagnostics({
          bufferedAmount: ws.bufferedAmount,
          overflow: backpressure.audioPaused,
        });

        if (!backpressure.allowAudio) {
          return;
        }

        ws.send(buildBinaryAudioFrame(CLIENT_AUDIO_OPCODE, pcmBuffer));
        publishDiagnostics({ bufferedAmount: ws.bufferedAmount });
      };

      ws.addEventListener('message', async (event) => {
        try {
          if (typeof event.data !== 'string') {
            if (userActivityRef.current || stateRef.current === 'interrupted') {
              publishDiagnostics({
                bufferedAmount: ws.bufferedAmount,
                playbackQueueDepth: getPlaybackQueueDepth(),
                overflow: audioPausedRef.current,
              });
              return;
            }
            const pcmBuffer = parseBinaryAudioFrame(
              event.data as ArrayBuffer,
              SERVER_AUDIO_OPCODE,
            );
            vadRef.current.registerPlayback(performance.now());
            const playback = getPlaybackService();
            playback.enqueueChunk(pcmBuffer);
            publishDiagnostics({
              bufferedAmount: ws.bufferedAmount,
              vadState: diagnosticsRef.current.vadState,
              playbackQueueDepth: getPlaybackQueueDepth(),
              overflow: audioPausedRef.current,
            });
            syncState('speaking');
            return;
          }

          const payload = JSON.parse(String(event.data));

          if (payload.type === 'state' && payload.state === 'connected') {
            try {
              audioCaptureRef.current = new AudioCaptureService();
              await audioCaptureRef.current.startCapture(processAudioChunk, {
                onReady: (captureDiagnostics: AudioCaptureDiagnostics) => {
                  telemetryCountersRef.current.micStartSuccess += 1;
                  logLiveClient('mic_start_success', {
                    inputSampleRate: captureDiagnostics.inputSampleRate,
                    outputSampleRate: captureDiagnostics.outputSampleRate,
                    processorPath: captureDiagnostics.processorPath,
                  });
                  publishDiagnostics(
                    {
                      inputSampleRate: captureDiagnostics.inputSampleRate,
                      outputSampleRate: captureDiagnostics.outputSampleRate,
                      bufferedAmount: ws.bufferedAmount,
                      vadState: 'warming',
                    },
                    true,
                  );
                },
              });
            } catch (captureError) {
              telemetryCountersRef.current.micStartFailure += 1;
              const message =
                captureError instanceof Error
                  ? captureError.message
                  : 'Failed to start microphone capture';
              logLiveClient('mic_start_failure', {
                message,
                count: telemetryCountersRef.current.micStartFailure,
              });
              if (ws.readyState === WebSocket.OPEN) {
                try {
                  ws.send(JSON.stringify({ type: 'audio_end' }));
                } catch {
                  // Ignore close-path send failures.
                }
              }
              failSocket(message, ws);
              return;
            }

            if (websocketRef.current !== ws) {
              return;
            }

            pushEvent(buildEvent('connected'));
            sessionConnectedRef.current = true;
            syncState('listening');
            settleConnectPromise('resolve');
            updateStatusMessage(null);

            videoIntervalRef.current = setInterval(() => {
              if (ws.readyState !== WebSocket.OPEN) {
                return;
              }

              const backpressure = evaluateSocketBackpressure(
                ws.bufferedAmount,
                audioPausedRef.current,
              );
              audioPausedRef.current = backpressure.audioPaused;
              publishDiagnostics({
                bufferedAmount: ws.bufferedAmount,
                overflow: backpressure.audioPaused,
              });
              updateStatusMessage(backpressure.statusMessage);

              if (!backpressure.allowVideo) {
                return;
              }

              const frame = frameStore.getLatestFrame();
              if (frame?.data) {
                ws.send(JSON.stringify({ type: 'frame', data: frame.data }));
                publishDiagnostics({ bufferedAmount: ws.bufferedAmount });
              }
            }, VIDEO_FRAME_INTERVAL_MS);
            return;
          }

          if (payload.type === 'user_transcript' && payload.text) {
            if (payload.isFinal) {
              setPartialUserTranscript('');
              pushEvent(buildEvent('transcript_final', payload.text));
              syncState('thinking');
            } else {
              setPartialUserTranscript(payload.text);
              pushEvent(buildEvent('transcript_partial', payload.text));
            }
            return;
          }

          if (payload.type === 'ai_text' && payload.text) {
            if (userActivityRef.current || stateRef.current === 'interrupted') {
              return;
            }
            aiTextBufferRef.current = `${aiTextBufferRef.current} ${payload.text}`.trim();
            setPartialAiTranscript(aiTextBufferRef.current);
            pushEvent(buildEvent('agent_response_partial', aiTextBufferRef.current));
            return;
          }

          if (payload.type === 'barge_in') {
            telemetryCountersRef.current.bargeInAccepted += 1;
            getPlaybackService().interrupt();
            publishDiagnostics({
              playbackQueueDepth: getPlaybackQueueDepth(),
            });
            if (stateRef.current !== 'interrupted') {
              pushEvent(buildEvent('interrupted'));
            }
            syncState('interrupted');
            logLiveClient('barge_in', {
              count: telemetryCountersRef.current.bargeInAccepted,
            });
            return;
          }

          if (payload.type === 'turn_complete') {
            if (aiTextBufferRef.current) {
              pushEvent(buildEvent('agent_response_final', aiTextBufferRef.current));
            }
            setPartialAiTranscript('');
            aiTextBufferRef.current = '';
            publishDiagnostics({
              playbackQueueDepth: getPlaybackQueueDepth(),
            });
            if (stateRef.current !== 'error') {
              syncState(userActivityRef.current ? 'interrupted' : 'listening');
            }
            updateStatusMessage(audioPausedRef.current ? 'Recovering audio link…' : null);
            return;
          }

          if (payload.type === 'error') {
            failSocket(payload.error || 'Live session failed', ws);
            return;
          }
        } catch (messageError) {
          const message =
            messageError instanceof Error
              ? messageError.message
              : 'Failed to process live session payload';
          logLiveClient('message_error', { message });
          failSocket(message, ws);
        }
      });

      ws.addEventListener('close', () => {
        finalizeSocketClose(ws);
      });

      ws.addEventListener('error', () => {
        logLiveClient('socket_error');
        failSocket('Failed to connect to the live session', ws);
      });
    });

    connectPromiseRef.current = promise;
    return promise;
  }, [
    clearPartialBuffers,
    emitActivityEnd,
    emitActivityStart,
    failSocket,
    finalizeSocketClose,
    getPlaybackQueueDepth,
    getPlaybackService,
    publishDiagnostics,
    pushEvent,
    settleConnectPromise,
    syncState,
    updateStatusMessage,
  ]);

  const disconnect = useCallback(() => {
    const socket = websocketRef.current;
    if (!socket) {
      cleanupLocalResources();
      clearPartialBuffers();
      setError(null);
      updateStatusMessage(null);
      syncState('idle');
      return;
    }

    if (
      socket.readyState !== WebSocket.OPEN &&
      socket.readyState !== WebSocket.CONNECTING
    ) {
      cleanupLocalResources();
      clearPartialBuffers();
      setError(null);
      updateStatusMessage(null);
      syncState('idle');
      return;
    }

    socketCloseOutcomeRef.current = DEFAULT_CLOSE_OUTCOME;

    if (socket.readyState === WebSocket.OPEN) {
      if (userActivityRef.current) {
        emitActivityEnd(socket);
      }

      try {
        socket.send(JSON.stringify({ type: 'audio_end' }));
      } catch {
        // Ignore send failures while closing.
      }
    }

    requestSocketClose(socket, DEFAULT_CLOSE_OUTCOME);
  }, [
    cleanupLocalResources,
    clearPartialBuffers,
    emitActivityEnd,
    requestSocketClose,
    syncState,
    updateStatusMessage,
  ]);

  const sendTextCommand = useCallback(
    (text: string) => {
      const socket = websocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !text.trim()) {
        return;
      }

      socket.send(JSON.stringify({ type: 'text', text }));
      syncState('thinking');
    },
    [syncState],
  );

  const interrupt = useCallback(() => {
    emitActivityStart();
  }, [emitActivityStart]);

  useEffect(() => {
    return () => {
      disconnect();
      cleanupLocalResources();
    };
  }, [cleanupLocalResources, disconnect]);

  return {
    connectionState,
    partialUserTranscript,
    partialAiTranscript,
    transcriptEvents,
    error,
    statusMessage,
    diagnostics,
    connect,
    disconnect,
    sendTextCommand,
    interrupt,
  };
}
