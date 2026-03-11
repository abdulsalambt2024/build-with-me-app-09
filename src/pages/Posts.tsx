import { useState, useMemo, memo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePosts, useDeletePost } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/posts/PostCard';
import { UnifiedCreateDialog } from '@/components/posts/UnifiedCreateDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SortAsc, SortDesc, FileText, TrendingUp } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

type SortType = 'newest' | 'oldest' | 'popular';

// Loading skeleton
const PostSkeleton = memo(() => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </CardContent>
  </Card>
));

PostSkeleton.displayName = 'PostSkeleton';

export default function Posts() {
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  
  const { data: posts, isLoading } = usePosts(50);
  const deletePost = useDeletePost();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = role && ['member', 'admin', 'super_admin'].includes(role);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, [queryClient]);

  const feedItems = useMemo(() => {
    if (!posts) return [];

    let filtered = [...posts];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.content.toLowerCase().includes(query) || 
        item.profiles?.full_name?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'popular') return (b.likes_count || 0) - (a.likes_count || 0);
      return 0;
    });
    
    return filtered;
  }, [posts, sortBy, searchQuery]);

  const paginatedItems = useMemo(() => feedItems.slice(0, page * itemsPerPage), [feedItems, page, itemsPerPage]);
  const hasMore = paginatedItems.length < feedItems.length;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      await deletePost.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container max-w-4xl mx-auto p-4 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <PullToRefresh onRefresh={handleRefresh} />
      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary shadow-lg">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Posts</h1>
              <p className="text-xs text-muted-foreground">{feedItems.length} posts</p>
            </div>
          </div>
          {canCreate && <UnifiedCreateDialog />}
        </div>

        {/* Search & Sort */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search posts..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-9 border-0 bg-muted/50 focus-visible:ring-1"
                />
              </div>
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortType)}>
                <SelectTrigger className="w-full sm:w-[140px] border-0 bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <span className="flex items-center gap-2"><SortDesc className="h-3 w-3" /> Newest</span>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <span className="flex items-center gap-2"><SortAsc className="h-3 w-3" /> Oldest</span>
                  </SelectItem>
                  <SelectItem value="popular">
                    <span className="flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Popular</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground px-1">
          Showing {paginatedItems.length} of {feedItems.length} posts
        </p>

        {paginatedItems.length > 0 ? (
          <div className="space-y-3">
            {paginatedItems.map(post => (
              <Card key={post.id} className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                <PostCard 
                  post={{
                    id: post.id,
                    user_id: post.user_id,
                    title: post.title,
                    content: post.content,
                    media_urls: post.media_urls || null,
                    likes_count: post.likes_count || 0,
                    comments_count: post.comments_count || 0,
                    created_at: post.created_at,
                    updated_at: post.created_at,
                    profiles: post.profiles
                  }} 
                  onDelete={handleDelete} 
                />
              </Card>
            ))}
            {hasMore && (
              <Button variant="outline" className="w-full border-2 hover:bg-primary/5" onClick={() => setPage(p => p + 1)}>
                Load More ({feedItems.length - paginatedItems.length} remaining)
              </Button>
            )}
          </div>
        ) : (
          <Card className="border-0 shadow-lg bg-card/80">
            <CardContent className="py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {searchQuery ? 'No results found' : 'No posts yet'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Try a different search term' : 'Be the first to create a post!'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
