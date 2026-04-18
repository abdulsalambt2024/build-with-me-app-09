import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BJzGZuJ5xKzLqXkX9rN7nQ0vY4mP5tH8sL2dF6gW3aE1cB4uI7yT0pR9oM2kJ5hN8wQ3xV6bC1nD7eS4aL0mK9j';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }).catch(() => {});
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast({ title: 'Permission Denied', description: 'Enable notifications in browser settings.', variant: 'destructive' });
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh || '',
        auth: json.keys?.auth || '',
      }, { onConflict: 'endpoint' });
      setIsSubscribed(true);
      toast({ title: 'Notifications Enabled', description: 'You will receive updates.' });
      return true;
    } catch (e) {
      console.error('Subscribe error:', e);
      toast({ title: 'Error', description: 'Could not enable notifications.', variant: 'destructive' });
      return false;
    }
  }, [user, isSupported, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
      setIsSubscribed(false);
      toast({ title: 'Notifications Disabled' });
      return true;
    } catch {
      return false;
    }
  }, [user, toast]);

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe };
}
