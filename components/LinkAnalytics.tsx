import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ExternalLink, User, Calendar, MousePointer, TrendingUp } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { LinkAnalytics as LinkAnalyticsType } from '../types';
import { supaclient } from '../services/supabase';

const LinkAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<LinkAnalyticsType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await supaclient.getLinkAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch link analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Filter analytics based on time filter
  const filteredAnalytics = analytics.filter(click => {
    const clickDate = new Date(click.clicked_at);
    const now = new Date();
    const diffHours = (now.getTime() - clickDate.getTime()) / (1000 * 60 * 60);

    switch (timeFilter) {
      case '24h':
        return diffHours <= 24;
      case '7d':
        return diffHours <= 24 * 7;
      case '30d':
        return diffHours <= 24 * 30;
      default:
        return true;
    }
  });

  // Group analytics by highlight
  const highlightStats = filteredAnalytics.reduce((acc, click) => {
    const highlightId = click.highlight_id;
    if (!acc[highlightId]) {
      acc[highlightId] = {
        highlight: click.community_highlights,
        clicks: [],
        totalClicks: 0,
        uniqueUsers: new Set()
      };
    }
    acc[highlightId].clicks.push(click);
    acc[highlightId].totalClicks++;
    if (click.user_id) {
      acc[highlightId].uniqueUsers.add(click.user_id);
    }
    return acc;
  }, {} as Record<string, any>);

  // Convert to array and sort by total clicks
  const sortedHighlights = Object.entries(highlightStats)
    .map(([id, stats]) => ({
      id,
      ...stats,
      uniqueUsers: stats.uniqueUsers.size
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks);

  const totalClicks = filteredAnalytics.length;
  const uniqueUsers = new Set(filteredAnalytics.filter(c => c.user_id).map(c => c.user_id)).size;
  const topHighlight = sortedHighlights[0];

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-blue-400" size={24} />
          <div>
            <h2 className="text-2xl font-bold text-white">Link Analytics</h2>
            <p className="text-slate-400 text-sm">
              Track external link clicks and engagement
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {(['24h', '7d', '30d', 'all'] as const).map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeFilter(filter)}
            >
              {filter === 'all' ? 'All Time' : filter.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-900/20 rounded-lg p-4 text-center">
          <MousePointer className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{totalClicks}</div>
          <div className="text-sm text-slate-400">Total Clicks</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 text-center">
          <User className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{uniqueUsers}</div>
          <div className="text-sm text-slate-400">Unique Users</div>
        </div>
        <div className="bg-purple-900/20 rounded-lg p-4 text-center">
          <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{sortedHighlights.length}</div>
          <div className="text-sm text-slate-400">Active Highlights</div>
        </div>
      </div>

      {/* Top Performing Highlights */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Performing Highlights</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        ) : sortedHighlights.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No link clicks recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHighlights.slice(0, 10).map((highlight, index) => (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">
                    {highlight.highlight?.title || 'Unknown Highlight'}
                  </h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-slate-400">
                      {highlight.totalClicks} clicks
                    </span>
                    <span className="text-sm text-slate-400">
                      {highlight.uniqueUsers} unique users
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {highlight.highlight?.embedded_link && (
                    <button
                      onClick={() => window.open(highlight.highlight.embedded_link, '_blank', 'noopener,noreferrer')}
                      className="p-2 hover:bg-slate-700 rounded transition-colors"
                      title="Visit link"
                    >
                      <ExternalLink size={14} className="text-slate-400 hover:text-slate-300" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Clicks */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Clicks</h3>
        
        {filteredAnalytics.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No recent clicks found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAnalytics.slice(0, 50).map((click, index) => (
              <motion.div
                key={click.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-slate-800/30 rounded border border-slate-700/50"
              >
                <div className="flex-shrink-0">
                  {click.users?.avatar_url ? (
                    <img
                      src={click.users.avatar_url}
                      alt={click.users.username || 'User'}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User size={16} className="text-slate-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {click.users?.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-slate-500">clicked</span>
                    <span className="text-sm text-slate-300 truncate">
                      {click.community_highlights?.title || 'Unknown Highlight'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-500">
                      {new Date(click.clicked_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => window.open(click.link_url, '_blank', 'noopener,noreferrer')}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title="Visit clicked link"
                >
                  <ExternalLink size={12} className="text-slate-400 hover:text-slate-300" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default LinkAnalytics;
