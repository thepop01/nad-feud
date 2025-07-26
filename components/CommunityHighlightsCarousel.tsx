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

  return (
    <div 
      className={`relative bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/50 border-b border-slate-600/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} />
            <h2 className="text-xl font-bold text-white">Community Highlights</h2>
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            {renderMediaIcon(currentHighlight.media_type)}
            <span className="capitalize">{currentHighlight.media_type}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          {highlights.length > 1 && (
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
              title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
            </button>
          )}
          
          {/* Navigation Buttons */}
          {highlights.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                title="Previous highlight"
              >
                <ChevronLeft size={16} className="text-white" />
              </button>
              <button
                onClick={goToNext}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                title="Next highlight"
              >
                <ChevronRight size={16} className="text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="relative h-72 md:h-96 lg:h-[32rem] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {highlights.length >= 3 ? (
          /* Three-panel layout when we have 3+ highlights */
          <div className="flex h-full gap-2 p-2">
            {/* Left Panel - Secondary Highlight */}
            <motion.div
              className="flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 group cursor-pointer"
              onClick={() => setCurrentIndex((currentIndex - 1 + highlights.length) % highlights.length)}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {highlights[(currentIndex - 1 + highlights.length) % highlights.length].media_type === 'video' ? (
                <video
                  src={highlights[(currentIndex - 1 + highlights.length) % highlights.length].media_url}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  muted
                  loop
                  preload="metadata"
                />
              ) : (
                <img
                  src={highlights[(currentIndex - 1 + highlights.length) % highlights.length].media_url}
                  alt={highlights[(currentIndex - 1 + highlights.length) % highlights.length].title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end">
                <div className="p-4 text-white">
                  <h4 className="font-bold text-sm md:text-base line-clamp-2">
                    {highlights[(currentIndex - 1 + highlights.length) % highlights.length].title}
                  </h4>
                </div>
              </div>
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                {renderMediaIcon(highlights[(currentIndex - 1 + highlights.length) % highlights.length].media_type)}
              </div>
            </motion.div>

            {/* Center Panel - Main Highlight */}
            <motion.div
              className="flex-[2] relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 group"
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              {currentHighlight.media_type === 'video' ? (
                <video
                  src={currentHighlight.media_url}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={currentHighlight.media_url}
                  alt={currentHighlight.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                  loading="lazy"
                />
              )}

              {/* Enhanced overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
                {/* Media type indicator */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2">
                  {renderMediaIcon(currentHighlight.media_type)}
                  <span className="text-sm text-white capitalize font-medium">{currentHighlight.media_type}</span>
                </div>

                {/* Progress indicator */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                  <span className="text-sm text-white font-medium">
                    {currentIndex + 1} / {highlights.length}
                  </span>
                </div>

                {/* Enhanced Content */}
                <div className="p-4 md:p-6 text-white max-w-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-purple-300 text-xs font-medium uppercase tracking-wider">
                      Featured Highlight
                    </span>
                  </div>

                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-3 leading-tight bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {currentHighlight.title}
                  </h2>

                  <p className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2">
                    {currentHighlight.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-green-300 font-medium capitalize">
                        {currentHighlight.category}
                      </span>
                    </div>

                    {currentHighlight.is_featured && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                        <span className="text-yellow-300 font-medium">
                          Featured
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Panel - Next Highlight */}
            <motion.div
              className="flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 group cursor-pointer"
              onClick={() => setCurrentIndex((currentIndex + 1) % highlights.length)}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {highlights[(currentIndex + 1) % highlights.length].media_type === 'video' ? (
                <video
                  src={highlights[(currentIndex + 1) % highlights.length].media_url}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  muted
                  loop
                  preload="metadata"
                />
              ) : (
                <img
                  src={highlights[(currentIndex + 1) % highlights.length].media_url}
                  alt={highlights[(currentIndex + 1) % highlights.length].title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end">
                <div className="p-4 text-white">
                  <h4 className="font-bold text-sm md:text-base line-clamp-2">
                    {highlights[(currentIndex + 1) % highlights.length].title}
                  </h4>
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                {renderMediaIcon(highlights[(currentIndex + 1) % highlights.length].media_type)}
              </div>
            </motion.div>
          </div>
        ) : (
          /* Fallback to single highlight when less than 3 highlights */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {currentHighlight.media_type === 'video' ? (
                <video
                  src={currentHighlight.media_url}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={currentHighlight.media_url}
                  alt={currentHighlight.title}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
                  loading="lazy"
                />
              )}

              {/* Enhanced overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
                {/* Media type indicator */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2">
                  {renderMediaIcon(currentHighlight.media_type)}
                  <span className="text-sm text-white capitalize font-medium">{currentHighlight.media_type}</span>
                </div>

                {/* Progress indicator */}
                {highlights.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                    <span className="text-sm text-white font-medium">
                      {currentIndex + 1} / {highlights.length}
                    </span>
                  </div>
                )}

                {/* Enhanced Content */}
                <div className="p-6 md:p-8 lg:p-10 text-white max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-purple-300 text-sm font-medium uppercase tracking-wider">
                      Community Highlight
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {currentHighlight.title}
                  </h2>

                  <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-6 line-clamp-3">
                    {currentHighlight.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-green-300 text-sm font-medium capitalize">
                        {currentHighlight.category}
                      </span>
                    </div>

                    {currentHighlight.is_featured && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-yellow-300 text-sm font-medium">
                          Featured
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Dots Indicator */}
      {highlights.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 bg-slate-900/30">
          {highlights.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-purple-400 w-8'
                  : 'bg-slate-500 hover:bg-slate-400'
              }`}
              title={`Go to highlight ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar (when playing) */}
      {isPlaying && highlights.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
            key={currentIndex}
          />
        </div>
      )}
    </div>
  );
};

export default CommunityHighlightsCarousel;
