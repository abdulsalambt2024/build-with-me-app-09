import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Users, Mail, BookOpen, Calendar } from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface MemberProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  branch: string | null;
  course: string | null;
  semester: string | null;
  year: string | null;
  roll_number: string | null;
  created_at: string;
  role?: string;
}

export default function AllMembers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['all-members'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, bio, branch, course, semester, year, roll_number, created_at')
        .eq('is_disabled', false)
        .order('full_name');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));

      return profiles?.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || 'viewer'
      })) as MemberProfile[];
    }
  });

  const filtered = members?.filter(m => {
    const matchesSearch = !search || 
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.branch?.toLowerCase().includes(search.toLowerCase()) ||
      m.roll_number?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role?: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      member: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    const labels: Record<string, string> = {
      super_admin: 'Super Admin', admin: 'Admin', member: 'Member', viewer: 'Viewer'
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[role || 'viewer']}`}>
        {labels[role || 'viewer']}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary shadow-lg">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">All Members</h1>
            <p className="text-xs text-muted-foreground">{filtered?.length || 0} members</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, branch, roll..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-muted/50" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[120px] border-0 bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-0"><CardContent className="p-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered?.map(member => (
              <Card 
                key={member.user_id} 
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {member.full_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{member.full_name || 'Unknown'}</p>
                        <VerifiedBadge userId={member.user_id} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoleBadge(member.role)}
                        {member.branch && <span className="text-xs text-muted-foreground">{member.branch}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered?.length === 0 && (
              <Card className="border-0"><CardContent className="py-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" /><p className="text-muted-foreground">No members found</p></CardContent></Card>
            )}
          </div>
        )}

        {/* Profile Dialog */}
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Member Profile</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedMember.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {selectedMember.full_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="font-bold text-lg">{selectedMember.full_name}</h3>
                      <VerifiedBadge userId={selectedMember.user_id} />
                    </div>
                    {getRoleBadge(selectedMember.role)}
                  </div>
                </div>
                {selectedMember.bio && <p className="text-sm text-muted-foreground text-center">{selectedMember.bio}</p>}
                <div className="space-y-2 text-sm">
                  {selectedMember.course && (
                    <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span>{selectedMember.course}</span></div>
                  )}
                  {selectedMember.branch && (
                    <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span>{selectedMember.branch} {selectedMember.semester && `• Sem ${selectedMember.semester}`}</span></div>
                  )}
                  {selectedMember.roll_number && (
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>Roll: {selectedMember.roll_number}</span></div>
                  )}
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Joined {new Date(selectedMember.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
