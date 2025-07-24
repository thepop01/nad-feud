import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaConfigManager } from '../utils/mediaConfig';

interface CelebrationGifProps {
  show: boolean;
  type?: 'answer_submitted' | 'question_ended' | 'level_up' | 'win' | 'achievement';
  duration?: number;
  onComplete?: () => void;
}

const CelebrationGif: React.FC<CelebrationGifProps> = ({ 
  show, 
  type = 'answer_submitted', 
  duration = 3000,
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  const celebrationGifs = {
    answer_submitted: [
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // Sparkles
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // Confetti burst
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Success checkmark
    ],
    question_ended: [
      'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', // Fireworks
      'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', // Party celebration
      'https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif', // Victory dance
    ],
    level_up: [
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // Level up sparkles
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // Achievement unlock
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Power up
    ],
    win: [
      'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', // Big fireworks
      'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', // Massive celebration
      'https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif', // Winner dance
    ],
    achievement: [
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', // Achievement sparkles
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // Trophy celebration
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Medal ceremony
    ]
  };

  const currentGifs = celebrationGifs[type];
  const randomGif = currentGifs[Math.floor(Math.random() * currentGifs.length)];

  const getAnimationVariants = () => {
    switch (type) {
      case 'answer_submitted':
        return {
          initial: { scale: 0, rotate: -180, opacity: 0 },
          animate: { scale: 1, rotate: 0, opacity: 1 },
          exit: { scale: 0, rotate: 180, opacity: 0 }
        };
      case 'question_ended':
        return {
          initial: { y: -100, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: 100, opacity: 0 }
        };
      case 'win':
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: [0, 1.2, 1], opacity: 1 },
          exit: { scale: 0, opacity: 0 }
        };
      default:
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0, opacity: 0 }
        };
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'answer_submitted': return '🎉 Answer Submitted!';
      case 'question_ended': return '🏁 Question Complete!';
      case 'level_up': return '⬆️ Level Up!';
      case 'win': return '🏆 You Win!';
      case 'achievement': return '🎖️ Achievement Unlocked!';
      default: return '🎉 Great Job!';
    }
  };

  // Check if celebration GIFs are enabled
  if (!MediaConfigManager.areCelebrationGifsEnabled()) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background overlay */}
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Main celebration container */}
          <motion.div
            className="relative flex flex-col items-center justify-center"
            variants={getAnimationVariants()}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              duration: 0.6 
            }}
          >
            {/* GIF container */}
            <div className="relative w-64 h-64 mb-4">
              <img
                src={randomGif}
                alt="Celebration"
                className="w-full h-full object-contain rounded-lg"
                style={{ filter: 'brightness(1.1) contrast(1.1)' }}
              />
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur-xl" />
            </div>
            
            {/* Message */}
            <motion.div
              className="bg-slate-800/90 backdrop-blur-sm px-6 py-3 rounded-full border border-purple-500/30"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-white font-bold text-xl text-center">
                {getMessage()}
              </p>
            </motion.div>
          </motion.div>
          
          {/* Particle effects */}
          {type === 'win' && (
            <>
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 100}vw`,
                    y: `${50 + (Math.random() - 0.5) * 100}vh`,
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationGif;
