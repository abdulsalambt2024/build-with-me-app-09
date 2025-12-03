import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface PrivateChatProps {
  onSelectRoom: (roomId: string) => void;
}

export function PrivateChat({ onSelectRoom }: PrivateChatProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Only members, admins, super_admins can use chat
  const canChat = role !== 'viewer';

  const { data: privateChats } = useQuery({
    queryKey: ['private-chats'],
    queryFn: async () => {
      if (!user) return [];

      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select(`
          id, name, is_private, updated_at,
          chat_participants!inner(user_id)
        `)
        .eq('is_private', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get the other participant for each room
      const otherUserIds = rooms?.flatMap(r => 
        r.chat_participants
          .filter((p: { user_id: string }) => p.user_id !== user.id)
          .map((p: { user_id: string }) => p.user_id)
      ) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return rooms?.map(room => {
        const otherUserId = room.chat_participants.find((p: { user_id: string }) => p.user_id !== user?.id)?.user_id;
        const otherUser = profileMap.get(otherUserId);
        return {
          ...room,
          otherUser
        };
      }) || [];
    },
    enabled: canChat && !!user
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-chat'],
    queryFn: async () => {
      // Get users who are not viewers
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .neq('role', 'viewer');

      const userIds = roles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds)
        .neq('user_id', user?.id || '');

      return profiles || [];
    },
    enabled: dialogOpen && canChat
  });

  const createPrivateChat = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if chat already exists
      const { data: existingRooms } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          chat_participants!inner(user_id)
        `)
        .eq('is_private', true);

      const existingRoom = existingRooms?.find(room => {
        const participants = room.chat_participants.map((p: { user_id: string }) => p.user_id);
        return participants.includes(user.id) && participants.includes(otherUserId);
      });

      if (existingRoom) {
        return existingRoom.id;
      }

      // Create new private chat
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          is_private: true,
          is_group: false,
          created_by: user.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { room_id: room.id, user_id: user.id },
          { room_id: room.id, user_id: otherUserId }
        ]);

      if (participantsError) throw participantsError;

      return room.id;
    },
    onSuccess: (roomId) => {
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
      setDialogOpen(false);
      onSelectRoom(roomId);
      toast({ title: 'Chat created', description: 'Start your conversation!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
    }
  });

  const filteredUsers = allUsers?.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!canChat) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chat is only available for Members, Admins, and Super Admins.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Private Messages</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {filteredUsers?.map((u) => (
                      <Button
                        key={u.user_id}
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => createPrivateChat.mutate(u.user_id)}
                        disabled={createPrivateChat.isPending}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{u.full_name}</span>
                      </Button>
                    ))}
                    {filteredUsers?.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No users found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {privateChats?.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => onSelectRoom(chat.id)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={chat.otherUser?.avatar_url || undefined} />
                  <AvatarFallback>{chat.otherUser?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <span className="truncate">{chat.otherUser?.full_name || 'Unknown'}</span>
              </Button>
            ))}
            {(!privateChats || privateChats.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No private chats yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
