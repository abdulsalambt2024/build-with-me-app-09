import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trophy, Megaphone, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FeedItem {
  id: string;
  type: 'post' | 'achievement' | 'announcement' | 'event';
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  avatar_url?: string;
  media_urls?: string[];
  priority?: string;
  event_date?: string;
  likes_count?: number;
  comments_count?: number;
}

export function CombinedFeed() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const canEdit = role !== 'viewer';
  const isSuperAdmin = role === 'super_admin';

  const { data: feedItems, isLoading, refetch } = useQuery({
    queryKey: ['combined-feed'],
    queryFn: async () => {
      const [postsRes, achievementsRes, announcementsRes, eventsRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('achievements').select('*').order('earned_at', { ascending: false }).limit(10),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('events').select('*').order('event_date', { ascending: false }).limit(10)
      ]);

      const userIds = new Set<string>();
      postsRes.data?.forEach(p => userIds.add(p.user_id));
      achievementsRes.data?.forEach(a => userIds.add(a.user_id));
      announcementsRes.data?.forEach(a => userIds.add(a.created_by));
      eventsRes.data?.forEach(e => userIds.add(e.created_by));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const items: FeedItem[] = [
        ...(postsRes.data?.map(p => ({
          id: p.id,
          type: 'post' as const,
          title: p.title,
          content: p.content,
          created_at: p.created_at,
          user_id: p.user_id,
          user_name: profileMap.get(p.user_id)?.full_name || 'Unknown',
          avatar_url: profileMap.get(p.user_id)?.avatar_url,
          media_urls: p.media_urls,
          likes_count: p.likes_count,
          comments_count: p.comments_count
        })) || []),
        ...(achievementsRes.data?.map(a => ({
          id: a.id,
          type: 'achievement' as const,
          title: a.title,
          content: a.description || '',
          created_at: a.earned_at || new Date().toISOString(),
          user_id: a.user_id,
          user_name: profileMap.get(a.user_id)?.full_name || 'Unknown',
          avatar_url: profileMap.get(a.user_id)?.avatar_url
        })) || []),
        ...(announcementsRes.data?.map(a => ({
          id: a.id,
          type: 'announcement' as const,
          title: a.title,
          content: a.content,
          created_at: a.created_at,
          user_id: a.created_by,
          user_name: profileMap.get(a.created_by)?.full_name || 'Admin',
          avatar_url: profileMap.get(a.created_by)?.avatar_url,
          priority: a.priority
        })) || []),
        ...(eventsRes.data?.map(e => ({
          id: e.id,
          type: 'event' as const,
          title: e.title,
          content: e.description,
          created_at: e.created_at,
          user_id: e.created_by,
          user_name: profileMap.get(e.created_by)?.full_name || 'Admin',
          avatar_url: profileMap.get(e.created_by)?.avatar_url,
          event_date: e.event_date
        })) || [])
      ];

      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  });

  const handleDelete = async (item: FeedItem) => {
    const canDelete = item.user_id === user?.id || isSuperAdmin || (role === 'admin' && item.type !== 'event');
    if (!canDelete) return;

    let error;
    switch (item.type) {
      case 'post':
        ({ error } = await supabase.from('posts').delete().eq('id', item.id));
        break;
      case 'achievement':
        ({ error } = await supabase.from('achievements').delete().eq('id', item.id));
        break;
      case 'announcement':
        ({ error } = await supabase.from('announcements').delete().eq('id', item.id));
        break;
      case 'event':
        ({ error } = await supabase.from('events').delete().eq('id', item.id));
        break;
    }
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Item removed successfully' });
      refetch();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageCircle className="h-4 w-4" />;
      case 'achievement': return <Trophy className="h-4 w-4" />;
      case 'announcement': return <Megaphone className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string, priority?: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      post: 'secondary',
      achievement: 'default',
      announcement: priority === 'high' ? 'destructive' : 'outline',
      event: 'default'
    };
    return (
      <Badge variant={variants[type]} className="gap-1">
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-12 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedItems?.map((item) => {
        const canModify = item.user_id === user?.id || isSuperAdmin || (role === 'admin' && item.type !== 'event');
        
        return (
          <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={item.avatar_url || undefined} />
                    <AvatarFallback>{item.user_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{item.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(item.type, item.priority)}
                  {canEdit && canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-muted-foreground line-clamp-3">{item.content}</p>
              
              {item.media_urls && item.media_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {item.media_urls.slice(0, 4).map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt="" 
                      className="rounded-lg object-cover aspect-video w-full"
                    />
                  ))}
                </div>
              )}

              {item.event_date && (
                <p className="text-sm text-primary font-medium">
                  📅 {new Date(item.event_date).toLocaleDateString()}
                </p>
              )}

              {item.type === 'post' && (
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Heart className="h-4 w-4" /> {item.likes_count || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <MessageCircle className="h-4 w-4" /> {item.comments_count || 0}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {(!feedItems || feedItems.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No content yet. Be the first to post!
          </CardContent>
        </Card>
      )}
    </div>
  );
}
