import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, Monitor, Bell, Lock, Palette, Sparkles } from 'lucide-react';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { useState } from 'react';
import { toast } from 'sonner';

const themes = [
  { id: 'light', name: 'Light', icon: Sun, preview: 'bg-white border' },
  { id: 'dark', name: 'Dark', icon: Moon, preview: 'bg-slate-900 border-slate-700' },
  { id: 'system', name: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-white to-slate-900' },
];

const colorSchemes = [
  { id: 'default', name: 'Indigo', color: 'bg-indigo-500' },
  { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
  { id: 'rose', name: 'Rose', color: 'bg-rose-500' },
  { id: 'amber', name: 'Amber', color: 'bg-amber-500' },
  { id: 'violet', name: 'Violet', color: 'bg-violet-500' },
  { id: 'cyan', name: 'Cyan', color: 'bg-cyan-500' },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, role } = useAuth();
  const [colorScheme, setColorScheme] = useState('default');
  const [notifications, setNotifications] = useState({
    posts: true,
    events: true,
    tasks: true,
    achievements: true,
    chat: true,
    announcements: true,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    showActivity: true,
    showOnlineStatus: true,
  });

  // 2FA is available for all users except viewers
  const canUse2FA = role !== 'viewer';

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    toast.success('Setting updated');
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    toast.success('Setting updated');
  };

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    toast.success(`Color scheme changed to ${scheme}`);
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription className="text-xs">Customize how Parivartan looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(t => (
                <Button
                  key={t.id}
                  variant={theme === t.id ? 'default' : 'outline'}
                  onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                  className="flex flex-col gap-1 h-16 text-xs"
                  size="sm"
                >
                  <t.icon className="h-4 w-4" />
                  {t.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorSchemes.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleColorSchemeChange(c.id)}
                  className={`w-8 h-8 rounded-full ${c.color} transition-transform hover:scale-110 ${
                    colorScheme === c.id ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {canUse2FA && <TwoFactorAuth />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription className="text-xs">Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm capitalize">{key}</Label>
              <Switch
                checked={value}
                onCheckedChange={(checked) => handleNotificationChange(key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy
          </CardTitle>
          <CardDescription className="text-xs">Control your privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Profile Visibility</Label>
              <p className="text-xs text-muted-foreground">Others can view your profile</p>
            </div>
            <Switch
              checked={privacy.profileVisible}
              onCheckedChange={(checked) => handlePrivacyChange('profileVisible', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Show Email</Label>
              <p className="text-xs text-muted-foreground">Display email in profile</p>
            </div>
            <Switch
              checked={privacy.showEmail}
              onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Show Activity</Label>
              <p className="text-xs text-muted-foreground">Show recent activity</p>
            </div>
            <Switch
              checked={privacy.showActivity}
              onCheckedChange={(checked) => handlePrivacyChange('showActivity', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Online Status</Label>
              <p className="text-xs text-muted-foreground">Show when you're online</p>
            </div>
            <Switch
              checked={privacy.showOnlineStatus}
              onCheckedChange={(checked) => handlePrivacyChange('showOnlineStatus', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}