import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Camera as CameraIcon, History, MapPin, Sparkles, X, ChevronUp, Share, Bookmark, Play } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { Badge } from '@/src/components/ui/Badge';
import { BottomSheet } from '@/src/components/ui/BottomSheet';
import { ChatSheet } from '@/src/components/ui/ChatSheet';
import { TabSwitcher } from '@/src/components/layout/TabSwitcher';
import { useLiveExplore } from '@/src/hooks/useLiveExplore';
import { useTimeTravel } from '@/src/hooks/useTimeTravel';
import { useNearbyAttractions } from '@/src/hooks/useNearbyAttractions';
import { useAnimate } from '@/src/hooks/useAnimate';
import { useCreate } from '@/src/hooks/useCreate';
import { useVideo } from '@/src/hooks/useVideo';
import { Place } from '@/src/types';
import { mockPlaces } from '@/src/mocks';

import { CameraView } from '@/src/components/CameraView';

const EXPLORE_TABS = [
  { id: 'explain', label: 'Explain' },
  { id: 'time-travel', label: 'Time Travel' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'animate', label: 'Animate' },
  { id: 'create', label: 'Create' },
  { id: 'video', label: 'Video' }
];

const HISTORICAL_ERAS = [
  { year: '1915', label: 'Panama-Pacific Expo', image: 'https://picsum.photos/seed/1915/400/600?grayscale' },
  { year: '1930', label: 'Great Depression', image: 'https://picsum.photos/seed/1930/400/600?grayscale' },
  { year: '1965', label: 'Reconstruction', image: 'https://picsum.photos/seed/1965/400/600?grayscale' },
  { year: '1989', label: 'Loma Prieta', image: 'https://picsum.photos/seed/1989/400/600?grayscale' },
  { year: '2000', label: 'Millennium', image: 'https://picsum.photos/seed/2000/400/600?grayscale' }
];

export function ExploreScreen() {
  const [mode, setMode] = useState('explain');
  const [showResponse, setShowResponse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const {
    isListening,
    isThinking,
    isSpeaking,
    transcript,
    detectedPlace,
    startListening,
    stopListening
  } = useLiveExplore();

  const {
    isGenerating,
    historicalImage,
    generateHistoricalView,
    reset: resetTimeTravel
  } = useTimeTravel();

  const { attractions, isLoading: isLoadingNearby } = useNearbyAttractions();
  const { isGenerating: isGeneratingVideo, videoUrl, generateVideo, reset: resetAnimate } = useAnimate();
  const { isGenerating: isGeneratingImage, imageUrl: createdImageUrl, generateImage, reset: resetCreate } = useCreate();
  const { isAnalyzing: isAnalyzingVideo, analysis: videoAnalysis, analyzeVideo, reset: resetVideo } = useVideo();
  const [animatePrompt, setAnimatePrompt] = useState('');
  const [createPrompt, setCreatePrompt] = useState('');
  const [createSize, setCreateSize] = useState<"1K" | "2K" | "4K">("1K");
  const [videoPrompt, setVideoPrompt] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<{ base64: string, mimeType: string, url: string } | null>(null);

  useEffect(() => {
    if (detectedPlace && mode === 'explain') {
      setShowResponse(true);
    }
  }, [detectedPlace, mode]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    setShowResponse(newMode === 'explain' && !!detectedPlace);
    if (newMode !== 'time-travel') resetTimeTravel();
    if (newMode !== 'animate') resetAnimate();
    if (newMode !== 'create') resetCreate();
    if (newMode !== 'video') {
      resetVideo();
      setSelectedVideo(null);
    }
  };

  const handleTimeTravel = (year: string) => {
    const placeToReconstruct = detectedPlace || mockPlaces[0];
    if (placeToReconstruct) {
      generateHistoricalView(placeToReconstruct, year);
    }
  };

  const handleShare = async () => {
    if (!detectedPlace) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Discover ${detectedPlace.name} with LensIQ`,
          text: `I just learned about ${detectedPlace.name} using LensIQ! ${detectedPlace.audioSummary}`,
          url: window.location.href,
        });
      } else {
        // Fallback if Web Share API is not supported
        alert(`Sharing ${detectedPlace.name}...`);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-black overflow-hidden">
      {/* Camera Background */}
      <div className="absolute inset-0 z-0 bg-black">
        <CameraView onCapture={(base64) => (window as any).lastCapturedFrame = base64} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* Global Camera Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div className="" />
          </div>
        </div>

        {/* Camera Reticle Overlay */}
        {mode !== 'time-travel' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <motion.div
              animate={{
                scale: isThinking ? [1, 1.05, 1] : 1,
                opacity: isThinking ? [0.5, 1, 0.5] : 0.6,
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative w-72 h-72"
            >
              {/* Corners */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-white/70" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-white/70" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-white/70" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white/70" />
              
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-px bg-white/70" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-white/70" />
              
              {/* Distance / Status Indicator */}
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3">
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isThinking ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                  <span className="text-xs font-mono font-medium tracking-wider text-white/90">
                    {isThinking ? 'ANALYZING...' : 'OBJ_DIST: 14.2m'}
                  </span>
                </div>
                <div className="flex space-x-4 text-[10px] font-mono text-white/50 tracking-widest">
                  <span>ISO 400</span>
                  <span>F/1.8</span>
                  <span>1/120s</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-6 pt-12">
        <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">LensIQ</span>
        </div>
        <Button variant="glass" size="icon" className="rounded-full w-10 h-10">
          <CameraIcon className="w-5 h-5" />
        </Button>
      </div>

      {/* Mode Switcher */}
      <div className="relative z-10 flex justify-center mt-4 px-6">
        <TabSwitcher
          tabs={EXPLORE_TABS}
          activeTab={mode}
          onChange={handleModeChange}
          className="w-full max-w-xs bg-black/40 border-white/10"
        />
      </div>

      {/* Center Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {/* AI Status Indicator */}
        <AnimatePresence>
          {(isListening || isThinking || isSpeaking) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-1/4 flex flex-col items-center"
            >
              <div className="relative w-24 h-24 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.5, 1] : 1,
                    opacity: isThinking ? [0.5, 1, 0.5] : 1
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-white/20 rounded-full blur-xl"
                />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] border border-white/50">
                  <Mic className="w-8 h-8 text-black" />
                </div>
              </div>
              <span className="mt-4 text-sm font-medium text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                {isListening ? "Listening..." : isThinking ? "Thinking..." : "Speaking..."}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time Travel View */}
        <AnimatePresence>
          {mode === 'time-travel' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 pointer-events-none"
            >
              {historicalImage && (
                <>
                  <img 
                    src={historicalImage} 
                    alt="Historical View" 
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
                  
                  <div className="absolute top-24 left-6 right-6 flex justify-between items-start pointer-events-auto">
                    <Badge variant="warning" className="bg-amber-500/20 text-amber-300 border-amber-500/30 backdrop-blur-md">
                      Historical Reconstruction
                    </Badge>
                    <Button variant="glass" size="icon" onClick={resetTimeTravel}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              )}

              <div className="absolute bottom-32 left-0 right-0 px-6 pointer-events-auto">
                {isGenerating ? (
                  <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-zinc-300 font-medium">Reconstructing history...</p>
                  </div>
                ) : (
                  <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {HISTORICAL_ERAS.map(era => (
                      <button
                        key={era.year}
                        onClick={() => handleTimeTravel(era.year)}
                        className="snap-center shrink-0 w-40 text-left group"
                      >
                        <div className="relative h-48 rounded-2xl overflow-hidden border-2 border-zinc-800 hover:border-white transition-all duration-300">
                          <img src={era.image} alt={era.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <h4 className="text-2xl font-bold text-white mb-1">{era.year}</h4>
                            <p className="text-xs text-zinc-300 line-clamp-2">{era.label}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nearby View */}
        <AnimatePresence>
          {mode === 'nearby' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-0 right-0 px-6"
            >
              <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {attractions.map(place => (
                  <div key={place.id} className="snap-center shrink-0 w-80 bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 p-4 shadow-2xl flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 relative border border-zinc-700">
                        <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px] truncate max-w-[100px]">{place.category}</Badge>
                          <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-[10px] shrink-0">{place.distance}</Badge>
                        </div>
                        <h4 className="text-base font-bold text-white truncate">{place.name}</h4>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2">{place.description}</p>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1">Guide Me</Button>
                      <Button size="sm" variant="secondary" className="flex-1">Ask AI</Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animate View */}
        <AnimatePresence>
          {mode === 'animate' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-0 right-0 px-6"
            >
              <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 shadow-2xl">
                {isGeneratingVideo ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-medium">Animating scene...</p>
                    <p className="text-sm text-zinc-400 mt-2 text-center">This may take a minute or two using Veo 3.</p>
                  </div>
                ) : videoUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full rounded-2xl overflow-hidden border border-zinc-700 mb-4 bg-black">
                      <video src={videoUrl} autoPlay loop controls className="w-full h-auto max-h-64 object-contain" />
                    </div>
                    <Button onClick={resetAnimate} variant="secondary" className="w-full">
                      Create Another
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <p className="text-white font-medium text-center">Bring the current scene to life</p>
                    <input
                      type="text"
                      value={animatePrompt}
                      onChange={e => setAnimatePrompt(e.target.value)}
                      placeholder="e.g. A cinematic pan, birds flying..."
                      className="bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <Button 
                      onClick={() => {
                        const base64Image = (window as any).lastCapturedFrame;
                        if (base64Image) {
                          generateVideo(base64Image, animatePrompt);
                        } else {
                          alert("No camera frame available");
                        }
                      }}
                      className="w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Video
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create View */}
        <AnimatePresence>
          {mode === 'create' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-0 right-0 px-6"
            >
              <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 shadow-2xl">
                {isGeneratingImage ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-medium">Generating image...</p>
                    <p className="text-sm text-zinc-400 mt-2 text-center">Using Nano Banana Pro.</p>
                  </div>
                ) : createdImageUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full rounded-2xl overflow-hidden border border-zinc-700 mb-4 bg-black">
                      <img src={createdImageUrl} alt="Generated" className="w-full h-auto max-h-64 object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <Button onClick={resetCreate} variant="secondary" className="w-full">
                      Create Another
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <p className="text-white font-medium text-center">Generate an image</p>
                    <input
                      type="text"
                      value={createPrompt}
                      onChange={e => setCreatePrompt(e.target.value)}
                      placeholder="e.g. A futuristic city skyline..."
                      className="bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex space-x-2">
                      {(["1K", "2K", "4K"] as const).map(size => (
                        <Button
                          key={size}
                          variant={createSize === size ? "default" : "secondary"}
                          onClick={() => setCreateSize(size)}
                          className="flex-1"
                          size="sm"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      onClick={() => generateImage(createPrompt, createSize)}
                      className="w-full"
                      disabled={!createPrompt.trim()}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Image
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video View */}
        <AnimatePresence>
          {mode === 'video' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-0 right-0 px-6"
            >
              <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 shadow-2xl">
                {isAnalyzingVideo ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-medium">Analyzing video...</p>
                  </div>
                ) : videoAnalysis ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full rounded-2xl overflow-hidden border border-zinc-700 mb-4 bg-black">
                      <video src={selectedVideo?.url} controls className="w-full h-auto max-h-64 object-contain" />
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-xl mb-4 w-full">
                      <p className="text-sm text-zinc-300">{videoAnalysis}</p>
                    </div>
                    <Button onClick={() => { resetVideo(); setSelectedVideo(null); }} variant="secondary" className="w-full">
                      Analyze Another
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <p className="text-white font-medium text-center">Understand a video</p>
                    
                    {!selectedVideo ? (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed rounded-2xl cursor-pointer hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Sparkles className="w-8 h-8 text-zinc-400 mb-2" />
                          <p className="text-sm text-zinc-400">Click to upload video</p>
                        </div>
                        <input 
                          type="file" 
                          accept="video/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = (reader.result as string).split(',')[1];
                                setSelectedVideo({ base64, mimeType: file.type, url });
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                    ) : (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-700 bg-black">
                        <video src={selectedVideo.url} controls className="w-full h-auto max-h-48 object-contain" />
                        <button 
                          onClick={() => setSelectedVideo(null)}
                          className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/80"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <input
                      type="text"
                      value={videoPrompt}
                      onChange={e => setVideoPrompt(e.target.value)}
                      placeholder="What do you want to know about this video?"
                      className="bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    
                    <Button 
                      onClick={() => {
                        if (selectedVideo) {
                          analyzeVideo(selectedVideo.base64, selectedVideo.mimeType, videoPrompt || "Describe this video in detail.");
                        }
                      }}
                      className="w-full"
                      disabled={!selectedVideo}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Video
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Interaction Tray */}
      <div className="relative z-30 pb-24 bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
        <div className="px-6 pb-6">
          {/* Suggestion Chips */}
          <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
            <Chip active>What is this?</Chip>
            <Chip>Why is it important?</Chip>
            <Chip>Show 1920</Chip>
            <Chip>Nearby places</Chip>
          </div>

          {/* Voice Control Bar */}
          <div className="flex items-center space-x-4 bg-zinc-900/80 backdrop-blur-xl rounded-full p-2 border border-zinc-800 shadow-2xl">
            <Button 
              size="icon" 
              className={`rounded-full w-14 h-14 shrink-0 transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
              onClick={isListening ? stopListening : startListening}
            >
              <Mic className="w-6 h-6" />
            </Button>
            <div 
              className="flex-1 px-2 cursor-text"
              onClick={() => setShowChat(true)}
            >
              <p className="text-sm text-zinc-400 font-medium truncate">
                {isListening ? "Listening..." : "Tap to ask LensIQ..."}
              </p>
            </div>
            {detectedPlace && mode === 'explain' && !showResponse && (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowResponse(true)}>
                <ChevronUp className="w-6 h-6 text-zinc-400" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sheet */}
      <ChatSheet 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
        contextImage={(window as any).lastCapturedFrame} 
      />

      {/* Explain Mode Response Sheet */}
      <BottomSheet isOpen={showResponse && mode === 'explain'} onClose={() => setShowResponse(false)}>
        {detectedPlace && (
          <div className="flex flex-col h-[60vh]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="success">98% Match</Badge>
                  <Badge variant="outline">{detectedPlace.category}</Badge>
                </div>
                <h2 className="text-2xl font-bold text-white">{detectedPlace.name}</h2>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant={isSaved ? "default" : "secondary"} 
                  size="icon" 
                  className={`w-10 h-10 rounded-full transition-colors ${isSaved ? 'text-black' : ''}`}
                  onClick={() => setIsSaved(!isSaved)}
                >
                  <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                </Button>
                <Button variant="secondary" size="icon" className="w-10 h-10 rounded-full" onClick={handleShare}>
                  <Share className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
              {/* Audio Summary Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start space-x-4">
                <Button size="icon" className="w-10 h-10 rounded-full shrink-0">
                  <Play className="w-4 h-4 ml-0.5" />
                </Button>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {detectedPlace.audioSummary}
                </p>
              </div>

              {/* Key Facts */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Key Facts</h4>
                <ul className="space-y-2">
                  {detectedPlace.facts.map((fact, i) => (
                    <li key={i} className="flex items-start space-x-3 text-sm text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-1.5 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Did you know */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                <h4 className="flex items-center text-sm font-semibold text-amber-400 mb-2">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Did you know?
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {detectedPlace.didYouKnow}
                </p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
