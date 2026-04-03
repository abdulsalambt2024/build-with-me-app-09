import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, MessageCircle, Calendar, FileText, Trophy, Bell, Settings, Shield, Sparkles, Heart, Eye, Lock, Smartphone, HelpCircle, Palette } from 'lucide-react';
import parivartanLogo from '@/assets/parivartan-logo.png';

const guideContent = {
  viewer: [
    { icon: FileText, title: 'Browse Posts', description: 'View community posts, like and comment on content shared by members.' },
    { icon: Calendar, title: 'View Events', description: 'Check upcoming community events and RSVP to attend.' },
    { icon: Bell, title: 'Announcements', description: 'Stay updated with important announcements from admins.' },
    { icon: Users, title: 'All Members', description: 'Browse the community directory and view member profiles.' },
    { icon: Trophy, title: 'Achievements', description: 'View your earned achievement badges and milestones.' },
    { icon: Settings, title: 'Settings', description: 'Customize notifications, privacy, and app appearance.' },
    { icon: Lock, title: 'Limited Access', description: 'Sign in with an account to unlock chat, AI Studio, and more features.' },
  ],
  member: [
    { icon: FileText, title: 'Create Posts', description: 'Share text, images, and media with the community. Your posts appear in the feed.' },
    { icon: MessageCircle, title: 'Community Chat', description: 'Send messages in the unified community chat. Share images, documents, voice notes and react to messages with emojis.' },
    { icon: Calendar, title: 'Events & RSVP', description: 'View and RSVP to events. Get reminders for upcoming activities and view event details.' },
    { icon: Sparkles, title: 'AI Studio', description: 'Use AI tools to generate images, enhance photos, and create posters for the community.' },
    { icon: Heart, title: 'Donations', description: 'Support community campaigns via UPI/QR payments and track donation progress.' },
    { icon: Trophy, title: 'Earn Badges', description: 'Complete tasks, attend events, and engage to earn achievement badges awarded by admins.' },
    { icon: Bell, title: 'Notifications', description: 'Receive push notifications for new announcements, events, tasks, and messages.' },
    { icon: Smartphone, title: 'PARI Assistant', description: 'Chat with PARI, your AI assistant. Ask questions, get help, and use voice input.' },
  ],
  admin: [
    { icon: Users, title: 'User Management', description: 'View all users, change roles for viewers and members, and monitor activity.' },
    { icon: FileText, title: 'Content Moderation', description: 'Review and moderate community posts, comments, and reported content.' },
    { icon: Calendar, title: 'Create Events', description: 'Organize events with posters, registration links, and manage attendee lists.' },
    { icon: Bell, title: 'Announcements', description: 'Create priority-based announcements (high/medium/low) visible to all users.' },
    { icon: Heart, title: 'Donation Campaigns', description: 'Create and manage fundraising campaigns with UPI integration and progress tracking.' },
    { icon: Shield, title: 'Admin Panel', description: 'Access attendance tracking, analytics dashboard, slideshow manager, task assignment, and FAQ editor.' },
    { icon: Sparkles, title: 'AI Studio & Chat', description: 'Full access to AI creative tools and community chat with moderation capabilities.' },
    { icon: Palette, title: 'Slideshow & Popups', description: 'Manage homepage slideshows and schedule popup messages for special occasions.' },
  ],
  super_admin: [
    { icon: Shield, title: 'Full Control', description: 'Complete access to all platform features including user deletion, password resets, and system configuration.' },
    { icon: Users, title: 'User Management', description: 'Add users manually, permanently delete accounts, disable/enable users, reset passwords, edit profiles, and assign any role.' },
    { icon: Trophy, title: 'Achievement Awards', description: 'Create custom achievement badges and award them to any member. Badges appear on their Achievements page.' },
    { icon: Bell, title: 'Popup & PARI Manager', description: 'Schedule popup messages and manage PARI assistant speech bubbles that rotate on the homepage.' },
    { icon: FileText, title: 'Audit Logs & Error Logs', description: 'Monitor all administrative actions with detailed audit trails and view application error logs.' },
    { icon: Settings, title: 'System Configuration', description: 'Manage chatbot FAQ knowledge base, badge designs, data tracking, and platform-wide settings.' },
    { icon: Lock, title: 'Security', description: 'Protected super admin accounts cannot be modified. All role changes are atomic with audit logging.' },
    { icon: HelpCircle, title: 'Support', description: 'Access complete help documentation and provide support to community members.' },
  ],
};

export default function AppGuide() {
  const { role, isGuest } = useAuth();
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

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'super_admin': return 'bg-destructive/10 text-destructive';
      case 'admin': return 'bg-primary/10 text-primary';
      case 'member': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img src={parivartanLogo} alt="Parivartan" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-xl font-heading font-bold">Application Guide</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Your role:</p>
              <Badge className={`text-xs ${getRoleColor(userRole)}`}>
                {isGuest ? '👁 Guest Viewer' : getRoleLabel(userRole)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Guest Banner */}
        {isGuest && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Eye className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">You're browsing as a Guest Viewer</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can view posts, events, and announcements. Sign in to unlock chat, AI Studio, and full community features.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guide Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {guide.map((item, i) => (
            <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-shadow animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
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

        {/* Quick Tips */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-heading font-bold text-sm">💡 Quick Tips</h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Use the bottom navigation to quickly switch between Home, Posts, Events, Chat, and Profile.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Tap PARI (the floating character) for instant AI assistance and quick replies.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Pull down on the home page to refresh content. Enable notifications in Settings for real-time updates.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Switch between light and dark mode in Settings for comfortable viewing.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* About Parivartan */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-heading font-bold text-sm">About Parivartan</h3>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>This application represents the work of a non-profit organization and social working committee dedicated to supporting students in rural areas who do not have access to quality education. The initiative focuses on providing learning opportunities, academic guidance, and educational resources to underprivileged students in villages, helping them build a better academic foundation and future.</p>
              <p>The initiative is operated and governed by Meerut Institute of Engineering and Technology (MIET), Meerut, Uttar Pradesh, which provides guidance and support for its activities and outreach programs.</p>
              <p>This application serves as a digital platform to connect volunteers, educators, and students, enabling easier access to educational support and community-driven learning initiatives.</p>
              <p className="font-medium text-foreground">All rights, credits, and ownership of this application belong to Abdul Salam (abdul.salam.bt.2024@miet.ac.in)</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm font-medium">Need help?</p>
            <p className="text-xs text-muted-foreground">
              Contact us at{' '}
              <a href="mailto:abdul.salam.bt.2024@miet.ac.in" className="text-primary hover:underline font-medium">abdul.salam.bt.2024@miet.ac.in</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}