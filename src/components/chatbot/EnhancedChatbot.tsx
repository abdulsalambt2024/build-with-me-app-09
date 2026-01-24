import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Send, Volume2, VolumeX, Bot, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatbotMessageSchema } from '@/lib/validation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_REPLIES = [
  { label: '📝 Create Post', message: 'How do I create a post?' },
  { label: '📅 View Events', message: 'How can I view and register for events?' },
  { label: '💬 Start Chat', message: 'How do I start a group chat?' },
  { label: '🎨 AI Studio', message: 'What can I do in AI Studio?' },
  { label: '🏆 Achievements', message: 'How do I earn achievements?' },
  { label: '💰 Donations', message: 'How can I donate to campaigns?' },
  { label: '⚙️ Settings', message: 'How do I change my settings?' },
  { label: '👤 My Profile', message: 'How do I update my profile?' },
];

export function EnhancedChatbot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Animate the bot icon periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { data: faqData } = useQuery({
    queryKey: ['chatbot-faq'],
    queryFn: async () => {
      const { data } = await supabase.from('chatbot_faq').select('*');
      return data || [];
    }
  });

  // Web Speech API TTS (Free)
  const speakText = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthRef.current = utterance;
    
    // Configure voice settings
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    // Try to find a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      voice => voice.name.includes('Female') || 
               voice.name.includes('Zira') || 
               voice.name.includes('Samantha') ||
               voice.name.includes('Google UK English Female')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const validation = chatbotMessageSchema.safeParse({ message: input.trim() });
    if (!validation.success) {
      toast({
        title: 'Error',
        description: validation.error.errors[0].message,
        variant: 'destructive'
      });
      return;
    }

    const userMessage = validation.data.message;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const faqContext = faqData?.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') || '';
      
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          message: userMessage,
          faqContext,
          conversationHistory: messages.slice(-10)
        }
      });

      if (error) throw error;

      const assistantMessage = data?.response || 'I apologize, but I encountered an issue. Please try again.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      speakText(assistantMessage);

      if (user) {
        await supabase.from('chatbot_conversations').insert({
          user_id: user.id,
          message: userMessage,
          response: assistantMessage
        });
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (message: string) => {
    setInput(message);
    // Auto-send the message
    setTimeout(() => {
      const form = document.getElementById('chatbot-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleOpenFullScreen = () => {
    setIsOpen(true);
    setIsFullScreen(true);
  };

  const chatWindowClasses = isFullScreen 
    ? 'fixed inset-0 z-50 flex flex-col bg-background'
    : 'fixed bottom-44 right-4 md:bottom-28 w-[calc(100%-2rem)] max-w-sm h-[450px] flex flex-col z-40 shadow-2xl border rounded-xl overflow-hidden bg-background';

  return (
    <>
      {/* Interactive Floating Robot Button */}
      <button
        className={`fixed bottom-24 right-4 md:bottom-8 h-14 w-14 md:h-16 md:w-16 rounded-full shadow-xl z-40 
          bg-gradient-to-br from-primary via-primary/80 to-accent
          hover:scale-110 transition-all duration-300 ease-out
          flex items-center justify-center
          ${isAnimating ? 'animate-bounce' : ''}
          ${isSpeaking ? 'ring-4 ring-primary/30 animate-pulse' : ''}
          ${isOpen && !isFullScreen ? 'rotate-180' : ''}`}
        onClick={() => isOpen ? setIsOpen(false) : handleOpenFullScreen()}
        aria-label="Open chat assistant"
      >
        <div className="relative">
          {isOpen && !isFullScreen ? (
            <X className="h-6 w-6 md:h-7 md:w-7 text-primary-foreground" />
          ) : (
            <>
              <Bot className="h-7 w-7 md:h-8 md:w-8 text-primary-foreground" />
              <Sparkles className={`absolute -top-1 -right-1 h-3 w-3 md:h-4 md:w-4 text-accent ${isAnimating ? 'animate-ping' : ''}`} />
            </>
          )}
        </div>
        {/* Pulsing ring effect */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary/40 opacity-30 animate-ping" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={chatWindowClasses}>
          {/* Header */}
          <div className="p-3 md:p-4 flex-shrink-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-primary-foreground/50 bg-primary-foreground/20">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base md:text-lg font-bold">PARI</h2>
                  <p className="text-[10px] md:text-xs text-primary-foreground/70">
                    {isLoading ? '✨ Thinking...' : isSpeaking ? '🔊 Speaking...' : '🟢 Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setIsMuted(!isMuted);
                  }}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                >
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => {
                    setIsOpen(false);
                    setIsFullScreen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                    <Bot className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                  </div>
                  <p className="font-bold text-lg md:text-xl">Hi! I'm PARI 👋</p>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Your PARIVARTAN Assistant. How can I help you today?
                  </p>
                  
                  {/* Quick Reply Buttons */}
                  <div className="mt-4 md:mt-6 flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr.label}
                        onClick={() => handleQuickReply(qr.message)}
                        className="text-xs px-3 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm md:text-base ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-sm'
                        : 'bg-card shadow-sm border rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card shadow-sm border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 md:p-4 border-t flex-shrink-0 bg-background">
            <form
              id="chatbot-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2 max-w-2xl mx-auto"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask PARI anything..."
                disabled={isLoading}
                className="flex-1 rounded-full text-sm md:text-base h-10 md:h-11"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full h-10 w-10 md:h-11 md:w-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
