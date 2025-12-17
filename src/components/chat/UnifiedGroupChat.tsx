import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Image as ImageIcon, Paperclip, Mic, MicOff, Reply, Pin, Trash2, Check, CheckCheck, MoreVertical, Users, Info, Edit2, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { chatMessageSchema } from '@/lib/validation';
import { GroupInfoPanel } from './GroupInfoPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  media_url: string | null;
  message_type: string | null;
  is_deleted: boolean;
  is_pinned: boolean;
  reply_to_message_id: string | null;
  edited_at: string | null;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  reactions: { emoji: string; user_id: string }[];
  read_status: { user_id: string; read_at: string }[];
}

const UNIFIED_ROOM_ID = '00000000-0000-0000-0000-000000000001';
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export function UnifiedGroupChat() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
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

      const userIds = messagesData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const messageIds = messagesData?.map(m => m.id) || [];
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

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

    const reactionsChannel = supabase
      .channel('unified-chat-reactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions'
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
      reactionsChannel.unsubscribe();
      typingChannel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const validation = chatMessageSchema.safeParse({ content });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: UNIFIED_ROOM_ID,
          user_id: user?.id,
          content: validation.data.content,
          reply_to_message_id: replyingTo?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    }
  });

  const editMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingMessage(null);
      setEditContent('');
      queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
      toast.success('Message edited');
    }
  });

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

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // Check if user already reacted with this emoji
      const existingReaction = messages.find(m => m.id === messageId)?.reactions
        .find(r => r.user_id === user?.id && r.emoji === emoji);

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user?.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user?.id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
    }
  });

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('message_read_status')
      .upsert({ message_id: messageId, user_id: user?.id });
  };

  useEffect(() => {
    messages.forEach(msg => {
      if (msg.user_id !== user?.id && !msg.read_status.some(r => r.user_id === user?.id)) {
        markAsRead(msg.id);
      }
    });
  }, [messages, user?.id]);

  const handleTyping = async () => {
    await supabase
      .from('typing_indicators')
      .upsert({ room_id: UNIFIED_ROOM_ID, user_id: user?.id, is_typing: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fileName = `voice-${Date.now()}.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob);
        
        if (uploadError) {
          toast.error('Failed to upload voice message');
          return;
        }
        
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);
        
        await supabase.from('messages').insert({
          room_id: UNIFIED_ROOM_ID,
          user_id: user?.id,
          content: '🎤 Voice message',
          media_url: urlData.publicUrl,
          message_type: 'voice'
        });
        
        queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
        toast.success('Voice message sent');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  // Group reactions by emoji
  const groupReactions = (reactions: { emoji: string; user_id: string }[]) => {
    const grouped: { [emoji: string]: string[] } = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user_id);
    });
    return grouped;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
      {/* Header */}
      <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-3 sm:p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">PARIVARTAN Community</h2>
          <p className="text-xs text-emerald-100">{messages.length} messages</p>
        </div>
        <Sheet open={showGroupInfo} onOpenChange={setShowGroupInfo}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-500">
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Group Info</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <GroupInfoPanel roomId={UNIFIED_ROOM_ID} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-2 sm:p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading messages...</div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.user_id === user?.id;
              const readCount = msg.read_status.length;
              const groupedReactions = groupReactions(msg.reactions);
              
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {!isOwn && (
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarImage src={msg.profiles.avatar_url} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                          {msg.profiles.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="flex flex-col">
                      <div className={`rounded-lg px-3 py-2 ${isOwn ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-card shadow-sm'} ${msg.is_pinned ? 'ring-2 ring-amber-400' : ''}`}>
                        {!isOwn && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {msg.profiles.full_name}
                            </span>
                            <VerifiedBadge userId={msg.user_id} className="h-3 w-3" />
                          </div>
                        )}
                        
                        {msg.media_url && msg.message_type === 'image' && (
                          <img 
                            src={msg.media_url} 
                            alt="Shared" 
                            className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(msg.media_url!, '_blank')}
                          />
                        )}
                        {msg.media_url && msg.message_type === 'document' && (
                          <a 
                            href={msg.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded mb-2 hover:bg-muted"
                          >
                            <Paperclip className="h-4 w-4" />
                            <span className="text-xs">Download attachment</span>
                          </a>
                        )}
                        {msg.media_url && msg.message_type === 'voice' && (
                          <audio controls className="max-w-full mb-2">
                            <source src={msg.media_url} type="audio/webm" />
                          </audio>
                        )}
                        <p className="text-sm break-words">{msg.content}</p>
                        
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                          <span className={`text-[10px] ${isOwn ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          {msg.edited_at && (
                            <span className={`text-[10px] ${isOwn ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                              (edited)
                            </span>
                          )}
                          {isOwn && (
                            readCount > 0 ? <CheckCheck className="h-3 w-3 text-blue-300" /> : <Check className="h-3 w-3 text-emerald-200" />
                          )}
                          {msg.is_pinned && <Pin className="h-3 w-3 text-amber-400" />}
                        </div>
                      </div>

                      {/* Reactions */}
                      {Object.keys(groupedReactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                          {Object.entries(groupedReactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                users.includes(user?.id || '') 
                                  ? 'bg-emerald-100 dark:bg-emerald-900' 
                                  : 'bg-muted'
                              }`}
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                        <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                          <Reply className="h-3 w-3 mr-2" /> Reply
                        </DropdownMenuItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Smile className="h-3 w-3 mr-2" /> React
                            </DropdownMenuItem>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <div className="flex gap-1">
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                                  className="text-lg hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {isOwn && (
                          <DropdownMenuItem onClick={() => {
                            setEditingMessage(msg);
                            setEditContent(msg.content);
                          }}>
                            <Edit2 className="h-3 w-3 mr-2" /> Edit
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => pinMutation.mutate({ messageId: msg.id, isPinned: msg.is_pinned })}>
                            <Pin className="h-3 w-3 mr-2" /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                          </DropdownMenuItem>
                        )}
                        {(isOwn || isSuperAdmin) && (
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(msg.id)} className="text-destructive">
                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Edit message dialog */}
      {editingMessage && (
        <div className="mx-2 sm:mx-4 mb-2 px-3 py-2 bg-muted rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600">Editing message</span>
            <Button variant="ghost" size="sm" onClick={() => setEditingMessage(null)} className="h-6 w-6 p-0">×</Button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editContent.trim()) {
              editMutation.mutate({ messageId: editingMessage.id, content: editContent.trim() });
            }
          }} className="flex gap-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">Save</Button>
          </form>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground italic">
          Someone is typing...
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="mx-2 sm:mx-4 mb-2 px-3 py-2 bg-muted rounded-lg flex items-center justify-between border-l-4 border-emerald-500">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-emerald-600 font-medium">{replyingTo.profiles.full_name}</span>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0 flex-shrink-0">×</Button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 bg-background border-t flex items-center gap-1 sm:gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="group-image-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            try {
              const fileName = `${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, file);
              
              if (uploadError) throw uploadError;
              
              const { data: urlData } = supabase.storage
                .from('chat-media')
                .getPublicUrl(fileName);
              
              await supabase.from('messages').insert({
                room_id: UNIFIED_ROOM_ID,
                user_id: user?.id,
                content: '📷 Image',
                media_url: urlData.publicUrl,
                message_type: 'image'
              });
              
              queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
              toast.success('Image sent');
            } catch (error) {
              toast.error('Failed to upload image');
            }
          }}
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground h-8 w-8 sm:h-9 sm:w-9"
          onClick={() => document.getElementById('group-image-upload')?.click()}
        >
          <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          id="group-file-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            try {
              const fileName = `${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, file);
              
              if (uploadError) throw uploadError;
              
              const { data: urlData } = supabase.storage
                .from('chat-media')
                .getPublicUrl(fileName);
              
              await supabase.from('messages').insert({
                room_id: UNIFIED_ROOM_ID,
                user_id: user?.id,
                content: `📎 ${file.name}`,
                media_url: urlData.publicUrl,
                message_type: 'document'
              });
              
              queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
              toast.success('File sent');
            } catch (error) {
              toast.error('Failed to upload file');
            }
          }}
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground h-8 w-8 sm:h-9 sm:w-9"
          onClick={() => document.getElementById('group-file-upload')?.click()}
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-8 w-8 sm:h-9 sm:w-9 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="flex-1 h-9 sm:h-10 text-sm"
          disabled={sendMutation.isPending}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || sendMutation.isPending}
          className="bg-emerald-500 hover:bg-emerald-600 h-8 w-8 sm:h-9 sm:w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
