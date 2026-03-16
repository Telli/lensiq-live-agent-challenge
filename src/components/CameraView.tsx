import React, { useEffect, useRef } from 'react';
import { frameStore } from '../services/session/frameStore';

export function CameraView({ onCapture }: { onCapture?: (base64: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Reusable canvas for frame capture (avoids GC pressure)
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const captureFrame = () => {
      const canvas = canvasRef.current!;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        // Downscale to 640px wide for performance
        const scale = Math.min(1, 640 / videoRef.current.videoWidth);
        canvas.width = videoRef.current.videoWidth * scale;
        canvas.height = videoRef.current.videoHeight * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          if (onCapture) {
            onCapture(base64);
          }
          frameStore.setLatestFrame({
            mimeType: 'image/jpeg',
            data: base64,
            timestamp: Date.now()
          });
          return base64;
        }
      }
      return null;
    };
    (window as any).captureCameraFrame = captureFrame;

    // Auto-capture frames at 1 FPS to keep frameStore fresh
    const interval = setInterval(captureFrame, 1000);
    return () => clearInterval(interval);
  }, [onCapture]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover opacity-80"
    />
  );
}
