import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdVideo {
  id: string;
  video_url: string;
  title: string | null;
}

export function FloatingAdVideo() {
  const [closed, setClosed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const { data: ads } = useQuery({
    queryKey: ['ad-videos-floating'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_video_settings')
        .select('id, video_url, title')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1);
      return (data || []) as AdVideo[];
    },
  });

  if (closed || !ads || ads.length === 0) return null;
  const ad = ads[0];

  return (
    <div
      className="fixed z-40 bottom-24 md:bottom-6 left-3 md:left-6 w-[240px] md:w-[300px] rounded-xl overflow-hidden shadow-2xl border border-border bg-card animate-fade-in-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-2 py-1 bg-muted/80 backdrop-blur">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {ad.title || 'Sponsored'}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setClosed(true)}
            aria-label="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {!minimized && (
        <video
          src={ad.video_url}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="w-full aspect-video bg-black"
        />
      )}
    </div>
  );
}
