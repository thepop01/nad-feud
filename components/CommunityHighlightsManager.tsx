import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Trash2, Edit, Eye, EyeOff, Image as ImageIcon, Video, Zap, Save, X, ExternalLink, Link } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import TwitterPreview from './TwitterPreview';
import UrlValidator from './UrlValidator';
import { CommunityHighlight } from '../types';
import { supaclient } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface CommunityHighlightsManagerProps {
  className?: string;
}

const CommunityHighlightsManager: React.FC<CommunityHighlightsManagerProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<CommunityHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<CommunityHighlight | null>(null);
  const [newHighlight, setNewHighlight] = useState({
    title: '',
    description: '',
    media_type: 'image' as 'image' | 'video' | 'gif',
    media_url: '',
    embedded_link: '',
    is_active: true,
    display_order: 1,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    setIsLoading(true);
    try {
      const fetchedHighlights = await supaclient.getCommunityHighlights();
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

    try {
      const highlightData: Omit<CommunityHighlight, 'id' | 'created_at'> = {
        ...newHighlight,
        media_url: previewUrl || newHighlight.media_url,
        uploaded_by: user.id,
        is_active: true,
        display_order: highlights.length + 1,
        created_by: user.id,
        is_featured: false,
        updated_at: new Date().toISOString(),
        view_count: 0
      };

      if (editingHighlight) {
        // Update existing highlight
        const updatedHighlight = await supaclient.updateCommunityHighlight(editingHighlight.id, highlightData);
        setHighlights(prev => prev.map(h => h.id === editingHighlight.id ? updatedHighlight : h));
      } else {
        // Create new highlight
        const newHighlightCreated = await supaclient.createCommunityHighlight(highlightData);
        setHighlights(prev => [...prev, newHighlightCreated]);
      }

      resetForm();
      alert(editingHighlight ? 'Highlight updated successfully!' : 'Highlight added successfully!');
    } catch (error) {
      console.error('Failed to save highlight:', error);
      alert(`Failed to save highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetForm = () => {
    setNewHighlight({
      title: '',
      description: '',
      media_type: 'image',
      media_url: '',
      embedded_link: '',
      is_active: true,
      display_order: 1,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadMethod('file');
    setShowAddModal(false);
    setEditingHighlight(null);
  };

  const handleEdit = (highlight: CommunityHighlight) => {
    setEditingHighlight(highlight);
    setNewHighlight({
      title: highlight.title,
      description: highlight.description || '',
      media_type: highlight.media_type,
      media_url: highlight.media_url,
      is_active: highlight.is_active,
      display_order: highlight.display_order,
    });
    setPreviewUrl(highlight.media_url);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this highlight?')) {
      try {
        setHighlights(prev => prev.filter(h => h.id !== id));
        alert('Highlight deleted successfully!');
      } catch (error) {
        console.error('Failed to delete highlight:', error);
        alert('Failed to delete highlight. Please try again.');
      }
    }
  };

  const toggleActive = async (id: string) => {
    try {
      setHighlights(prev => prev.map(h => 
        h.id === id ? { ...h, is_active: !h.is_active } : h
      ));
    } catch (error) {
      console.error('Failed to toggle highlight status:', error);
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
            <h2 className="text-2xl font-bold text-white">Homepage Community Highlights</h2>
            <p className="text-slate-400 text-sm">Manage highlights shown in the carousel on the homepage</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus size={16} />
            Add Highlight
          </Button>
        </div>

        {/* Highlights List */}
        <div className="space-y-4">
          {highlights.length > 0 ? (
            highlights
              .sort((a, b) => a.display_order - b.display_order)
              .map((highlight) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border transition-all ${
                    highlight.is_active
                      ? 'bg-slate-800/50 border-slate-600'
                      : 'bg-slate-900/50 border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Media Preview */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                      {highlight.media_type === 'video' ? (
                        <video
                          src={highlight.media_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={highlight.media_url}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        {renderMediaIcon(highlight.media_type)}
                        <h3 className="font-semibold text-white">{highlight.title}</h3>
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          Order: {highlight.display_order}
                        </span>
                        {highlight.file_size && (
                          <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                            {formatFileSize(highlight.file_size)}
                          </span>
                        )}
                        {highlight.view_count !== undefined && (
                          <span className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded">
                            {highlight.view_count} views
                          </span>
                        )}
                      </div>
                      {highlight.description && (
                        <p className="text-slate-400 text-sm">{highlight.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(highlight.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          highlight.is_active
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-slate-600/20 text-slate-400 hover:bg-slate-600/30'
                        }`}
                        title={highlight.is_active ? 'Hide from homepage' : 'Show on homepage'}
                      >
                        {highlight.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
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
              <p className="text-slate-400 text-lg">No highlights added yet</p>
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
                    {editingHighlight ? 'Edit Highlight' : 'Add New Highlight'}
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
                        <div className="w-full h-48 rounded-lg overflow-hidden bg-slate-700">
                          {newHighlight.media_type === 'video' ? (
                            <video
                              src={previewUrl}
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          )}
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
                  <div className="grid grid-cols-2 gap-4">
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
                        Status
                      </label>
                      <select
                        value={newHighlight.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setNewHighlight(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                      <Save size={16} />
                      {editingHighlight ? 'Update' : 'Add'} Highlight
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

export default CommunityHighlightsManager;
