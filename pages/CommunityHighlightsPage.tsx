import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Image as ImageIcon, Video, Zap, Filter, Grid, List, Search, ExternalLink, Twitter } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import TwitterPreview from '../components/TwitterPreview';
import CommunityHighlightsCarousel from '../components/CommunityHighlightsCarousel';
import { AllTimeCommunityHighlight, CommunityHighlight } from '../types';
import { supaclient } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

const CommunityHighlightsPage: React.FC = () => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<AllTimeCommunityHighlight[]>([]);
  const [filteredHighlights, setFilteredHighlights] = useState<AllTimeCommunityHighlight[]>([]);
  const [dailyHighlights, setDailyHighlights] = useState<CommunityHighlight[]>([]);
  const [weeklyHighlights, setWeeklyHighlights] = useState<CommunityHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredHighlight, setHoveredHighlight] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All Highlights', icon: Star },
    { value: 'gaming', label: 'Gaming', icon: Zap },
    { value: 'community', label: 'Community', icon: ImageIcon },
    { value: 'events', label: 'Events', icon: Video },
    { value: 'achievements', label: 'Achievements', icon: Star },
    { value: 'memories', label: 'Memories', icon: ImageIcon },
  ];

  useEffect(() => {
    fetchHighlights();
    fetchDailyHighlights();
    fetchWeeklyHighlights();
  }, []);

  useEffect(() => {
    filterHighlights();
  }, [highlights, selectedCategory, searchTerm]);

  const fetchHighlights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allTimeHighlights = await supaclient.getAllTimeHighlights();
      setHighlights(allTimeHighlights);
    } catch (err: any) {
      setError(err.message || 'Failed to load community highlights');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailyHighlights = async () => {
    try {
      const highlights = await supaclient.getDailyHighlights();
      setDailyHighlights(highlights);
    } catch (err: any) {
      console.error('Failed to load daily highlights:', err);
      setDailyHighlights([]);
    }
  };

  const fetchWeeklyHighlights = async () => {
    try {
      const highlights = await supaclient.getWeeklyHighlights();
      setWeeklyHighlights(highlights);
    } catch (err: any) {
      console.error('Failed to load weekly highlights:', err);
      setWeeklyHighlights([]);
    }
  };

  const filterHighlights = () => {
    let filtered = highlights;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(highlight => highlight.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(highlight =>
        highlight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (highlight.description && highlight.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort by featured first, then by display order
    filtered.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return a.display_order - b.display_order;
    });

    setFilteredHighlights(filtered);
  };

  const renderMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video':
        return <Video size={16} className="text-blue-400" />;
      case 'gif':
        return <Zap size={16} className="text-purple-400" />;
      default:
        return <ImageIcon size={16} className="text-green-400" />;
    }
  };

  const renderHighlightCard = (highlight: AllTimeCommunityHighlight) => (
    <motion.div
      key={highlight.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        {/* Featured Badge */}
        {highlight.is_featured && (
          <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Star size={12} />
            Featured
          </div>
        )}

        {/* Enhanced Media */}
        <div className="relative h-56 md:h-64 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
          {highlight.media_type === 'video' ? (
            <video
              src={highlight.media_url}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              muted
              loop
              preload="metadata"
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            <img
              src={highlight.media_url}
              alt={highlight.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          )}

          {/* Enhanced overlay with better gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Media type indicator */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {renderMediaIcon(highlight.media_type)}
            <span className="text-xs text-white capitalize font-medium">{highlight.media_type}</span>
          </div>

          {/* Category badge */}
          <div className="absolute top-3 right-3 bg-purple-600/80 backdrop-blur-sm rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs text-white capitalize font-medium">{highlight.category}</span>
          </div>

          {/* Featured indicator */}
          {highlight.is_featured && (
            <div className="absolute bottom-3 left-3 bg-yellow-500/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
              <Star size={12} className="text-white" />
              <span className="text-xs text-white font-medium">Featured</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {renderMediaIcon(highlight.media_type)}
              <span className="text-xs text-slate-400 capitalize">{highlight.media_type}</span>
            </div>
            <div className="flex items-center gap-2">
              {highlight.embedded_link && (
                <div className="relative">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();

                      // Track the link click
                      if (highlight.embedded_link) {
                        try {
                          await supaclient.trackLinkClick(
                            highlight.id,
                            highlight.embedded_link,
                            user?.id
                          );
                        } catch (error) {
                          console.error('Failed to track link click:', error);
                        }
                      }

                      window.open(highlight.embedded_link, '_blank', 'noopener,noreferrer');
                    }}
                    onMouseEnter={() => setHoveredHighlight(highlight.id)}
                    onMouseLeave={() => setHoveredHighlight(null)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors group/link"
                    title={
                      highlight.embedded_link?.includes('twitter.com') || highlight.embedded_link?.includes('x.com')
                        ? "View on Twitter"
                        : "Visit external link"
                    }
                  >
                    {(highlight.embedded_link?.includes('twitter.com') || highlight.embedded_link?.includes('x.com')) ? (
                      <Twitter
                        size={14}
                        className="text-blue-400 group-hover/link:text-blue-300 transition-colors"
                      />
                    ) : (
                      <ExternalLink
                        size={14}
                        className="text-slate-400 group-hover/link:text-purple-300 transition-colors"
                      />
                    )}
                  </button>

                  {/* Twitter Preview Tooltip */}
                  {hoveredHighlight === highlight.id && (highlight.embedded_link?.includes('twitter.com') || highlight.embedded_link?.includes('x.com')) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      className="absolute bottom-full right-0 mb-2 w-80 z-50"
                    >
                      <TwitterPreview twitterUrl={highlight.embedded_link} />
                    </motion.div>
                  )}
                </div>
              )}
              <span className="text-xs text-slate-500 capitalize bg-slate-800 px-2 py-1 rounded">
                {highlight.category}
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
            {highlight.title}
          </h3>
          
          {highlight.description && (
            <p className="text-slate-400 text-sm line-clamp-2">
              {highlight.description}
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );

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
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Error loading highlights: {error}</p>
          <Button onClick={fetchHighlights} variant="secondary">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-4">
          Community Highlights
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Celebrating the best moments, achievements, and memories from our amazing community
        </p>
      </div>

      {/* Daily Highlights Carousel */}
      {dailyHighlights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-transparent bg-clip-text mb-2">
              Daily Highlights
            </h2>
            <p className="text-slate-300 text-base max-w-xl mx-auto">
              Fresh highlights from the last 24 hours
            </p>
          </div>
          <CommunityHighlightsCarousel highlights={dailyHighlights} />
        </motion.div>
      )}

      {/* Weekly Highlights Carousel */}
      {weeklyHighlights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 text-transparent bg-clip-text mb-2">
              Weekly Highlights
            </h2>
            <p className="text-slate-300 text-base max-w-xl mx-auto">
              Top highlights from the past week
            </p>
          </div>
          <CommunityHighlightsCarousel highlights={weeklyHighlights} />
        </motion.div>
      )}

      {/* All-Time Highlights Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-2">
          All-Time Highlights
        </h2>
        <p className="text-slate-300 text-base max-w-xl mx-auto">
          Browse and search through our complete collection of community highlights
        </p>
      </div>

      {/* Filters and Controls */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search highlights..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Icon size={16} />
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="text-slate-400 text-sm">
        Showing {filteredHighlights.length} of {highlights.length} highlights
        {selectedCategory !== 'all' && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Highlights Grid/List */}
      {filteredHighlights.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredHighlights.map(renderHighlightCard)}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <ImageIcon className="mx-auto text-slate-400 mb-4" size={64} />
            <h3 className="text-xl font-bold text-white mb-2">No highlights found</h3>
            <p className="text-slate-400">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Check back soon for amazing community content!'
              }
            </p>
          </div>
        </Card>
      )}
    </motion.div>
  );
};

export default CommunityHighlightsPage;
