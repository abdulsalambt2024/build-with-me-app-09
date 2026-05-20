import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewer({ images, initialIndex = 0, open, onOpenChange }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureStart = useRef<{
    dist: number;
    zoom: number;
    midX: number;
    midY: number;
    offset: { x: number; y: number };
  } | null>(null);
  const panStart = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((p) => (p > 0 ? p - 1 : images.length - 1));
    reset();
  }, [images.length, reset]);

  const handleNext = useCallback(() => {
    setCurrentIndex((p) => (p < images.length - 1 ? p + 1 : 0));
    reset();
  }, [images.length, reset]);

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      gestureStart.current = {
        dist: dist(p1, p2),
        zoom,
        midX: (p1.x + p2.x) / 2,
        midY: (p1.y + p2.y) / 2,
        offset: { ...offset },
      };
      swipeStart.current = null;
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      if (zoom > 1) {
        panStart.current = { x: e.clientX, y: e.clientY, offset: { ...offset } };
      } else {
        swipeStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && gestureStart.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const newDist = dist(p1, p2);
      const scale = newDist / gestureStart.current.dist;
      const newZoom = Math.min(Math.max(gestureStart.current.zoom * scale, 1), 6);
      setZoom(newZoom);
    } else if (pointers.current.size === 1 && panStart.current && zoom > 1) {
      setOffset({
        x: panStart.current.offset.x + (e.clientX - panStart.current.x),
        y: panStart.current.offset.y + (e.clientY - panStart.current.y),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) gestureStart.current = null;

    // swipe navigation (only when not zoomed)
    if (swipeStart.current && zoom === 1 && images.length > 1) {
      const dx = e.clientX - swipeStart.current.x;
      const dy = e.clientY - swipeStart.current.y;
      const dt = Date.now() - swipeStart.current.time;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && dt < 600) {
        if (dx < 0) handleNext();
        else handlePrev();
      }
    }
    swipeStart.current = null;
    panStart.current = null;

    // double-tap to toggle zoom
    if (pointers.current.size === 0) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (zoom > 1) reset();
        else setZoom(2.5);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }

    if (zoom <= 1) setOffset({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.003;
    setZoom((z) => Math.min(Math.max(z + delta, 1), 6));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-none w-screen h-screen sm:!rounded-none p-0 bg-black border-0 [&>button]:hidden gap-0 translate-x-[-50%] translate-y-[-50%] left-1/2 top-1/2"
      >
        <div
          ref={containerRef}
          className="relative w-full h-full overflow-hidden touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          style={{ touchAction: 'none' }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3 z-50 text-white hover:bg-white/20 h-11 w-11 rounded-full bg-black/40"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            draggable={false}
            className="absolute inset-0 m-auto max-w-full max-h-full object-contain will-change-transform"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: pointers.current.size === 0 ? 'transform 0.15s ease-out' : 'none',
            }}
          />

          {images.length > 1 && (
            <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-1.5 rounded-full font-medium z-50">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
