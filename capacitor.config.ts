import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.5ad419b6507a44e881e827716f177f32',
  appName: 'beinghayat-parivartan',
  webDir: 'dist',
  server: {
    url: 'https://5ad419b6-507a-44e8-81e8-27716f177f32.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    App: {
      // Deep link scheme handled by AndroidManifest intent-filter:
      //   parivartan://auth-callback
    },
  },
};

export default config;
