import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question } from '../types';

const HomePage: React.FC = () => {
  const { user, login } = useAuth();
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  useEffect(() => {
    const fetchLiveQuestions = async () => {
      try {
        const questions = await supaclient.getLiveQuestions();
        setLiveQuestions(questions);
      } catch (error) {
        console.error('Failed to fetch live questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveQuestions();
  }, [user]);

  const handleAnswerSubmit = async (questionId: string) => {
    if (!answerText.trim() || !user) return;

    setSubmitting(true);
    try {
      await supaclient.submitAnswer(questionId, answerText.trim(), user.id);
      setAnswerText('');
      // Refresh questions to show updated state
      const updatedQuestions = await supaclient.getLiveQuestions();
      setLiveQuestions(updatedQuestions);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !user) return;

    setSubmittingSuggestion(true);
    try {
      await supaclient.submitSuggestion(suggestion.trim(), user.id);
      setSuggestion('');
      alert('Suggestion submitted successfully!');
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
      alert('Failed to submit suggestion. Please try again.');
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to NAD Family Feud! 🎯
        </h1>
        <p className="text-gray-300 text-lg">
          Answer live questions and compete for the top spot on the leaderboard!
        </p>
      </div>

      {!user && (
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">🚀 Join the Game!</h2>
          <p className="text-gray-300 mb-6">
            Connect your Discord account to participate in live questions, submit suggestions, and climb the leaderboard!
          </p>
          <button
            onClick={login}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            🎮 Login with Discord
          </button>
        </div>
      )}

      {/* Live Questions Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-bold text-white">Live Questions</h2>
        </div>

        {liveQuestions.length > 0 ? (
          <div className="space-y-6">
            {liveQuestions.map((question) => (
              <div key={question.id} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-xl">
                <h3 className="text-xl font-semibold text-white mb-4">
                  {question.question_text}
                </h3>
                
                {question.image_url && (
                  <div className="mb-6">
                    <img
                      src={question.image_url}
                      alt="Question"
                      className="max-w-full max-h-64 object-contain rounded-lg mx-auto"
                    />
                  </div>
                )}
                
                {user ? (
                  question.answered ? (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                      <p className="text-green-300 font-medium">✅ You've already answered this question!</p>
                      <p className="text-green-400 text-sm mt-1">Check back for new questions or view results on the leaderboard.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        rows={3}
                        disabled={submitting}
                      />
                      <button
                        onClick={() => handleAnswerSubmit(question.id)}
                        disabled={!answerText.trim() || submitting}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Submitting...
                          </span>
                        ) : (
                          '🚀 Submit Answer'
                        )}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-6 text-center">
                    <p className="text-gray-300 mb-4">🔒 Login required to answer questions</p>
                    <button
                      onClick={login}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200"
                    >
                      Login with Discord
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Live Questions Right Now</h3>
            <p className="text-gray-400">Check back later or submit a suggestion below!</p>
          </div>
        )}
      </div>

      {/* Question Suggestion Section */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">💡</div>
          <h2 className="text-2xl font-bold text-white">Suggest a Question</h2>
        </div>
        
        {user ? (
          <form onSubmit={handleSuggestionSubmit} className="space-y-4">
            <p className="text-gray-300">
              Got an idea for a great Family Feud question? Share it with us!
            </p>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Example: Name something you find in a kitchen..."
              className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              rows={4}
              disabled={submittingSuggestion}
            />
            <button
              type="submit"
              disabled={!suggestion.trim() || submittingSuggestion}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              {submittingSuggestion ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </span>
              ) : (
                '📤 Submit Suggestion'
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-300 mb-4">Login to suggest questions for future games!</p>
            <button
              onClick={login}
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200"
            >
              Login to Suggest
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
