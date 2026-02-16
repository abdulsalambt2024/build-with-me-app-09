import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X, Send, Volume2, VolumeX, Sparkles, Maximize2, Minimize2, Mic, MicOff, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatbotMessageSchema } from '@/lib/validation';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useChatbotHistory } from '@/hooks/useChatbotHistory';
import { QuickReplies } from './QuickReplies';
import pariAvatar from '@/assets/pari-avatar.jpg';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function EnhancedChatbot() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const { 
    messages, setMessages, addMessage, saveConversation, 
    clearHistory, exportHistory, isLoadingHistory 
  } = useChatbotHistory(user?.id);

  const handleExport = async () => {
    const result = await exportHistory();
    toast({
      title: result ? 'Export successful' : 'Export failed',
      description: result ? 'Your chat history has been downloaded.' : 'No conversation history to export.',
      variant: result ? 'default' : 'destructive'
    });
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setShowDeleteConfirm(false);
    toast({ title: 'History cleared', description: 'All previous conversations have been permanently deleted.' });
  };

  const handleVoiceResult = useCallback((transcript: string) => {
    setInput(transcript);
    toast({ title: 'Voice captured', description: `"${transcript}"` });
  }, [toast]);

  const handleVoiceError = useCallback((error: string) => {
    toast({
      title: 'Voice input error',
      description: error === 'not-allowed' ? 'Please allow microphone access' : 'Could not recognize speech',
      variant: 'destructive'
    });
  }, [toast]);

  const { isListening, isSupported: isVoiceSupported, toggleListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const { data: faqData } = useQuery({
    queryKey: ['chatbot-faq'],
    queryFn: async () => {
      const { data } = await supabase.from('chatbot_faq').select('*');
      return data || [];
    }
  });

  const speakText = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthRef.current = utterance;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      voice => voice.name.includes('Female') || voice.name.includes('Zira') || 
               voice.name.includes('Samantha') || voice.name.includes('Google UK English Female')
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const validation = chatbotMessageSchema.safeParse({ message: input.trim() });
    if (!validation.success) {
      toast({ title: 'Error', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }
    const userMessage = validation.data.message;
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setIsLoading(true);
    try {
      const faqContext = faqData?.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') || '';
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: { message: userMessage, faqContext, conversationHistory: messages.slice(-10) }
      });
      if (error) throw error;
      const assistantMessage = data?.response || 'I apologize, but I encountered an issue. Please try again.';
      addMessage({ role: 'assistant', content: assistantMessage });
      speakText(assistantMessage);
      await saveConversation(userMessage, assistantMessage);
    } catch (error) {
      console.error('Chatbot error:', error);
      toast({ title: 'Error', description: 'Failed to get response. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (message: string) => {
    setInput(message);
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
      {/* Floating PARI Button - Character Style */}
      <button
        className={`fixed bottom-24 right-4 md:bottom-8 z-40 group transition-all duration-300 ease-out hover:scale-105
          ${isSpeaking ? 'animate-pulse' : ''}
          ${isOpen && !isFullScreen ? '' : ''}`}
        onClick={() => isOpen ? setIsOpen(false) : handleOpenFullScreen()}
        aria-label="Open PARI assistant"
      >
        <div className="relative">
          <div className="h-16 w-16 md:h-[72px] md:w-[72px] rounded-full overflow-hidden border-3 border-primary shadow-xl shadow-primary/20">
            <img src={pariAvatar} alt="PARI" className="w-full h-full object-cover" />
          </div>
          {/* Speech bubble */}
          {!isOpen && (
            <div className="absolute -top-10 -left-20 bg-background border rounded-xl px-3 py-1.5 shadow-lg whitespace-nowrap animate-bounce">
              <p className="text-xs font-semibold text-primary">How can I help you? 💬</p>
              <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-background border-r border-b rotate-45" />
            </div>
          )}
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent animate-ping" />
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-primary/20 opacity-40 animate-ping" />
          )}
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={chatWindowClasses}>
          {/* Header */}
          <div className="p-3 md:p-4 flex-shrink-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <Avatar className="h-11 w-11 md:h-12 md:w-12 border-2 border-primary-foreground/50">
                  <AvatarImage src={pariAvatar} alt="PARI" />
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base md:text-lg font-bold">PARI ✨</h2>
                  <p className="text-[10px] md:text-xs text-primary-foreground/70">
                    {isLoading ? '✨ Thinking...' : isSpeaking ? '🔊 Speaking...' : '🟢 I am PARI, your AI assistant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => { if (isSpeaking) stopSpeaking(); setIsMuted(!isMuted); }}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleExport} title="Export chat history">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setShowDeleteConfirm(true)} title="Clear history">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsFullScreen(!isFullScreen)}>
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => { setIsOpen(false); setIsFullScreen(false); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto">
              {isLoadingHistory && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Loading conversation history...</p>
                </div>
              )}
              {!isLoadingHistory && messages.length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <div className="inline-block mb-4">
                    <img src={pariAvatar} alt="PARI" className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-primary/20 shadow-lg mx-auto" />
                  </div>
                  <p className="font-bold text-xl md:text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    How can I help you? 🙏
                  </p>
                  <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium">
                    I am <span className="text-primary font-bold">PARI</span> — Your PARIVARTAN AI Assistant
                  </p>
                  <div className="mt-4 md:mt-6">
                    <QuickReplies role={role} onSelect={handleQuickReply} />
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                      <AvatarImage src={pariAvatar} alt="PARI" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80">P</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm md:text-base ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-sm'
                      : 'bg-card shadow-sm border rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start items-end gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={pariAvatar} alt="PARI" />
                    <AvatarFallback>P</AvatarFallback>
                  </Avatar>
                  <div className="bg-card shadow-sm border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">PARI is typing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 md:p-4 border-t flex-shrink-0 bg-background">
            <form id="chatbot-form" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2 max-w-2xl mx-auto">
              {isVoiceSupported && (
                <Button type="button" size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  className={`rounded-full h-10 w-10 md:h-11 md:w-11 flex-shrink-0 ${isListening ? 'animate-pulse' : ''}`}
                  onClick={toggleListening} disabled={isLoading}>
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask PARI anything..."}
                disabled={isLoading || isListening}
                className="flex-1 rounded-full text-sm md:text-base h-10 md:h-11" />
              <Button type="submit" size="icon"
                className="rounded-full h-10 w-10 md:h-11 md:w-11 bg-gradient-to-r from-primary to-primary/80"
                disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all your conversations with PARI. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
