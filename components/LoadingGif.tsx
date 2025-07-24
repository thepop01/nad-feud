import React from 'react';
import { motion } from 'framer-motion';
import { MediaConfigManager } from '../utils/mediaConfig';

interface LoadingGifProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'gaming' | 'fun';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

const LoadingGif: React.FC<LoadingGifProps> = ({ 
  type = 'gaming', 
  size = 'medium',
  message = 'Loading...',
  className = '' 
}) => {
  const loadingGifs = {
    spinner: [
      'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', // Classic spinner
      'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif', // Modern spinner
    ],
    dots: [
      'https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif', // Bouncing dots
      'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', // Pulsing dots
    ],
    pulse: [
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // Gentle pulse
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Heartbeat pulse
    ],
    gaming: [
      'https://media.giphy.com/media/3o6Zt9PivJAtA1xXyg/giphy.gif', // Retro loading
      'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif', // 8-bit loading
      'https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/giphy.gif', // Gaming controller
    ],
    fun: [
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Dancing loading
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // Sparkly loading
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // Party loading
    ]
  };

  const currentGifs = loadingGifs[type];
  const randomGif = currentGifs[Math.floor(Math.random() * currentGifs.length)];

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-16 h-16';
      case 'medium': return 'w-24 h-24';
      case 'large': return 'w-32 h-32';
      default: return 'w-24 h-24';
    }
  };

  const getMessageSize = () => {
    switch (size) {
      case 'small': return 'text-sm';
      case 'medium': return 'text-base';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  // If loading GIFs are disabled, show simple text loading
  if (!MediaConfigManager.areLoadingGifsEnabled()) {
    return (
      <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        {message && (
          <p className={`text-slate-300 font-medium ${getMessageSize()} text-center`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* GIF Container */}
      <motion.div
        className={`${getSizeClasses()} relative`}
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: type === 'spinner' ? [0, 360] : 0
        }}
        transition={{ 
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 2, repeat: Infinity, ease: "linear" }
        }}
      >
        <img
          src={randomGif}
          alt="Loading animation"
          className="w-full h-full object-contain rounded-lg"
          style={{ filter: 'brightness(1.1)' }}
        />
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg blur-lg -z-10" />
      </motion.div>
      
      {/* Loading Message */}
      {message && (
        <motion.p
          className={`text-slate-300 font-medium ${getMessageSize()} text-center`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {message}
        </motion.p>
      )}
      
      {/* Loading dots animation */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-500 rounded-full"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingGif;
