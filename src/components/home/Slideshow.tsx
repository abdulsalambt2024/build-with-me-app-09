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
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentIndex(prev => (prev + 1) % slides.length);
      else setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
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
    <Card className="relative overflow-hidden rounded-2xl border-0 shadow-medium group">
      <div
        className="relative aspect-[16/8] w-full select-none"
        onClick={handleSlideClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: slides[currentIndex]?.link_url ? 'pointer' : 'default' }}
      >
        <img
          src={slides[currentIndex].image_url}
          alt={slides[currentIndex].title}
          className="w-full h-full object-cover transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <h3 className="text-primary-foreground font-heading font-bold text-center text-sm md:text-base">
            {slides[currentIndex].title}
          </h3>
          {slides[currentIndex].description && (
            <p className="text-primary-foreground/80 text-center text-[11px] mt-0.5">
              {slides[currentIndex].description}
            </p>
          )}
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-primary-foreground w-5' : 'bg-primary-foreground/30 w-1.5'
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
