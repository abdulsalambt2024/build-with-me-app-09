import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme, ColorScheme } from '@/contexts/ColorSchemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, Monitor, Bell, Lock, Palette, Check, Sparkles, Shield, Eye, Mail, Activity, Wifi } from 'lucide-react';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const themes = [
  { id: 'light', name: 'Light', icon: Sun, description: 'Bright & clean' },
  { id: 'dark', name: 'Dark', icon: Moon, description: 'Easy on eyes' },
  { id: 'system', name: 'Auto', icon: Monitor, description: 'Match device' },
];

const colorSchemes: { id: ColorScheme; name: string; color: string; gradient: string }[] = [
  { id: 'indigo', name: 'Indigo', color: '#6366F1', gradient: 'from-indigo-400 to-indigo-600' },
  { id: 'emerald', name: 'Emerald', color: '#10B981', gradient: 'from-emerald-400 to-emerald-600' },
  { id: 'rose', name: 'Rose', color: '#F43F5E', gradient: 'from-rose-400 to-rose-600' },
  { id: 'amber', name: 'Amber', color: '#F59E0B', gradient: 'from-amber-400 to-amber-600' },
  { id: 'violet', name: 'Violet', color: '#8B5CF6', gradient: 'from-violet-400 to-violet-600' },
  { id: 'cyan', name: 'Cyan', color: '#06B6D4', gradient: 'from-cyan-400 to-cyan-600' },
  { id: 'blue', name: 'Blue', color: '#3B82F6', gradient: 'from-blue-400 to-blue-600' },
  { id: 'orange', name: 'Orange', color: '#F97316', gradient: 'from-orange-400 to-orange-600' },
];

const notificationItems = [
  { key: 'posts', label: 'Posts', description: 'New posts from your community', icon: Activity },
  { key: 'events', label: 'Events', description: 'Event reminders & updates', icon: Bell },
  { key: 'tasks', label: 'Tasks', description: 'Task assignments & deadlines', icon: Check },
  { key: 'achievements', label: 'Achievements', description: 'Badge unlocks & rewards', icon: Sparkles },
  { key: 'chat', label: 'Messages', description: 'Direct & group messages', icon: Mail },
  { key: 'announcements', label: 'Announcements', description: 'Important announcements', icon: Bell },
];

const privacyItems = [
  { key: 'profileVisible', label: 'Profile Visibility', description: 'Allow others to view your profile', icon: Eye },
  { key: 'showEmail', label: 'Show Email', description: 'Display email on your profile', icon: Mail },
  { key: 'showActivity', label: 'Activity Status', description: 'Show your recent activity', icon: Activity },
  { key: 'showOnlineStatus', label: 'Online Status', description: 'Show when you are online', icon: Wifi },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { role } = useAuth();
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

  const canUse2FA = role !== 'viewer';

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    toast.success('Notification preference updated');
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    toast.success('Privacy setting updated');
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    toast.success(`Theme color changed to ${scheme}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container max-w-2xl mx-auto p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="space-y-1 pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Personalize your Parivartan experience</p>
        </div>

        {/* Theme Mode Section */}
        <Card className="overflow-hidden border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription className="text-xs">Choose your preferred theme</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Theme Mode</Label>
              <div className="grid grid-cols-3 gap-3">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                      theme === t.id
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                    )}
                  >
                    {theme === t.id && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      'p-2.5 rounded-lg transition-colors',
                      theme === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/10'
                    )}>
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scheme */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Accent Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorSchemes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleColorSchemeChange(c.id)}
                    className={cn(
                      'group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                      colorScheme === c.id
                        ? 'border-primary shadow-md scale-[1.02]'
                        : 'border-transparent hover:border-muted-foreground/20 hover:scale-[1.02]'
                    )}
                  >
                    <div 
                      className={cn(
                        'w-10 h-10 rounded-full bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110',
                        c.gradient
                      )}
                    >
                      {colorScheme === c.id && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Check className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2FA Section */}
        {canUse2FA && <TwoFactorAuth />}

        {/* Notifications Section */}
        <Card className="overflow-hidden border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary/10">
                <Bell className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription className="text-xs">Control what notifications you receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {notificationItems.map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium cursor-pointer">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => handleNotificationChange(item.key, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Section */}
        <Card className="overflow-hidden border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-destructive/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Privacy & Security</CardTitle>
                <CardDescription className="text-xs">Manage your privacy preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {privacyItems.map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium cursor-pointer">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={privacy[item.key as keyof typeof privacy]}
                    onCheckedChange={(checked) => handlePrivacyChange(item.key, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-muted-foreground">Parivartan MIET v1.0.0</p>
          <p className="text-[10px] text-muted-foreground/70">Made with ❤️ for MIET Community</p>
        </div>
      </div>
    </div>
  );
}
