import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, MessageCircle, Calendar, FileText, Trophy, Bell, Settings, Shield, Sparkles, Heart } from 'lucide-react';

const guideContent = {
  viewer: [
    { icon: FileText, title: 'Browse Posts', description: 'View community posts, like and comment on content shared by members.' },
    { icon: Calendar, title: 'View Events', description: 'Check upcoming community events and RSVP to attend.' },
    { icon: Bell, title: 'Announcements', description: 'Stay updated with important announcements from admins.' },
    { icon: Users, title: 'All Members', description: 'Browse the community directory and view member profiles.' },
    { icon: Trophy, title: 'Achievements', description: 'View your earned achievement badges and milestones.' },
    { icon: Settings, title: 'Settings', description: 'Customize notifications, privacy, and app appearance.' },
  ],
  member: [
    { icon: FileText, title: 'Create Posts', description: 'Share text, images, and media with the community. Your posts appear in the feed.' },
    { icon: MessageCircle, title: 'Chat', description: 'Send messages in the community chat. Share images, documents, and react to messages.' },
    { icon: Calendar, title: 'Events', description: 'View and RSVP to events. Get reminders for upcoming activities.' },
    { icon: Sparkles, title: 'AI Studio', description: 'Use AI tools to generate images, enhance photos, and create posters.' },
    { icon: Heart, title: 'Donations', description: 'Support community campaigns and track donation progress.' },
    { icon: Trophy, title: 'Earn Badges', description: 'Complete tasks, attend events, and engage to earn achievement badges.' },
  ],
  admin: [
    { icon: Users, title: 'User Management', description: 'View all users. Admins can change roles for viewers and members.' },
    { icon: FileText, title: 'Content Moderation', description: 'Review reported content and manage community posts.' },
    { icon: Calendar, title: 'Create Events', description: 'Organize events with posters, registration links, and attendee management.' },
    { icon: Bell, title: 'Announcements', description: 'Create priority-based announcements visible to all users.' },
    { icon: Shield, title: 'Admin Panel', description: 'Access attendance, analytics, slideshow manager, and task assignment.' },
    { icon: Sparkles, title: 'AI Studio & Chat', description: 'Full access to AI tools and community chat features.' },
  ],
  super_admin: [
    { icon: Shield, title: 'Full Control', description: 'Complete access to all features including user deletion, password resets, and system configuration.' },
    { icon: Users, title: 'User Management', description: 'Add, delete, disable users. Reset passwords and manage all roles.' },
    { icon: Trophy, title: 'Achievement Awards', description: 'Create custom badges and award them to any member with notifications.' },
    { icon: Bell, title: 'Popup Messages', description: 'Schedule popups for announcements, birthdays, and festivals.' },
    { icon: FileText, title: 'Audit Logs', description: 'Monitor all administrative actions with detailed audit trails.' },
    { icon: Settings, title: 'System Settings', description: 'Configure app-wide settings, manage chatbot FAQ, and error logs.' },
  ],
};

export default function AppGuide() {
  const { role } = useAuth();
  const userRole = role || 'viewer';
  const guide = guideContent[userRole as keyof typeof guideContent] || guideContent.viewer;

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'member': return 'Member';
      default: return 'Viewer';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary shadow-lg">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Application Guide</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Personalized for your role:</p>
              <Badge variant="secondary" className="text-xs">{getRoleLabel(userRole)}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {guide.map((item, i) => (
            <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4 flex gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 h-fit shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-lg bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact us at{' '}
              <a href="mailto:hayatamr9608@gmail.com" className="text-primary hover:underline">hayatamr9608@gmail.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
