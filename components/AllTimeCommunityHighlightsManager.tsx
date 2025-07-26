import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Trash2, Edit, Star, StarOff, Image as ImageIcon, Video, Zap, Save, X, Filter, ExternalLink, Link } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import TwitterPreview from './TwitterPreview';
import UrlValidator from './UrlValidator';
import { AllTimeCommunityHighlight } from '../types';
import { supaclient } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface AllTimeCommunityHighlightsManagerProps {
  className?: string;
}

const AllTimeCommunityHighlightsManager: React.FC<AllTimeCommunityHighlightsManagerProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<AllTimeCommunityHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<AllTimeCommunityHighlight | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newHighlight, setNewHighlight] = useState({
    title: '',
    description: '',
    media_type: 'image' as 'image' | 'video' | 'gif',
    media_url: '',
    embedded_link: '',
    category: 'gaming' as 'gaming' | 'community' | 'events' | 'achievements' | 'memories',
    is_featured: false,
    display_order: 1,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [isUploading, setIsUploading] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'community', label: 'Community' },
    { value: 'events', label: 'Events' },
    { value: 'achievements', label: 'Achievements' },
    { value: 'memories', label: 'Memories' },
  ];

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    setIsLoading(true);
    try {
      const fetchedHighlights = await supaclient.getAllTimeHighlights();
      setHighlights(fetchedHighlights);
    } catch (error) {
      console.error('Failed to fetch highlights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Auto-detect media type and track file size
      if (file.type.startsWith('video/')) {
        setNewHighlight(prev => ({ ...prev, media_type: 'video', file_size: file.size }));
      } else if (file.type === 'image/gif') {
        setNewHighlight(prev => ({ ...prev, media_type: 'gif', file_size: file.size }));
      } else {
        setNewHighlight(prev => ({ ...prev, media_type: 'image', file_size: file.size }));
      }
    }
  };

  const handleUrlInput = (url: string) => {
    setNewHighlight(prev => ({ ...prev, media_url: url }));
    setPreviewUrl(url);

    // Auto-detect media type from URL
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov') || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) {
      setNewHighlight(prev => ({ ...prev, media_type: 'video' }));
    } else if (lowerUrl.includes('.gif')) {
      setNewHighlight(prev => ({ ...prev, media_type: 'gif' }));
    } else {
      setNewHighlight(prev => ({ ...prev, media_type: 'image' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to create highlights');
      return;
    }

    setIsUploading(true);
    try {
      let mediaUrl = newHighlight.media_url;

      // Upload file to Community Highlights bucket if a file is selected
      if (selectedFile && uploadMethod === 'file') {
        console.log('Uploading file to Community Highlights bucket...');
        mediaUrl = await supaclient.uploadCommunityHighlightMedia(selectedFile, user.id);
        console.log('File uploaded successfully to community bucket:', mediaUrl);
      } else if (uploadMethod === 'url' && newHighlight.media_url) {
        // Use the provided URL directly
        mediaUrl = newHighlight.media_url;
      }

      if (!mediaUrl) {
        alert('Please provide a media file or URL');
        return;
      }

      const highlightData: Omit<AllTimeCommunityHighlight, 'id' | 'created_at' | 'updated_at'> = {
        ...newHighlight,
        media_url: mediaUrl,
        uploaded_by: user.id,
        display_order: highlights.length + 1
      };

      if (editingHighlight) {
        // If updating and there's a new file, delete the old one
        if (selectedFile && editingHighlight.media_url && uploadMethod === 'file') {
          try {
            await supaclient.deleteHighlightMedia(editingHighlight.media_url);
          } catch (error) {
            console.warn('Failed to delete old media file:', error);
          }
        }

        // Update existing highlight
        const updatedHighlight = await supaclient.updateAllTimeHighlight(editingHighlight.id, highlightData);
        setHighlights(prev => prev.map(h => h.id === editingHighlight.id ? updatedHighlight : h));
      } else {
        // Create new highlight
        const newHighlightCreated = await supaclient.createAllTimeHighlight(highlightData);
        setHighlights(prev => [...prev, newHighlightCreated]);
      }

      resetForm();
      alert(editingHighlight ? 'Highlight updated successfully!' : 'Highlight added successfully!');
    } catch (error) {
      console.error('Failed to save highlight:', error);
      alert(`Failed to save highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setNewHighlight({
      title: '',
      description: '',
      media_type: 'image',
      media_url: '',
      embedded_link: '',
      category: 'gaming',
      is_featured: false,
      display_order: 1,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadMethod('file');
    setShowAddModal(false);
    setEditingHighlight(null);
  };

  const handleEdit = (highlight: AllTimeCommunityHighlight) => {
    setEditingHighlight(highlight);
    setNewHighlight({
      title: highlight.title,
      description: highlight.description || '',
      media_type: highlight.media_type,
      media_url: highlight.media_url,
      category: highlight.category,
      is_featured: highlight.is_featured,
      display_order: highlight.display_order,
    });
    setPreviewUrl(highlight.media_url);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this highlight?')) {
      try {
        // Find the highlight to get the media URL
        const highlightToDelete = highlights.find(h => h.id === id);

        // Delete from database first
        await supaclient.deleteAllTimeHighlight(id);

        // Delete media file from storage if it exists
        if (highlightToDelete?.media_url) {
          try {
            await supaclient.deleteHighlightMedia(highlightToDelete.media_url);
          } catch (error) {
            console.warn('Failed to delete media file:', error);
            // Don't fail the whole operation if file deletion fails
          }
        }

        // Update local state
        setHighlights(prev => prev.filter(h => h.id !== id));
        alert('Highlight deleted successfully!');
      } catch (error) {
        console.error('Failed to delete highlight:', error);
        alert('Failed to delete highlight. Please try again.');
      }
    }
  };

  const toggleFeatured = async (id: string) => {
    try {
      setHighlights(prev => prev.map(h => 
        h.id === id ? { ...h, is_featured: !h.is_featured } : h
      ));
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
    }
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredHighlights = selectedCategory === 'all' 
    ? highlights 
    : highlights.filter(h => h.category === selectedCategory);

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-slate-300">Loading highlights...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">All-Time Community Highlights</h2>
            <p className="text-slate-400 text-sm">Manage highlights shown on the dedicated community highlights page</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus size={16} />
            Add Highlight
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{highlights.length}</div>
            <div className="text-slate-400 text-sm">Total Highlights</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{highlights.filter(h => h.is_featured).length}</div>
            <div className="text-slate-400 text-sm">Featured</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{highlights.filter(h => h.media_type === 'video').length}</div>
            <div className="text-slate-400 text-sm">Videos</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{highlights.filter(h => h.media_type === 'image').length}</div>
            <div className="text-slate-400 text-sm">Images</div>
          </div>
        </div>

        {/* Highlights List */}
        <div className="space-y-4">
          {filteredHighlights.length > 0 ? (
            filteredHighlights
              .sort((a, b) => {
                // Featured first, then by display order
                if (a.is_featured && !b.is_featured) return -1;
                if (!a.is_featured && b.is_featured) return 1;
                return a.display_order - b.display_order;
              })
              .map((highlight) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border bg-slate-800/50 border-slate-600"
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Enhanced Media Preview */}
                    <div className="w-full lg:w-48 h-32 lg:h-28 rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 relative group">
                      {highlight.media_type === 'video' ? (
                        <video
                          src={highlight.media_url}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={highlight.media_url}
                          alt={highlight.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                      {/* Media type overlay */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                        {renderMediaIcon(highlight.media_type)}
                        <span className="text-xs text-white capitalize">{highlight.media_type}</span>
                      </div>
                      {/* Featured indicator */}
                      {highlight.is_featured && (
                        <div className="absolute top-2 right-2 bg-yellow-500/90 backdrop-blur-sm rounded-lg p-1.5">
                          <Star size={12} className="text-white" />
                        </div>
                      )}
                      {/* Category badge */}
                      <div className="absolute bottom-2 left-2 bg-purple-600/80 backdrop-blur-sm rounded-lg px-2 py-1">
                        <span className="text-xs text-white capitalize font-medium">{highlight.category}</span>
                      </div>
                    </div>

                    {/* Enhanced Content */}
                    <div className="flex-grow space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-white text-lg leading-tight">{highlight.title}</h3>
                        {highlight.is_featured && (
                          <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <Star size={12} />
                            Featured
                          </span>
                        )}
                      </div>
                      {highlight.description && (
                        <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">{highlight.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full capitalize">
                          {highlight.category}
                        </span>
                        <span className="bg-slate-600/20 text-slate-400 px-2 py-1 rounded-full">
                          Order: {highlight.display_order}
                        </span>
                        {highlight.file_size && (
                          <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full">
                            {formatFileSize(highlight.file_size)}
                          </span>
                        )}
                        {highlight.view_count !== undefined && (
                          <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded-full">
                            {highlight.view_count} views
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFeatured(highlight.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          highlight.is_featured
                            ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                            : 'bg-slate-600/20 text-slate-400 hover:bg-slate-600/30'
                        }`}
                        title={highlight.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        {highlight.is_featured ? <Star size={16} /> : <StarOff size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(highlight)}
                        className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                        title="Edit highlight"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(highlight.id)}
                        className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                        title="Delete highlight"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-400 text-lg">
                {selectedCategory === 'all' ? 'No highlights added yet' : `No ${selectedCategory} highlights found`}
              </p>
              <p className="text-slate-500 text-sm">Add your first community highlight to get started!</p>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {editingHighlight ? 'Edit All-Time Highlight' : 'Add New All-Time Highlight'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Upload Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Upload Method
                    </label>
                    <div className="flex border border-slate-600 rounded-lg overflow-hidden mb-4">
                      <button
                        type="button"
                        onClick={() => setUploadMethod('file')}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${
                          uploadMethod === 'file'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Upload size={16} className="inline mr-2" />
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMethod('link')}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${
                          uploadMethod === 'link'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        🔗 Upload by Link
                      </button>
                    </div>

                    {uploadMethod === 'file' ? (
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="media-upload"
                        />
                        <label htmlFor="media-upload" className="cursor-pointer">
                          <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                          <p className="text-slate-400">Click to upload media file</p>
                          <p className="text-slate-500 text-sm">Supports images, videos, and GIFs</p>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="url"
                          value={newHighlight.media_url}
                          onChange={(e) => handleUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg or https://youtube.com/watch?v=..."
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <p className="text-slate-500 text-sm">
                          Supports direct links to images, videos, GIFs, YouTube, Vimeo, etc.
                        </p>
                      </div>
                    )}
                    {previewUrl && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Media Preview
                        </label>
                        <div className="w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 relative group">
                          {newHighlight.media_type === 'video' ? (
                            <video
                              src={previewUrl}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}
                          {/* Media type indicator */}
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                            {renderMediaIcon(newHighlight.media_type)}
                            <span className="text-sm text-white capitalize font-medium">{newHighlight.media_type}</span>
                          </div>
                          {/* Category indicator */}
                          <div className="absolute top-3 right-3 bg-purple-600/80 backdrop-blur-sm rounded-lg px-3 py-1">
                            <span className="text-sm text-white capitalize font-medium">{newHighlight.category}</span>
                          </div>
                          {/* Preview label */}
                          <div className="absolute bottom-3 right-3 bg-blue-600/80 backdrop-blur-sm rounded-lg px-3 py-1">
                            <span className="text-sm text-white font-medium">Preview</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newHighlight.title}
                      onChange={(e) => setNewHighlight(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter highlight title"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newHighlight.description}
                      onChange={(e) => setNewHighlight(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter highlight description"
                      rows={3}
                    />
                  </div>

                  {/* Embedded Link */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Link size={16} className="inline mr-2" />
                      Embedded Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={newHighlight.embedded_link}
                      onChange={(e) => setNewHighlight(prev => ({ ...prev, embedded_link: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="https://twitter.com/example or any external link"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Add a link that users can click to visit (Twitter, YouTube, etc.)
                    </p>

                    {/* URL Validation */}
                    {newHighlight.embedded_link && (
                      <div className="mt-3">
                        <UrlValidator url={newHighlight.embedded_link} />
                      </div>
                    )}

                    {/* Twitter Preview */}
                    {newHighlight.embedded_link && (newHighlight.embedded_link.includes('twitter.com') || newHighlight.embedded_link.includes('x.com')) && (
                      <div className="mt-3">
                        <TwitterPreview twitterUrl={newHighlight.embedded_link} />
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Category
                      </label>
                      <select
                        value={newHighlight.category}
                        onChange={(e) => setNewHighlight(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="gaming">Gaming</option>
                        <option value="community">Community</option>
                        <option value="events">Events</option>
                        <option value="achievements">Achievements</option>
                        <option value="memories">Memories</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={newHighlight.display_order}
                        onChange={(e) => setNewHighlight(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Featured
                      </label>
                      <select
                        value={newHighlight.is_featured ? 'yes' : 'no'}
                        onChange={(e) => setNewHighlight(prev => ({ ...prev, is_featured: e.target.value === 'yes' }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {editingHighlight ? 'Update' : 'Add'} Highlight
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default AllTimeCommunityHighlightsManager;
