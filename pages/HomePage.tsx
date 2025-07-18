
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Send, AlertTriangle, VenetianMask } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question } from '../types';

const HomePage: React.FC = () => {
  const { user, canVote } = useAuth();
  const [liveQuestion, setLiveQuestion] = useState<(Question & { answered: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const fetchLiveQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supaclient.getLiveQuestion();
      setLiveQuestion(data);
    } catch (e: any) {
      console.error("Error fetching live question:", e);
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        setError('Could not connect to the server. Please ensure your Supabase URL is correct and that you have configured CORS for this domain in your Supabase project settings.');
      } else {
        setError(e.message || 'An unknown error occurred while fetching the question.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveQuestion();
  }, [fetchLiveQuestion]);

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !liveQuestion || !user) return;
    setIsSubmitting(true);
    try {
        await supaclient.submitAnswer(liveQuestion.id, answer, user.id);
        setAnswer('');
        fetchLiveQuestion(); // Refetch to update answered status
    } catch (error) {
        console.error("Failed to submit answer:", error);
        alert("There was an error submitting your answer.");
    } finally {
        setIsSubmitting(false);
    }
  };

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

  const renderAnswerSection = () => {
    if (!user) {
      return <p className="text-slate-400">Please log in to submit an answer.</p>;
    }
    if (liveQuestion.answered) {
      return (
        <div className="p-4 bg-green-500/20 text-green-300 rounded-lg">
          <p className="font-semibold">Thanks for your answer! Results will be revealed when the question ends.</p>
        </div>
      );
    }
    if (!canVote) {
       return (
          <div className="p-4 bg-yellow-900/50 text-yellow-300 rounded-lg flex items-center gap-3 justify-center">
            <VenetianMask className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <p className="font-semibold">You do not have a required role to participate in the feud.</p>
          </div>
        );
    }
    return (
       <form onSubmit={handleAnswerSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your one-word answer..."
            className="flex-grow bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={!answer.trim() || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </form>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <Card>
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-4">
            Live Question
          </h1>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/50 text-red-300 rounded-lg text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 mt-1 text-red-400 flex-shrink-0" />
                <div>
                  <p className="font-bold">Error Loading Data</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          ) : liveQuestion ? (
            <div className="space-y-6">
              {liveQuestion.image_url && (
                <img src={liveQuestion.image_url} alt="Question visual" className="rounded-lg mx-auto max-h-64 shadow-lg"/>
              )}
              <p className="text-xl md:text-2xl text-slate-200">
                {liveQuestion.question_text}
              </p>
              {renderAnswerSection()}
            </div>
          ) : (
            <p className="text-slate-400 text-lg h-48 flex items-center justify-center">No live question at the moment. Check back soon!</p>
          )}
        </div>
      </Card>

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