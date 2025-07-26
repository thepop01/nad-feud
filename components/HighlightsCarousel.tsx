import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Calendar, User } from 'lucide-react';

interface HighlightCard {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  author?: string;
  date?: string;
  category?: string;
  featured?: boolean;
}

interface HighlightsCarouselProps {
  highlights: HighlightCard[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const HighlightsCarousel: React.FC<HighlightsCarouselProps> = ({ 
  highlights, 
  autoPlay = true, 
  autoPlayInterval = 5000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 });
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || highlights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, highlights.length]);

  // Update drag constraints
  useEffect(() => {
    if (carouselRef.current && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const carouselWidth = carouselRef.current.scrollWidth;
      setDragConstraints({
        left: -(carouselWidth - containerWidth),
        right: 0
      });
    }
  }, [highlights]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % highlights.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      prevSlide();
    } else if (info.offset.x < -threshold) {
      nextSlide();
    }
  };

  const getCardStyle = (index: number) => {
    const distance = Math.abs(index - currentIndex);
    const isCenter = index === currentIndex;
    
    return {
      scale: isCenter ? 1.1 : Math.max(0.8, 1 - distance * 0.1),
      opacity: Math.max(0.4, 1 - distance * 0.2),
      zIndex: isCenter ? 10 : Math.max(1, 5 - distance),
      rotateY: isCenter ? 0 : (index < currentIndex ? -15 : 15),
      translateZ: isCenter ? 50 : Math.max(-20, -distance * 10)
    };
  };

  if (!highlights || highlights.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-white/60">
        <p>No highlights available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 overflow-hidden rounded-3xl" ref={containerRef}>
      {/* Dreamy Space Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-800/30 to-pink-700/20 backdrop-blur-xl">
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Carousel Container */}
      <motion.div
        ref={carouselRef}
        className="flex items-center justify-center h-full px-8 py-12"
        style={{ perspective: '1000px' }}
        drag="x"
        dragConstraints={dragConstraints}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: 'grabbing' }}
      >
        <AnimatePresence mode="wait">
          {highlights.map((highlight, index) => {
            const cardStyle = getCardStyle(index);
            const isVisible = Math.abs(index - currentIndex) <= 2;
            
            if (!isVisible) return null;

            return (
              <motion.div
                key={highlight.id}
                className="absolute w-80 h-72 cursor-grab active:cursor-grabbing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: cardStyle.opacity,
                  scale: cardStyle.scale,
                  rotateY: cardStyle.rotateY,
                  translateZ: cardStyle.translateZ,
                  x: (index - currentIndex) * 320
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                style={{
                  zIndex: cardStyle.zIndex,
                  transformStyle: 'preserve-3d'
                }}
                onClick={() => setCurrentIndex(index)}
              >
                {/* Glassmorphic Card */}
                <div className="relative w-full h-full rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-indigo-500/5 to-purple-600/10 border border-white/20 shadow-2xl overflow-hidden group">
                  {/* Glowing edges */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-indigo-400/30 via-purple-500/30 to-pink-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Card content */}
                  <div className="relative z-10 p-6 h-full flex flex-col">
                    {/* Image */}
                    {highlight.image_url && (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-sm">
                        <img
                          src={highlight.image_url}
                          alt={highlight.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2" style={{
                          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                        }}>
                          {highlight.title}
                        </h3>
                        <p className="text-blue-200/80 text-sm line-clamp-3 mb-3">
                          {highlight.description}
                        </p>
                      </div>
                      
                      {/* Meta info */}
                      <div className="flex items-center justify-between text-xs text-white/60">
                        {highlight.author && (
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            <span>{highlight.author}</span>
                          </div>
                        )}
                        {highlight.date && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{highlight.date}</span>
                          </div>
                        )}
                        {highlight.featured && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star size={12} fill="currentColor" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Center highlight effect */}
                  {index === currentIndex && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-indigo-500/10 pointer-events-none" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-md bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 z-20"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <ChevronLeft size={20} />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-md bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 z-20"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {highlights.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white w-6' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HighlightsCarousel;
