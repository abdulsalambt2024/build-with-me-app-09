import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GraduationCap, MessageCircle, FileText, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to own profile if viewing self
  if (userId && user?.id === userId) return <Navigate to="/profile" replace />;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, bio, avatar_url, created_at')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const [{ count: posts }, { count: achievements }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId!),
        supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('user_id', userId!),
      ]);
      return { posts: posts || 0, achievements: achievements || 0 };
    },
    enabled: !!userId,
  });

  const { data: posts } = useQuery({
    queryKey: ['user-posts-public', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, content, created_at, media_urls')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="container max-w-lg mx-auto p-4">
        <Card><CardContent className="p-8 text-center">Loading…</CardContent></Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-lg mx-auto p-4">
        <Card><CardContent className="p-8 text-center text-muted-foreground">User not found</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-lg mx-auto p-4 pb-24 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h2 className="text-xl font-bold">{profile.full_name || 'Unknown User'}</h2>
                  <VerifiedBadge userId={profile.user_id} />
                </div>
                <Badge variant="secondary" className="mt-2">Member</Badge>
              </div>
            </div>
          </div>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/chat')}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> Message
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/posts')}>
                <FileText className="mr-1.5 h-4 w-4" /> View posts
              </Button>
            </div>
          </CardContent>
        </Card>

        {profile.bio && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-1">Bio</h3>
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats?.posts ?? 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <Award className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats?.achievements ?? 0}</p>
              <p className="text-xs text-muted-foreground">Achievements</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Recent posts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {posts && posts.length > 0 ? posts.map(p => (
              <div key={p.id} className="border-b last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                </p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No posts yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
