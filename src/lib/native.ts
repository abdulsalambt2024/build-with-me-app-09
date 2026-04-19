import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

// Deep-link redirect target used by Supabase OAuth on native (Android/iOS).
// Must match the AndroidManifest intent-filter and Supabase Redirect URLs.
export const NATIVE_AUTH_REDIRECT = 'parivartan://auth-callback';

export const getOAuthRedirectTo = (): string =>
  isNativePlatform() ? NATIVE_AUTH_REDIRECT : `${window.location.origin}/`;
