import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Users, Crown, Shield, User } from 'lucide-react';

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
      // Get all participants in the room
      const { data: participants, error } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (error) throw error;
      if (!participants) return [];

      const userIds = participants.map(p => p.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Get roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

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

  // Sort members: super_admin > admin > member
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
    <div className="space-y-4">
      {/* Group Header */}
      <div className="text-center pb-4 border-b">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto mb-3">
          <Users className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-semibold text-lg">PARIVARTAN Community</h3>
        <p className="text-sm text-muted-foreground">{stats.total} members</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{stats.superAdmins}</p>
          <p className="text-xs text-muted-foreground">Super Admins</p>
        </div>
        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{stats.admins}</p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </div>
        <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-lg font-bold text-green-600">{stats.members}</p>
          <p className="text-xs text-muted-foreground">Members</p>
        </div>
      </div>

      {/* Members List */}
      <div>
        <h4 className="font-medium mb-2 text-sm text-muted-foreground">All Members</h4>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {sortedMembers?.map((member) => (
                <div 
                  key={member.user_id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {member.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{member.full_name}</span>
                      <VerifiedBadge userId={member.user_id} size="sm" />
                    </div>
                    <Badge className={`text-xs mt-0.5 ${getRoleBadgeColor(member.role)}`}>
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