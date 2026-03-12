import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const getServiceWorkerRegistration = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    let registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
    }

    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration || !(registration as ServiceWorkerRegistration).pushManager) {
        setIsSubscribed(false);
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    }
  }, [getServiceWorkerRegistration, user]);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [checkSubscription, user]);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        return false;
      }

      const registration = await getServiceWorkerRegistration();
      if (!registration || !registration.pushManager) {
        toast({
          title: 'Service Worker Error',
          description: 'Push service could not be initialized.',
          variant: 'destructive',
        });
        return false;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        }));

      const subscriptionJSON = subscription.toJSON();

      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint || '',
        p256dh: subscriptionJSON.keys?.p256dh || '',
        auth: subscriptionJSON.keys?.auth || '',
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive push notifications.',
      });
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications.',
        variant: 'destructive',
      });
      return false;
    }
  }, [getServiceWorkerRegistration, isSupported, toast, user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = registration?.pushManager
        ? await registration.pushManager.getSubscription()
        : null;

      if (subscription) {
        await subscription.unsubscribe();
      }

      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

      setIsSubscribed(false);
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      });
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable notifications.',
        variant: 'destructive',
      });
      return false;
    }
  }, [getServiceWorkerRegistration, toast, user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
