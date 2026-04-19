import { useDeepLinkAuth } from '@/hooks/useDeepLinkAuth';

/** Mounts native deep-link OAuth handling. Renders nothing on web. */
export function DeepLinkAuthListener() {
  useDeepLinkAuth();
  return null;
}
