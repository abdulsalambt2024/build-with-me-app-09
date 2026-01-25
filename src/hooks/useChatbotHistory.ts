import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistoryEntry {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

export function useChatbotHistory(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load conversation history on mount
  useEffect(() => {
    if (!userId) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('chatbot_conversations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(20); // Load last 20 conversations

        if (error) throw error;

        if (data && data.length > 0) {
          const historyMessages: Message[] = [];
          (data as ChatHistoryEntry[]).forEach((entry) => {
            historyMessages.push({ role: 'user', content: entry.message });
            historyMessages.push({ role: 'assistant', content: entry.response });
          });
          setMessages(historyMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [userId]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const saveConversation = useCallback(async (userMessage: string, assistantMessage: string) => {
    if (!userId) return;

    try {
      await supabase.from('chatbot_conversations').insert({
        user_id: userId,
        message: userMessage,
        response: assistantMessage
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, [userId]);

  const clearHistory = useCallback(async () => {
    if (!userId) return;

    try {
      await supabase
        .from('chatbot_conversations')
        .delete()
        .eq('user_id', userId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, [userId]);

  return {
    messages,
    setMessages,
    addMessage,
    saveConversation,
    clearHistory,
    isLoadingHistory,
  };
}
