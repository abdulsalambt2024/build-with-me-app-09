import { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewer({ images, initialIndex = 0, open, onOpenChange }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
  }, [images.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden [&>button]:hidden">
        <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-50 text-white hover:bg-white/20 h-10 w-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Zoom controls */}
          <div className="absolute top-3 left-3 z-50 flex gap-1 items-center">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-xs px-2 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Previous button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 px-3 gap-1 text-sm font-medium"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
          )}

          {/* Next button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 px-3 gap-1 text-sm font-medium"
              onClick={handleNext}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {/* Image */}
          <div className="overflow-auto max-h-[80vh] max-w-full flex items-center justify-center p-4 pt-14">
            <img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-1.5 rounded-full font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
