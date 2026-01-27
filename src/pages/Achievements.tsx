import { useAchievements } from '@/hooks/useAchievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Trophy, Star, Zap, Target, Medal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { memo, useMemo } from 'react';

// Memoized achievement card for performance
const AchievementCard = memo(({ achievement }: { achievement: any }) => {
  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'task_completion': return Target;
      case 'post_engagement': return Zap;
      case 'event_attendance': return Star;
      default: return Trophy;
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'task_completion': return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
      case 'post_engagement': return 'from-blue-500/20 to-blue-500/5 border-blue-500/30';
      case 'event_attendance': return 'from-purple-500/20 to-purple-500/5 border-purple-500/30';
      default: return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
    }
  };

  const IconComponent = getCategoryIcon(achievement.category);

  return (
    <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br ${getCategoryColor(achievement.category)}`}>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          {achievement.category && (
            <Badge variant="secondary" className="capitalize text-xs bg-background/80 backdrop-blur-sm">
              {achievement.category.replace('_', ' ')}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg font-bold">{achievement.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {achievement.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {achievement.description}
          </p>
        )}
        
        {achievement.badge_url && (
          <div className="flex justify-center py-2">
            <img
              src={achievement.badge_url}
              alt={achievement.title}
              className="h-20 w-20 object-contain drop-shadow-lg"
              loading="lazy"
            />
          </div>
        )}

        {achievement.profiles && (
          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
              <AvatarImage src={achievement.profiles.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {achievement.profiles.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {achievement.profiles.full_name}
              </p>
              {achievement.earned_at && (
                <p className="text-xs text-muted-foreground">
                  Earned {new Date(achievement.earned_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
            <Medal className="h-5 w-5 text-amber-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AchievementCard.displayName = 'AchievementCard';

// Loading skeleton
const AchievementSkeleton = () => (
  <Card className="border-0 shadow-lg">
    <CardHeader className="space-y-3 pb-2">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
    </CardHeader>
    <CardContent className="space-y-4 pt-0">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center gap-3 pt-3 border-t">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Achievements() {
  const { user } = useAuth();
  const { data: achievements, isLoading } = useAchievements(user?.id);

  const stats = useMemo(() => {
    if (!achievements) return { total: 0, categories: {} };
    const categories: Record<string, number> = {};
    achievements.forEach((a: any) => {
      const cat = a.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return { total: achievements.length, categories };
  }, [achievements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container max-w-6xl mx-auto p-4 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <AchievementSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container max-w-6xl mx-auto p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Achievements</h1>
              <p className="text-sm text-muted-foreground">
                {stats.total} {stats.total === 1 ? 'badge' : 'badges'} earned
              </p>
            </div>
          </div>
        </div>

        {/* Achievement Grid */}
        {achievements && achievements.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement: any) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Award className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No achievements yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Keep participating in events, completing tasks, and engaging with posts to earn badges!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
