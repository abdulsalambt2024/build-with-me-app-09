import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AwardedBadge {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  badge_url: string | null;
  earned_at: string | null;
}

export default function Achievements() {
  const { user } = useAuth();

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['my-awarded-badges', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('id, title, description, category, badge_url, earned_at')
        .eq('user_id', user!.id)
        .eq('achievement_type', 'awarded')
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AwardedBadge[];
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto max-w-5xl space-y-6 p-4 pb-24">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">My Achievement Badges</h1>
            <p className="text-sm text-muted-foreground">
              Badges awarded to you by Super Admins appear here only.
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading badges...</CardContent>
          </Card>
        ) : badges.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
                <Award className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">No awarded badges yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Once a Super Admin awards you a badge, it will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <Card key={badge.id} className="overflow-hidden border-border/60">
                {badge.badge_url && (
                  <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                    <img
                      src={badge.badge_url}
                      alt={`${badge.title} badge`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">{badge.title}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {badge.category || 'custom'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {badge.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{badge.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Awarded {badge.earned_at ? new Date(badge.earned_at).toLocaleDateString() : '-'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
