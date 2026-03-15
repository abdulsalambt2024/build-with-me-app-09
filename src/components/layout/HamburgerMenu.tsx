import { X, Award, Bell, Heart, Palette, Settings, Users, HelpCircle, LogOut, BookOpen, ChevronRight } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import parivartanLogo from '@/assets/parivartan-logo.png';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { to: '/members', icon: Users, label: 'All Members' },
  { to: '/achievements', icon: Award, label: 'Achievements' },
  { to: '/announcements', icon: Bell, label: 'Announcements' },
  { to: '/donations', icon: Heart, label: 'Donations' },
  { to: '/ai-studio', icon: Palette, label: 'AI Studio', badge: 'Members' },
  { to: '/admin', icon: Users, label: 'Admin Panel', badge: 'Admin' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/guide', icon: BookOpen, label: 'App Guide' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
];

export function HamburgerMenu({ isOpen, onClose }: HamburgerMenuProps) {
  const { signOut } = useAuth();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 w-[300px] bg-card z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden shadow-elevated',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-sm">P</span>
              </div>
              <div>
                <h2 className="font-heading font-bold text-base">Parivartan</h2>
                <p className="text-[10px] text-muted-foreground font-medium">Community Platform</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-3">
            <nav className="space-y-0.5 px-3">
              {menuItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={onClose}>
                  {({ isActive }) => (
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'hover:bg-muted text-foreground'
                    )}>
                      <item.icon className="h-[18px] w-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        )}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 opacity-40',
                        isActive && 'opacity-70'
                      )} />
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>

            <Separator className="my-3 mx-3" />

            <nav className="space-y-0.5 px-3">
              {bottomItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={onClose}>
                  {({ isActive }) => (
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'hover:bg-muted text-foreground'
                    )}>
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-medium"
              onClick={() => { signOut(); onClose(); }}
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
