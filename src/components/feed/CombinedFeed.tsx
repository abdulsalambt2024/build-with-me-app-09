import { useState, memo, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trophy, Megaphone, Calendar, MoreVertical, Pencil, Trash2, Share2, Pin, Send, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { VerifiedBadge } from '@/components/VerifiedBadge';

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
  is_pinned?: boolean;
  pinned_at?: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  created_at: string;
}

interface LikeUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

// Memoized feed item skeleton for loading state
const FeedItemSkeleton = memo(() => (
  <Card className="border-0 shadow-sm">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </CardContent>
  </Card>
));

FeedItemSkeleton.displayName = 'FeedItemSkeleton';

export function CombinedFeed() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'post' | 'achievement' | 'announcement'>('all');
  const [page, setPage] = useState(0);
  const [showLikesDialog, setShowLikesDialog] = useState<string | null>(null);
  const [showCommentsDialog, setShowCommentsDialog] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  
  const canEdit = role !== 'viewer';
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const pageSize = 15; // Reduced for faster initial load

  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: ['combined-feed', filter, page],
    queryFn: async () => {
      const queries = [];
      
      if (filter === 'all' || filter === 'post') {
        queries.push(
          supabase.from('posts')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('pinned_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)
        );
      }
      
      if (filter === 'all' || filter === 'achievement') {
        queries.push(
          supabase.from('achievements')
            .select('*')
            .order('earned_at', { ascending: false })
            .limit(pageSize)
        );
      }
      
      if (filter === 'all' || filter === 'announcement') {
        queries.push(
          supabase.from('announcements')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('pinned_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(pageSize)
        );
      }
      
      if (filter === 'all') {
        queries.push(
          supabase.from('events')
            .select('*')
            .order('event_date', { ascending: false })
            .limit(10)
        );
      }

      const results = await Promise.all(queries);
      
      const userIds = new Set<string>();
      results.forEach(res => {
        res.data?.forEach((item: any) => {
          userIds.add(item.user_id || item.created_by);
        });
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      // Get user's liked posts
      if (user) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);
        setLikedPosts(new Set(likes?.map(l => l.post_id) || []));
      }

      const items: FeedItem[] = [];
      let resultIndex = 0;

      if (filter === 'all' || filter === 'post') {
        const postsRes = results[resultIndex++];
        postsRes.data?.forEach((p: any) => {
          items.push({
            id: p.id,
            type: 'post',
            title: p.title,
            content: p.content,
            created_at: p.created_at,
            user_id: p.user_id,
            user_name: profileMap.get(p.user_id)?.full_name || 'Unknown',
            avatar_url: profileMap.get(p.user_id)?.avatar_url,
            media_urls: p.media_urls,
            likes_count: p.likes_count,
            comments_count: p.comments_count,
            is_pinned: p.is_pinned,
            pinned_at: p.pinned_at
          });
        });
      }

      if (filter === 'all' || filter === 'achievement') {
        const achievementsRes = results[resultIndex++];
        achievementsRes.data?.forEach((a: any) => {
          items.push({
            id: a.id,
            type: 'achievement',
            title: a.title,
            content: a.description || '',
            created_at: a.earned_at || new Date().toISOString(),
            user_id: a.user_id,
            user_name: profileMap.get(a.user_id)?.full_name || 'Unknown',
            avatar_url: profileMap.get(a.user_id)?.avatar_url
          });
        });
      }

      if (filter === 'all' || filter === 'announcement') {
        const announcementsRes = results[resultIndex++];
        announcementsRes.data?.forEach((a: any) => {
          items.push({
            id: a.id,
            type: 'announcement',
            title: a.title,
            content: a.content,
            created_at: a.created_at,
            user_id: a.created_by,
            user_name: profileMap.get(a.created_by)?.full_name || 'Admin',
            avatar_url: profileMap.get(a.created_by)?.avatar_url,
            priority: a.priority,
            is_pinned: a.is_pinned,
            pinned_at: a.pinned_at
          });
        });
      }

      if (filter === 'all') {
        const eventsRes = results[resultIndex++];
        eventsRes.data?.forEach((e: any) => {
          items.push({
            id: e.id,
            type: 'event',
            title: e.title,
            content: e.description,
            created_at: e.created_at,
            user_id: e.created_by,
            user_name: profileMap.get(e.created_by)?.full_name || 'Admin',
            avatar_url: profileMap.get(e.created_by)?.avatar_url,
            event_date: e.event_date,
            media_urls: e.banner_url ? [e.banner_url] : undefined
          });
        });
      }

      // Sort: pinned first, then by date
      return items.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
  });

  // Fetch likes for a post
  const { data: likesUsers } = useQuery({
    queryKey: ['post-likes', showLikesDialog],
    queryFn: async () => {
      if (!showLikesDialog) return [];
      const { data: likes } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', showLikesDialog);
      
      if (!likes?.length) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', likes.map(l => l.user_id));
      
      return profiles as LikeUser[] || [];
    },
    enabled: !!showLikesDialog
  });

  // Fetch comments for a post
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['post-comments', showCommentsDialog],
    queryFn: async () => {
      if (!showCommentsDialog) return [];
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', showCommentsDialog)
        .order('created_at', { ascending: true });
      
      if (!data?.length) return [];
      
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      return data.map(c => ({
        ...c,
        user_name: profileMap.get(c.user_id)?.full_name || 'Unknown',
        avatar_url: profileMap.get(c.user_id)?.avatar_url
      })) as Comment[];
    },
    enabled: !!showCommentsDialog
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const isLiked = likedPosts.has(postId);
      if (isLiked) {
        await supabase.from('post_likes').delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({
          post_id: postId,
          user_id: user.id
        });
      }
    },
    onSuccess: (_, postId) => {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['combined-feed'] });
    }
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content
      });
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['combined-feed'] });
    }
  });

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: async ({ id, type, isPinned }: { id: string; type: string; isPinned: boolean }) => {
      const table = type === 'post' ? 'posts' : 'announcements';
      await supabase.from(table).update({
        is_pinned: !isPinned,
        pinned_at: !isPinned ? new Date().toISOString() : null,
        pinned_by: !isPinned ? user?.id : null
      }).eq('id', id);
    },
    onSuccess: () => {
      refetch();
      toast({ title: 'Updated', description: 'Pin status updated' });
    }
  });

  const handleDelete = async (item: FeedItem) => {
    const canDelete = item.user_id === user?.id || isSuperAdmin || (isAdmin && ['post', 'announcement'].includes(item.type));
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

  const handleShare = async (item: FeedItem) => {
    const url = `${window.location.origin}/${item.type}s/${item.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.content.substring(0, 100),
          url
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Share link copied to clipboard' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageCircle className="h-3 w-3" />;
      case 'achievement': return <Trophy className="h-3 w-3" />;
      case 'announcement': return <Megaphone className="h-3 w-3" />;
      case 'event': return <Calendar className="h-3 w-3" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string, priority?: string, isPinned?: boolean) => {
    const colors: Record<string, string> = {
      post: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      achievement: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      announcement: priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      event: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    };
    return (
      <div className="flex items-center gap-1">
        {isPinned && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            <Pin className="h-3 w-3" />
          </span>
        )}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
          {getTypeIcon(type)}
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <FeedItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(0); }}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="post" className="text-xs">Posts</TabsTrigger>
          <TabsTrigger value="achievement" className="text-xs">Achievements</TabsTrigger>
          <TabsTrigger value="announcement" className="text-xs">Announcements</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feed Items */}
      {feedData?.map((item) => {
        const canModify = item.user_id === user?.id || isSuperAdmin || (isAdmin && ['post', 'announcement'].includes(item.type));
        const canPin = isAdmin && ['post', 'announcement'].includes(item.type);
        const isLiked = likedPosts.has(item.id);
        
        return (
          <Card key={`${item.type}-${item.id}`} className={`overflow-hidden hover:shadow-md transition-shadow ${item.is_pinned ? 'border-orange-300 dark:border-orange-700' : ''}`}>
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={item.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                      {item.user_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm truncate">{item.user_name}</p>
                      <VerifiedBadge userId={item.user_id} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getTypeBadge(item.type, item.priority, item.is_pinned)}
                  {canEdit && canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canPin && (
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => pinMutation.mutate({ id: item.id, type: item.type, isPinned: !!item.is_pinned })}
                          >
                            <Pin className="h-4 w-4" /> {item.is_pinned ? 'Unpin' : 'Pin to top'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="gap-2">
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive gap-2"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
              
              {item.media_urls && item.media_urls.length > 0 && (
                <div className={`grid gap-1 ${item.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {item.media_urls.slice(0, 4).map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={url} 
                        alt="" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {item.media_urls!.length > 4 && idx === 3 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">+{item.media_urls!.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item.event_date && (
                <div className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/5 px-2 py-1.5 rounded-lg">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.event_date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}

              {/* Actions for all feed items */}
              <div className="flex items-center gap-1 pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-1 text-xs h-8 ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                  onClick={() => item.type === 'post' && likeMutation.mutate(item.id)}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={(e) => { e.stopPropagation(); setShowLikesDialog(item.id); }}
                  >
                    {item.likes_count || 0}
                  </span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 text-xs h-8 text-muted-foreground"
                  onClick={() => setShowCommentsDialog(item.id)}
                >
                  <MessageCircle className="h-4 w-4" /> {item.comments_count || 0}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 text-xs h-8 text-muted-foreground ml-auto"
                  onClick={() => handleShare(item)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {(!feedData || feedData.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No content yet. Be the first to post!</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {feedData && feedData.length >= pageSize && (
        <div className="flex justify-center gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Likes Dialog */}
      <Dialog open={!!showLikesDialog} onOpenChange={() => setShowLikesDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liked by</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            {likesUsers?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No likes yet</p>
            ) : (
              <div className="space-y-2">
                {likesUsers?.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{u.full_name}</span>
                    <VerifiedBadge userId={u.user_id} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={!!showCommentsDialog} onOpenChange={() => setShowCommentsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] pr-4">
            {comments?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {comments?.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{c.user_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{c.user_name}</span>
                        <VerifiedBadge userId={c.user_id} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {canEdit && (
            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim() && showCommentsDialog) {
                    commentMutation.mutate({ postId: showCommentsDialog, content: commentText });
                  }
                }}
                className="text-sm"
              />
              <Button 
                size="icon"
                disabled={!commentText.trim() || commentMutation.isPending}
                onClick={() => {
                  if (showCommentsDialog && commentText.trim()) {
                    commentMutation.mutate({ postId: showCommentsDialog, content: commentText });
                  }
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
