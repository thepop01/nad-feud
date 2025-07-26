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

      {/* Enhanced Main Content */}
      <div className="relative h-72 md:h-96 lg:h-[28rem] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
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

            {/* Enhanced overlay with better gradients */}
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
              <div className="p-6 md:p-8 text-white flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                      {currentHighlight.title}
                    </h3>
                    {currentHighlight.description && (
                      <p className="text-slate-200 text-sm md:text-base leading-relaxed opacity-90 max-w-2xl">
                        {currentHighlight.description}
                      </p>
                    )}
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs md:text-sm text-slate-300">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        By {currentHighlight.uploaded_by}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        {new Date(currentHighlight.created_at).toLocaleDateString()}
                      </span>
                      {currentHighlight.view_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          {currentHighlight.view_count} views
                        </span>
                      )}
                    </div>
                  </div>

                  {/* External Link Icon */}
                  {currentHighlight.embedded_link && (
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();

                          // Track the link click
                          if (currentHighlight.embedded_link) {
                            try {
                              await supaclient.trackLinkClick(
                                currentHighlight.id,
                                currentHighlight.embedded_link,
                                user?.id
                              );
                            } catch (error) {
                              console.error('Failed to track link click:', error);
                            }
                          }

                          window.open(currentHighlight.embedded_link, '_blank', 'noopener,noreferrer');
                        }}
                        onMouseEnter={() => {
                          if (currentHighlight.embedded_link?.includes('twitter.com') || currentHighlight.embedded_link?.includes('x.com')) {
                            setShowTwitterPreview(true);
                          }
                        }}
                        onMouseLeave={() => setShowTwitterPreview(false)}
                        className="p-2 bg-slate-800/50 hover:bg-slate-700/70 rounded-lg transition-colors group"
                        title={
                          currentHighlight.embedded_link?.includes('twitter.com') || currentHighlight.embedded_link?.includes('x.com')
                            ? "View on Twitter"
                            : "Visit external link"
                        }
                      >
                        {(currentHighlight.embedded_link?.includes('twitter.com') || currentHighlight.embedded_link?.includes('x.com')) ? (
                          <Twitter
                            size={20}
                            className="text-blue-400 group-hover:text-blue-300 transition-colors"
                          />
                        ) : (
                          <ExternalLink
                            size={20}
                            className="text-white group-hover:text-purple-300 transition-colors"
                          />
                        )}
                      </button>

                      {/* Twitter Preview Tooltip */}
                      {showTwitterPreview && (currentHighlight.embedded_link?.includes('twitter.com') || currentHighlight.embedded_link?.includes('x.com')) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute top-full right-0 mt-2 w-80 z-50"
                        >
                          <TwitterPreview twitterUrl={currentHighlight.embedded_link} />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
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
