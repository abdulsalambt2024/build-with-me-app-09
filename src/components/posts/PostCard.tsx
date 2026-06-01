import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreVertical, Send, X, Pin } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { useLikePost } from '@/hooks/usePosts';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ImageViewer } from './ImageViewer';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const goToProfile = () => navigate(`/users/${post.user_id}`);
  const likePost = useLikePost();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [commentText, setCommentText] = useState('');

  const isLiked = post.post_likes?.some((like) => like.user_id === user?.id) || false;
  const isOwner = user?.id === post.user_id;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const canModify = isOwner || isSuperAdmin;

  const handleLike = () => {
    likePost.mutate({ postId: post.id, unlike: isLiked });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, text: post.content.substring(0, 100), url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Post link copied to clipboard' });
    }
  };

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: async () => {
      const isPinned = (post as any).is_pinned;
      await supabase.from('posts').update({
        is_pinned: !isPinned,
        pinned_at: !isPinned ? new Date().toISOString() : null,
        pinned_by: !isPinned ? user?.id : null
      }).eq('id', post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Updated', description: 'Pin status updated' });
    }
  });

  // Likes query
  const { data: likesUsers } = useQuery({
    queryKey: ['post-likes-detail', post.id],
    queryFn: async () => {
      const { data: likes } = await supabase.from('post_likes').select('user_id').eq('post_id', post.id);
      if (!likes?.length) return [];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', likes.map(l => l.user_id));
      return profiles || [];
    },
    enabled: showLikes
  });

  // Comments query
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['post-comments-detail', post.id],
    queryFn: async () => {
      const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      return data.map(c => ({ ...c, user_name: profileMap.get(c.user_id)?.full_name || 'Unknown', avatar_url: profileMap.get(c.user_id)?.avatar_url }));
    },
    enabled: showComments
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, content });
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const openImage = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const mediaCount = post.media_urls?.length || 0;

  return (
    <>
      <Card className="border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 cursor-pointer" onClick={goToProfile}>
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <p
                    className="font-semibold text-sm cursor-pointer hover:underline"
                    onClick={goToProfile}
                  >
                    {post.profiles?.full_name || 'Unknown User'}
                  </p>
                  <VerifiedBadge userId={post.user_id} />
                  {(post as any).is_pinned && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      <Pin className="h-2.5 w-2.5" /> Pinned
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {canModify && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => pinMutation.mutate()} className="gap-2">
                      <Pin className="h-4 w-4" /> {(post as any).is_pinned ? 'Unpin' : 'Pin to top'}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive gap-2">
                      Delete Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <div>
            <h3 className="text-base font-semibold mb-1">{post.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
          </div>

          {mediaCount > 0 && (
            <div className={`grid gap-1.5 ${mediaCount === 1 ? 'grid-cols-1' : mediaCount === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {post.media_urls!.slice(0, 6).map((url, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer rounded-lg overflow-hidden bg-muted aspect-square"
                  onClick={() => openImage(index)}
                >
                  <img
                    src={url}
                    alt={`Post media ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  {index === 5 && mediaCount > 6 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-bold">+{mediaCount - 6}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-1 pt-0 px-3 pb-3 border-t mt-1">
          <Button variant="ghost" size="sm" onClick={handleLike} className={`h-8 gap-1 text-xs ${isLiked ? 'text-red-500' : ''}`}>
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span
              className="cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); setShowLikes(true); }}
            >
              {post.likes_count}
            </span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowComments(true)}>
            <MessageCircle className="h-4 w-4" /> {post.comments_count}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs ml-auto" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Likes Dialog */}
      <Dialog open={showLikes} onOpenChange={setShowLikes}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Liked by</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[300px]">
            {likesUsers?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No likes yet</p>
            ) : (
              <div className="space-y-2">
                {likesUsers?.map((u: any) => (
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
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[300px] pr-4">
            {comments?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {comments?.map((c: any) => (
                  <div key={c.id} className="flex gap-2 group">
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
                        {(c.user_id === user?.id || isSuperAdmin) && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                            onClick={async () => {
                              await supabase.from('comments').delete().eq('id', c.id);
                              refetchComments();
                              queryClient.invalidateQueries({ queryKey: ['posts'] });
                              toast({ title: 'Comment deleted' });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {role !== 'viewer' && user && !((user as any).id === 'guest') && (
            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) commentMutation.mutate(commentText); }}
                className="text-sm"
              />
              <Button size="icon" disabled={!commentText.trim() || commentMutation.isPending}
                onClick={() => { if (commentText.trim()) commentMutation.mutate(commentText); }}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {post.media_urls && post.media_urls.length > 0 && (
        <ImageViewer
          images={post.media_urls}
          initialIndex={viewerIndex}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      )}
    </>
  );
}
