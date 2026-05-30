import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, Mail, Shield, Edit, BookOpen, Calendar, User, GraduationCap } from 'lucide-react';
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
        .select('full_name,bio,avatar_url,course,branch,roll_number,year,semester')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      const { data: priv } = await supabase.rpc('get_my_private_profile_fields');
      const privateFields = Array.isArray(priv) && priv[0] ? priv[0] : { father_name: null, date_of_birth: null };
      return { ...data, ...privateFields };
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
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Please sign in to view your profile.</p></CardContent></Card>
      </div>
    );
  }

  const details = [
    { label: "Father's Name", value: profile?.father_name },
    { label: 'Course', value: profile?.course },
    { label: 'Branch', value: profile?.branch },
    { label: 'Roll Number', value: profile?.roll_number },
    { label: 'Year', value: profile?.year },
    { label: 'Semester', value: profile?.semester },
    { label: 'Date of Birth', value: profile?.date_of_birth },
  ].filter(d => d.value);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-lg mx-auto p-4 pb-24 space-y-4">
        {/* Profile Header Card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h2 className="text-xl font-bold">{profile?.full_name || user.email}</h2>
                  <VerifiedBadge userId={user.id} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                <Badge variant={getRoleBadgeVariant(role)} className="mt-2">
                  {getRoleLabel(role)}
                </Badge>
              </div>
            </div>
          </div>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/profile/edit')}>
                <Edit className="mr-1.5 h-4 w-4" /> Edit Profile
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {profile?.bio && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-1">Bio</h3>
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Details */}
        {details.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> Academic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {details.map(d => (
                  <div key={d.label}>
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className="font-medium">{d.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">User ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{user.id.slice(0, 8)}...</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span>{new Date(profile?.created_at || user.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
