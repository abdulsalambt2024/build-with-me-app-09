import { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { useLikePost } from '@/hooks/usePosts';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ImageViewer } from './ImageViewer';
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
  const { user } = useAuth();
  const likePost = useLikePost();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isLiked = post.post_likes?.some((like) => like.user_id === user?.id) || false;
  const isOwner = user?.id === post.user_id;

  const handleLike = () => {
    likePost.mutate({ postId: post.id, unlike: isLiked });
  };

  const openImage = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const mediaCount = post.media_urls?.length || 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm">{post.profiles?.full_name || 'Unknown User'}</p>
                  <VerifiedBadge userId={post.user_id} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {isOwner && onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                    Delete Post
                  </DropdownMenuItem>
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

        <CardFooter className="flex items-center gap-4 pt-0 px-4 pb-3">
          <Button variant="ghost" size="sm" onClick={handleLike} className={`h-8 ${isLiked ? 'text-red-500' : ''}`}>
            <Heart className={`mr-1.5 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{post.likes_count}</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{post.comments_count}</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <Share2 className="mr-1.5 h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </CardFooter>
      </Card>

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
