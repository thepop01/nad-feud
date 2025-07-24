import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaConfigManager } from '../utils/mediaConfig';

interface GifBackgroundProps {
  type?: 'subtle' | 'celebration' | 'loading' | 'gaming';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

const GifBackground: React.FC<GifBackgroundProps> = ({ 
  type = 'subtle', 
  intensity = 'medium',
  className = '' 
}) => {
  const [currentGif, setCurrentGif] = useState(0);

  // Collection of gaming/fun GIFs from popular sources
  const gifCollections = {
    subtle: [
      'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', // Floating particles
      'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', // Gentle waves
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // Soft sparkles
    ],
    celebration: [
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // Confetti
      'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', // Fireworks
      'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', // Party celebration
      'https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif', // Victory dance
    ],
    loading: [
      'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', // Loading spinner
      'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif', // Dots loading
      'https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif', // Pulse loading
    ],
    gaming: [
      'https://media.giphy.com/media/3o6Zt9PivJAtA1xXyg/giphy.gif', // Retro gaming
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Pixel art
      'https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/giphy.gif', // Gaming controller
      'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif', // 8-bit style
    ]
  };

  const currentGifs = gifCollections[type];

  // Rotate through GIFs every 10 seconds
  useEffect(() => {
    if (currentGifs.length > 1) {
      const interval = setInterval(() => {
        setCurrentGif((prev) => (prev + 1) % currentGifs.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentGifs.length]);

  const getOpacity = () => {
    switch (intensity) {
      case 'low': return 'opacity-10';
      case 'medium': return 'opacity-20';
      case 'high': return 'opacity-40';
      default: return 'opacity-20';
    }
  };

  const getBlendMode = () => {
    switch (type) {
      case 'celebration': return 'mix-blend-screen';
      case 'gaming': return 'mix-blend-overlay';
      default: return 'mix-blend-soft-light';
    }
  };

  // Check if background GIFs are enabled
  if (!MediaConfigManager.areBackgroundGifsEnabled()) {
    return null;
  }

  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentGif}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className={`absolute inset-0 ${getOpacity()} ${getBlendMode()}`}
        >
          <img
            src={currentGifs[currentGif]}
            alt="Animated background"
            className="w-full h-full object-cover"
            style={{ 
              filter: type === 'subtle' ? 'blur(1px) brightness(0.7)' : 'brightness(0.8)',
            }}
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Overlay gradient to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/80" />
    </div>
  );
};

export default GifBackground;
