import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon, Video, Zap, ExternalLink } from 'lucide-react';
import { CommunityHighlight } from '../types';

interface CommunityHighlightsCarouselProps {
  highlights: CommunityHighlight[];
  className?: string;
}

const CommunityHighlightsCarousel: React.FC<CommunityHighlightsCarouselProps> = ({ 
  highlights, 
  className = '' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
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
          {/* External Link Button */}
          {currentHighlight.embedded_link && (
            <a
              href={currentHighlight.embedded_link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-purple-600/50 hover:bg-purple-500/50 transition-colors group"
              title="View original source"
            >
              <ExternalLink size={16} className="text-white group-hover:text-purple-200" />
            </a>
          )}

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

      {/* Main Content */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {currentHighlight.media_type === 'video' ? (
              <video
                src={currentHighlight.media_url}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={currentHighlight.media_url}
                alt={currentHighlight.title}
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay with title and description */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end">
              <div className="p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">{currentHighlight.title}</h3>
                {currentHighlight.description && (
                  <p className="text-slate-200 text-sm opacity-90">{currentHighlight.description}</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
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
