
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Send, ShieldAlert } from 'lucide-react';

import { Question } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import Card from './Card';
import Button from './Button';

interface LiveQuestionCardProps {
  question: Question & { answered: boolean } & { answer_type?: 'username' | 'general' };
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
        <div className="flex items-center gap-3 text-blue-300 bg-gradient-to-r from-blue-900/60 to-blue-800/60 p-4 rounded-xl border border-blue-600/40 shadow-inner backdrop-blur-sm">
          <CheckCircle size={20} />
          <p className="font-bold">Your answer has been submitted. Thanks for playing!</p>
        </div>
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
      const placeholderText = question.answer_type === 'username'
        ? "Type username for username based answer..."
        : "Type answer for non username based answer...";

      return (
        <div className="pr-6 md:pr-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-full mr-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={placeholderText}
              className="flex-grow max-w-[calc(100%-140px)] sm:max-w-[calc(100%-32px)] bg-gradient-to-r from-white/90 to-white/80 border-2 border-purple-400/60 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-inner shadow-purple-200/20 font-medium backdrop-blur-md transition-all duration-300 mr-4"
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
       <div className="flex items-center gap-3 text-purple-200 bg-gradient-to-r from-purple-700/60 to-purple-800/60 p-4 rounded-xl border border-purple-500/40 shadow-inner backdrop-blur-sm">
        <p className="font-bold">Please log in to submit an answer.</p>
      </div>
    );
  };
  
  return (
    <div className="relative group">
      {/* Dark Material Bar */}
      <div className="relative transition-all duration-700">
        {/* 3D Glassmorphic Question Card */}
        <div className="glassmorphic-card group/card relative rounded-3xl p-8 transform-gpu transition-all duration-700 hover:scale-[1.02] hover:translateZ-20">
          {/* Glassmorphic Background with Blur */}
          <div className="absolute inset-0 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-purple-700/20 border-2 border-purple-400/50 shadow-2xl shadow-purple-500/20"></div>



          {/* Inner Glow Effect */}
          <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-purple-400/10 via-purple-500/5 to-purple-600/10 opacity-80"></div>

          {/* Floating Bubbles Inside Card */}
          <div className="card-bubble card-bubble-1"></div>
          <div className="card-bubble card-bubble-2"></div>
          <div className="card-bubble card-bubble-3"></div>
          <div className="card-bubble card-bubble-4"></div>
          <div className="card-bubble card-bubble-5"></div>
          <div className="card-bubble card-bubble-6"></div>

          {/* 3D Depth Layers */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-700/15 via-purple-800/10 to-purple-900/15 transform translateZ-[-5px] scale-[0.98] opacity-70"></div>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-800/20 via-purple-900/15 to-purple-950/20 transform translateZ-[-10px] scale-[0.96] opacity-50"></div>

          {/* Glassmorphic Content Container */}
          <div className="relative z-30 flex flex-col md:flex-row gap-8 items-start transform-gpu transition-all duration-500 group-hover/card:translateY-[-2px] md:pl-4" style={{
            transform: 'translateZ(40px)'
          }}>
            {/* Image embedded in the bar */}
            {question.image_url && (
              <div className="relative flex-shrink-0 group/avatar md:ml-6">
                {/* Pixel Avatar */}
                <div className="w-full md:w-52 h-36 md:h-40 rounded-2xl overflow-hidden backdrop-blur-md bg-white/10 border-2 border-indigo-300/40 transform-gpu group-hover/card:scale-105 transition-all duration-500 shadow-2xl">
                  <img
                    src={question.image_url}
                    alt="Question visual"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Liquid frame effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-300/20 via-transparent to-slate-600/30 pointer-events-none liquid-reflection"></div>
                </div>
              </div>
            )}

            {/* Question and Answer Content */}
            <div className="flex-grow space-y-6">
              {/* Question Text */}
              <div>
                {/* Question Headline */}
                <h2 className="text-xl md:text-3xl font-bold text-white leading-tight transform-gpu transition-all duration-300 group-hover/card:scale-[1.02]" style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                }}>
                  {question.question_text}
                </h2>
              </div>

              {/* Answer Section */}
              <div
                className="space-y-2 transform-gpu transition-all duration-300 group-hover/card:translateX-1 pr-6 md:pr-8"
                style={{
                  color: '#93c5fd'
                }}
              >
                {renderAnswerSection()}
                {error && <p className="text-red-400 mt-2 text-sm font-medium">{error}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Glassmorphic Depth Layers */}
        <div className="absolute top-2 left-2 right-2 bottom-2 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-purple-600/3 to-indigo-500/5 -z-10 transform-gpu translateZ-[-15px] scale-[0.99] backdrop-blur-sm"></div>

        <div className="absolute top-4 left-4 right-4 bottom-4 rounded-3xl bg-gradient-to-br from-indigo-600/8 via-purple-700/5 to-indigo-600/8 -z-20 transform-gpu translateZ-[-25px] scale-[0.98] backdrop-blur-sm"></div>



        {/* Floating Elements Around Card */}
        <div className="floating-element floating-element-1"></div>
        <div className="floating-element floating-element-2"></div>
        <div className="floating-element floating-element-3"></div>
      </div>
    </div>
  );
};

export default LiveQuestionCard;
