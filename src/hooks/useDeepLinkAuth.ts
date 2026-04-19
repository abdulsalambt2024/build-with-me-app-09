import { useEffect } from 'react';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/lib/native';
import { toast } from '@/hooks/use-toast';

/**
 * Handles Supabase OAuth deep-link callbacks on native (Capacitor) builds.
 * - Listens for `parivartan://auth-callback#access_token=...&refresh_token=...`
 * - Restores the Supabase session via setSession()
 * - Closes the in-app browser tab and routes the user home
 *
 * No-op on web — browser flow keeps working unchanged.
 */
export function useDeepLinkAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;

    const setup = async () => {
      handle = await App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
        try {
          const url = new URL(event.url);
          // Tokens may arrive in the hash (implicit) or query (PKCE) depending on Supabase settings.
          const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
          const queryParams = url.searchParams;

          const access_token = hashParams.get('access_token') ?? queryParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
          const code = queryParams.get('code');
          const errorDesc = hashParams.get('error_description') ?? queryParams.get('error_description');

          if (errorDesc) {
            toast({ title: 'Sign-in failed', description: errorDesc, variant: 'destructive' });
            await Browser.close().catch(() => {});
            return;
          }

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          } else if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          } else {
            return; // Not an auth callback — ignore.
          }

          await Browser.close().catch(() => {});
          toast({ title: 'Welcome back!', description: "You've successfully signed in." });
          navigate('/');
        } catch (err: any) {
          toast({
            title: 'Sign-in failed',
            description: err?.message ?? 'Could not complete sign-in.',
            variant: 'destructive',
          });
        }
      });
    };

    setup();
    return () => {
      handle?.remove();
    };
  }, [navigate]);
}
