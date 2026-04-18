import { useState, useEffect } from 'react';
import { Bell, X, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [storageGranted, setStorageGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Check storage persistence
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      navigator.storage.persisted().then(setStorageGranted);
    }
  }, []);

  useEffect(() => {
    if (!user || !isSupported) return;
    const key = `perm-prompt-dismissed-${user.id}`;
    const wasDismissed = localStorage.getItem(key);
    const needsNotif = !isSubscribed && permission !== 'denied';
    const needsStorage = storageGranted === false;
    if (!wasDismissed && (needsNotif || needsStorage)) {
      const timer = setTimeout(() => setDismissed(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isSubscribed, permission, storageGranted]);

  const handleEnableAll = async () => {
    // Notifications
    if (!isSubscribed && permission !== 'denied') {
      await subscribe();
    }
    // Storage
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        setStorageGranted(granted);
        if (granted) toast.success('Local storage enabled for offline use');
      } catch {/* ignore */}
    }
    setDismissed(true);
    if (user) localStorage.setItem(`perm-prompt-dismissed-${user.id}`, 'true');
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (user) localStorage.setItem(`perm-prompt-dismissed-${user.id}`, 'true');
  };

  const needsNotif = isSupported && !isSubscribed && permission !== 'denied';
  const needsStorage = storageGranted === false;
  if (dismissed || (!needsNotif && !needsStorage)) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 animate-in slide-in-from-top-4 duration-500">
      <Card className="max-w-lg mx-auto border-0 shadow-2xl bg-gradient-to-r from-primary/10 via-card to-primary/5 backdrop-blur-xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-primary/15 flex-shrink-0">
            {needsNotif ? <Bell className="h-5 w-5 text-primary animate-bounce" /> : <HardDrive className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Enable App Permissions</p>
            <p className="text-xs text-muted-foreground">
              {needsNotif && needsStorage ? 'Allow notifications & local storage for the best experience.' :
               needsNotif ? 'Get notified about posts, events & messages.' :
               'Allow local storage so the app works offline.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" onClick={handleEnableAll} className="h-8 text-xs px-3">
              Allow
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
