import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ONESIGNAL_APP_ID = 'e3cf890a-22e9-4e34-bfc8-4362b82a53d0';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<string>('default');

  useEffect(() => {
    // Load OneSignal SDK
    if (document.getElementById('onesignal-sdk')) {
      setIsInitialized(true);
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred.push(async function(OneSignal: any) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: '/push/onesignal/' },
        serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
      });

      setIsInitialized(true);

      // Check subscription status
      const subscribed = await OneSignal.User.PushSubscription.optedIn;
      setIsSubscribed(!!subscribed);

      const perm = await OneSignal.Notifications.permission;
      setPermission(perm ? 'granted' : 'default');

      // Listen for subscription changes
      OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
        setIsSubscribed(!!event.current.optedIn);
      });
    });
  }, []);

  // Tag user with their ID for targeted notifications
  useEffect(() => {
    if (!isInitialized || !user?.id) return;
    
    window.OneSignalDeferred?.push(async function(OneSignal: any) {
      await OneSignal.login(user.id);
      await OneSignal.User.addTag('user_id', user.id);
      if (user.email) {
        await OneSignal.User.addEmail(user.email);
      }
    });
  }, [isInitialized, user?.id, user?.email]);

  const subscribe = useCallback(async () => {
    if (!isInitialized) return false;
    try {
      await window.OneSignal?.Notifications.requestPermission();
      await window.OneSignal?.User.PushSubscription.optIn();
      setIsSubscribed(true);
      setPermission('granted');
      return true;
    } catch (e) {
      console.error('OneSignal subscribe error:', e);
      return false;
    }
  }, [isInitialized]);

  const unsubscribe = useCallback(async () => {
    if (!isInitialized) return false;
    try {
      await window.OneSignal?.User.PushSubscription.optOut();
      setIsSubscribed(false);
      return true;
    } catch (e) {
      console.error('OneSignal unsubscribe error:', e);
      return false;
    }
  }, [isInitialized]);

  return {
    isSupported: isInitialized,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}
