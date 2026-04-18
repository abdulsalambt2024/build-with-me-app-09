import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Slideshow } from '@/components/home/Slideshow';
import { CombinedFeed } from '@/components/feed/CombinedFeed';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MessageCircle, Calendar, Lightbulb, Grid, TrendingUp, ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { PopupDisplay } from '@/components/popup/PopupDisplay';
import { FloatingAdVideo } from '@/components/home/FloatingAdVideo';
import { memo, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { LogIn } from 'lucide-react';

const StatCard = memo(({ icon: Icon, value, label, color }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}) => (
  <Card className="border-0 shadow-soft hover-lift group cursor-default overflow-hidden">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div>
        <p className="text-xl font-heading font-bold tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      </div>
    </CardContent>
  </Card>
));
StatCard.displayName = 'StatCard';

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="border-0">
        <CardContent className="p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function Home() {
  const { user, role, isGuest } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canCreate = role !== 'viewer';
  const isAdmin = role === 'admin' || role === 'super_admin';

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['home-stats'],
    queryFn: async () => {
      const [membersRes, eventsRes, postsRes, attendanceRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('event_date', new Date().toISOString()),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('status', { count: 'exact', head: true }).eq('status', 'present')
      ]);
      const totalAttendance = attendanceRes.count || 0;
      const attendanceRate = totalAttendance > 0 ? Math.min(Math.round((totalAttendance / Math.max(membersRes.count || 1, 1)) * 10), 100) : 85;
      return { members: membersRes.count || 0, upcomingEvents: eventsRes.count || 0, posts: postsRes.count || 0, attendanceRate };
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  const firstName = useMemo(() => profile?.full_name?.split(' ')[0] || 'User', [profile?.full_name]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['combined-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['home-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['user-profile-name', user?.id] }),
    ]);
  }, [queryClient, user?.id]);

  const statsData = useMemo(() => [
    { icon: Users, value: stats?.members || 0, label: 'Members', color: 'bg-primary' },
    { icon: Grid, value: stats?.posts || 0, label: 'Posts', color: 'bg-secondary' },
    { icon: Calendar, value: stats?.upcomingEvents || 0, label: 'Events', color: 'bg-accent' },
    { icon: TrendingUp, value: `${stats?.attendanceRate || 85}%`, label: 'Activity', color: 'bg-secondary' },
  ], [stats]);

  return (
    <div className="min-h-screen">
      <PullToRefresh onRefresh={handleRefresh} />
      <PopupDisplay />
      <FloatingAdVideo />
      <div className="container max-w-3xl mx-auto px-4 py-5">
        <div className="max-w-2xl mx-auto w-full space-y-5">
        {/* Guest Banner */}
        {isGuest && (
          <Card className="border-0 shadow-soft bg-gradient-to-r from-primary/10 to-secondary/10 animate-fade-in-up">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-heading font-bold text-sm">You're browsing as a guest</p>
                <p className="text-xs text-muted-foreground">Sign in to access all features like chat, posts, and more.</p>
              </div>
              <Button size="sm" onClick={() => navigate('/auth')} className="gap-2 shrink-0">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </CardContent>
          </Card>
        )}
        {/* Welcome Section */}
        <div className="flex items-center justify-between animate-fade-in-up">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Welcome back</p>
            <h1 className="text-2xl font-heading font-bold">
              {firstName} 👋
            </h1>
          </div>
          {canCreate && (
            <Button
              onClick={() => navigate('/ai-studio')}
              size="sm"
              className="hidden md:flex gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              AI Studio
            </Button>
          )}
        </div>

        {/* Slideshow */}
        <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <Slideshow />
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {statsLoading ? <StatsSkeleton /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statsData.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {canCreate && (
          <Card className="border-0 shadow-soft overflow-hidden animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm">Quick Actions</h3>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <CreatePostDialog />
                {isAdmin && <CreateEventDialog />}
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-3.5 border-2 border-dashed hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                  onClick={() => navigate('/achievements')}
                >
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Trophy className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-[11px] font-semibold">Achievements</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-3.5 border-2 border-dashed hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                  onClick={() => navigate('/chat')}
                >
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <MessageCircle className="h-4 w-4 text-secondary" />
                  </div>
                  <span className="text-[11px] font-semibold">Start Chat</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Feed */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-lg">Community Feed</h2>
              <p className="text-[11px] text-muted-foreground">Latest updates from your community</p>
            </div>
            {canCreate && <CreatePostDialog />}
          </div>
          <CombinedFeed />
        </div>
        </div>
      </div>
    </div>
  );
}
