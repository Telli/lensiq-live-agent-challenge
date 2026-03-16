import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { TabSwitcher } from '@/src/components/layout/TabSwitcher';
import { useAnimate } from '@/src/hooks/useAnimate';
import { useCreate } from '@/src/hooks/useCreate';
import { useVideo } from '@/src/hooks/useVideo';
import { frameStore } from '@/src/services/session/frameStore';

const LAB_TABS = [
  { id: 'animate', label: 'Animate' },
  { id: 'create', label: 'Create' },
  { id: 'video', label: 'Video Analysis' }
];

export function LabView() {
  const [labMode, setLabMode] = useState('animate');

  const { isGenerating: isGeneratingVideo, videoUrl, error: animateError, generateVideo, reset: resetAnimate } = useAnimate();
  const { isGenerating: isGeneratingImage, imageUrl: createdImageUrl, error: createError, generateImage, reset: resetCreate } = useCreate();
  const { isAnalyzing: isAnalyzingVideo, analysis: videoAnalysis, error: videoError, analyzeVideo, reset: resetVideo } = useVideo();
  
  const [animatePrompt, setAnimatePrompt] = useState('');
  const [createPrompt, setCreatePrompt] = useState('');
  const [createSize, setCreateSize] = useState<"1K" | "2K" | "4K">("1K");
  const [videoPrompt, setVideoPrompt] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<{ base64: string, mimeType: string, url: string } | null>(null);

  const handleLabModeChange = (newMode: string) => {
    setLabMode(newMode);
    if (newMode !== 'animate') resetAnimate();
    if (newMode !== 'create') resetCreate();
    if (newMode !== 'video') {
      resetVideo();
      setSelectedVideo(null);
    }
  };

  useEffect(() => {
    return () => {
      if (selectedVideo?.url) {
        URL.revokeObjectURL(selectedVideo.url);
      }
    };
  }, [selectedVideo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-32 left-0 right-0 px-6 z-20 pointer-events-auto"
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 shadow-2xl">
        <div className="flex justify-center mb-6">
          <TabSwitcher
            tabs={LAB_TABS}
            activeTab={labMode}
            onChange={handleLabModeChange}
            className="w-full bg-black/40 border-white/10"
          />
        </div>

        {/* Animate View */}
        {labMode === 'animate' && (
          <div>
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
                    const frame = frameStore.getLatestFrame();
                    const base64Image = frame ? frame.data : null;
                    if (base64Image) {
                      generateVideo(base64Image, animatePrompt);
                    }
                  }}
                  className="w-full"
                  disabled={!frameStore.getLatestFrame()?.data}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Video
                </Button>
                {animateError && <p className="text-xs text-amber-300">{animateError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Create View */}
        {labMode === 'create' && (
          <div>
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
                {createError && <p className="text-xs text-amber-300">{createError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Video View */}
        {labMode === 'video' && (
          <div>
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
                {videoError && <p className="text-xs text-amber-300">{videoError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
