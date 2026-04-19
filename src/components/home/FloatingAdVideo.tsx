import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Minimize2, Maximize2, GripVertical, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdItem {
  id: string;
  video_url: string;
  title: string | null;
  link_url: string | null;
}

const STORAGE_KEY = 'floating-ad-position';
const ROTATE_MS = 8000;

export function FloatingAdVideo() {
  const [closed, setClosed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(0);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; dragging: boolean; moved: boolean }>({
    startX: 0, startY: 0, origX: 0, origY: 0, dragging: false, moved: false,
  });
  const elRef = useRef<HTMLDivElement>(null);

  const { data: ads } = useQuery({
    queryKey: ['ad-videos-floating'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_video_settings')
        .select('id, video_url, title, link_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      return (data || []) as AdItem[];
    },
  });

  // Load saved position
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.x === 'number' && typeof p.y === 'number') setPos(p);
      }
    } catch {}
  }, []);

  // Default position: bottom-left with safe spacing
  useEffect(() => {
    if (pos === null && elRef.current) {
      const h = elRef.current.offsetHeight || 180;
      setPos({ x: 12, y: window.innerHeight - h - 96 });
    }
  }, [pos]);

  // Rotate through ads every 8s
  useEffect(() => {
    if (!ads || ads.length <= 1 || minimized) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % ads.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [ads, minimized]);

  const clamp = (x: number, y: number) => {
    const el = elRef.current;
    const w = el?.offsetWidth || 260;
    const h = el?.offsetHeight || 180;
    const maxX = window.innerWidth - w - 4;
    const maxY = window.innerHeight - h - 4;
    return { x: Math.max(4, Math.min(maxX, x)), y: Math.max(4, Math.min(maxY, y)) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: pos.x, origY: pos.y, dragging: true, moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true;
    setPos(clamp(dragState.current.origX + dx, dragState.current.origY + dy));
  };
  const onPointerUp = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    if (pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    }
  };

  if (closed || !ads || ads.length === 0) return null;
  const ad = ads[index % ads.length];
  const url = ad.video_url || '';
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);

  const handleMediaClick = (e: React.MouseEvent) => {
    if (dragState.current.moved) { e.preventDefault(); return; }
    if (ad.link_url) {
      e.preventDefault();
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={elRef}
      className="fixed z-40 w-[240px] md:w-[300px] rounded-xl overflow-hidden shadow-2xl border border-border bg-card animate-fade-in-up touch-none select-none"
      style={{
        left: pos ? `${pos.x}px` : 12,
        top: pos ? `${pos.y}px` : undefined,
        bottom: pos ? undefined : 96,
      }}
    >
      <div
        className="flex items-center justify-between px-2 py-1 bg-muted/80 backdrop-blur cursor-move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex items-center gap-1 min-w-0">
          <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {ad.title || 'Sponsored'}
          </span>
          {ad.link_url && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
        </div>
        <div className="flex items-center gap-0.5">
          {ads.length > 1 && (
            <span className="text-[10px] text-muted-foreground px-1">{index + 1}/{ads.length}</span>
          )}
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setMinimized((m) => !m)} aria-label={minimized ? 'Expand' : 'Minimize'}>
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setClosed(true)} aria-label="Close">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {!minimized && (
        <div onClick={handleMediaClick} className={ad.link_url ? 'cursor-pointer' : ''}>
          {isImage ? (
            <img src={url} alt={ad.title || 'Advertisement'} className="w-full aspect-video object-cover bg-black" draggable={false} />
          ) : (
            <video src={url} controls autoPlay muted loop playsInline className="w-full aspect-video bg-black" />
          )}
        </div>
      )}
    </div>
  );
}
