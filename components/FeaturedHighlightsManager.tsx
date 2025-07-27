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

interface FeaturedHighlightsManagerProps {
  className?: string;
  showAllHighlights?: boolean; // If true, shows all highlights including inactive ones
}

const FeaturedHighlightsManager: React.FC<FeaturedHighlightsManagerProps> = ({ className = '', showAllHighlights = false }) => {
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
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    setIsLoading(true);
    try {
      const fetchedHighlights = showAllHighlights
        ? await supaclient.getAllFeaturedHighlights()
        : await supaclient.getFeaturedHighlights();
      setHighlights(fetchedHighlights);
    } catch (error) {
      console.error('Failed to fetch featured highlights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setNewHighlight(prev => ({ ...prev, media_url: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUploading(true);
    try {
      let mediaUrl = newHighlight.media_url;

      // Upload file if using file method
      if (uploadMethod === 'file' && selectedFile) {
        const uploadedUrl = await supaclient.uploadFile(selectedFile, 'homepage-highlights');
        mediaUrl = uploadedUrl;
      }

      const highlightData = {
        ...newHighlight,
        media_url: mediaUrl,
        uploaded_by: user.id,
        created_by: user.id,
      };

      if (editingHighlight) {
        await supaclient.updateFeaturedHighlight(editingHighlight.id, highlightData);
      } else {
        await supaclient.createFeaturedHighlight(highlightData);
      }

      // Reset form
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
      setShowAddModal(false);
      setEditingHighlight(null);
      
      await fetchHighlights();
    } catch (error) {
      console.error('Failed to save featured highlight:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save featured highlight: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (highlight: CommunityHighlight) => {
    setEditingHighlight(highlight);
    setNewHighlight({
      title: highlight.title,
      description: highlight.description || '',
      media_type: highlight.media_type,
      media_url: highlight.media_url,
      embedded_link: highlight.embedded_link || '',
      is_active: highlight.is_active,
      display_order: highlight.display_order,
    });
    setPreviewUrl(highlight.media_url);
    setUploadMethod('link');
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this featured highlight?')) return;

    try {
      await supaclient.deleteFeaturedHighlight(id);
      await fetchHighlights();
    } catch (error) {
      console.error('Failed to delete featured highlight:', error);
      alert('Failed to delete featured highlight. Please try again.');
    }
  };

  const toggleActive = async (highlight: CommunityHighlight) => {
    try {
      await supaclient.updateFeaturedHighlight(highlight.id, {
        is_active: !highlight.is_active
      });
      await fetchHighlights();
    } catch (error) {
      console.error('Failed to toggle highlight status:', error);
      alert('Failed to update highlight status. Please try again.');
    }
  };

  const renderMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video': return <Video size={16} className="text-red-400" />;
      case 'gif': return <Zap size={16} className="text-yellow-400" />;
      default: return <ImageIcon size={16} className="text-blue-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Featured Highlights
            </h2>
            <p className="text-slate-400">
              Manage featured highlights that appear on the homepage carousel
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Featured Highlight
          </Button>
        </div>

        {highlights.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto text-slate-400 mb-4" size={64} />
            <h3 className="text-xl font-bold text-white mb-2">No featured highlights yet</h3>
            <p className="text-slate-400 mb-4">Create your first featured highlight to get started</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Add Featured Highlight
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((highlight) => (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
              >
                {/* Media Preview */}
                <div className="relative h-48 bg-slate-900">
                  {highlight.media_url && (
                    <>
                      {highlight.media_type === 'video' ? (
                        <video
                          src={highlight.media_url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                        />
                      ) : (
                        <img
                          src={highlight.media_url}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </>
                  )}
                  
                  {/* Media type overlay */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                    {renderMediaIcon(highlight.media_type)}
                    <span className="text-xs text-white capitalize">{highlight.media_type}</span>
                  </div>
                  
                  {/* Status overlay */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                    highlight.is_active 
                      ? 'bg-green-600/80 text-green-100' 
                      : 'bg-red-600/80 text-red-100'
                  }`}>
                    {highlight.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2 line-clamp-2">{highlight.title}</h3>
                  {highlight.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{highlight.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Order: {highlight.display_order}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(highlight)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title={highlight.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {highlight.is_active ? (
                          <EyeOff size={14} className="text-slate-400" />
                        ) : (
                          <Eye size={14} className="text-slate-400" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleEdit(highlight)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} className="text-slate-400" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(highlight.id)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingHighlight ? 'Edit Featured Highlight' : 'Add Featured Highlight'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Upload Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Upload Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="file"
                        checked={uploadMethod === 'file'}
                        onChange={(e) => setUploadMethod(e.target.value as 'file' | 'link')}
                        className="mr-2"
                      />
                      <span className="text-slate-300">Upload File</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="link"
                        checked={uploadMethod === 'link'}
                        onChange={(e) => setUploadMethod(e.target.value as 'file' | 'link')}
                        className="mr-2"
                      />
                      <span className="text-slate-300">Media URL</span>
                    </label>
                  </div>
                </div>

                {/* File Upload or URL Input */}
                {uploadMethod === 'file' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Media File
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Media URL
                    </label>
                    <input
                      type="url"
                      value={newHighlight.media_url}
                      onChange={(e) => {
                        setNewHighlight(prev => ({ ...prev, media_url: e.target.value }));
                        setPreviewUrl(e.target.value);
                      }}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                )}

                {/* Media Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Media Type</label>
                  <select
                    value={newHighlight.media_type}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, media_type: e.target.value as 'image' | 'video' | 'gif' }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="gif">GIF</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={newHighlight.title}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    placeholder="Enter highlight title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newHighlight.description}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    placeholder="Enter highlight description"
                    rows={3}
                  />
                </div>

                {/* Embedded Link */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Embedded Link (Optional)</label>
                  <input
                    type="url"
                    value={newHighlight.embedded_link}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, embedded_link: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    placeholder="https://twitter.com/..."
                  />
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={newHighlight.display_order}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    min="1"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newHighlight.is_active}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-slate-300">Active (visible on homepage)</label>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Preview</label>
                    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                      {newHighlight.media_type === 'video' ? (
                        <video
                          src={previewUrl}
                          className="w-full h-48 object-cover rounded"
                          controls
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading || !newHighlight.title || !newHighlight.media_url}
                  >
                    {isUploading ? 'Saving...' : editingHighlight ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeaturedHighlightsManager;
