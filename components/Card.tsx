
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  delay?: number;
}

const Card: React.FC<CardProps> = ({ children, className = '', delay = 0, ...props }) => {
  return (
    <div
      className={`glassmorphic-card relative rounded-3xl p-8 transform-gpu transition-all duration-700 hover:scale-[1.02] hover:translateZ-20 ${className}`}
      {...props}
    >
      {/* Glassmorphic Background with Blur */}
      <div className="absolute inset-0 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-indigo-500/5 to-purple-600/10 border-2 border-indigo-400/30 shadow-2xl"></div>

      {/* Inner Glow Effect */}
      <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-purple-500/5 opacity-60"></div>

      {/* Content */}
      <div className="relative z-30">
        {children}
      </div>
    </div>
  );
};

export default Card;
