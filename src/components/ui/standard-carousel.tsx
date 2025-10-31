import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StandardCarouselProps {
  children: React.ReactNode;
  className?: string;
  showDots?: boolean;
  showArrows?: boolean;
  cardWidth?: 'mobile' | 'tablet' | 'desktop';
}

export const StandardCarousel: React.FC<StandardCarouselProps> = ({
  children,
  className,
  showDots = true,
  showArrows = false,
  cardWidth = 'mobile'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    if (scrollRef.current) {
      setTotalCards(scrollRef.current.children.length);
    }
  }, [children]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = scrollRef.current.scrollWidth / totalCards;
      const index = Math.round(scrollLeft / cardWidth);
      setCurrentIndex(index);
    }
  };

  const scrollTo = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.scrollWidth / totalCards;
      scrollRef.current.scrollTo({
        left: cardWidth * index,
        behavior: 'smooth'
      });
    }
  };

  const scrollNext = () => {
    if (currentIndex < totalCards - 1) {
      scrollTo(currentIndex + 1);
    }
  };

  const scrollPrev = () => {
    if (currentIndex > 0) {
      scrollTo(currentIndex - 1);
    }
  };

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "grid gap-4 px-5 overflow-x-auto",
          "scroll-snap-type-x-mandatory",
          "scrollbar-hide",
          "[grid-auto-flow:column]",
          "[align-items:stretch]",
          "[-webkit-overflow-scrolling:touch]",
          cardWidth === 'mobile' && "[grid-auto-columns:85%]",
          cardWidth === 'tablet' && "[grid-auto-columns:85%] md:[grid-auto-columns:45%]",
          cardWidth === 'desktop' && "[grid-auto-columns:85%] md:[grid-auto-columns:45%] lg:[grid-auto-columns:32%]",
          className
        )}
      >
        {children}
      </div>

      {showArrows && totalCards > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={currentIndex === totalCards - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {showDots && totalCards > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalCards }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                currentIndex === index
                  ? "bg-primary w-8"
                  : "bg-primary/20 hover:bg-primary/40 w-2"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const StandardCarouselCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "carousel-card",
        "scroll-snap-align-start",
        "flex flex-col",
        "min-h-[400px]",
        className
      )}
    >
      {children}
    </div>
  );
};
