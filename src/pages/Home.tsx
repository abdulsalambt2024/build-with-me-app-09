import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Slideshow } from '@/components/home/Slideshow';
import { CombinedFeed } from '@/components/feed/CombinedFeed';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MessageCircle, Calendar, Lightbulb, UserCheck, Grid, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { PopupDisplay } from '@/components/popup/PopupDisplay';
import { memo, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Memoized stat card for better performance
const StatCard = memo(({ icon: Icon, value, label, gradient, iconColor }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  gradient: string;
  iconColor: string;
}) => (
  <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${gradient}`}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${iconColor} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

// Loading skeleton for stats
const StatsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="border-0">
        <CardContent className="p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function Home() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const canCreate = role !== 'viewer';
  const isAdmin = role === 'admin' || role === 'super_admin';

  // Optimized stats query with proper caching
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
      
      return {
        members: membersRes.count || 0,
        upcomingEvents: eventsRes.count || 0,
        posts: postsRes.count || 0,
        attendanceRate
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const firstName = useMemo(() => profile?.full_name?.split(' ')[0] || 'User', [profile?.full_name]);

  const statsData = useMemo(() => [
    { icon: Users, value: stats?.members || 0, label: 'Members', gradient: 'bg-gradient-to-br from-primary/15 via-primary/5 to-transparent', iconColor: 'bg-primary' },
    { icon: Grid, value: stats?.posts || 0, label: 'Posts', gradient: 'bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent', iconColor: 'bg-secondary' },
    { icon: Calendar, value: stats?.upcomingEvents || 0, label: 'Events', gradient: 'bg-gradient-to-br from-accent/15 via-accent/5 to-transparent', iconColor: 'bg-accent' },
    { icon: TrendingUp, value: `${stats?.attendanceRate || 85}%`, label: 'Activity', gradient: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent', iconColor: 'bg-emerald-500' },
  ], [stats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <PopupDisplay />
      <div className="container max-w-6xl mx-auto px-4 py-4 space-y-6">
        {/* Welcome Section - Optimized */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm text-muted-foreground font-medium">Welcome back,</p>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {firstName}! 👋
            </h1>
          </div>
          {canCreate && (
            <Button 
              onClick={() => navigate('/ai-studio')} 
              size="sm"
              className="hidden md:flex gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Lightbulb className="h-4 w-4" />
              AI Studio
            </Button>
          )}
        </div>

        {/* Slideshow */}
        <Slideshow />

        {/* Stats Grid - With loading state */}
        {statsLoading ? <StatsSkeleton /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statsData.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
        )}

        {/* Quick Actions - Modernized */}
        {canCreate && (
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Quick Actions</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CreatePostDialog />
                {isAdmin && <CreateEventDialog />}
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 py-4 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200" 
                  onClick={() => navigate('/chat')}
                >
                  <div className="p-2 rounded-lg bg-accent/10">
                    <MessageCircle className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-xs font-medium">Start Chat</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 py-4 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 md:hidden" 
                  onClick={() => navigate('/ai-studio')}
                >
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Lightbulb className="h-5 w-5 text-violet-500" />
                  </div>
                  <span className="text-xs font-medium">AI Studio</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Feed - With header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-xl">Community Feed</h2>
              <p className="text-xs text-muted-foreground">Latest updates from your community</p>
            </div>
            {canCreate && <CreatePostDialog />}
          </div>
          <CombinedFeed />
        </div>
      </div>
    </div>
  );
}
