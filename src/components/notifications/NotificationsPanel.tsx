import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bell,
  Check,
  Award,
  MessageSquare,
  Calendar,
  ClipboardList,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  related_id: string | null;
}

const typeIcons: Record<string, ReactNode> = {
  achievement: <Award className="h-4 w-4 text-primary" />,
  announcement: <MessageSquare className="h-4 w-4 text-primary" />,
  event: <Calendar className="h-4 w-4 text-primary" />,
  task: <ClipboardList className="h-4 w-4 text-primary" />,
};

export function NotificationsPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    const items = (data as Notification[]) || [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.read).length);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);

    if (error) {
      toast.error('Failed to mark as read');
      return;
    }

    fetchNotifications();
  };

  const markAsUnread = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: false }).eq('id', id);

    if (error) {
      toast.error('Failed to mark as unread');
      return;
    }

    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to delete notification');
      return;
    }

    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      toast.error('Failed to mark all as read');
      return;
    }

    fetchNotifications();
    toast.success('All marked as read');
  };

  const filteredNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [filter, notifications]
  );

  const groupedNotifications = useMemo(
    () =>
      filteredNotifications.reduce((acc, n) => {
        const type = n.type || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(n);
        return acc;
      }, {} as Record<string, Notification[]>),
    [filteredNotifications]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="top-0 left-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0">
        <DialogHeader className="border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="text-base">Notifications</DialogTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="h-7 px-3 text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="h-7 px-3 text-xs">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {unreadCount > 0 && (
          <div className="border-b px-4 py-2">
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
              <CheckCircle className="mr-1 h-3 w-3" />
              Mark all as read
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedNotifications).map(([type, items]) => (
                <div key={type}>
                  <div className="flex items-center gap-2 bg-muted/30 px-4 py-2">
                    {typeIcons[type] || <Bell className="h-3 w-3" />}
                    <span className="text-xs font-medium capitalize">{type}s</span>
                    <Badge variant="secondary" className="ml-auto h-4 text-[10px]">
                      {items.length}
                    </Badge>
                  </div>

                  {items.map((notification) => (
                    <div
                      key={notification.id}
                      className={`cursor-pointer px-4 py-3 transition-colors hover:bg-muted/40 ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{notification.title}</p>
                            {!notification.read && (
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              notification.read
                                ? markAsUnread(notification.id)
                                : markAsRead(notification.id);
                            }}
                            aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {notification.read ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
