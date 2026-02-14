import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Award, Search, Trophy, Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AchievementAwards() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [badgeForm, setBadgeForm] = useState({
    title: '',
    description: '',
    category: 'custom',
    badge_url: '',
  });

  const isSuperAdmin = role === 'super_admin';

  const { data: members } = useQuery({
    queryKey: ['all-profiles-for-awards'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').order('full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
      return profiles?.map(p => ({ ...p, role: roleMap.get(p.user_id) || 'viewer' })) || [];
    },
    enabled: isSuperAdmin,
  });

  const { data: recentAwards, isLoading } = useQuery({
    queryKey: ['recent-achievement-awards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('achievements')
        .select('*, profiles!achievements_user_id_fkey(full_name, avatar_url)')
        .eq('achievement_type', 'awarded')
        .order('earned_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  const awardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !badgeForm.title) throw new Error('Select a user and provide a title');

      // Create achievement
      const { error } = await supabase.from('achievements').insert({
        user_id: selectedUser,
        title: badgeForm.title,
        description: badgeForm.description || null,
        category: badgeForm.category,
        badge_url: badgeForm.badge_url || null,
        achievement_type: 'awarded',
        earned_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Notify user
      const selectedMember = members?.find(m => m.user_id === selectedUser);
      await supabase.from('notifications').insert({
        user_id: selectedUser,
        title: '🏆 Achievement Badge Awarded!',
        message: `You have been awarded "${badgeForm.title}" by a Super Admin.`,
        type: 'achievement',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-achievement-awards'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast.success('Achievement badge awarded successfully!');
      setShowCreate(false);
      setBadgeForm({ title: '', description: '', category: 'custom', badge_url: '' });
      setSelectedUser('');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to award badge'),
  });

  const filteredMembers = members?.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Only Super Admins can award achievement badges.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Trophy className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Achievement Awards</h1>
            <p className="text-sm text-muted-foreground">Create and award badges to members</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Award Badge
        </Button>
      </div>

      {/* Recent Awards */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Awards</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : recentAwards && recentAwards.length > 0 ? (
            <div className="divide-y">
              {recentAwards.map((award: any) => (
                <div key={award.id} className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={award.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{award.profiles?.full_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{award.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{award.title}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{award.category}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(award.earned_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No awards yet. Click "Award Badge" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Award Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Award Achievement Badge</DialogTitle>
            <DialogDescription>Create a custom badge and award it to a member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Badge Title *</Label>
              <Input
                placeholder="e.g. Best Volunteer, Star Performer"
                value={badgeForm.title}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Why is this badge being awarded?"
                value={badgeForm.description}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={badgeForm.category} onValueChange={(v) => setBadgeForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="task_completion">Task Completion</SelectItem>
                  <SelectItem value="post_engagement">Post Engagement</SelectItem>
                  <SelectItem value="event_attendance">Event Attendance</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="community">Community Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Badge Image URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={badgeForm.badge_url}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, badge_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Award To *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {filteredMembers?.map(m => (
                  <button
                    key={m.user_id}
                    type="button"
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${selectedUser === m.user_id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                    onClick={() => setSelectedUser(m.user_id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback>{m.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{m.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => awardMutation.mutate()}
              disabled={!selectedUser || !badgeForm.title || awardMutation.isPending}
            >
              {awardMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Award Badge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
