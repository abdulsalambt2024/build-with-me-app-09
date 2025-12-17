import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trophy, FileText } from 'lucide-react';
import { useCreatePost } from '@/hooks/usePosts';
import { useAwardAchievement } from '@/hooks/useAchievements';
import { useAuth } from '@/contexts/AuthContext';
import { MediaUpload } from './MediaUpload';
import { toast } from 'sonner';

type ContentType = 'post' | 'achievement';

export function UnifiedCreateDialog() {
  const [open, setOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  
  const { user } = useAuth();
  const createPost = useCreatePost();
  const awardAchievement = useAwardAchievement();

  const isLoading = createPost.isPending || awardAchievement.isPending;

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMediaUrls([]);
    setCategory('');
    setContentType('post');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (contentType === 'post') {
        await createPost.mutateAsync({
          title,
          content,
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined
        });
      } else if (contentType === 'achievement') {
        if (!user) {
          toast.error('You must be logged in');
          return;
        }
        await awardAchievement.mutateAsync({
          user_id: user.id,
          title,
          description: content,
          badge_url: mediaUrls[0] || null,
          category: category || 'general',
          achievement_type: 'custom',
          milestone_count: 0
        });
      }
      
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error('Error creating content:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
            <DialogDescription>
              Share posts or achievements with the community
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Content Type Selection */}
            <div className="space-y-2">
              <Label>Content Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={contentType === 'post' ? 'default' : 'outline'}
                  className="gap-2 h-auto py-3"
                  onClick={() => setContentType('post')}
                >
                  <FileText className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Post</div>
                    <div className="text-xs opacity-70">Share updates</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={contentType === 'achievement' ? 'default' : 'outline'}
                  className="gap-2 h-auto py-3"
                  onClick={() => setContentType('achievement')}
                >
                  <Trophy className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Achievement</div>
                    <div className="text-xs opacity-70">Celebrate milestones</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {contentType === 'post' ? 'Post Title' : 'Achievement Title'} *
              </Label>
              <Input
                id="title"
                placeholder={contentType === 'post' ? 'Enter post title...' : 'Enter achievement title...'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                {contentType === 'post' ? 'Content' : 'Description'} *
              </Label>
              <Textarea
                id="content"
                placeholder={contentType === 'post' ? "What's on your mind?" : 'Describe the achievement...'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px]"
                required
              />
            </div>

            {/* Category for achievements */}
            {contentType === 'achievement' && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="arts">Arts & Culture</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>
                {contentType === 'post' ? 'Photos' : 'Badge Image'}
              </Label>
              <MediaUpload
                onMediaUploaded={setMediaUrls}
                existingMedia={mediaUrls}
                maxFiles={contentType === 'post' ? 10 : 1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contentType === 'post' ? 'Create Post' : 'Award Achievement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
