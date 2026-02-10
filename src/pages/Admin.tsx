import { useAuth } from '@/contexts/AuthContext';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BarChart3, Settings as SettingsIcon, Bug, CreditCard, CalendarCheck, Image, Shield, Bell, MessageSquare, ClipboardList, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const adminCards = [
    { title: 'User Management', description: 'Manage users and permissions', icon: Users, path: '/admin/users' },
    { title: 'Role Assignment', description: 'Assign roles to users', icon: UserCog, path: '/admin/roles' },
    { title: 'Task Assignment', description: 'Assign and manage tasks', icon: ClipboardList, path: '/admin/task-assignment' },
    { title: 'Content Moderation', description: 'Review and moderate content', icon: FileText, path: '/admin/moderation' },
    { title: 'Analytics', description: 'View engagement metrics', icon: BarChart3, path: '/admin/analytics' },
    { title: 'Attendance', description: 'Mark and track attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { title: 'Slideshow Manager', description: 'Manage homepage slideshow', icon: Image, path: '/admin/slideshow' },
    { title: 'Popup Messages', description: 'Schedule greetings', icon: Bell, path: '/admin/popups' },
    { title: 'Badge Management', description: 'Grant verification badges', icon: Shield, path: '/admin/badges' },
    { title: 'PARI FAQ Management', description: 'Customize chatbot knowledge', icon: MessageSquare, path: '/admin/chatbot-faq' },
    { title: 'Error Logs', description: 'Monitor application errors', icon: Bug, path: '/admin/errors' },
    { title: 'Payment Transactions', description: 'View and verify payments', icon: CreditCard, path: '/admin/payments' },
    { title: 'System Settings', description: 'Configure app settings', icon: SettingsIcon, path: '/admin/settings' },
  ];

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, content, and system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.path}
              className="hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate(card.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs">{card.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {role === 'super_admin' && (
        <Card className="mt-6 border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-600 dark:text-amber-400">Super Admin Access</CardTitle>
            <CardDescription>Full system access including user role management and system configuration.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
