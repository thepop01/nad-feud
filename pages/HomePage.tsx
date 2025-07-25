
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Send, AlertTriangle, Clock, CheckCircle, Twitter } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question, CommunityHighlight } from '../types';
import LiveQuestionCard from '../components/LiveQuestionCard';
import CommunityHighlightsCarousel from '../components/CommunityHighlightsCarousel';


const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [endedQuestions, setEndedQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [communityHighlights, setCommunityHighlights] = useState<CommunityHighlight[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'ended'>('live');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [highlightUrl, setHighlightUrl] = useState('');
  const [highlightDescription, setHighlightDescription] = useState('');
  const [isSubmittingHighlight, setIsSubmittingHighlight] = useState(false);
  const [activeTabType, setActiveTabType] = useState<'question' | 'highlight'>('question');

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

  const fetchEndedQuestions = useCallback(async () => {
    try {
      // Mock data for ended questions - replace with actual API call
      const mockEndedQuestions: (Question & { answered: boolean })[] = [
        {
          id: 'ended-1',
          question_text: 'What was your favorite gaming moment this year?',
          image_url: null,
          status: 'ended',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          answered: true,
        },
        {
          id: 'ended-2',
          question_text: 'Which game character would you want as a teammate?',
          image_url: null,
          status: 'ended',
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          updated_at: new Date(Date.now() - 172800000).toISOString(),
          answered: false,
        },
      ];
      setEndedQuestions(mockEndedQuestions);
    } catch (e: any) {
      console.error("Error fetching ended questions:", e);
    }
  }, []);

  const fetchCommunityHighlights = useCallback(async () => {
    try {
      const highlights = await supaclient.getCommunityHighlights();
      setCommunityHighlights(highlights);
    } catch (e: any) {
      console.error("Error fetching community highlights:", e);
      // Fallback to empty array if fetch fails
      setCommunityHighlights([]);
    }
  }, []);

  useEffect(() => {
    fetchLiveQuestions();
    fetchEndedQuestions();
    fetchCommunityHighlights();
  }, [fetchLiveQuestions, fetchEndedQuestions, fetchCommunityHighlights]);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !user) {
      console.log('Suggestion submission blocked:', { suggestion: suggestion.trim(), user });
      return;
    }

    console.log('Submitting suggestion:', { text: suggestion, userId: user.id });
    setIsSubmittingSuggestion(true);
    try {
        const result = await supaclient.submitSuggestion(suggestion, user.id);
        console.log('Suggestion submitted successfully:', result);
        setSuggestion('');
        alert("Thanks for your suggestion!");
    } catch (error) {
        console.error("Failed to submit suggestion:", error);
        console.error("Error details:", error instanceof Error ? error.message : error);
        alert(`There was an error submitting your suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsSubmittingSuggestion(false);
    }
  };

  const handleHighlightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightUrl.trim() || !user) return;

    // Basic Twitter URL validation
    if (!highlightUrl.includes('twitter.com') && !highlightUrl.includes('x.com')) {
      alert("Please enter a valid Twitter/X URL");
      return;
    }

    setIsSubmittingHighlight(true);
    try {
        await supaclient.submitHighlightSuggestion(highlightUrl, highlightDescription, user.id);
        setHighlightUrl('');
        setHighlightDescription('');
        alert("Thanks for your highlight suggestion!");
    } catch (error) {
        console.error("Failed to submit highlight suggestion:", error);
        alert("There was an error submitting your highlight suggestion.");
    } finally {
        setIsSubmittingHighlight(false);
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

    const currentQuestions = activeTab === 'live' ? liveQuestions : endedQuestions;

    if (currentQuestions.length > 0) {
      return currentQuestions.map((question, index) => (
        <LiveQuestionCard
          key={question.id}
          question={question}
          onAnswerSubmitted={activeTab === 'live' ? fetchLiveQuestions : fetchEndedQuestions}
          delay={index * 0.1}
        />
      ));
    }

    return (
      <Card>
        <p className="text-slate-400 text-lg h-48 flex items-center justify-center">
          {activeTab === 'live'
            ? 'No live questions at the moment. Check back soon!'
            : 'No ended questions to show yet.'
          }
        </p>
      </Card>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      {/* Community Highlights Carousel */}
      <CommunityHighlightsCarousel highlights={communityHighlights} />

      {/* Questions Section */}
      <div>
        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-8 text-center">
          Community Questions
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-800/50 rounded-lg p-1 flex">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'live'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Clock size={20} />
              Live Questions
              {liveQuestions.length > 0 && (
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  {liveQuestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'ended'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CheckCircle size={20} />
              Ended Questions
              {endedQuestions.length > 0 && (
                <span className="bg-slate-500 text-white text-xs px-2 py-1 rounded-full">
                  {endedQuestions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Questions Content */}
        <div className="space-y-8">
          {renderContent()}
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Make a Suggestion</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTabType('question')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTabType === 'question'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Lightbulb size={16} />
            Question
          </button>
          <button
            onClick={() => setActiveTabType('highlight')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTabType === 'highlight'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Twitter size={16} />
            Highlight
          </button>
        </div>

        {user ? (
          <>
            {activeTabType === 'question' ? (
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
                <p className="text-slate-400 mb-4">Found an epic gaming moment on Twitter? Share it for potential highlights!</p>
                <form onSubmit={handleHighlightSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={highlightUrl}
                    onChange={(e) => setHighlightUrl(e.target.value)}
                    placeholder="https://twitter.com/username/status/123456789"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                    disabled={isSubmittingHighlight}
                  />
                  <input
                    type="text"
                    value={highlightDescription}
                    onChange={(e) => setHighlightDescription(e.target.value)}
                    placeholder="Brief description (optional)..."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                    disabled={isSubmittingHighlight}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="secondary" disabled={!highlightUrl.trim() || isSubmittingHighlight}>
                      {isSubmittingHighlight ? 'Sending...' : <Send size={20} />}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-slate-400 mb-4">Log in to share your {activeTabType === 'question' ? 'question ideas' : 'highlight suggestions'} with the admins!</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={`Log in to suggest a ${activeTabType}...`}
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
