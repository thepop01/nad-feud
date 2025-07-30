import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, ExternalLink, Calendar, Target } from 'lucide-react';
import { EventTask } from '../types';
import { supaclient } from '../services/supabase';

interface EventTaskCarouselProps {
  eventTasks: EventTask[];
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const EventTaskCarousel: React.FC<EventTaskCarouselProps> = ({
  eventTasks,
  className = '',
  autoPlay = true,
  autoPlayInterval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || eventTasks.length <= 1 || isHovered) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % eventTasks.length);
    }, autoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, autoPlayInterval, eventTasks.length, isHovered]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + eventTasks.length) % eventTasks.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % eventTasks.length);
  };

  const handleLinkClick = async (eventTask: EventTask) => {
    if (eventTask.link_url) {
      // Increment view count
      try {
        await supaclient.incrementEventTaskViewCount(eventTask.id);
      } catch (error) {
        console.error('Failed to increment view count:', error);
      }
      
      window.open(eventTask.link_url, '_blank');
    }
  };

  if (!eventTasks || eventTasks.length === 0) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <Target className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-400 text-lg">No ongoing events or tasks at the moment.</p>
          <p className="text-slate-500 text-sm mt-2">Check back soon for exciting new missions!</p>
        </div>
      </div>
    );
  }

  const currentEventTask = eventTasks[currentIndex];

  return (
    <div 
      className={`relative bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Content */}
      <div className="relative h-96">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEventTask.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 flex"
          >
            {/* Media Section */}
            <div className="w-1/2 relative bg-slate-900 flex items-center justify-center">
              {currentEventTask.media_type === 'video' ? (
                <video
                  src={currentEventTask.media_url}
                  className="max-w-full max-h-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={currentEventTask.media_url}
                  alt={currentEventTask.name}
                  className="max-w-full max-h-full object-contain"
                />
              )}
              
              {/* Media Type Indicator */}
              <div className="absolute top-4 left-4">
                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {currentEventTask.media_type.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="w-1/2 p-8 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400 text-sm">
                  <Target size={16} />
                  <span>Ongoing Event</span>
                </div>

                <h3 className="text-2xl font-bold text-white leading-tight">
                  {currentEventTask.name}
                </h3>

                {currentEventTask.description && (
                  <p className="text-slate-300 text-base leading-relaxed">
                    {currentEventTask.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Calendar size={16} />
                  <span>
                    Started {new Date(currentEventTask.created_at).toLocaleDateString()}
                  </span>
                </div>

                {currentEventTask.link_url && (
                  <button
                    onClick={() => handleLinkClick(currentEventTask)}
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                    <ExternalLink size={18} />
                    Join Event
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      {eventTasks.length > 1 && (
        <>
          {/* Previous/Next Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <ChevronRight size={24} />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {eventTasks.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  index === currentIndex
                    ? 'bg-purple-500 scale-125'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Event Counter */}
      {eventTasks.length > 1 && (
        <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {eventTasks.length}
        </div>
      )}
    </div>
  );
};

export default EventTaskCarousel;
