import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Users, Crown, Shield, User, MessageCircle, Image, FileText, Mic2 } from 'lucide-react';

interface GroupMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface GroupInfoPanelProps {
  roomId: string;
}

export function GroupInfoPanel({ roomId }: GroupInfoPanelProps) {
  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', roomId],
    queryFn: async () => {
      const { data: participants, error } = await supabase
        .from('chat_participants').select('user_id').eq('room_id', roomId);
      if (error) throw error;
      if (!participants) return [];
      const userIds = participants.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
      const { data: roles } = await supabase
        .from('user_roles').select('user_id, role').in('user_id', userIds);
      return participants.map(p => {
        const profile = profiles?.find(pr => pr.user_id === p.user_id);
        const roleData = roles?.find(r => r.user_id === p.user_id);
        return {
          user_id: p.user_id,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url,
          role: roleData?.role || 'viewer'
        };
      }) as GroupMember[];
    }
  });

  // Message stats
  const { data: messageStats } = useQuery({
    queryKey: ['group-stats', roomId],
    queryFn: async () => {
      const { count: totalMessages } = await supabase
        .from('messages').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('is_deleted', false);
      const { count: imageCount } = await supabase
        .from('messages').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('message_type', 'image');
      const { count: docCount } = await supabase
        .from('messages').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('message_type', 'document');
      const { count: voiceCount } = await supabase
        .from('messages').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('message_type', 'voice');
      return { totalMessages: totalMessages || 0, imageCount: imageCount || 0, docCount: docCount || 0, voiceCount: voiceCount || 0 };
    }
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-3 w-3 text-amber-500" />;
      case 'admin': return <Shield className="h-3 w-3 text-blue-500" />;
      case 'member': return <User className="h-3 w-3 text-green-500" />;
      default: return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'admin': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'member': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const sortedMembers = members?.sort((a, b) => {
    const order = { super_admin: 0, admin: 1, member: 2, viewer: 3 };
    return (order[a.role as keyof typeof order] || 3) - (order[b.role as keyof typeof order] || 3);
  });

  const stats = {
    total: members?.length || 0,
    superAdmins: members?.filter(m => m.role === 'super_admin').length || 0,
    admins: members?.filter(m => m.role === 'admin').length || 0,
    members: members?.filter(m => m.role === 'member').length || 0
  };

  return (
    <div className="space-y-5">
      {/* Group Header */}
      <div className="text-center pb-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Users className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-bold text-xl">PARIVARTAN Family 😇</h3>
        <p className="text-sm text-muted-foreground mt-1">Community Group • Created by Admin</p>
        <p className="text-xs text-muted-foreground mt-0.5">{stats.total} participants</p>
      </div>

      <Separator />

      {/* Role Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl">
          <Crown className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-amber-600">{stats.superAdmins}</p>
          <p className="text-[10px] text-muted-foreground">Super Admins</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl">
          <Shield className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-600">{stats.admins}</p>
          <p className="text-[10px] text-muted-foreground">Admins</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl">
          <User className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-600">{stats.members}</p>
          <p className="text-[10px] text-muted-foreground">Members</p>
        </div>
      </div>

      <Separator />

      {/* Media Stats */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Shared Media & Files</h4>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <MessageCircle className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{messageStats?.totalMessages || 0}</p>
            <p className="text-[9px] text-muted-foreground">Messages</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Image className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{messageStats?.imageCount || 0}</p>
            <p className="text-[9px] text-muted-foreground">Images</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{messageStats?.docCount || 0}</p>
            <p className="text-[9px] text-muted-foreground">Files</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Mic2 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{messageStats?.voiceCount || 0}</p>
            <p className="text-[9px] text-muted-foreground">Voice</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Members List */}
      <div>
        <h4 className="font-semibold text-sm mb-2">{stats.total} Participants</h4>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-1">
              {sortedMembers?.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                      {member.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{member.full_name}</span>
                      <VerifiedBadge userId={member.user_id} size="sm" />
                    </div>
                    <Badge className={`text-[10px] mt-0.5 h-5 ${getRoleBadgeColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      <span className="ml-1 capitalize">{member.role.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
