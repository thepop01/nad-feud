import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Trophy, Calendar, ExternalLink, Eye, ArrowLeft, Target, Vote, Edit2, Check, X } from 'lucide-react';
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
  const [isEditingTwitter, setIsEditingTwitter] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [isUpdatingTwitter, setIsUpdatingTwitter] = useState(false);

  useEffect(() => {
    if (discordUserId) {
      fetchUserProfile();
      fetchUserSubmissions();
    }
  }, [discordUserId]);

  const fetchUserProfile = async () => {
    try {
      console.log('🔍 Fetching user profile for ID:', discordUserId);

      let user = null;

      // Try to fetch by Discord ID first
      try {
        user = await supaclient.getUserByDiscordId(discordUserId!);
        console.log('✅ Found user by Discord ID:', user);
      } catch (discordError) {
        console.log('❌ Discord ID lookup failed:', discordError);

        // If Discord ID fails, try regular ID
        try {
          user = await supaclient.getUserById(discordUserId!);
          console.log('✅ Found user by regular ID:', user);
        } catch (regularIdError) {
          console.log('❌ Regular ID lookup also failed:', regularIdError);
          throw new Error('User not found with either Discord ID or regular ID');
        }
      }

      if (user) {
        setProfileUser(user);
        setTwitterUsername(user.twitter_username || '');
      } else {
        throw new Error('User data is null');
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      setProfileUser(null);
    }
  };

  const fetchUserSubmissions = async () => {
    try {
      console.log('🔍 Fetching submissions for ID:', discordUserId);

      let submissions;
      // Try Discord ID first, then regular ID
      try {
        submissions = await supaclient.getUserEventSubmissions(discordUserId!);
        console.log('✅ Found submissions by Discord ID:', submissions.length);
      } catch (discordError) {
        console.log('❌ Discord ID submissions failed, trying by user ID');
        submissions = await supaclient.getUserEventSubmissionsByUserId(discordUserId!);
        console.log('✅ Found submissions by user ID:', submissions.length);
      }

      setEventSubmissions(submissions);
    } catch (error) {
      console.error('❌ Error fetching user submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProfile = currentUser?.discord_id === discordUserId || currentUser?.id === discordUserId;

  const handleTwitterUpdate = async () => {
    if (!currentUser || !isOwnProfile) return;

    setIsUpdatingTwitter(true);
    try {
      await supaclient.updateTwitterUsername(currentUser.id, twitterUsername);
      setProfileUser(prev => prev ? { ...prev, twitter_username: twitterUsername } : null);
      setIsEditingTwitter(false);
    } catch (error) {
      console.error('Error updating Twitter username:', error);
    } finally {
      setIsUpdatingTwitter(false);
    }
  };

  const cancelTwitterEdit = () => {
    setTwitterUsername(profileUser?.twitter_username || '');
    setIsEditingTwitter(false);
  };

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

              {/* Twitter Username */}
              <div className="mb-2">
                {isEditingTwitter && isOwnProfile ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={twitterUsername}
                      onChange={(e) => setTwitterUsername(e.target.value)}
                      placeholder="Twitter username (without @)"
                      className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <button
                      onClick={handleTwitterUpdate}
                      disabled={isUpdatingTwitter}
                      className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={cancelTwitterEdit}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {profileUser.twitter_username ? (
                      <a
                        href={`https://twitter.com/${profileUser.twitter_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        @{profileUser.twitter_username}
                      </a>
                    ) : (
                      <span className="text-slate-500 text-sm">
                        {isOwnProfile ? 'No Twitter username set' : 'No Twitter username'}
                      </span>
                    )}
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditingTwitter(true)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

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
