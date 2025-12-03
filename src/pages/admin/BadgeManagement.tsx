import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Search, Shield, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserWithBadge {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  badge?: {
    id: string;
    badge_type: string;
    granted_at: string;
  };
}

export default function BadgeManagement() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadgeType, setSelectedBadgeType] = useState('verified');

  const isSuperAdmin = role === 'super_admin';

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-badges'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url');

      const { data: badges } = await supabase
        .from('verification_badges')
        .select('*');

      const badgeMap = new Map(badges?.map(b => [b.user_id, b]));

      return profiles?.map(p => ({
        ...p,
        badge: badgeMap.get(p.user_id)
      })) || [];
    },
    enabled: isSuperAdmin
  });

  const grantBadge = useMutation({
    mutationFn: async ({ userId, badgeType }: { userId: string; badgeType: string }) => {
      const { error } = await supabase
        .from('verification_badges')
        .upsert({
          user_id: userId,
          badge_type: badgeType,
          granted_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-badges'] });
      toast({ title: 'Badge Granted', description: 'Verification badge has been assigned.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to grant badge', variant: 'destructive' });
    }
  });

  const revokeBadge = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('verification_badges')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-badges'] });
      toast({ title: 'Badge Revoked', description: 'Verification badge has been removed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to revoke badge', variant: 'destructive' });
    }
  });

  const filteredUsers = users?.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBadgeIcon = (type?: string) => {
    switch (type) {
      case 'super_admin': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'admin': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'verified': return <Star className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Only Super Admins can manage verification badges.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Badge Management</h1>
        <p className="text-muted-foreground">Grant or revoke verification badges for users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedBadgeType} onValueChange={setSelectedBadgeType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="admin">Admin Badge</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="space-y-3">
              {filteredUsers?.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {u.full_name}
                        {u.badge && getBadgeIcon(u.badge.badge_type)}
                      </p>
                      {u.badge && (
                        <Badge variant="outline" className="text-xs">
                          {u.badge.badge_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.badge ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeBadge.mutate(u.user_id)}
                        disabled={revokeBadge.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => grantBadge.mutate({ userId: u.user_id, badgeType: selectedBadgeType })}
                        disabled={grantBadge.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Grant Badge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
