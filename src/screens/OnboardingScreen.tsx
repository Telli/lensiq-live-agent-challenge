import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

const slides = [
  {
    id: 'camera',
    title: 'See the Unseen',
    description: 'LensIQ needs camera access to identify landmarks and buildings around you.',
    icon: Camera,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10'
  },
  {
    id: 'mic',
    title: 'Ask Anything',
    description: 'Enable your microphone to talk naturally with your AI guide.',
    icon: Mic,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    id: 'location',
    title: 'Discover Nearby',
    description: 'Location access helps find historical sites and hidden gems near you.',
    icon: MapPin,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10'
  }
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      navigate('/explore');
    }
  };

  const handleGrant = (id: string) => {
    setPermissions(prev => ({ ...prev, [id]: true }));
    setTimeout(handleNext, 600);
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isGranted = permissions[slide.id];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <div className="flex justify-between items-center pt-8 mb-12">
        <div className="flex space-x-2">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-zinc-800'}`}
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
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle2 className={`w-16 h-16 ${slide.color}`} />
                </motion.div>
              ) : (
                <Icon className={`w-16 h-16 ${slide.color}`} />
              )}
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight mb-4">{slide.title}</h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-12">
              {slide.description}
            </p>

            <div className="w-full space-y-4">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg"
                onClick={() => handleGrant(slide.id)}
                disabled={isGranted}
              >
                {isGranted ? 'Granted' : 'Allow Access'}
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="w-full h-14 text-lg"
                onClick={handleNext}
              >
                Not Now
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
