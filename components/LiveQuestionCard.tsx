
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Send, ShieldAlert } from 'lucide-react';

import { Question } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import Card from './Card';
import Button from './Button';

interface LiveQuestionCardProps {
  question: Question & { answered: boolean };
  onAnswerSubmitted: () => void;
  delay?: number;
}

const LiveQuestionCard: React.FC<LiveQuestionCardProps> = ({ question, onAnswerSubmitted, delay = 0 }) => {
  const { user } = useAuth();
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !user || !user.can_vote) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await supaclient.submitAnswer(question.id, answer, user.id);
      // Don't reset the answer text, as we'll hide the form.
      // Call the parent callback to refresh data, which will mark this question as answered.
      onAnswerSubmitted();
    } catch (err: any) {
      console.error("Failed to submit answer:", err);
      setError(err.message || 'An error occurred while submitting your answer.');
      setIsSubmitting(false); // Only set to false on error, on success the component will re-render as "answered"
    }
  };

  const renderAnswerSection = () => {
    if (question.answered) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 text-green-300 bg-gradient-to-r from-green-900/60 to-green-800/60 p-4 rounded-xl border border-green-600/40 shadow-inner backdrop-blur-sm"
        >
          <CheckCircle size={20} />
          <p className="font-bold">Your answer has been submitted. Thanks for playing!</p>
        </motion.div>
      );
    }

    if (user && !user.can_vote) {
      return (
         <div className="flex items-center gap-3 text-amber-300 bg-gradient-to-r from-amber-900/60 to-amber-800/60 p-4 rounded-xl border border-amber-600/40 shadow-inner backdrop-blur-sm">
            <ShieldAlert size={20} />
            <p className="font-bold">Your current role does not have permission to participate.</p>
        </div>
      );
    }

    if (user) {
      return (
        <div className="pr-6 md:pr-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-full mr-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="flex-grow max-w-[calc(100%-140px)] sm:max-w-[calc(100%-32px)] bg-gradient-to-r from-white/10 to-indigo-500/10 border-2 border-indigo-300/40 rounded-xl px-4 py-3 text-white placeholder-blue-200/70 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-inner font-medium backdrop-blur-md transition-all duration-300 mr-4"
              style={{
                textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05)'
              }}
              disabled={isSubmitting}
              aria-label={`Answer for: ${question.question_text}`}
            />
            <Button type="submit" disabled={!answer.trim() || isSubmitting}>
              {isSubmitting ? 'Submitting...' : <><Send size={18} /> Submit Answer</>}
            </Button>
          </form>
        </div>
      );
    }

    return (
       <div className="flex items-center gap-3 text-slate-300 bg-gradient-to-r from-slate-700/60 to-slate-800/60 p-4 rounded-xl border border-slate-600/40 shadow-inner backdrop-blur-sm">
        <p className="font-bold">Please log in to submit an answer.</p>
      </div>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className="relative group"
    >
      {/* Dark Material Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: delay + 0.2 }}
        className="relative transition-all duration-700"
      >
        {/* 3D Glassmorphic Question Card */}
        <div className="glassmorphic-card group/card relative rounded-3xl p-8 transform-gpu transition-all duration-700 hover:scale-[1.02] hover:translateZ-20">
          {/* Glassmorphic Background with Blur */}
          <div className="absolute inset-0 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-indigo-500/5 to-purple-600/10 border-2 border-indigo-400/30 shadow-2xl"></div>

          {/* Glowing Border Animation */}
          <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-indigo-400/50 via-purple-500/50 to-indigo-400/50 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 animate-pulse-glow"></div>

          {/* Inner Glow Effect */}
          <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-purple-500/5 opacity-60"></div>

          {/* Floating Bubbles Inside Card */}
          <div className="card-bubble card-bubble-1"></div>
          <div className="card-bubble card-bubble-2"></div>
          <div className="card-bubble card-bubble-3"></div>
          <div className="card-bubble card-bubble-4"></div>
          <div className="card-bubble card-bubble-5"></div>
          <div className="card-bubble card-bubble-6"></div>

          {/* 3D Depth Layers */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-purple-800/5 to-indigo-900/10 transform translateZ-[-5px] scale-[0.98] opacity-60"></div>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-950/15 via-purple-900/8 to-indigo-950/15 transform translateZ-[-10px] scale-[0.96] opacity-40"></div>

          {/* Glassmorphic Content Container */}
          <div className="relative z-30 flex flex-col md:flex-row gap-8 items-start transform-gpu transition-all duration-500 group-hover/card:translateY-[-2px] md:pl-4" style={{
            transform: 'translateZ(40px)'
          }}>
            {/* Image embedded in the bar */}
            {question.image_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.8, delay: delay + 0.5 }}
                className="relative flex-shrink-0 group/avatar md:ml-6"
              >
                {/* Pixel Avatar with Glow */}
                <div className="w-full md:w-52 h-36 md:h-40 rounded-2xl overflow-hidden backdrop-blur-md bg-white/10 border-2 border-indigo-300/40 transform-gpu group-hover/card:scale-105 transition-all duration-500 shadow-2xl" style={{
                  boxShadow: '0 0 30px rgba(99, 102, 241, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.2)'
                }}>
                  <img
                    src={question.image_url}
                    alt="Question visual"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Liquid frame effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-300/20 via-transparent to-slate-600/30 pointer-events-none liquid-reflection"></div>
                </div>
              </motion.div>
            )}

            {/* Question and Answer Content */}
            <div className="flex-grow space-y-6">
              {/* Question Text */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: delay + 0.3 }}
              >
                {/* Neon White Headline */}
                <h2 className="text-xl md:text-3xl font-bold text-white leading-tight transform-gpu transition-all duration-300 group-hover/card:scale-[1.02]" style={{
                  textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4), 0 0 60px rgba(99, 102, 241, 0.3)',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                }}>
                  {question.question_text}
                </h2>
              </motion.div>

              {/* Answer Section */}
              {/* Soft-Blue Subtext Answer Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: delay + 0.4 }}
                className="space-y-2 transform-gpu transition-all duration-300 group-hover/card:translateX-1 pr-6 md:pr-8"
                style={{
                  color: '#93c5fd',
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}
              >
                {renderAnswerSection()}
                {error && <p className="text-red-400 mt-2 text-sm font-medium">{error}</p>}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Glassmorphic Depth Layers */}
        <div className="absolute top-2 left-2 right-2 bottom-2 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-purple-600/3 to-indigo-500/5 -z-10 transform-gpu translateZ-[-15px] scale-[0.99] backdrop-blur-sm"></div>

        <div className="absolute top-4 left-4 right-4 bottom-4 rounded-3xl bg-gradient-to-br from-indigo-600/8 via-purple-700/5 to-indigo-600/8 -z-20 transform-gpu translateZ-[-25px] scale-[0.98] backdrop-blur-sm"></div>

        {/* Ambient Glow Shadow */}
        <div className="absolute top-6 left-6 right-6 bottom-6 rounded-3xl -z-30 blur-2xl transform-gpu translateZ-[-35px] scale-[0.95]" style={{
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4) 0%, rgba(147, 51, 234, 0.3) 50%, rgba(0, 0, 0, 0.8) 100%)',
          boxShadow: '0 0 60px rgba(99, 102, 241, 0.3)'
        }}></div>

        {/* Floating Elements Around Card */}
        <div className="floating-element floating-element-1"></div>
        <div className="floating-element floating-element-2"></div>
        <div className="floating-element floating-element-3"></div>
      </motion.div>
    </motion.div>
  );
};

export default LiveQuestionCard;
