import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Pause, Trash2, Edit, Eye, EyeOff, Plus, Save, X } from 'lucide-react';
import { BackgroundMedia } from '../types';
import { supaclient } from '../services/supabase';
import Card from './Card';
import Button from './Button';

interface BackgroundMediaManagerProps {
  className?: string;
}

const BackgroundMediaManager: React.FC<BackgroundMediaManagerProps> = ({ className = '' }) => {
  const [backgroundMedia, setBackgroundMedia] = useState<BackgroundMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMedia, setEditingMedia] = useState<BackgroundMedia | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

  // Form state for new/editing media
  const [formData, setFormData] = useState({
    name: '',
    media_url: '',
    thumbnail_url: '',
    media_type: 'gif' as 'gif' | 'video' | 'image',
    category: 'gaming' as 'gaming' | 'celebration' | 'subtle' | 'loading' | 'custom',
    intensity: 'medium' as 'low' | 'medium' | 'high',
    is_active: true
  });

  useEffect(() => {
    fetchBackgroundMedia();
  }, []);

  const fetchBackgroundMedia = async () => {
    setIsLoading(true);
    try {
      const data = await supaclient.getBackgroundMedia();
      setBackgroundMedia(data);
    } catch (error) {
      console.error('Error fetching background media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMedia) {
        // Update existing media
        await supaclient.updateBackgroundMedia(editingMedia.id, formData);
      } else {
        // Create new media
        await supaclient.createBackgroundMedia({
          ...formData,
          uploaded_by: 'admin-user-id' // Replace with actual admin user ID
        });
      }
      
      resetForm();
      fetchBackgroundMedia();
    } catch (error) {
      console.error('Error saving background media:', error);
      alert('Failed to save background media. Please try again.');
    }
  };

  const handleEdit = (media: BackgroundMedia) => {
    setEditingMedia(media);
    setFormData({
      name: media.name,
      media_url: media.media_url,
      thumbnail_url: media.thumbnail_url || '',
      media_type: media.media_type,
      category: media.category,
      intensity: media.intensity,
      is_active: media.is_active
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this background media?')) return;
    
    try {
      await supaclient.deleteBackgroundMedia(id);
      fetchBackgroundMedia();
    } catch (error) {
      console.error('Error deleting background media:', error);
      alert('Failed to delete background media. Please try again.');
    }
  };

  const handleToggleActive = async (media: BackgroundMedia) => {
    try {
      await supaclient.updateBackgroundMedia(media.id, { is_active: !media.is_active });
      fetchBackgroundMedia();
    } catch (error) {
      console.error('Error toggling media status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      media_url: '',
      thumbnail_url: '',
      media_type: 'gif',
      category: 'gaming',
      intensity: 'medium',
      is_active: true
    });
    setEditingMedia(null);
    setShowUploadForm(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gaming': return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'celebration': return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      case 'subtle': return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
      case 'loading': return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'custom': return 'bg-orange-600/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return 'bg-green-600/20 text-green-300';
      case 'medium': return 'bg-yellow-600/20 text-yellow-300';
      case 'high': return 'bg-red-600/20 text-red-300';
      default: return 'bg-slate-600/20 text-slate-300';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-slate-300">Loading background media...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Background Media Manager</h2>
        <Button
          onClick={() => setShowUploadForm(true)}
          variant="secondary"
          className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
        >
          <Plus size={16} />
          Add Media
        </Button>
      </div>

      {/* Upload/Edit Form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <Card className="bg-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingMedia ? 'Edit Background Media' : 'Add New Background Media'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Gaming Background 1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Media Type
                    </label>
                    <select
                      value={formData.media_type}
                      onChange={(e) => setFormData({ ...formData, media_type: e.target.value as any })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="gif">GIF</option>
                      <option value="video">Video</option>
                      <option value="image">Image</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="gaming">Gaming</option>
                      <option value="celebration">Celebration</option>
                      <option value="subtle">Subtle</option>
                      <option value="loading">Loading</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Intensity
                    </label>
                    <select
                      value={formData.intensity}
                      onChange={(e) => setFormData({ ...formData, intensity: e.target.value as any })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Media URL
                  </label>
                  <input
                    type="url"
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://example.com/media.gif"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Thumbnail URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-slate-300">
                    Active (available for use)
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={resetForm} variant="secondary">
                    <X size={16} />
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500">
                    <Save size={16} />
                    {editingMedia ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {backgroundMedia.map((media) => (
          <Card key={media.id} className="bg-slate-800/30 overflow-hidden">
            <div className="aspect-video relative bg-slate-900/50 rounded-lg overflow-hidden mb-3">
              {media.media_type === 'video' ? (
                <video
                  src={media.media_url}
                  poster={media.thumbnail_url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
              ) : (
                <img
                  src={media.thumbnail_url || media.media_url}
                  alt={media.name}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Status overlay */}
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  media.is_active ? 'bg-green-600/80 text-white' : 'bg-red-600/80 text-white'
                }`}>
                  {media.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Media type indicator */}
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-black/60 text-white">
                  {media.media_type.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-white truncate">{media.name}</h3>
              
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(media.category)}`}>
                  {media.category}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getIntensityColor(media.intensity)}`}>
                  {media.intensity}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(media)}
                    className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(media)}
                    className={`transition-colors p-1 ${
                      media.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                    }`}
                    title={media.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {media.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(media.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <span className="text-xs text-slate-400">
                  {new Date(media.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {backgroundMedia.length === 0 && (
        <div className="text-center py-12">
          <Upload className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Background Media</h3>
          <p className="text-slate-400 mb-4">Upload your first background GIF, video, or image to get started.</p>
          <Button
            onClick={() => setShowUploadForm(true)}
            variant="secondary"
            className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
          >
            <Plus size={16} />
            Add First Media
          </Button>
        </div>
      )}
    </Card>
  );
};

export default BackgroundMediaManager;
