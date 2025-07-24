

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, HelpCircle, Calendar, ChevronsUp, Filter } from 'lucide-react';
import Card from '../components/Card';
import { supaclient } from '../services/supabase';
import { LeaderboardUser } from '../types';
import { FILTERABLE_ROLES } from '../services/config';

type View = 'all-time' | 'weekly';

const LeaderboardPage: React.FC = () => {
  const [view, setView] = useState<View>('all-time');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardUser[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setIsLoading(true);
      try {
        const [allTimeData, weeklyData] = await Promise.all([
          supaclient.getLeaderboard(roleFilter || undefined),
          supaclient.getWeeklyLeaderboard(roleFilter || undefined),
        ]);
        setAllTimeLeaderboard(allTimeData);
        setWeeklyLeaderboard(weeklyData);
      } catch (error) {
        console.error("Failed to fetch leaderboards", error);
        // Handle error state if needed
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboards();
  }, [view, roleFilter]);

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-slate-300';
    if (rank === 2) return 'text-yellow-600';
    return 'text-slate-400';
  };
  
  const TabButton: React.FC<{currentView: string; viewName: View; setView: (view: View) => void; children: React.ReactNode}> = ({currentView, viewName, setView, children}) => (
    <button 
      onClick={() => setView(viewName)} 
      className={`relative w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none flex items-center justify-center gap-2 ${currentView === viewName ? 'text-white' : 'text-slate-400 hover:text-white'}`}
      aria-pressed={currentView === viewName}
    >
      {currentView === viewName && (
        <motion.div
          layoutId="leaderboardTab"
          className="absolute inset-0 bg-purple-600/50 rounded-md z-0"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );

  const LeaderboardList: React.FC<{ users: LeaderboardUser[] }> = ({ users }) => {
     const listVariants = {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      };

      const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
        },
      };
      
      return (
        <motion.ul
            className="space-y-2"
            variants={listVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            aria-live="polite"
        >
          {users.length > 0 ? users.map((user, index) => (
            <motion.li
                key={user.id}
                variants={itemVariants}
                className={`flex items-center p-3 rounded-lg ${index < 3 ? 'bg-slate-700/50' : 'bg-slate-800/30'}`}
            >
                <div className={`flex items-center w-12 ${getRankColor(index)}`}>
                {index < 3 ? <Crown className="w-6 h-6" /> : <span className="w-6 h-6 text-center text-lg font-bold">{index + 1}</span>}
                </div>
                <div className="flex items-center flex-grow gap-4">
                <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
                <div className="flex-grow">
                    <p className="font-bold text-lg text-white">{user.nickname || user.username}</p>
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                    <HelpCircle size={12} />
                    {user.questions_participated} questions answered
                    </p>
                </div>
                </div>
                <div className="text-xl font-bold text-purple-400">{user.total_score} pts</div>
            </motion.li>
            )) : (
              <motion.div variants={itemVariants} className="text-center py-8 text-slate-400">
                  No users found for this filter.
              </motion.div>
            )}
        </motion.ul>
      );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <Card>
      <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text mb-6">
        Leaderboard
      </h1>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <div role="tablist" aria-label="Leaderboard timeframe" className="flex justify-center p-1 bg-slate-800/60 rounded-lg w-full sm:w-auto">
            <TabButton currentView={view} viewName="all-time" setView={setView}>
              <ChevronsUp size={16} /> All-Time
            </TabButton>
            <TabButton currentView={view} viewName="weekly" setView={setView}>
              <Calendar size={16} /> Weekly
            </TabButton>
        </div>
        <div className="relative w-full sm:w-auto">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none bg-slate-800/60 text-white rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
                <option value="">All Users</option>
                {FILTERABLE_ROLES.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                ))}
            </select>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
            key={`${view}-${roleFilter}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {view === 'all-time' && <LeaderboardList users={allTimeLeaderboard} />}
            {view === 'weekly' && <LeaderboardList users={weeklyLeaderboard} />}
        </motion.div>
      </AnimatePresence>
      
    </Card>
  );
};

export default LeaderboardPage;