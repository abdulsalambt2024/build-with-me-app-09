import { Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full glass-strong">
      <div className="flex h-14 items-center justify-between px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden h-9 w-9 rounded-xl hover:bg-primary/10"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-soft">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-heading font-bold text-gradient-primary">
              Parivartan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <NotificationsPanel />
        </div>
      </div>
    </header>
  );
}
