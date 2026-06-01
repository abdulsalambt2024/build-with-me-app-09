import { useAuth } from '@/contexts/AuthContext';
import { Home, FileText, Calendar, MessageCircle, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const { role } = useAuth();
  const canSeeChat = role && ['member', 'admin', 'super_admin'].includes(role);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/posts', icon: FileText, label: 'Posts' },
    { to: '/events', icon: Calendar, label: 'Events' },
    ...(canSeeChat ? [{ to: '/chat', icon: MessageCircle, label: 'Chat' }] : []),
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <div className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-medium transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200',
                  isActive && 'bg-primary/10 scale-110'
                )}>
                  <item.icon className={cn(
                    'h-[18px] w-[18px] transition-all duration-200',
                    isActive && 'text-primary'
                  )} />
                </div>
                <span>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
