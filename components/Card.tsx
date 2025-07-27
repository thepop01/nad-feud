
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
      <div className="absolute inset-0 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-purple-700/20 border-2 border-purple-400/50 shadow-2xl shadow-purple-500/20"></div>

      {/* Inner Glow Effect */}
      <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-purple-400/10 via-purple-500/5 to-purple-600/10 opacity-80"></div>

      {/* 3D Depth Layers */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-700/15 via-purple-800/10 to-purple-900/15 transform translateZ-[-5px] scale-[0.98] opacity-70"></div>
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-800/20 via-purple-900/15 to-purple-950/20 transform translateZ-[-10px] scale-[0.96] opacity-50"></div>

      {/* Floating Bubbles Inside Card */}
      <div className="card-bubble card-bubble-1"></div>
      <div className="card-bubble card-bubble-2"></div>
      <div className="card-bubble card-bubble-3"></div>
      <div className="card-bubble card-bubble-4"></div>
      <div className="card-bubble card-bubble-5"></div>
      <div className="card-bubble card-bubble-6"></div>

      {/* Content */}
      <div className="relative z-30">
        {children}
      </div>
    </div>
  );
};

export default Card;
