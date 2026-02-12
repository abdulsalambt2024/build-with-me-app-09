import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, Mail, Shield, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Profile() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const getRoleBadgeVariant = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'member': return 'Member';
      default: return 'Viewer';
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-24">
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Avatar and info */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-xl sm:text-2xl">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg sm:text-2xl truncate">
                    {profile?.full_name || user.email}
                  </CardTitle>
                  <VerifiedBadge userId={user?.id || ''} />
                </div>
                <CardDescription className="flex items-center gap-1.5 mt-1 text-xs sm:text-sm">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </CardDescription>
              </div>
            </div>
            {/* Action buttons - full width on mobile */}
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/profile/edit')}>
                <Edit className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={signOut}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="p-4 sm:pt-6 space-y-4 sm:space-y-6">
          {profile?.bio && (
            <>
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-1.5">Bio</h3>
                <p className="text-muted-foreground text-sm">{profile.bio}</p>
              </div>
              <Separator />
            </>
          )}
          
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Account Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant={getRoleBadgeVariant(role)}>
                  {getRoleLabel(role)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {user.id.slice(0, 8)}...
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Member Since:</span>
                <span className="text-sm">
                  {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
