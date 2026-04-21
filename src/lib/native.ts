import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

// Deep-link redirect targets used by Supabase OAuth on native (Android/iOS).
// Android: verified App Link (https://) — survives Android 12+ restrictions.
// iOS: custom URL scheme (parivartan://) registered in Info.plist.
// Both must be added to Supabase Auth → URL Configuration → Redirect URLs.
export const ANDROID_AUTH_REDIRECT = 'https://beinghayat-parivartan.lovable.app/auth-callback';
export const IOS_AUTH_REDIRECT = 'parivartan://auth-callback';

export const getOAuthRedirectTo = (): string => {
  if (!isNativePlatform()) return `${window.location.origin}/`;
  return Capacitor.getPlatform() === 'ios' ? IOS_AUTH_REDIRECT : ANDROID_AUTH_REDIRECT;
};
