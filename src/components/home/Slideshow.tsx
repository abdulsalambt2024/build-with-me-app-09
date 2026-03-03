import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Slide {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  link_url?: string | null;
}

export function Slideshow() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSlides();
    const channel = supabase.channel('slideshows-changes').on('postgres_changes', {
      event: '*', schema: 'public', table: 'slideshows'
    }, () => fetchSlides()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const fetchSlides = async () => {
    const { data, error } = await supabase.from('slideshows').select('*')
      .eq('is_active', true).order('display_order', { ascending: true });
    if (!error && data) setSlides(data);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next
        setCurrentIndex(prev => (prev + 1) % slides.length);
      } else {
        // Swipe right - previous
        setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
      }
    }
  }, [slides.length]);

  const handleSlideClick = () => {
    const link = slides[currentIndex]?.link_url;
    if (link) {
      if (link.startsWith('http')) window.open(link, '_blank');
      else window.location.href = link;
    }
  };

  if (slides.length === 0) return null;

  return (
    <Card className="relative overflow-hidden rounded-xl">
      <div 
        ref={containerRef}
        className="relative aspect-video w-full select-none"
        onClick={handleSlideClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: slides[currentIndex]?.link_url ? 'pointer' : 'default' }}
      >
        <img 
          src={slides[currentIndex].image_url} 
          alt={slides[currentIndex].title} 
          className="w-full h-full object-cover transition-opacity duration-500" 
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6">
          <h3 className="text-white font-bold text-center text-base md:text-lg">
            {slides[currentIndex].title}
          </h3>
          {slides[currentIndex].description && (
            <p className="text-white/90 text-center text-xs mt-1">
              {slides[currentIndex].description}
            </p>
          )}
        </div>

        {/* Dot indicators only - no buttons */}
        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, index) => (
              <button 
                key={index} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-white w-5' : 'bg-white/40 w-1.5'
                }`} 
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }} 
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
