import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOneSignal } from '@/hooks/useOneSignal';

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const oneSignal = useOneSignal();

  const subscribe = useCallback(async () => {
    if (!user) return false;
    try {
      const result = await oneSignal.subscribe();
      if (result) {
        toast({ title: 'Notifications Enabled', description: 'You will now receive push notifications.' });
      } else {
        toast({ title: 'Permission Denied', description: 'Please enable notifications in your browser settings.', variant: 'destructive' });
      }
      return result;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({ title: 'Error', description: 'Failed to enable notifications.', variant: 'destructive' });
      return false;
    }
  }, [oneSignal, toast, user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    try {
      const result = await oneSignal.unsubscribe();
      if (result) {
        toast({ title: 'Notifications Disabled', description: 'You will no longer receive push notifications.' });
      }
      return result;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({ title: 'Error', description: 'Failed to disable notifications.', variant: 'destructive' });
      return false;
    }
  }, [oneSignal, toast, user]);

  return {
    isSupported: oneSignal.isSupported,
    isSubscribed: oneSignal.isSubscribed,
    permission: oneSignal.permission,
    subscribe,
    unsubscribe,
  };
}
