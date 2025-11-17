import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Heart, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Slideshow } from '@/components/home/Slideshow';
import { RecentActivities } from '@/components/home/RecentActivities';

export default function Home() {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const canCreate = role && ['member', 'admin', 'super_admin'].includes(role);
  const isAdmin = role && ['admin', 'super_admin'].includes(role);

  return (
    <div className="container max-w-7xl mx-auto p-4 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">Welcome to PARIVARTAN</h1>
        <p className="text-lg font-medium text-primary">ENLIGHTEN A CHILD, DISCOVER A PERSONALITY</p>
      </div>

      {/* Slideshow */}
      <Slideshow />

      {/* Quick Actions */}
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              className="h-24 flex-col gap-2"
              onClick={() => navigate('/posts')}
            >
              <Plus className="h-6 w-6" />
              <span>New Post</span>
            </Button>
            {isAdmin && (
              <Button 
                variant="secondary" 
                className="h-24 flex-col gap-2"
                onClick={() => navigate('/events')}
              >
                <Calendar className="h-6 w-6" />
                <span>Create Event</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2"
              onClick={() => navigate('/donations')}
            >
              <Heart className="h-6 w-6" />
              <span>Donate</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2"
              onClick={() => navigate('/announcements')}
            >
              <Megaphone className="h-6 w-6" />
              <span>Announcements</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      <RecentActivities />
    </div>
  );
}
