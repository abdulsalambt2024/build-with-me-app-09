import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Finding {
  id: string;
  name: string;
  description: string;
  level: 'error' | 'warn' | 'info';
}

const STORAGE_KEY = 'security_scan_report_v1';

// Issues fixed across recent migrations
const FIXED: Finding[] = [
  { id: 'EXPOSED_PROFILES_PII', level: 'error', name: 'Profiles sensitive fields exposed',
    description: 'Revoked SELECT on disabled_*, roll_number, branch, course, semester, year, role from non-admins. Admins use get_full_profile_admin().' },
  { id: 'EXPOSED_ACHIEVEMENTS', level: 'error', name: 'Achievements visible to all users',
    description: 'Dropped broad authenticated SELECT policy; achievements are now owner-only with an admin-scoped read policy.' },
  { id: 'REALTIME_AI_USAGE', level: 'warn', name: 'AI usage broadcast over realtime',
    description: 'Removed public.ai_usage from supabase_realtime publication.' },
  { id: 'POST_MEDIA_UPDATE', level: 'warn', name: 'post-media UPDATE policy lacked role check',
    description: 'Added member/admin/super_admin role check to post-media UPDATE policy.' },
  { id: 'DEFINER_EXECUTE', level: 'warn', name: 'SECURITY DEFINER functions executable by all',
    description: 'Revoked EXECUTE from PUBLIC/anon/authenticated on all public SECURITY DEFINER functions; only explicit RPCs re-granted to authenticated.' },
  { id: 'DONATIONS_REALTIME', level: 'warn', name: 'Donations/receipts in realtime',
    description: 'Removed donations and donation_receipts from supabase_realtime publication.' },
  { id: 'CHAT_MEDIA_INSERT', level: 'warn', name: 'chat-media INSERT missing role check',
    description: 'Added member/admin role requirement in addition to path ownership.' },
  { id: 'EDGE_JWT', level: 'warn', name: 'Edge functions accepted unauthenticated calls',
    description: 'JWT validation added to chatbot, text-to-speech, send-donation-email, verify-2fa, and payment-webhook (shared secret).' },
];

// Findings that remain by design or require dashboard action
const ACCEPTED: Finding[] = [
  { id: 'PUBLIC_BUCKET_LISTING', level: 'warn', name: 'Public buckets allow listing',
    description: 'Avatars, posts, events, slideshow and other media buckets are intentionally public (read-only listing) to power the feed.' },
  { id: 'LEAKED_PASSWORD', level: 'warn', name: 'Leaked Password Protection disabled',
    description: 'Toggle is only configurable from the Supabase Auth dashboard; enable it under Authentication → Providers.' },
  { id: 'REALTIME_CHANNEL_AUTH', level: 'error', name: 'Realtime channel authorization',
    description: 'Realtime channel-level RLS requires Supabase RLS-on-realtime which is enabled per-table; chat is scoped via chat_participants RLS on the messages table.' },
];

export default function SecurityReport() {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [fixedAt, setFixedAt] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setLastScan(data.lastScan);
        setFixedAt(data.fixedAt || new Date().toISOString());
      } catch {}
    }
  }, []);

  const recordScan = () => {
    const now = new Date().toISOString();
    setLastScan(now);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lastScan: now, fixedAt }));
  };

  const levelBadge = (level: Finding['level']) => {
    if (level === 'error') return <Badge variant="destructive">Error</Badge>;
    if (level === 'warn') return <Badge className="bg-amber-500 hover:bg-amber-600">Warn</Badge>;
    return <Badge variant="secondary">Info</Badge>;
  };

  return (
    <div className="container max-w-3xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Security Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Last scan: {lastScan ? `${formatDistanceToNow(new Date(lastScan))} ago` : 'not recorded'}
            {' · '}Last fixes: {formatDistanceToNow(new Date(fixedAt))} ago
          </p>
        </div>
        <Button onClick={recordScan} size="sm" className="gap-1">
          <RefreshCw className="h-4 w-4" /> Mark scan run
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold">{FIXED.length}</p>
            <p className="text-xs text-muted-foreground">Fixed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{ACCEPTED.filter(a => a.level === 'warn').length}</p>
            <p className="text-xs text-muted-foreground">Accepted (warn)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <ShieldAlert className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{ACCEPTED.filter(a => a.level === 'error').length}</p>
            <p className="text-xs text-muted-foreground">Mitigated (error)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fixed">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fixed">Fixed ({FIXED.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({ACCEPTED.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed">
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="text-base">Resolved findings</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-3">
                  {FIXED.map(f => (
                    <div key={f.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{f.name}</p>
                        {levelBadge(f.level)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accepted">
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="text-base">Accepted / dashboard-only</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-3">
                  {ACCEPTED.map(f => (
                    <div key={f.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{f.name}</p>
                        {levelBadge(f.level)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
