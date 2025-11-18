import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Image as ImageIcon, Paperclip, Mic, Reply, Pin, Trash2, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  media_url: string | null;
  is_deleted: boolean;
  is_pinned: boolean;
  reply_to_message_id: string | null;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  reactions: any[];
  read_status: { user_id: string; read_at: string }[];
}

const UNIFIED_ROOM_ID = 'unified-group-chat';

export function UnifiedGroupChat() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['unified-chat-messages'],
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', UNIFIED_ROOM_ID)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch profiles separately
      const userIds = messagesData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Fetch reactions
      const messageIds = messagesData?.map(m => m.id) || [];
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      // Fetch read status
      const { data: readStatus } = await supabase
        .from('message_read_status')
        .select('*')
        .in('message_id', messageIds);

      return messagesData?.map(msg => ({
        ...msg,
        profiles: profiles?.find(p => p.user_id === msg.user_id) || { full_name: '', avatar_url: '' },
        reactions: reactions?.filter(r => r.message_id === msg.id) || [],
        read_status: readStatus?.filter(r => r.message_id === msg.id) || []
      })) as Message[];
    }
  });

  // Real-time subscriptions
  useEffect(() => {
    const messagesChannel = supabase
      .channel('unified-chat-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${UNIFIED_ROOM_ID}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
      })
      .subscribe();

    const typingChannel = supabase
      .channel('unified-chat-typing')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `room_id=eq.${UNIFIED_ROOM_ID}`
      }, (payload: any) => {
        if (payload.new?.is_typing && payload.new.user_id !== user?.id) {
          setTypingUsers(prev => new Set(prev).add(payload.new.user_id));
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(payload.new.user_id);
              return next;
            });
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      typingChannel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: UNIFIED_ROOM_ID,
          user_id: user?.id,
          content,
          reply_to_message_id: replyingTo?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  // Delete message
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
      toast.success('Message deleted');
    }
  });

  // Pin message (admin only)
  const pinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('messages')
        .update({
          is_pinned: !isPinned,
          pinned_by: !isPinned ? user?.id : null,
          pinned_at: !isPinned ? new Date().toISOString() : null
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
    }
  });

  // Mark as read
  const markAsRead = async (messageId: string) => {
    await supabase
      .from('message_read_status')
      .upsert({
        message_id: messageId,
        user_id: user?.id,
      });
  };

  useEffect(() => {
    messages.forEach(msg => {
      if (msg.user_id !== user?.id && !msg.read_status.some(r => r.user_id === user?.id)) {
        markAsRead(msg.id);
      }
    });
  }, [messages, user?.id]);

  // Typing indicator
  const handleTyping = async () => {
    await supabase
      .from('typing_indicators')
      .upsert({
        room_id: UNIFIED_ROOM_ID,
        user_id: user?.id,
        is_typing: true,
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Community Group Chat</h2>
        <p className="text-sm text-muted-foreground">
          {messages.length} messages
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading messages...</div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.user_id === user?.id;
              const readCount = msg.read_status.length;
              
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${msg.is_pinned ? 'bg-accent/20 p-2 rounded-lg' : ''}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={msg.profiles.avatar_url} />
                    <AvatarFallback>{msg.profiles.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{msg.profiles.full_name}</span>
                      <VerifiedBadge />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {msg.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                    </div>
                    
                    <div className={`mt-1 inline-block rounded-lg px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.content}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      {isOwn && (
                        <>
                          {readCount === 0 ? <Check className="h-3 w-3 text-muted-foreground" /> : <CheckCheck className="h-3 w-3 text-blue-500" />}
                        </>
                      )}
                      
                      {!isOwn && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(msg)}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pinMutation.mutate({ messageId: msg.id, isPinned: msg.is_pinned })}
                          >
                            <Pin className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(msg.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      
                      {isOwn && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(msg.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 text-sm text-muted-foreground">
          Someone is typing...
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted flex items-center justify-between">
          <span className="text-sm">Replying to {replyingTo.profiles.full_name}</span>
          <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Button type="button" variant="ghost" size="icon">
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button type="button" variant="ghost" size="icon">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="button" variant="ghost" size="icon">
          <Mic className="h-5 w-5" />
        </Button>
        <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </Card>
  );
}
