import { Card, CardContent } from '@/components/ui/card';
import { Award, Trophy } from 'lucide-react';

export default function Achievements() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container max-w-6xl mx-auto p-4 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Achievements</h1>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <Award className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Achievements Coming Soon</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              This feature is being redesigned. Stay tuned for a better experience!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
