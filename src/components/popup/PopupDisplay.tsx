import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, PartyPopper, Bell, X, Sparkles, Pause, Play } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Popup {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  popup_type: string;
  show_date: string;
  is_active: boolean;
  is_paused: boolean;
}

export function PopupDisplay() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  // Fetch active popups that should be shown now
  const { data: activePopups } = useQuery({
    queryKey: ['active-popups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const now = new Date().toISOString();
      
      // Get active popups where show_date is today or past, and not paused
      const { data: popups, error: popupsError } = await supabase
        .from('popups')
        .select('*')
        .eq('is_active', true)
        .eq('is_paused', false)
        .lte('show_date', now)
        .order('show_date', { ascending: false });
      
      if (popupsError) throw popupsError;
      
      // Get popup views for this user
      const { data: views, error: viewsError } = await supabase
        .from('popup_views')
        .select('popup_id')
        .eq('user_id', user.id);
      
      if (viewsError) throw viewsError;
      
      const viewedIds = new Set(views?.map(v => v.popup_id) || []);
      
      // Filter out already viewed popups
      return (popups as Popup[]).filter(p => !viewedIds.has(p.id));
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5
  });

  // Mark popup as viewed
  const markViewed = useMutation({
    mutationFn: async (popupId: string) => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('popup_views')
        .insert({
          popup_id: popupId,
          user_id: user.id
        });
      
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-popups', user?.id] });
    }
  });

  // Pause popup (Super Admin only)
  const pausePopup = useMutation({
    mutationFn: async (popupId: string) => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('popups')
        .update({
          is_paused: true,
          paused_by: user.id,
          paused_at: new Date().toISOString()
        })
        .eq('id', popupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-popups'] });
      toast.success('Popup paused for all users');
      handleClose();
    }
  });

  // Show the first unviewed popup
  useEffect(() => {
    if (activePopups && activePopups.length > 0 && !currentPopup) {
      setCurrentPopup(activePopups[0]);
      setIsOpen(true);
    }
  }, [activePopups, currentPopup]);

  const handleClose = useCallback(() => {
    if (currentPopup) {
      markViewed.mutate(currentPopup.id);
    }
    setIsOpen(false);
    setCurrentPopup(null);
  }, [currentPopup, markViewed]);

  const handlePause = useCallback(() => {
    if (currentPopup) {
      pausePopup.mutate(currentPopup.id);
    }
  }, [currentPopup, pausePopup]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Gift className="h-8 w-8 text-pink-500" />;
      case 'festival':
        return <PartyPopper className="h-8 w-8 text-yellow-500" />;
      case 'announcement':
        return <Bell className="h-8 w-8 text-primary" />;
      default:
        return <Sparkles className="h-8 w-8 text-primary" />;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'birthday':
        return 'from-pink-500/20 via-purple-500/10 to-pink-500/20';
      case 'festival':
        return 'from-yellow-500/20 via-orange-500/10 to-yellow-500/20';
      case 'announcement':
        return 'from-primary/20 via-primary/10 to-primary/20';
      default:
        return 'from-primary/20 via-primary/10 to-primary/20';
    }
  };

  if (!currentPopup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0">
        <div className={`relative bg-gradient-to-br ${getGradient(currentPopup.popup_type)}`}>
          {/* Action buttons */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {isSuperAdmin && (
              <button
                onClick={handlePause}
                className="p-1.5 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors text-white"
                title="Pause for all users"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Image */}
          {currentPopup.image_url && (
            <div className="relative h-48 w-full">
              <img
                src={currentPopup.image_url}
                alt={currentPopup.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-background/80 shadow-sm">
                {getTypeIcon(currentPopup.popup_type)}
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {currentPopup.popup_type}
              </span>
            </div>

            <h2 className="text-2xl font-bold leading-tight">
              {currentPopup.title}
            </h2>

            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {currentPopup.message}
            </p>

            <p className="text-xs text-muted-foreground">
              {format(new Date(currentPopup.show_date), 'EEEE, MMMM d, yyyy')}
            </p>

            <Button onClick={handleClose} className="w-full mt-4">
              Got it! ✨
            </Button>
          </div>

          {/* Decorative elements */}
          {currentPopup.popup_type === 'birthday' && (
            <>
              <div className="absolute top-4 left-4 text-4xl animate-bounce">🎈</div>
              <div className="absolute top-8 right-12 text-3xl animate-pulse">🎂</div>
            </>
          )}
          {currentPopup.popup_type === 'festival' && (
            <>
              <div className="absolute top-4 left-4 text-4xl animate-bounce">🎊</div>
              <div className="absolute top-8 right-12 text-3xl animate-pulse">✨</div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
