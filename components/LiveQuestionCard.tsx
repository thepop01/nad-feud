
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
          className="mt-4 flex items-center gap-2 text-green-400 bg-green-900/50 p-3 rounded-lg"
        >
          <CheckCircle size={20} />
          <p className="font-semibold">Your answer has been submitted. Thanks for playing!</p>
        </motion.div>
      );
    }
    
    if (user && !user.can_vote) {
      return (
         <div className="mt-4 flex items-center gap-2 text-yellow-400 bg-yellow-900/50 p-3 rounded-lg">
            <ShieldAlert size={20} />
            <p className="font-semibold">Your current role does not have permission to participate.</p>
        </div>
      );
    }

    if (user) {
      return (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="flex-grow bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
            disabled={isSubmitting}
            aria-label={`Answer for: ${question.question_text}`}
          />
          <Button type="submit" disabled={!answer.trim() || isSubmitting}>
            {isSubmitting ? 'Submitting...' : <><Send size={18} /> Submit Answer</>}
          </Button>
        </form>
      );
    }

    return (
       <div className="mt-4 flex items-center gap-2 text-slate-400 bg-slate-800/50 p-3 rounded-lg">
        <p className="font-semibold">Please log in to submit an answer.</p>
      </div>
    );
  };
  
  return (
    <Card delay={delay}>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {question.image_url && (
            <motion.img 
                src={question.image_url} 
                alt="Question visual" 
                className="w-full md:w-48 h-auto rounded-lg object-cover shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.2 }}
            />
        )}
        <div className="flex-grow">
            <h2 className="text-xl md:text-3xl font-bold text-white leading-tight">
                {question.question_text}
            </h2>
            <div className="mt-4">
              {renderAnswerSection()}
              {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>
        </div>
      </div>
    </Card>
  );
};

export default LiveQuestionCard;
