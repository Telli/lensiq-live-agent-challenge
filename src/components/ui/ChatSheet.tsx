import React, { useState, useRef, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Send, Sparkles, Bot, User, Zap, Brain, Search } from 'lucide-react';
import { chatService } from '../../services/session/chat.service';
import { searchService } from '../../services/ai/search.service';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isThinking?: boolean;
}

export function ChatSheet({ isOpen, onClose, contextImage, initialQuery }: { isOpen: boolean, onClose: () => void, contextImage?: string, initialQuery?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Hi! I am LensIQ. Ask me anything about what you see or where you are.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useFastMode, setUseFastMode] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setInput(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const isComplex = userMsg.content.toLowerCase().includes('why') || userMsg.content.toLowerCase().includes('how');
      const imageBase64 = contextImage?.includes(',')
        ? contextImage.split(',')[1]
        : contextImage;

      let responseText = '';
      if (useSearch) {
        responseText = await searchService.search(userMsg.content);
      } else {
        responseText = await chatService.chat(userMsg.content, useFastMode ? false : useThinking || isComplex, {
          imageBase64,
        });
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-[78vh] sm:h-[70vh]">
        <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <h2 className="text-xl font-bold text-white">LensIQ Chat</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide pb-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-tl-sm p-3 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="pt-4 border-t border-zinc-800 flex flex-col space-y-3">
          <div className="flex space-x-2">
            <Button
              variant={useSearch ? "default" : "secondary"}
              size="sm"
              className="flex-1 text-xs py-1 h-8"
              onClick={() => { setUseSearch(!useSearch); if (!useSearch) { setUseFastMode(false); setUseThinking(false); } }}
            >
              <Search className="w-3 h-3 mr-1" />
              Web Search
            </Button>
            <Button
              variant={useFastMode ? "default" : "secondary"}
              size="sm"
              className="flex-1 text-xs py-1 h-8"
              onClick={() => { setUseFastMode(!useFastMode); if (!useFastMode) { setUseThinking(false); setUseSearch(false); } }}
            >
              <Zap className="w-3 h-3 mr-1" />
              Fast
            </Button>
            <Button
              variant={useThinking ? "default" : "secondary"}
              size="sm"
              className="flex-1 text-xs py-1 h-8"
              onClick={() => { setUseThinking(!useThinking); if (!useThinking) { setUseFastMode(false); setUseSearch(false); } }}
            >
              <Brain className="w-3 h-3 mr-1" />
              Deep Think
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask LensIQ..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
            />
            <Button size="icon" className="rounded-full w-12 h-12 shrink-0" onClick={handleSend} disabled={!input.trim() || isTyping}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
