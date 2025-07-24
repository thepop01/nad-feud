import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Heart, MessageCircle } from 'lucide-react';
import { CommunityMemory } from '../types';
import { MediaConfigManager } from '../utils/mediaConfig';
import Card from './Card';

interface CommunityMemoriesPanelProps {
  memories: CommunityMemory[];
  className?: string;
}

const CommunityMemoriesPanel: React.FC<CommunityMemoriesPanelProps> = ({ 
  memories, 
  className = '' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Filter active memories and sort by display order
  const activeMemories = memories
    .filter(memory => memory.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  // Group memories by position for current display
  const getCurrentMemories = () => {
    if (activeMemories.length === 0) return { center: null, left: null, right: null };

    const centerMemories = activeMemories.filter(m => m.position === 'center');
    const leftMemories = activeMemories.filter(m => m.position === 'left');
    const rightMemories = activeMemories.filter(m => m.position === 'right');

    return {
      center: centerMemories[currentIndex % centerMemories.length] || null,
      left: leftMemories[currentIndex % leftMemories.length] || null,
      right: rightMemories[currentIndex % rightMemories.length] || null,
    };
  };

  const currentMemories = getCurrentMemories();

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || activeMemories.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, activeMemories.length));
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, activeMemories.length]);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % Math.max(1, activeMemories.length));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + activeMemories.length) % Math.max(1, activeMemories.length));
  };

  const renderMedia = (memory: CommunityMemory, position: 'center' | 'left' | 'right') => {
    if (!memory) return null;

    const isCenter = position === 'center';
    const containerClasses = isCenter 
      ? 'aspect-video w-full' 
      : 'aspect-[3/4] w-full';

    const mediaSettings = MediaConfigManager.getVideoSettings();
    const videosEnabled = MediaConfigManager.areVideosEnabled();

    return (
      <motion.div
        key={`${memory.id}-${position}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5 }}
        className={`${containerClasses} relative rounded-lg overflow-hidden bg-slate-800/50 group`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {memory.media_type === 'video' && videosEnabled ? (
          <video
            src={memory.media_url}
            poster={memory.thumbnail_url}
            autoPlay={mediaSettings.autoplay}
            muted={isMuted}
            loop={mediaSettings.loop}
            className="w-full h-full object-cover"
            onError={(e) => console.error('Video failed to load:', e)}
          />
        ) : (
          <img
            src={memory.media_type === 'video' ? memory.thumbnail_url || memory.media_url : memory.media_url}
            alt={memory.title}
            className="w-full h-full object-cover"
            onError={(e) => console.error('Image failed to load:', e)}
          />
        )}

        {/* Overlay with title and description */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">
              {memory.title}
            </h3>
            {memory.description && (
              <p className="text-slate-300 text-xs line-clamp-2">
                {memory.description}
              </p>
            )}
          </div>
        </div>

        {/* Video controls overlay */}
        {memory.media_type === 'video' && videosEnabled && isCenter && (
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4 flex gap-2"
              >
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Media type indicator */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            memory.media_type === 'video' ? 'bg-red-600/80 text-white' :
            memory.media_type === 'gif' ? 'bg-purple-600/80 text-white' :
            'bg-blue-600/80 text-white'
          }`}>
            {memory.media_type.toUpperCase()}
          </span>
        </div>
      </motion.div>
    );
  };

  if (activeMemories.length === 0) {
    return (
      <Card className={`${className} text-center py-8`}>
        <div className="text-slate-400">
          <MessageCircle className="mx-auto mb-4" size={48} />
          <h3 className="text-lg font-semibold mb-2">No Community Memories Yet</h3>
          <p className="text-sm">
            Admins can upload photos, videos, and GIFs to showcase community moments!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className} relative overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="text-purple-400" size={20} />
          <h2 className="text-xl font-bold text-white">Community Memories</h2>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={prevSlide}
              className="text-slate-400 hover:text-white transition-colors p-1"
              disabled={activeMemories.length <= 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-400 px-2">
              {currentIndex + 1} / {activeMemories.length}
            </span>
            <button
              onClick={nextSlide}
              className="text-slate-400 hover:text-white transition-colors p-1"
              disabled={activeMemories.length <= 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Media Display Grid */}
      <div className="grid grid-cols-4 gap-4 h-64">
        {/* Left Portrait */}
        <div className="col-span-1">
          <AnimatePresence mode="wait">
            {currentMemories.left && renderMedia(currentMemories.left, 'left')}
          </AnimatePresence>
        </div>

        {/* Center Landscape */}
        <div className="col-span-2">
          <AnimatePresence mode="wait">
            {currentMemories.center && renderMedia(currentMemories.center, 'center')}
          </AnimatePresence>
        </div>

        {/* Right Portrait */}
        <div className="col-span-1">
          <AnimatePresence mode="wait">
            {currentMemories.right && renderMedia(currentMemories.right, 'right')}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Indicators */}
      {activeMemories.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: activeMemories.length }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-purple-500' : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default CommunityMemoriesPanel;
