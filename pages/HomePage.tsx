
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Send, AlertTriangle, Clock, CheckCircle, Twitter } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question, CommunityHighlight, EventTask } from '../types';
import LiveQuestionCard from '../components/LiveQuestionCard';
import CommunityHighlightsCarousel from '../components/CommunityHighlightsCarousel';
import EventTaskCarousel from '../components/EventTaskCarousel';
import EventSubmissionBar from '../components/EventSubmissionBar';


const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [endedQuestions, setEndedQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [communityHighlights, setCommunityHighlights] = useState<CommunityHighlight[]>([]);
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
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
      // Fetch real ended questions from database
      const endedQuestionsData = await supaclient.getEndedQuestions();

      // Transform the data to match the expected format
      const endedQuestionsWithAnswered: (Question & { answered: boolean })[] = endedQuestionsData.map(item => ({
        ...item.question,
        answered: false // For ended questions, we don't need to check if user answered since they're already ended
      }));

      setEndedQuestions(endedQuestionsWithAnswered);
    } catch (e: any) {
      console.error("Error fetching ended questions:", e);
      // Set empty array if fetch fails
      setEndedQuestions([]);
    }
  }, []);

  const fetchCommunityHighlights = useCallback(async () => {
    try {
      const highlights = await supaclient.getFeaturedHighlights();
      setCommunityHighlights(highlights);
    } catch (e: any) {
      console.error("Error fetching featured highlights:", e);
      // Fallback to empty array if fetch fails
      setCommunityHighlights([]);
    }
  }, []);

  const fetchEventTasks = useCallback(async () => {
    try {
      console.log('HomePage: Fetching event tasks...');
      const events = await supaclient.getEventsTasks();
      console.log('HomePage: Event tasks fetched:', events);
      setEventTasks(events);
    } catch (e: any) {
      console.error("HomePage: Error fetching event tasks:", e);
      console.error("HomePage: Error details:", {
        message: e.message,
        code: e.code,
        details: e.details
      });
      // Fallback to empty array if fetch fails
      setEventTasks([]);
    }
  }, []);

  useEffect(() => {
    fetchLiveQuestions();
    fetchEndedQuestions();
    fetchCommunityHighlights();
    fetchEventTasks();
  }, [fetchLiveQuestions, fetchEndedQuestions, fetchCommunityHighlights, fetchEventTasks]);

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

    // Enhanced Twitter URL validation
    const isValidTwitterUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Check if it's a valid Twitter/X domain
        if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
          return false;
        }

        // Check if it's a status URL (contains /status/)
        if (!url.includes('/status/')) {
          return false;
        }

        // Check if it has a valid tweet ID (numeric)
        const tweetIdMatch = url.match(/\/status\/(\d+)/);
        if (!tweetIdMatch || !tweetIdMatch[1]) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    };

    if (!isValidTwitterUrl(highlightUrl)) {
      alert("Please enter a valid Twitter/X status URL (e.g., https://twitter.com/username/status/123456789)");
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
        if (error instanceof Error) {
          if (error.message.includes('duplicate') || error.message.includes('already exists')) {
            alert("This Twitter URL has already been suggested. Please try a different one.");
          } else if (error.message.includes('invalid') || error.message.includes('valid')) {
            alert("Please enter a valid Twitter/X status URL.");
          } else {
            alert("There was an error submitting your highlight suggestion. Please try again.");
          }
        } else {
          alert("There was an error submitting your highlight suggestion. Please try again.");
        }
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
      {/* Featured Highlights Section */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-4">
            Featured Highlights
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Discover the most captivating stories and breakthroughs from our community
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <CommunityHighlightsCarousel highlights={communityHighlights} />
        </motion.div>
      </div>

      {/* Ongoing Events Section */}
      {eventTasks.length > 0 && (
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-4">
              Ongoing Events
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Join our active missions and community events happening right now
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <EventTaskCarousel eventTasks={eventTasks} className="w-full" />
          </motion.div>

          {/* Submission Bar for events with submission enabled */}
          {eventTasks.length > 0 && eventTasks.some(task => task.submission_type && task.submission_type !== 'none') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-6"
            >
              {eventTasks
                .filter(task => task.submission_type && task.submission_type !== 'none')
                .map(task => (
                  <EventSubmissionBar key={task.id} eventTask={task} className="mb-4 last:mb-0" />
                ))
              }
            </motion.div>
          )}
        </div>
      )}

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

        {/* Content */}
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
                    className="flex-grow bg-gradient-to-r from-white/90 to-white/80 border-2 border-indigo-300/40 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-inner font-medium backdrop-blur-md transition-all duration-300"
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
                    className="w-full bg-gradient-to-r from-white/90 to-white/80 border-2 border-indigo-300/40 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-inner font-medium backdrop-blur-md transition-all duration-300"
                    disabled={isSubmittingHighlight}
                  />
                  <input
                    type="text"
                    value={highlightDescription}
                    onChange={(e) => setHighlightDescription(e.target.value)}
                    placeholder="Brief description (optional)..."
                    className="w-full bg-gradient-to-r from-white/90 to-white/80 border-2 border-indigo-300/40 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-inner font-medium backdrop-blur-md transition-all duration-300"
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
                className="flex-grow bg-gradient-to-r from-gray-300/50 to-gray-200/50 border-2 border-gray-400/40 rounded-xl px-4 py-3 text-gray-600 placeholder-gray-500 cursor-not-allowed shadow-inner font-medium backdrop-blur-md"
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
