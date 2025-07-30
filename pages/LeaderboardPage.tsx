
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, HelpCircle, Calendar, ChevronsUp, Filter, Trophy, Medal, Award, Star, TrendingUp, Users, Target, Vote, Play, Pause, Volume2, VolumeX, ExternalLink, Eye, X, User } from 'lucide-react';
import Card from '../components/Card';
import { supaclient } from '../services/supabase';
import { LeaderboardUser, EventTask } from '../types';
import { FILTERABLE_ROLES } from '../services/config';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface EventSubmission {
  id: string;
  event_id: string;
  username: string;
  discord_user_id: string;
  submission_link: string;
  submission_media?: string;
  description?: string;
  votes: number;
  created_at: string;
  user_voted?: boolean;
}

interface VerticalTabButtonProps {
  currentView: string;
  viewName: string;
  setView: (view: string) => void;
  children: React.ReactNode;
}

const VerticalTabButton: React.FC<VerticalTabButtonProps> = ({ currentView, viewName, setView, children }) => (
  <button
    onClick={() => setView(viewName)}
    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all ${
      currentView === viewName
        ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border-l-4 border-purple-500'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    }`}
  >
    {children}
  </button>
);

type View = 'question-score-alltime' | 'question-score-weekly' | 'voting-running' | 'voting-ended';

const LeaderboardPage: React.FC = () => {
  const { user, hasRequiredRole } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('question-score-alltime');
  const [selectedEvent, setSelectedEvent] = useState<EventTask | null>(null);



  // Question Score Data
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardUser[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardUser[]>([]);

  // Voting Data
  const [runningEvents, setRunningEvents] = useState<EventTask[]>([]);
  const [endedEvents, setEndedEvents] = useState<EventTask[]>([]);
  const [eventSubmissions, setEventSubmissions] = useState<EventSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<EventSubmission[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<EventSubmission | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (hasRequiredRole) {
      fetchInitialData();
    }
  }, [hasRequiredRole]);

  useEffect(() => {
    if (selectedEvent && (view === 'voting-running' || view === 'voting-ended')) {
      console.log('LeaderboardPage: Selected event changed:', selectedEvent);
      console.log('LeaderboardPage: Current view:', view);
      fetchEventSubmissions(selectedEvent.id);
    }
  }, [selectedEvent, view]);

  // Filter submissions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubmissions(eventSubmissions);
    } else {
      const filtered = eventSubmissions.filter(submission =>
        submission.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (submission.discord_user_id && submission.discord_user_id.includes(searchQuery))
      );
      setFilteredSubmissions(filtered);
    }
  }, [eventSubmissions, searchQuery]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);

      // Fetch leaderboard data
      const [allTimeData, weeklyData, runningEventsData, endedEventsData] = await Promise.all([
        supaclient.getLeaderboard(roleFilter || undefined),
        supaclient.getWeeklyLeaderboard(roleFilter || undefined),
        supaclient.getEventsTasks(), // Live events
        supaclient.getAllEventsTasks().then(events => events.filter(e => e.status === 'ended'))
      ]);

      console.log('LeaderboardPage: Running events loaded:', runningEventsData);
      console.log('LeaderboardPage: Ended events loaded:', endedEventsData);

      setAllTimeLeaderboard(allTimeData);
      setWeeklyLeaderboard(weeklyData);
      setRunningEvents(runningEventsData);
      setEndedEvents(endedEventsData);

      // Auto-select first running event if viewing voting
      if (runningEventsData.length > 0 && view === 'voting-running') {
        setSelectedEvent(runningEventsData[0]);
      } else if (endedEventsData.length > 0 && view === 'voting-ended') {
        setSelectedEvent(endedEventsData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventSubmissions = async (eventId: string) => {
    try {
      console.log('LeaderboardPage: Fetching submissions for event ID:', eventId);
      console.log('LeaderboardPage: Current user ID:', user?.id);
      const submissions = await supaclient.getEventSubmissions(eventId, user?.id);
      console.log('LeaderboardPage: Received submissions:', submissions);
      setEventSubmissions(submissions);
    } catch (error) {
      console.error('LeaderboardPage: Error fetching submissions:', error);
      setEventSubmissions([]);
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    try {
      const result = await supaclient.voteForSubmission(submissionId, user.id);

      // Update the local state
      setEventSubmissions(prev => prev.map(sub =>
        sub.id === submissionId
          ? {
              ...sub,
              votes: result.voted ? sub.votes + 1 : sub.votes - 1,
              user_voted: result.voted
            }
          : sub
      ));
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  const navigateToProfile = (discordUserId: string) => {
    navigate(`/profile/${discordUserId}`);
  };

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-slate-300';
    if (rank === 2) return 'text-yellow-600';
    return 'text-slate-400';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="text-yellow-400" size={24} />;
      case 1:
        return <Medal className="text-slate-300" size={24} />;
      case 2:
        return <Award className="text-yellow-600" size={24} />;
      default:
        return <span className="text-slate-400 font-bold text-lg">#{rank + 1}</span>;
    }
  };

  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 text-purple-400" size={64} />
          <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
          <p className="text-slate-400">You need MON, NADS OG, NADS, or FULL ACCESS role to view the leaderboard.</p>
        </div>
      </div>
    );
  }

  const renderQuestionScoreContent = () => {
    const currentData = view === 'question-score-alltime' ? allTimeLeaderboard : weeklyLeaderboard;

    return (
      <div className="space-y-4">
        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Filter size={16} className="inline mr-2" />
            Filter by Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles</option>
            {FILTERABLE_ROLES.map(role => (
              <option key={role.name} value={role.name}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          {currentData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto mb-4 text-slate-400" size={64} />
              <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
              <p className="text-slate-400">
                {view === 'question-score-weekly' ? 'No activity this week yet.' : 'No leaderboard data available.'}
              </p>
            </div>
          ) : (
            currentData.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`p-4 rounded-lg border backdrop-blur-lg ${
                  index < 3 ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-800/30 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {getRankIcon(index)}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-12 h-12 rounded-full border-2 border-purple-500"
                      />
                      <div>
                        <h3 className="text-white font-semibold text-lg">{user.nickname || user.username}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          <HelpCircle size={12} />
                          {user.questions_participated} questions answered
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">{user.total_score} pts</p>
                    <p className="text-slate-400 text-sm">Score</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderVotingContent = () => {
    const events = view === 'voting-running' ? runningEvents : endedEvents;

    if (!selectedEvent) {
      return (
        <div className="text-center py-12">
          <Vote className="mx-auto mb-4 text-slate-400" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">No Events Available</h3>
          <p className="text-slate-400">
            {view === 'voting-running' ? 'No running events with submissions.' : 'No ended events with submissions.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Event Info */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-2">{selectedEvent.name}</h3>
          <p className="text-slate-400">{selectedEvent.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className={`px-3 py-1 rounded-full text-sm ${
              selectedEvent.status === 'live'
                ? 'bg-green-600/20 text-green-400'
                : 'bg-slate-600/20 text-slate-400'
            }`}>
              {selectedEvent.status === 'live' ? 'Running' : 'Ended'}
            </span>
            {selectedEvent.link_url && (
              <a
                href={selectedEvent.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <ExternalLink size={16} />
                Event Link
              </a>
            )}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Submissions ({eventSubmissions.length})</h4>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by username or Discord ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Discord ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Submission</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Votes</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {submission.avatar_url ? (
                          <img
                            src={submission.avatar_url}
                            alt={`${submission.username}'s avatar`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                            <User size={16} className="text-slate-400" />
                          </div>
                        )}
                        <button
                          onClick={() => navigateToProfile(submission.discord_user_id)}
                          className="text-white font-medium hover:text-purple-400 transition-colors"
                        >
                          {submission.username}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-sm">{submission.discord_user_id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={submission.submission_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          Link
                        </a>
                        {submission.submission_media && (
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Eye size={14} />
                            Media
                          </button>
                        )}
                      </div>
                      {submission.description && (
                        <p className="text-slate-400 text-sm mt-1 truncate max-w-xs">
                          {submission.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-purple-400">{submission.votes}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleVote(submission.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          submission.user_voted
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {submission.user_voted ? 'Voted' : 'Vote'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {eventSubmissions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Vote className="mx-auto mb-2" size={32} />
              <p>No submissions yet for this event.</p>
            </div>
          ) : filteredSubmissions.length === 0 && searchQuery ? (
            <div className="text-center py-8 text-slate-400">
              <Vote className="mx-auto mb-2" size={32} />
              <p>No submissions found matching "{searchQuery}".</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-80 bg-slate-900/50 backdrop-blur-lg border-r border-slate-700 overflow-y-auto">
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-6">
              Leaderboard
            </h1>

            {/* Question Score Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Score</h3>
              <div className="space-y-1">
                <VerticalTabButton currentView={view} viewName="question-score-alltime" setView={setView}>
                  <Trophy size={16} className="mr-3" />
                  All Time
                </VerticalTabButton>
                <VerticalTabButton currentView={view} viewName="question-score-weekly" setView={setView}>
                  <Calendar size={16} className="mr-3" />
                  Weekly
                </VerticalTabButton>
              </div>
            </div>

            {/* Voting Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Voting</h3>
              <div className="space-y-1">
                <VerticalTabButton currentView={view} viewName="voting-running" setView={setView}>
                  <Vote size={16} className="mr-3" />
                  Running Events
                </VerticalTabButton>
                <VerticalTabButton currentView={view} viewName="voting-ended" setView={setView}>
                  <Target size={16} className="mr-3" />
                  Ended Events
                </VerticalTabButton>
              </div>
            </div>

            {/* Event List for Voting */}
            {(view === 'voting-running' || view === 'voting-ended') && (
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">
                  {view === 'voting-running' ? 'Running Events' : 'Ended Events'}
                </h4>
                <div className="space-y-2">
                  {(view === 'voting-running' ? runningEvents : endedEvents).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedEvent?.id === event.id
                          ? 'bg-purple-600/20 text-white border border-purple-500/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <p className="font-medium truncate">{event.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {event.status === 'live' ? 'Running' : 'Ended'}
                      </p>
                    </button>
                  ))}
                  {(view === 'voting-running' ? runningEvents : endedEvents).length === 0 && (
                    <p className="text-slate-500 text-sm">No events available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {(view === 'question-score-alltime' || view === 'question-score-weekly') && renderQuestionScoreContent()}
                {(view === 'voting-running' || view === 'voting-ended') && renderVotingContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSubmission(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Submission Details</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-slate-300 font-medium">User: {selectedSubmission.username}</p>
                  <p className="text-slate-400 text-sm">Discord ID: {selectedSubmission.discord_user_id}</p>
                </div>

                {selectedSubmission.description && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Description</h4>
                    <p className="text-slate-300">{selectedSubmission.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-white font-medium mb-2">Link</h4>
                  <a
                    href={selectedSubmission.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    {selectedSubmission.submission_link}
                  </a>
                </div>

                {selectedSubmission.submission_media && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Media</h4>
                    <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                      {selectedSubmission.submission_media.includes('video') || selectedSubmission.submission_media.includes('.mp4') ? (
                        <div className="relative">
                          <video
                            src={selectedSubmission.submission_media}
                            className="w-full max-h-96 object-contain"
                            controls={!isVideoPlaying}
                            autoPlay={isVideoPlaying}
                            muted={isVideoMuted}
                            onPlay={() => setIsVideoPlaying(true)}
                            onPause={() => setIsVideoPlaying(false)}
                          />
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button
                              onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                            >
                              {isVideoPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button
                              onClick={() => setIsVideoMuted(!isVideoMuted)}
                              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                            >
                              {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={selectedSubmission.submission_media}
                          alt="Submission"
                          className="w-full max-h-96 object-contain"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-400">{selectedSubmission.votes} votes</span>
                  </div>
                  <button
                    onClick={() => handleVote(selectedSubmission.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedSubmission.user_voted
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {selectedSubmission.user_voted ? 'Voted' : 'Vote'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardPage;