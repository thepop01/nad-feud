import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Trophy, Calendar, ExternalLink, Eye, ArrowLeft, Target, Vote } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { User as UserType, EventTask } from '../types';

interface EventSubmission {
  id: string;
  event_id: string;
  username: string;
  discord_user_id: string;
  avatar_url?: string;
  submission_link: string;
  submission_media?: string;
  description?: string;
  votes: number;
  created_at: string;
  event_name?: string;
}

const UserProfile: React.FC = () => {
  const { discordUserId } = useParams<{ discordUserId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [eventSubmissions, setEventSubmissions] = useState<EventSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submissions'>('submissions');

  useEffect(() => {
    if (discordUserId) {
      fetchUserProfile();
      fetchUserSubmissions();
    }
  }, [discordUserId]);

  const fetchUserProfile = async () => {
    try {
      const user = await supaclient.getUserByDiscordId(discordUserId!);
      setProfileUser(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserSubmissions = async () => {
    try {
      const submissions = await supaclient.getUserEventSubmissions(discordUserId!);
      setEventSubmissions(submissions);
    } catch (error) {
      console.error('Error fetching user submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProfile = currentUser?.discord_user_id === discordUserId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <User size={64} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-slate-400 mb-4">The profile you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 rounded-lg border border-slate-700 p-6 mb-6"
        >
          <div className="flex items-center gap-6">
            {profileUser.avatar_url ? (
              <img
                src={profileUser.avatar_url}
                alt={`${profileUser.username}'s avatar`}
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center border-4 border-purple-500">
                <User size={32} className="text-slate-400" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{profileUser.username}</h1>
              <p className="text-slate-400 mb-2">Discord ID: {profileUser.discord_user_id}</p>
              {profileUser.discord_role && (
                <span className="inline-block px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                  {profileUser.discord_role}
                </span>
              )}
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Trophy size={20} />
                <span className="text-2xl font-bold">{profileUser.total_score || 0}</span>
              </div>
              <p className="text-slate-400 text-sm">Total Score</p>
            </div>
          </div>
        </motion.div>

        {/* Profile Content */}
        <div className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'submissions'
                    ? 'text-white border-b-2 border-purple-500 bg-slate-700/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target size={16} />
                  Event Submissions ({eventSubmissions.length})
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'submissions' && (
              <div>
                {eventSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Target className="mx-auto mb-4" size={48} />
                    <p className="text-lg">No event submissions yet</p>
                    <p className="text-sm">
                      {isOwnProfile ? "You haven't" : `${profileUser.username} hasn't`} submitted to any events.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {eventSubmissions.map((submission) => (
                      <motion.div
                        key={submission.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-700/30 rounded-lg border border-slate-600 p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-semibold mb-1">
                              {submission.event_name || 'Event Submission'}
                            </h3>
                            <p className="text-slate-400 text-sm">
                              {new Date(submission.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-purple-400">
                              <Vote size={16} />
                              <span className="font-bold">{submission.votes}</span>
                            </div>
                          </div>
                        </div>

                        {submission.description && (
                          <p className="text-slate-300 mb-3">{submission.description}</p>
                        )}

                        <div className="flex items-center gap-3">
                          <a
                            href={submission.submission_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink size={14} />
                            View Submission
                          </a>
                          {submission.submission_media && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Eye size={14} />
                              Has Media
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
