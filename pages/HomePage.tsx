
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Send, AlertTriangle, Settings, Image, Monitor } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question } from '../types';
import LiveQuestionCard from '../components/LiveQuestionCard';
import GifBackground from '../components/GifBackground';
import CelebrationGif from '../components/CelebrationGif';
import LoadingGif from '../components/LoadingGif';
import CommunityMemoriesPanel from '../components/CommunityMemoriesPanel';
import MediaSettings from '../components/MediaSettings';
import AnimatedBackground from '../components/AnimatedBackground';
import { CommunityMemory } from '../types';
import { MediaConfigManager } from '../utils/mediaConfig';


const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'answer_submitted' | 'question_ended' | 'level_up' | 'win' | 'achievement'>('answer_submitted');
  const [communityMemories, setCommunityMemories] = useState<CommunityMemory[]>([]);
  const [showMediaSettings, setShowMediaSettings] = useState(false);
  const [backgroundGifsEnabled, setBackgroundGifsEnabled] = useState(() => {
    // Initialize media config and get the current state
    MediaConfigManager.loadConfig();
    return MediaConfigManager.areBackgroundGifsEnabled();
  });

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

  const fetchCommunityMemories = useCallback(async () => {
    try {
      const data = await supaclient.getCommunityMemories();
      setCommunityMemories(data);
    } catch (error) {
      console.error("Error fetching community memories:", error);
    }
  }, []);

  useEffect(() => {
    fetchLiveQuestions();
    fetchCommunityMemories();
    // Ensure background state is synced with media config
    setBackgroundGifsEnabled(MediaConfigManager.areBackgroundGifsEnabled());
  }, [fetchLiveQuestions, fetchCommunityMemories]);

  const toggleBackgroundMedia = () => {
    const newValue = !backgroundGifsEnabled;
    MediaConfigManager.saveConfig({
      animations: {
        ...MediaConfigManager.getConfig().animations,
        backgroundGifs: newValue
      }
    });
    setBackgroundGifsEnabled(newValue);
    console.log('Background media toggled to:', newValue ? 'GIF' : 'Animated');
  };

  // Debug function - can be called from browser console
  (window as any).resetMediaConfig = () => {
    MediaConfigManager.forceReload();
    setBackgroundGifsEnabled(MediaConfigManager.areBackgroundGifsEnabled());
    console.log('Media config reset. Background GIFs enabled:', MediaConfigManager.areBackgroundGifsEnabled());
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !user) return;
    setIsSubmittingSuggestion(true);
    try {
        await supaclient.submitSuggestion(suggestion, user.id);
        setSuggestion('');

        // Show celebration GIF
        setCelebrationType('answer_submitted');
        setShowCelebration(true);

        // Show success message after celebration
        setTimeout(() => {
          alert("Thanks for your suggestion!");
        }, 1000);
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
          <LoadingGif
            type="gaming"
            size="large"
            message="Loading awesome questions..."
          />
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
        {/* Community Memories Panel */}
        <CommunityMemoriesPanel
          memories={communityMemories}
          className="mb-8"
        />

        <div>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text text-center flex-grow">
                  Live Questions
              </h1>
              <div className="flex items-center gap-2">
                {/* Quick Background Toggle */}
                <button
                  onClick={toggleBackgroundMedia}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    backgroundGifsEnabled
                      ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
                      : 'bg-slate-600/20 text-slate-300 hover:bg-slate-600/30'
                  }`}
                  title={`Switch to ${backgroundGifsEnabled ? 'animated' : 'GIF'} background`}
                >
                  {backgroundGifsEnabled ? <Image size={16} /> : <Monitor size={16} />}
                  <span className="text-sm font-medium">
                    {backgroundGifsEnabled ? 'GIF' : 'Animated'}
                  </span>
                </button>

                {/* Media Settings */}
                <button
                  onClick={() => setShowMediaSettings(true)}
                  className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800/50"
                  title="All Media Settings"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>
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

      {/* Background - switches between animated and GIF based on settings */}
      {backgroundGifsEnabled ? (
        <GifBackground type="gaming" intensity="low" />
      ) : (
        <AnimatedBackground />
      )}

      {/* Celebration GIF overlay */}
      <CelebrationGif
        show={showCelebration}
        type={celebrationType}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Media Settings Modal */}
      <MediaSettings
        isOpen={showMediaSettings}
        onClose={() => setShowMediaSettings(false)}
      />
    </motion.div>
  );
};

export default HomePage;
