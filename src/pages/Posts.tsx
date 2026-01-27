import { useState, useMemo, memo } from 'react';
import { usePosts, useDeletePost } from '@/hooks/usePosts';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/posts/PostCard';
import { UnifiedCreateDialog } from '@/components/posts/UnifiedCreateDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SortAsc, SortDesc, Trophy, FileText, LayoutGrid, TrendingUp, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

type FilterType = 'all' | 'posts' | 'achievements';
type SortType = 'newest' | 'oldest' | 'popular';

interface FeedItem {
  id: string;
  type: 'post' | 'achievement';
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  media_urls?: string[] | null;
  likes_count?: number;
  comments_count?: number;
  category?: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string;
  } | null;
}

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

// Achievement item component
const AchievementItem = memo(({ item }: { item: FeedItem }) => (
  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden bg-gradient-to-br from-amber-500/10 via-transparent to-transparent">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        {item.media_urls?.[0] ? (
          <img 
            src={item.media_urls[0]} 
            alt={item.title} 
            className="w-16 h-16 rounded-xl object-cover shadow-sm"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
            <Trophy className="h-8 w-8 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
              <Sparkles className="h-3 w-3" />
              Achievement
            </span>
            {item.category && (
              <span className="text-xs text-muted-foreground capitalize">
                {item.category.replace('_', ' ')}
              </span>
            )}
          </div>
          <h3 className="font-bold text-base truncate">{item.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="font-medium">{item.profiles?.full_name || 'Unknown'}</span>
            <span>•</span>
            <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));

AchievementItem.displayName = 'AchievementItem';

export default function Posts() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 15; // Reduced for faster initial load
  
  const { data: posts, isLoading: postsLoading } = usePosts(50); // Reduced initial fetch
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const deletePost = useDeletePost();
  const { role, user } = useAuth();
  const canCreate = role && ['member', 'admin', 'super_admin'].includes(role);
  const isLoading = postsLoading || achievementsLoading;

  // Combine and process feed items
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    if (posts && (filter === 'all' || filter === 'posts')) {
      posts.forEach(post => {
        items.push({
          id: post.id,
          type: 'post',
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          user_id: post.user_id,
          media_urls: post.media_urls,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          profiles: post.profiles
        });
      });
    }

    if (achievements && (filter === 'all' || filter === 'achievements')) {
      achievements.forEach((achievement: any) => {
        items.push({
          id: achievement.id,
          type: 'achievement',
          title: achievement.title,
          content: achievement.description || '',
          created_at: achievement.earned_at || new Date().toISOString(),
          user_id: achievement.user_id,
          media_urls: achievement.badge_url ? [achievement.badge_url] : null,
          category: achievement.category,
          profiles: achievement.profiles
        });
      });
    }

    // Filter by search
    let filtered = items;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.content.toLowerCase().includes(query) || 
        item.profiles?.full_name?.toLowerCase().includes(query)
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'popular') {
        return (b.likes_count || 0) - (a.likes_count || 0);
      }
      return 0;
    });
    
    return filtered;
  }, [posts, achievements, filter, sortBy, searchQuery]);

  // Paginate
  const paginatedItems = useMemo(() => {
    return feedItems.slice(0, page * itemsPerPage);
  }, [feedItems, page, itemsPerPage]);

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
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary shadow-lg">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Posts & Achievements</h1>
              <p className="text-xs text-muted-foreground">{feedItems.length} total items</p>
            </div>
          </div>
          {canCreate && <UnifiedCreateDialog />}
        </div>

        {/* Search & Filter Bar */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search posts & achievements..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-9 border-0 bg-muted/50 focus-visible:ring-1"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortType)}>
                <SelectTrigger className="w-full sm:w-[140px] border-0 bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <span className="flex items-center gap-2">
                      <SortDesc className="h-3 w-3" /> Newest
                    </span>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <span className="flex items-center gap-2">
                      <SortAsc className="h-3 w-3" /> Oldest
                    </span>
                  </SelectItem>
                  <SelectItem value="popular">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" /> Popular
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={v => setFilter(v as FilterType)}>
              <TabsList className="w-full grid grid-cols-3 h-10 p-1">
                <TabsTrigger value="all" className="gap-1.5 text-xs data-[state=active]:shadow-md">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  All
                </TabsTrigger>
                <TabsTrigger value="posts" className="gap-1.5 text-xs data-[state=active]:shadow-md">
                  <FileText className="h-3.5 w-3.5" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="achievements" className="gap-1.5 text-xs data-[state=active]:shadow-md">
                  <Trophy className="h-3.5 w-3.5" />
                  Achievements
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results Count */}
        <p className="text-xs text-muted-foreground px-1">
          Showing {paginatedItems.length} of {feedItems.length} items
        </p>

        {/* Feed Items */}
        {paginatedItems.length > 0 ? (
          <div className="space-y-3">
            {paginatedItems.map(item => (
              item.type === 'achievement' ? (
                <AchievementItem key={`${item.type}-${item.id}`} item={item} />
              ) : (
                <Card key={`${item.type}-${item.id}`} className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <PostCard 
                    post={{
                      id: item.id,
                      user_id: item.user_id,
                      title: item.title,
                      content: item.content,
                      media_urls: item.media_urls || null,
                      likes_count: item.likes_count || 0,
                      comments_count: item.comments_count || 0,
                      created_at: item.created_at,
                      updated_at: item.created_at,
                      profiles: item.profiles
                    }} 
                    onDelete={handleDelete} 
                  />
                </Card>
              )
            ))}

            {/* Load More */}
            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full border-2 hover:bg-primary/5" 
                onClick={() => setPage(p => p + 1)}
              >
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
                {searchQuery ? 'No results found' : 'No content yet'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Try a different search term' : 'Be the first to create!'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
