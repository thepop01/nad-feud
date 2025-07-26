import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showTwitterPreview, setShowTwitterPreview] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-slide functionality
  useEffect(() => {
    if (isPlaying && !isHovered && highlights.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % highlights.length);
      }, 4000); // Change slide every 4 seconds
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
  }, [isPlaying, isHovered, highlights.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % highlights.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    // Track view count when slide changes
    trackView(highlights[index]);
  };

  const trackView = async (highlight: CommunityHighlight) => {
    try {
      // Increment view count in database
      // This would be implemented with actual API call to Supabase
      console.log(`Tracking view for highlight: ${highlight.title}`);
      // await supaclient.incrementViewCount('community_highlights', highlight.id);
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
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

  const currentHighlight = highlights[currentIndex];

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
        className="flex items-center justify-center h-full px-8 py-12"
        style={{ perspective: '1000px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="wait">
          {highlights.map((highlight, index) => {
            const cardStyle = getCardStyle(index);
            const isVisible = Math.abs(index - currentIndex) <= 2;

            if (!isVisible) return null;

            return (
              <motion.div
                key={highlight.id}
                className="absolute w-80 h-72 cursor-pointer"
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
                        <div className="flex items-center gap-1">
                          {renderMediaIcon(highlight.media_type)}
                          <span className="capitalize">{highlight.media_type}</span>
                        </div>
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
            {highlights.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-white shadow-lg scale-125'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                style={{
                  boxShadow: index === currentIndex ? '0 0 20px rgba(255, 255, 255, 0.8)' : 'none'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityHighlightsCarousel;
