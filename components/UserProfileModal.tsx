import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supaclient } from '../services/supabase';
import { UserAnswerHistoryItem } from '../types';
import { X, Award, HelpCircle, Calendar, MessageSquare, Star, ShieldCheck } from 'lucide-react';
import Button from './Button';

interface UserProfileModalProps {
  userId: string;
  username: string;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  nickname?: string;
  avatar_url: string;
  banner_url?: string;
  discord_id: string;
  discord_role?: string;
  total_score: number;
  can_vote: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, username, onClose }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userHistory, setUserHistory] = useState<UserAnswerHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch user profile data
        const [profileData, historyData] = await Promise.all([
          supaclient.getUserProfile(userId),
          supaclient.getUserAnswerHistory(userId)
        ]);
        
        setUserProfile(profileData);
        setUserHistory(historyData);
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex items-center gap-4">
      <div className="text-purple-400">{icon}</div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">User Profile</h2>
          <Button onClick={onClose} variant="secondary" className="p-2">
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 text-lg mb-2">Error</div>
              <p className="text-slate-400">{error}</p>
            </div>
          ) : userProfile ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="bg-slate-700/50 rounded-lg p-6" style={userProfile.banner_url ? {
                backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.9)), url(${userProfile.banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.username}
                    className="w-24 h-24 rounded-full border-4 border-purple-500 shadow-lg bg-slate-800"
                  />
                  <div className="flex-grow text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                      {userProfile.nickname || userProfile.username}
                    </h1>
                    <p className="text-slate-300 drop-shadow-md">@{userProfile.username}</p>
                    <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                      {userProfile.discord_role && (
                        <span className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-semibold">
                          <ShieldCheck size={12} /> {userProfile.discord_role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<Award size={24} />} label="Total Score" value={userProfile.total_score} />
                <StatCard icon={<HelpCircle size={24} />} label="Answers Submitted" value={userHistory.length} />
              </div>

              {/* Answer History */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Recent Answers</h3>
                {userHistory.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {userHistory.slice(0, 10).map((item, index) => (
                      <div key={index} className="bg-slate-800/60 p-4 rounded-lg border-l-4 border-slate-700">
                        <p className="text-sm text-slate-400 mb-2">
                          {item.questions?.question_text || "Question not found"}
                        </p>
                        <div className="flex items-start gap-3">
                          <MessageSquare size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-lg text-slate-100 font-medium">"{item.answer_text}"</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                              <Calendar size={12} />
                              Answered on {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-4">This user hasn't answered any questions yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};
