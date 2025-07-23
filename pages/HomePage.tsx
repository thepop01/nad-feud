import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { Question } from '../types';

const HomePage: React.FC = () => {
  const { user, login } = useAuth();
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [user]); // Refetch when user changes

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">NAD Family Feud</h1>
      
      {!user && (
        <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Join the Game!</h2>
          <p className="text-gray-300 mb-4">
            Login with Discord to participate in live questions and compete on the leaderboard.
          </p>
          <button
            onClick={login}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Login with Discord
          </button>
        </div>
      )}

      {liveQuestions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">🔴 Live Questions</h2>
          {liveQuestions.map((question) => (
            <div key={question.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium mb-4">{question.question_text}</h3>
              
              {question.image_url && (
                <img
                  src={question.image_url}
                  alt="Question"
                  className="max-w-md max-h-64 object-contain rounded mb-4"
                />
              )}
              
              {user ? (
                question.answered ? (
                  <div className="bg-green-900/50 border border-green-700 rounded p-3">
                    <p className="text-green-300">✅ You've already answered this question</p>
                  </div>
                ) : (
                  <QuestionAnswerForm questionId={question.id} userId={user.id} />
                )
              ) : (
                <div className="bg-gray-700 rounded p-4 text-center">
                  <p className="text-gray-400 mb-2">Login to answer this question</p>
                  <button
                    onClick={login}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Login with Discord
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No Live Questions</h2>
          <p className="text-gray-500">Check back later for new questions!</p>
        </div>
      )}
    </div>
  );
};

// Answer form component (only shows for logged-in users)
const QuestionAnswerForm: React.FC<{ questionId: string; userId: string }> = ({ questionId, userId }) => {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setSubmitting(true);
    try {
      await supaclient.submitAnswer(questionId, answer.trim(), userId);
      setSubmitted(true);
      setAnswer('');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-900/50 border border-green-700 rounded p-3">
        <p className="text-green-300">✅ Answer submitted successfully!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
        rows={3}
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={!answer.trim() || submitting}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Answer'}
      </button>
    </form>
  );
};

export default HomePage;
