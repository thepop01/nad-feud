import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon, Video, Zap, ExternalLink, Twitter } from 'lucide-react';
import TwitterPreview from './TwitterPreview';
import { CommunityHighlight } from '../types';
import { supaclient } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface CommunityHighlightsCarouselProps {
  highlights: CommunityHighlight[];
  className?: string;
}

const CommunityHighlightsCarousel: React.FC<CommunityHighlightsCarouselProps> = ({
  highlights,
  className = ''
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create extended array for seamless looping
  const extendedHighlights = highlights.length > 0 ? [
    ...highlights.slice(-2), // Last 2 items at the beginning
    ...highlights,
    ...highlights.slice(0, 2)  // First 2 items at the end
  ] : [];

  const actualIndex = currentIndex + 2; // Offset for the prepended items

  // Auto-slide functionality
  useEffect(() => {
    if (isPlaying && !isHovered && !isDragging && highlights.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 4000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isHovered, isDragging, highlights.length]);

  const goToNext = useCallback(() => {
    if (!isDragging) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isDragging]);

  const goToPrevious = useCallback(() => {
    if (!isDragging) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [isDragging]);

  // Handle seamless looping
  useEffect(() => {
    if (highlights.length === 0) return;

    // If we've moved past the end of the real slides, reset to the beginning
    if (currentIndex >= highlights.length) {
      const timer = setTimeout(() => {
        setCurrentIndex(0);
      }, 300); // Small delay to allow animation to complete
      return () => clearTimeout(timer);
    }

    // If we've moved before the beginning of the real slides, reset to the end
    if (currentIndex < 0) {
      const timer = setTimeout(() => {
        setCurrentIndex(highlights.length - 1);
      }, 300); // Small delay to allow animation to complete
      return () => clearTimeout(timer);
    }
  }, [currentIndex, highlights.length]);

  const goToSlide = useCallback((index: number) => {
    if (!isDragging) {
      setCurrentIndex(index);
      trackView(highlights[index]);
    }
  }, [highlights, isDragging]);

  const trackView = async (highlight: CommunityHighlight) => {
    try {
      console.log(`Tracking view for highlight: ${highlight.title}`);
      // await supaclient.incrementViewCount('community_highlights', highlight.id);
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle drag
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 50;

    if (info.offset.x > threshold) {
      goToPrevious();
    } else if (info.offset.x < -threshold) {
      goToNext();
    }
  };

  // Get card style for 3D effect
  const getCardStyle = (index: number) => {
    const distance = index - actualIndex;
    const absDistance = Math.abs(distance);

    if (absDistance > 2) {
      return { opacity: 0, scale: 0.7, rotateY: 0, translateZ: -200, zIndex: 1 };
    }

    if (distance === 0) {
      // Center card
      return { opacity: 1, scale: 1, rotateY: 0, translateZ: 0, zIndex: 10 };
    } else if (distance === -1) {
      // Left card
      return { opacity: 0.7, scale: 0.85, rotateY: 25, translateZ: -100, zIndex: 5 };
    } else if (distance === 1) {
      // Right card
      return { opacity: 0.7, scale: 0.85, rotateY: -25, translateZ: -100, zIndex: 5 };
    } else if (distance === -2) {
      // Far left card
      return { opacity: 0.4, scale: 0.7, rotateY: 45, translateZ: -200, zIndex: 2 };
    } else if (distance === 2) {
      // Far right card
      return { opacity: 0.4, scale: 0.7, rotateY: -45, translateZ: -200, zIndex: 2 };
    }

    return { opacity: 0, scale: 0.7, rotateY: 0, translateZ: -200, zIndex: 1 };
  };

  if (!highlights || highlights.length === 0) {
    return (
      <div className={`bg-slate-800/50 rounded-lg p-8 text-center ${className}`}>
        <ImageIcon className="mx-auto text-slate-400 mb-4" size={48} />
        <p className="text-slate-400 text-lg">No community highlights available</p>
        <p className="text-slate-500 text-sm mt-2">Check back soon for amazing community content!</p>
      </div>
    );
  }

  const renderMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video':
        return <Video size={16} className="text-blue-400" />;
      case 'gif':
        return <Zap size={16} className="text-purple-400" />;
      default:
        return <ImageIcon size={16} className="text-green-400" />;
    }
  };

  return (
    <div className={`relative w-full h-96 overflow-hidden rounded-3xl ${className}`}>
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
        ref={containerRef}
        className="relative flex items-center justify-center h-full px-4 py-8"
        style={{ perspective: '1200px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        dragElastic={0.1}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {extendedHighlights.map((highlight, index) => {
            const cardStyle = getCardStyle(index);
            const distance = Math.abs(index - actualIndex);
            const isVisible = distance <= 2;

            if (!isVisible) return null;

            return (
              <motion.div
                key={`${highlight.id}-${index}`}
                className="absolute w-80 h-72 cursor-pointer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: cardStyle.opacity,
                  scale: cardStyle.scale,
                  rotateY: cardStyle.rotateY,
                  translateZ: cardStyle.translateZ,
                  x: (index - actualIndex) * 280
                }}
                transition={{
                  duration: 0.7,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
                style={{
                  zIndex: cardStyle.zIndex,
                  transformStyle: 'preserve-3d'
                }}
                onClick={() => {
                  if (index >= 2 && index < extendedHighlights.length - 2) {
                    goToSlide(index - 2);
                  }
                }}
              >
                {/* Glassmorphic Card */}
                <div className="relative w-full h-full rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-indigo-500/5 to-purple-600/10 border border-white/20 shadow-2xl overflow-hidden group">
                  {/* Glowing edges */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-indigo-400/30 via-purple-500/30 to-pink-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card content */}
                  <div className="relative z-10 p-6 h-full flex flex-col">
                    {/* Image */}
                    {highlight.media_url && (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-sm">
                        {highlight.media_type === 'video' ? (
                          <video
                            src={highlight.media_url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            muted
                            loop
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={highlight.media_url}
                            alt={highlight.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        )}
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
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {renderMediaIcon(highlight.media_type)}
                            <span className="capitalize">{highlight.media_type}</span>
                          </div>
                          {highlight.embedded_link && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();

                                // Track the link click
                                if (highlight.embedded_link) {
                                  try {
                                    await supaclient.trackLinkClick(
                                      highlight.id,
                                      highlight.embedded_link,
                                      user?.id
                                    );
                                  } catch (error) {
                                    console.error('Failed to track link click:', error);
                                  }
                                }

                                window.open(highlight.embedded_link, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-1 hover:bg-white/20 rounded transition-colors group/link"
                              title={
                                highlight.embedded_link?.includes('twitter.com') || highlight.embedded_link?.includes('x.com')
                                  ? "View on Twitter"
                                  : "Visit external link"
                              }
                            >
                              {(highlight.embedded_link?.includes('twitter.com') || highlight.embedded_link?.includes('x.com')) ? (
                                <Twitter
                                  size={12}
                                  className="text-blue-400 group-hover/link:text-blue-300 transition-colors"
                                />
                              ) : (
                                <ExternalLink
                                  size={12}
                                  className="text-white/60 group-hover/link:text-purple-300 transition-colors"
                                />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {highlight.category && (
                            <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full border border-green-500/30">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              <span className="text-green-300 font-medium capitalize text-xs">
                                {highlight.category}
                              </span>
                            </div>
                          )}
                          {highlight.is_featured && (
                            <div className="flex items-center gap-1 text-yellow-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center highlight effect */}
                  {index === actualIndex && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-indigo-500/10 pointer-events-none" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Navigation Controls */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20">
        <button
          onClick={goToPrevious}
          className="p-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-2xl"
          disabled={highlights.length <= 1}
        >
          <ChevronLeft size={20} className="text-white drop-shadow-lg" />
        </button>
      </div>

      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20">
        <button
          onClick={goToNext}
          className="p-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-2xl"
          disabled={highlights.length <= 1}
        >
          <ChevronRight size={20} className="text-white drop-shadow-lg" />
        </button>
      </div>



      {/* Play/Pause Control */}
      {highlights.length > 1 && (
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={togglePlayPause}
            className="p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
            title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? <Pause size={16} className="text-white drop-shadow-lg" /> : <Play size={16} className="text-white drop-shadow-lg" />}
          </button>
        </div>
      )}

      {/* Bottom Indicators */}
      {highlights.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex gap-2">
            {highlights.map((_, index) => {
              // Calculate the actual current index for dot indicators
              const normalizedCurrentIndex = ((currentIndex % highlights.length) + highlights.length) % highlights.length;
              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === normalizedCurrentIndex
                      ? 'bg-white shadow-lg scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  style={{
                    boxShadow: index === normalizedCurrentIndex ? '0 0 20px rgba(255, 255, 255, 0.8)' : 'none'
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityHighlightsCarousel;
