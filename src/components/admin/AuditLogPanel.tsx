import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, UserCog, Ban, CheckCircle, Trash2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
  actor_profile?: { full_name: string | null } | null;
  target_profile?: { full_name: string | null } | null;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'role_change':
      return <UserCog className="h-4 w-4" />;
    case 'user_disabled':
      return <Ban className="h-4 w-4" />;
    case 'user_enabled':
      return <CheckCircle className="h-4 w-4" />;
    case 'user_deleted':
      return <Trash2 className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'role_change':
      return 'bg-blue-500/10 text-blue-600';
    case 'user_disabled':
      return 'bg-amber-500/10 text-amber-600';
    case 'user_enabled':
      return 'bg-green-500/10 text-green-600';
    case 'user_deleted':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const formatActionDescription = (log: AuditLog) => {
  switch (log.action_type) {
    case 'role_change':
      return `Changed role from ${log.old_value?.role || 'none'} to ${log.new_value?.role}`;
    case 'user_disabled':
      return `Disabled account${log.new_value?.reason ? `: ${log.new_value.reason}` : ''}`;
    case 'user_enabled':
      return 'Enabled account';
    case 'user_deleted':
      return 'Permanently deleted user';
    default:
      return log.action_type.replace(/_/g, ' ');
  }
};

export function AuditLogPanel() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch actor and target profiles
      const actorIds = [...new Set(data.map(l => l.actor_id).filter(Boolean))];
      const targetIds = [...new Set(data.map(l => l.target_id).filter(Boolean))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', [...actorIds, ...targetIds]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(log => ({
        ...log,
        actor_profile: profileMap.get(log.actor_id),
        target_profile: profileMap.get(log.target_id),
      })) as AuditLog[];
    },
    staleTime: 1000 * 60,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {logs && logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-0"
                >
                  <div className={`p-2 rounded-full ${getActionColor(log.action_type)}`}>
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {log.actor_profile?.full_name || 'System'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.action_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatActionDescription(log)}
                      {log.target_profile && (
                        <> for <strong>{log.target_profile.full_name}</strong></>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No audit logs yet
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
