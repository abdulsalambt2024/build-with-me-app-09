import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Send, Volume2, VolumeX, Bot, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatbotMessageSchema } from '@/lib/validation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function EnhancedChatbot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const speakText = async (text: string) => {
    if (isMuted) return;

    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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

  return (
    <>
      {/* Interactive Floating Robot Button */}
      <button
        className={`fixed bottom-24 right-4 md:bottom-8 h-16 w-16 rounded-full shadow-xl z-40 
          bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
          hover:scale-110 transition-all duration-300 ease-out
          flex items-center justify-center
          ${isAnimating ? 'animate-bounce' : ''}
          ${isSpeaking ? 'ring-4 ring-purple-300 ring-opacity-50 animate-pulse' : ''}
          ${isOpen ? 'rotate-180' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open chat assistant"
      >
        <div className="relative">
          {isOpen ? (
            <X className="h-7 w-7 text-white" />
          ) : (
            <>
              <Bot className="h-8 w-8 text-white" />
              <Sparkles className={`absolute -top-1 -right-1 h-4 w-4 text-yellow-300 ${isAnimating ? 'animate-ping' : ''}`} />
            </>
          )}
        </div>
        {/* Pulsing ring effect */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-44 right-4 md:bottom-28 w-[calc(100%-2rem)] max-w-sm h-[450px] flex flex-col z-40 shadow-2xl border-0 overflow-hidden">
          <CardHeader className="p-3 flex-shrink-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border-2 border-white/50 bg-white/20">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="h-5 w-5 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-semibold">Parivartan AI</CardTitle>
                  <p className="text-[10px] text-white/70">
                    {isLoading ? '✨ Thinking...' : isSpeaking ? '🔊 Speaking...' : '🟢 Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
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
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-b from-background to-muted/30">
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-3">
                      <Bot className="h-7 w-7 text-indigo-600" />
                    </div>
                    <p className="font-medium text-sm">Hi! I'm your AI Assistant</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      How can I help you today?
                    </p>
                    <div className="mt-3 space-y-1.5">
                      {['How do I create a post?', 'What is AI Studio?', 'How to donate?'].map((q) => (
                        <button
                          key={q}
                          onClick={() => setInput(q)}
                          className="block w-full text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                        >
                          {q}
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
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-sm'
                          : 'bg-card shadow-sm border rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card shadow-sm border rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t flex-shrink-0 bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 rounded-full text-sm h-9"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full h-9 w-9 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}