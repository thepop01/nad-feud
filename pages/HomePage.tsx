
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Send, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question } from '../types';
import LiveQuestionCard from '../components/LiveQuestionCard';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const fetchLiveQuestions = useCallback(async () => {
    // Only set loading true on initial fetch
    if (liveQuestions.length === 0) setIsLoading(true);
    setError(null);
    try {
      const data = await supaclient.getLiveQuestions();
      setLiveQuestions(data);
    } catch (e: any) {
      console.error("Error fetching live questions:", e);
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        setError('Could not connect to the server. Please ensure your Supabase URL is correct and that you have configured CORS for this domain in your Supabase project settings.');
      } else {
        setError(e.message || 'An unknown error occurred while fetching questions.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [liveQuestions.length]);

  useEffect(() => {
    fetchLiveQuestions();
  }, [fetchLiveQuestions]);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !user) return;
    setIsSubmittingSuggestion(true);
    try {
        await supaclient.submitSuggestion(suggestion, user.id);
        setSuggestion('');
        alert("Thanks for your suggestion!");
    } catch (error) {
        console.error("Failed to submit suggestion:", error);
        alert("There was an error submitting your suggestion.");
    } finally {
        setIsSubmittingSuggestion(false);
    }
  };

  const renderContent = () => {
     if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <Card>
            <div className="p-4 bg-red-900/50 text-red-300 rounded-lg text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 mt-1 text-red-400 flex-shrink-0" />
                <div>
                  <p className="font-bold">Error Loading Data</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
        </Card>
      );
    }
    
    if (liveQuestions.length > 0) {
        return liveQuestions.map((question, index) => (
            <LiveQuestionCard 
                key={question.id} 
                question={question}
                onAnswerSubmitted={fetchLiveQuestions}
                delay={index * 0.1}
            />
        ));
    }

    return (
        <Card>
            <p className="text-slate-400 text-lg h-48 flex items-center justify-center">No live questions at the moment. Check back soon!</p>
        </Card>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
        <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-8 text-center">
                Live Questions
            </h1>
            <div className="space-y-8">
                {renderContent()}
            </div>
        </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Suggest a Question</h2>
        </div>
        {user ? (
          <>
            <p className="text-slate-400 mb-4">Have a great idea for a question? Share it with the admins!</p>
            <form onSubmit={handleSuggestionSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Your brilliant question idea..."
                className="flex-grow bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                disabled={isSubmittingSuggestion}
              />
              <Button type="submit" variant="secondary" disabled={!suggestion.trim() || isSubmittingSuggestion}>
                {isSubmittingSuggestion ? 'Sending...' : <Send size={20} />}
              </Button>
            </form>
          </>
        ) : (
           <>
            <p className="text-slate-400 mb-4">Log in to share your question ideas with the admins!</p>
            <div className="flex flex-col sm:flex-row gap-2">
               <input
                type="text"
                placeholder="Log in to suggest a question..."
                className="flex-grow bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-400 placeholder-slate-500 cursor-not-allowed"
                disabled
              />
              <Button variant="secondary" disabled>
                <Send size={20} />
              </Button>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
};

export default HomePage;
