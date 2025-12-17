import { useState, useMemo } from 'react';
import { usePosts, useDeletePost } from '@/hooks/usePosts';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/posts/PostCard';
import { UnifiedCreateDialog } from '@/components/posts/UnifiedCreateDialog';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, SortAsc, SortDesc, Trophy, FileText, LayoutGrid } from 'lucide-react';
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

export default function Posts() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data: posts, isLoading: postsLoading } = usePosts(100);
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const deletePost = useDeletePost();
  const { role, user } = useAuth();

  const canCreate = role && ['member', 'admin', 'super_admin'].includes(role);
  const isLoading = postsLoading || achievementsLoading;

  // Combine and process feed items
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    // Add posts
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

    // Add achievements
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
    const start = 0;
    const end = page * itemsPerPage;
    return feedItems.slice(start, end);
  }, [feedItems, page]);

  const hasMore = paginatedItems.length < feedItems.length;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      await deletePost.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Posts & Achievements
          </p>
        </div>
        {canCreate && <UnifiedCreateDialog />}
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts & achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
            <SelectTrigger className="w-full sm:w-[140px]">
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
                  <LayoutGrid className="h-3 w-3" /> Popular
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mt-3">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm">
              <LayoutGrid className="h-3 w-3" />
              All
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-3 w-3" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-1 text-xs sm:text-sm">
              <Trophy className="h-3 w-3" />
              Achievements
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {paginatedItems.length} of {feedItems.length} items
      </p>

      {/* Feed Items */}
      {paginatedItems.length > 0 ? (
        <div className="space-y-4">
          {paginatedItems.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
              {item.type === 'achievement' ? (
                // Achievement Card
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {item.media_urls?.[0] && (
                      <img
                        src={item.media_urls[0]}
                        alt={item.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Achievement
                        </span>
                        {item.category && (
                          <span className="text-xs text-muted-foreground capitalize">
                            • {item.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{item.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{item.profiles?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Post Card
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
              )}
            </Card>
          ))}

          {/* Load More */}
          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPage(p => p + 1)}
            >
              Load More
            </Button>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No results found' : 'No content yet. Be the first to create!'}
          </p>
        </Card>
      )}
    </div>
  );
}
