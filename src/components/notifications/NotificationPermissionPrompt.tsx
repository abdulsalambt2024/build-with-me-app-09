import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user || !isSupported || isSubscribed || permission === 'denied') return;
    const key = `notif-prompt-dismissed-${user.id}`;
    const wasDismissed = localStorage.getItem(key);
    if (!wasDismissed) {
      // Show after a short delay so it doesn't block initial load
      const timer = setTimeout(() => setDismissed(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    await subscribe();
    setDismissed(true);
    if (user) localStorage.setItem(`notif-prompt-dismissed-${user.id}`, 'true');
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (user) localStorage.setItem(`notif-prompt-dismissed-${user.id}`, 'true');
  };

  if (dismissed || !isSupported || isSubscribed || permission === 'denied') return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 animate-in slide-in-from-top-4 duration-500">
      <Card className="max-w-lg mx-auto border-0 shadow-2xl bg-gradient-to-r from-primary/10 via-card to-primary/5 backdrop-blur-xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-primary/15 flex-shrink-0">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Stay Updated!</p>
            <p className="text-xs text-muted-foreground">Get notified about posts, events, tasks & more even when the app is closed.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" onClick={handleEnable} className="h-8 text-xs px-3">
              Enable
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
