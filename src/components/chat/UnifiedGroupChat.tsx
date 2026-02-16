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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, Image as ImageIcon, Paperclip, Mic, MicOff, Reply, Pin, Trash2, Check, CheckCheck, MoreVertical, Users, Info, Edit2, Smile, Search, ArrowDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { chatMessageSchema } from '@/lib/validation';
import { GroupInfoPanel } from './GroupInfoPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  profiles: { full_name: string; avatar_url: string; };
  reactions: { emoji: string; user_id: string; }[];
  read_status: { user_id: string; read_at: string; }[];
}

const UNIFIED_ROOM_ID = '00000000-0000-0000-0000-000000000001';
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯', '🎉'];

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['unified-chat-messages'],
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages').select('*')
        .eq('room_id', UNIFIED_ROOM_ID).eq('is_deleted', false)
        .order('created_at', { ascending: true });
      if (messagesError) throw messagesError;

      const userIds = messagesData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase.from('profiles')
        .select('user_id, full_name, avatar_url').in('user_id', userIds);
      const messageIds = messagesData?.map(m => m.id) || [];
      const { data: reactions } = await supabase.from('message_reactions')
        .select('*').in('message_id', messageIds);
      const { data: readStatus } = await supabase.from('message_read_status')
        .select('*').in('message_id', messageIds);

      return messagesData?.map(msg => ({
        ...msg,
        profiles: profiles?.find(p => p.user_id === msg.user_id) || { full_name: '', avatar_url: '' },
        reactions: reactions?.filter(r => r.message_id === msg.id) || [],
        read_status: readStatus?.filter(r => r.message_id === msg.id) || []
      })) as Message[];
    }
  });

  // Filter messages by search
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Pinned messages
  const pinnedMessages = messages.filter(m => m.is_pinned);

  // Real-time subscriptions
  useEffect(() => {
    const messagesChannel = supabase.channel('unified-chat-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${UNIFIED_ROOM_ID}` },
        () => queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] }))
      .subscribe();
    const reactionsChannel = supabase.channel('unified-chat-reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        () => queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] }))
      .subscribe();
    const typingChannel = supabase.channel('unified-chat-typing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_indicators', filter: `room_id=eq.${UNIFIED_ROOM_ID}` },
        (payload: any) => {
          if (payload.new?.is_typing && payload.new.user_id !== user?.id) {
            setTypingUsers(prev => new Set(prev).add(payload.new.user_id));
            setTimeout(() => {
              setTypingUsers(prev => { const next = new Set(prev); next.delete(payload.new.user_id); return next; });
            }, 3000);
          }
        })
      .subscribe();
    return () => { messagesChannel.unsubscribe(); reactionsChannel.unsubscribe(); typingChannel.unsubscribe(); };
  }, [user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mutations
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const validation = chatMessageSchema.safeParse({ content });
      if (!validation.success) throw new Error(validation.error.errors[0].message);
      const { error } = await supabase.from('messages').insert({
        room_id: UNIFIED_ROOM_ID, user_id: user?.id, content: validation.data.content,
        reply_to_message_id: replyingTo?.id
      });
      if (error) throw error;
    },
    onSuccess: () => { setMessage(''); setReplyingTo(null); queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] }); },
    onError: (error: Error) => toast.error(error.message || 'Failed to send message')
  });

  const editMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase.from('messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingMessage(null); setEditContent(''); queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] }); toast.success('Message edited'); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('messages').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => { setDeleteConfirm(null); queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] }); toast.success('Message deleted'); }
  });

  const pinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase.from('messages').update({
        is_pinned: !isPinned, pinned_by: !isPinned ? user?.id : null, pinned_at: !isPinned ? new Date().toISOString() : null
      }).eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] })
  });

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const existingReaction = messages.find(m => m.id === messageId)?.reactions.find(r => r.user_id === user?.id && r.emoji === emoji);
      if (existingReaction) {
        const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user?.id).eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user?.id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] })
  });

  const markAsRead = async (messageId: string) => {
    await supabase.from('message_read_status').upsert({ message_id: messageId, user_id: user?.id });
  };

  useEffect(() => {
    messages.forEach(msg => {
      if (msg.user_id !== user?.id && !msg.read_status.some(r => r.user_id === user?.id)) {
        markAsRead(msg.id);
      }
    });
  }, [messages, user?.id]);

  const handleTyping = async () => {
    await supabase.from('typing_indicators').upsert({ room_id: UNIFIED_ROOM_ID, user_id: user?.id, is_typing: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) sendMutation.mutate(message.trim());
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fileName = `voice-${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, blob);
        if (uploadError) { toast.error('Failed to upload voice message'); return; }
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
        await supabase.from('messages').insert({
          room_id: UNIFIED_ROOM_ID, user_id: user?.id, content: '🎤 Voice message',
          media_url: urlData.publicUrl, message_type: 'voice'
        });
        queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
        toast.success('Voice message sent');
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); setMediaRecorder(null); }
  };

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const groupReactions = (reactions: { emoji: string; user_id: string }[]) => {
    const grouped: { [emoji: string]: string[] } = {};
    reactions.forEach(r => { if (!grouped[r.emoji]) grouped[r.emoji] = []; grouped[r.emoji].push(r.user_id); });
    return grouped;
  };

  // Get reply-to message content
  const getReplyContent = (replyId: string | null) => {
    if (!replyId) return null;
    return messages.find(m => m.id === replyId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-700 text-white p-3 sm:p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Users className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate text-lg">PARIVARTAN Family 😇</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            <p className="text-xs text-emerald-100">{messages.length} messages • {typingUsers.size > 0 ? 'Someone typing...' : 'Tap for info'}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setShowSearch(!showSearch)}>
          <Search className="h-5 w-5" />
        </Button>
        <Sheet open={showGroupInfo} onOpenChange={setShowGroupInfo}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Group Info</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <GroupInfoPanel roomId={UNIFIED_ROOM_ID} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-2 border-b bg-muted/50">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages..." className="h-9 text-sm" autoFocus />
        </div>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && !showSearch && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/50 border-b flex items-center gap-2 text-sm">
          <Pin className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="truncate text-amber-700 dark:text-amber-300 font-medium">
            📌 {pinnedMessages[pinnedMessages.length - 1]?.content}
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading messages...</div>
        ) : (
          <div className="space-y-1 sm:space-y-2">
            {filteredMessages.map((msg, idx) => {
              const isOwn = msg.user_id === user?.id;
              const readCount = msg.read_status.length;
              const groupedReactions = groupReactions(msg.reactions);
              const replyMsg = getReplyContent(msg.reply_to_message_id);
              const prevMsg = filteredMessages[idx - 1];
              const showDateSep = !prevMsg || format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(prevMsg.created_at), 'yyyy-MM-dd');

              return (
                <div key={msg.id}>
                  {/* Date Separator */}
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                        {format(new Date(msg.created_at), 'MMM d, yyyy')}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`flex gap-1.5 max-w-[85%] sm:max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 mt-1">
                          <AvatarImage src={msg.profiles.avatar_url} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                            {msg.profiles.full_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex flex-col">
                        <div className={`rounded-2xl px-3 py-2 shadow-sm ${
                          isOwn
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-tr-sm'
                            : 'bg-card border rounded-tl-sm'
                        } ${msg.is_pinned ? 'ring-2 ring-amber-400/50' : ''}`}>
                          {/* Sender name */}
                          {!isOwn && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {msg.profiles.full_name}
                              </span>
                              <VerifiedBadge userId={msg.user_id} className="h-3 w-3" />
                            </div>
                          )}

                          {/* Reply preview */}
                          {replyMsg && (
                            <div className={`text-xs mb-1.5 px-2 py-1 rounded border-l-2 ${
                              isOwn ? 'bg-white/10 border-white/40' : 'bg-muted/50 border-emerald-400'
                            }`}>
                              <p className="font-medium truncate">{replyMsg.profiles.full_name}</p>
                              <p className="truncate opacity-75">{replyMsg.content}</p>
                            </div>
                          )}

                          {/* Media */}
                          {msg.media_url && msg.message_type === 'image' && (
                            <img src={msg.media_url} alt="Shared" className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90"
                              onClick={() => window.open(msg.media_url!, '_blank')} />
                          )}
                          {msg.media_url && msg.message_type === 'document' && (
                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-muted/30 rounded mb-2 hover:bg-muted/50">
                              <Paperclip className="h-4 w-4" />
                              <span className="text-xs">Download attachment</span>
                            </a>
                          )}
                          {msg.media_url && msg.message_type === 'voice' && (
                            <audio controls className="max-w-full mb-2">
                              <source src={msg.media_url} type="audio/webm" />
                            </audio>
                          )}

                          <p className="text-sm break-words leading-relaxed">{msg.content}</p>

                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                            {msg.edited_at && (
                              <span className={`text-[10px] italic ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>(edited)</span>
                            )}
                            {isOwn && (readCount > 0
                              ? <CheckCheck className="h-3.5 w-3.5 text-blue-200" />
                              : <Check className="h-3.5 w-3.5 text-white/50" />
                            )}
                            {msg.is_pinned && <Pin className="h-3 w-3 text-amber-300" />}
                          </div>
                        </div>

                        {/* Reactions */}
                        {Object.keys(groupedReactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                            {Object.entries(groupedReactions).map(([emoji, users]) => (
                              <button key={emoji}
                                onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                                className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                                  users.includes(user?.id || '') ? 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900' : 'bg-muted border-transparent'
                                }`}>
                                {emoji} {users.length}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Message Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 self-center">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="min-w-[140px]">
                          <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                            <Reply className="h-3 w-3 mr-2" /> Reply
                          </DropdownMenuItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                <Smile className="h-3 w-3 mr-2" /> React
                              </DropdownMenuItem>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                              <div className="flex gap-1 flex-wrap max-w-[200px]">
                                {EMOJIS.map(emoji => (
                                  <button key={emoji} onClick={() => reactMutation.mutate({ messageId: msg.id, emoji })}
                                    className="text-lg hover:scale-125 transition-transform p-1">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          {isOwn && (
                            <DropdownMenuItem onClick={() => { setEditingMessage(msg); setEditContent(msg.content); }}>
                              <Edit2 className="h-3 w-3 mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => pinMutation.mutate({ messageId: msg.id, isPinned: msg.is_pinned })}>
                              <Pin className="h-3 w-3 mr-2" /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                          )}
                          {(isOwn || isSuperAdmin) && (
                            <DropdownMenuItem onClick={() => setDeleteConfirm(msg.id)} className="text-destructive">
                              <Trash2 className="h-3 w-3 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Scroll to bottom button */}
      {messages.length > 20 && (
        <div className="absolute bottom-24 right-4 z-10">
          <Button variant="secondary" size="icon" className="rounded-full shadow-lg h-9 w-9" onClick={scrollToBottom}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit message bar */}
      {editingMessage && (
        <div className="mx-2 sm:mx-4 mb-2 px-3 py-2 bg-muted rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600">Editing message</span>
            <Button variant="ghost" size="sm" onClick={() => setEditingMessage(null)} className="h-6 w-6 p-0">×</Button>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            if (editContent.trim()) editMutation.mutate({ messageId: editingMessage.id, content: editContent.trim() });
          }} className="flex gap-2">
            <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="flex-1" />
            <Button type="submit" size="sm">Save</Button>
          </form>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground italic flex items-center gap-2">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
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
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 bg-background border-t flex items-center gap-1.5 sm:gap-2">
        <input type="file" accept="image/*" className="hidden" id="group-image-upload" onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const fileName = `${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
            await supabase.from('messages').insert({
              room_id: UNIFIED_ROOM_ID, user_id: user?.id, content: '📷 Image',
              media_url: urlData.publicUrl, message_type: 'image'
            });
            queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
            toast.success('Image sent');
          } catch (error) { toast.error('Failed to upload image'); }
        }} />
        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground h-9 w-9"
          onClick={() => document.getElementById('group-image-upload')?.click()}>
          <ImageIcon className="h-5 w-5" />
        </Button>
        <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" id="group-file-upload" onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const fileName = `${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
            await supabase.from('messages').insert({
              room_id: UNIFIED_ROOM_ID, user_id: user?.id, content: `📎 ${file.name}`,
              media_url: urlData.publicUrl, message_type: 'document'
            });
            queryClient.invalidateQueries({ queryKey: ['unified-chat-messages'] });
            toast.success('File sent');
          } catch (error) { toast.error('Failed to upload file'); }
        }} />
        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground h-9 w-9"
          onClick={() => document.getElementById('group-file-upload')?.click()}>
          <Paperclip className="h-5 w-5" />
        </Button>
        <Button type="button" variant="ghost" size="icon"
          className={`h-9 w-9 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}
          onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Input value={message} onChange={e => { setMessage(e.target.value); handleTyping(); }}
          placeholder="Type a message..." className="flex-1 h-10 text-sm rounded-full" disabled={sendMutation.isPending} />
        <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 h-10 w-10 rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This message will be removed from the chat for everyone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
