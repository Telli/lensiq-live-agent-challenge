import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

const slides = [
  {
    id: 'camera',
    title: 'See the Unseen',
    description: 'LensIQ needs camera access to identify landmarks and buildings around you.',
    icon: Camera,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  {
    id: 'mic',
    title: 'Ask Anything',
    description: 'Enable your microphone to talk naturally with your AI guide.',
    icon: Mic,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'location',
    title: 'Discover Nearby',
    description: 'Location access powers nearby places, routes, and stronger place matching.',
    icon: MapPin,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

async function requestSlidePermission(id: string) {
  if (id === 'camera') {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  }

  if (id === 'mic') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  }

  if (id === 'location') {
    await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 7000,
      }),
    );

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      const state = await (DeviceOrientationEvent as any).requestPermission();
      if (state !== 'granted') {
        throw new Error('Motion permission was not granted');
      }
    }
    return true;
  }

  return false;
}

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      navigate('/explore');
    }
  };

  const handleGrant = async (id: string) => {
    try {
      setError(null);
      await requestSlidePermission(id);
      setPermissions((prev) => ({ ...prev, [id]: true }));
      setTimeout(handleNext, 500);
    } catch (err: any) {
      setError(err.message || 'Permission request failed');
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isGranted = permissions[slide.id];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <div className="flex justify-between items-center pt-8 mb-12">
        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-zinc-800'}`}
            />
          ))}
        </div>
        <button onClick={() => navigate('/explore')} className="text-sm font-medium text-zinc-500 hover:text-zinc-300">
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center w-full"
          >
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 ${slide.bg}`}>
              {isGranted ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                  <CheckCircle2 className={`w-16 h-16 ${slide.color}`} />
                </motion.div>
              ) : (
                <Icon className={`w-16 h-16 ${slide.color}`} />
              )}
            </div>

            <h2 className="text-3xl font-bold tracking-tight mb-4">{slide.title}</h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">{slide.description}</p>

            {error && <p className="text-sm text-amber-300 mb-6">{error}</p>}

            <div className="w-full space-y-4">
              <Button size="lg" className="w-full h-14 text-lg" onClick={() => handleGrant(slide.id)} disabled={isGranted}>
                {isGranted ? 'Granted' : 'Allow Access'}
              </Button>
              <Button variant="ghost" size="lg" className="w-full h-14 text-lg" onClick={handleNext}>
                Not Now
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
