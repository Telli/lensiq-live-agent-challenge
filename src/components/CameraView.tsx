import React, { useEffect, useRef } from 'react';

export function CameraView({ onCapture }: { onCapture?: (base64: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Expose capture functionality if needed
  useEffect(() => {
    if (onCapture && videoRef.current) {
      const captureFrame = () => {
        const canvas = document.createElement('canvas');
        if (videoRef.current) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
            onCapture(base64);
          }
        }
      };
      // We can trigger this externally or periodically
      // For now, we'll just attach it to the window for easy access from hooks
      (window as any).captureCameraFrame = captureFrame;
    }
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
