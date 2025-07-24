import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Trash2, Edit, Eye, EyeOff, Plus, Save, X, ArrowUp, ArrowDown, Heart } from 'lucide-react';
import { CommunityMemory } from '../types';
import { supaclient } from '../services/supabase';
import Card from './Card';
import Button from './Button';

interface CommunityMemoriesManagerProps {
  className?: string;
}

const CommunityMemoriesManager: React.FC<CommunityMemoriesManagerProps> = ({ className = '' }) => {
  const [memories, setMemories] = useState<CommunityMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMemory, setEditingMemory] = useState<CommunityMemory | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Form state for new/editing memory
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media_url: '',
    thumbnail_url: '',
    media_type: 'image' as 'image' | 'video' | 'gif',
    position: 'center' as 'center' | 'left' | 'right',
    is_active: true,
    display_order: 1
  });

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const data = await supaclient.getCommunityMemories();
      setMemories(data);
    } catch (error) {
      console.error('Error fetching community memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMemory) {
        // Update existing memory
        await supaclient.updateCommunityMemory(editingMemory.id, formData);
      } else {
        // Create new memory
        await supaclient.createCommunityMemory({
          ...formData,
          uploaded_by: 'admin-user-id' // Replace with actual admin user ID
        });
      }
      
      resetForm();
      fetchMemories();
    } catch (error) {
      console.error('Error saving community memory:', error);
      alert('Failed to save community memory. Please try again.');
    }
  };

  const handleEdit = (memory: CommunityMemory) => {
    setEditingMemory(memory);
    setFormData({
      title: memory.title,
      description: memory.description || '',
      media_url: memory.media_url,
      thumbnail_url: memory.thumbnail_url || '',
      media_type: memory.media_type,
      position: memory.position,
      is_active: memory.is_active,
      display_order: memory.display_order
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this community memory?')) return;
    
    try {
      await supaclient.deleteCommunityMemory(id);
      fetchMemories();
    } catch (error) {
      console.error('Error deleting community memory:', error);
      alert('Failed to delete community memory. Please try again.');
    }
  };

  const handleToggleActive = async (memory: CommunityMemory) => {
    try {
      await supaclient.updateCommunityMemory(memory.id, { is_active: !memory.is_active });
      fetchMemories();
    } catch (error) {
      console.error('Error toggling memory status:', error);
    }
  };

  const handleReorder = async (memory: CommunityMemory, direction: 'up' | 'down') => {
    const sortedMemories = [...memories].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedMemories.findIndex(m => m.id === memory.id);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedMemories.length - 1)
    ) {
      return; // Can't move further
    }

    const newOrder = direction === 'up' ? memory.display_order - 1 : memory.display_order + 1;
    const swapMemory = sortedMemories.find(m => m.display_order === newOrder);

    try {
      // Swap display orders
      if (swapMemory) {
        await supaclient.updateCommunityMemory(swapMemory.id, { display_order: memory.display_order });
      }
      await supaclient.updateCommunityMemory(memory.id, { display_order: newOrder });
      fetchMemories();
    } catch (error) {
      console.error('Error reordering memories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      media_url: '',
      thumbnail_url: '',
      media_type: 'image',
      position: 'center',
      is_active: true,
      display_order: Math.max(...memories.map(m => m.display_order), 0) + 1
    });
    setEditingMemory(null);
    setShowUploadForm(false);
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'center': return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      case 'left': return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'right': return 'bg-green-600/20 text-green-300 border-green-500/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-slate-300">Loading community memories...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="text-purple-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Community Memories Manager</h2>
        </div>
        <Button
          onClick={() => setShowUploadForm(true)}
          variant="secondary"
          className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
        >
          <Plus size={16} />
          Add Memory
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
                {editingMemory ? 'Edit Community Memory' : 'Add New Community Memory'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Epic Game Night"
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
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="gif">GIF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Position
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="center">Center (Landscape)</option>
                      <option value="left">Left (Portrait)</option>
                      <option value="right">Right (Portrait)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Brief description of this memory..."
                    rows={2}
                  />
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
                    placeholder="https://example.com/memory.jpg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Thumbnail URL (Optional, for videos)
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
                    Active (visible in slideshow)
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={resetForm} variant="secondary">
                    <X size={16} />
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500">
                    <Save size={16} />
                    {editingMemory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memories List */}
      <div className="space-y-4">
        {memories
          .sort((a, b) => a.display_order - b.display_order)
          .map((memory, index) => (
            <Card key={memory.id} className="bg-slate-800/30">
              <div className="flex gap-4">
                {/* Media Preview */}
                <div className="flex-shrink-0">
                  <div className={`relative rounded-lg overflow-hidden ${
                    memory.position === 'center' ? 'w-32 h-18' : 'w-20 h-24'
                  } bg-slate-900/50`}>
                    {memory.media_type === 'video' ? (
                      <video
                        src={memory.media_url}
                        poster={memory.thumbnail_url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                    ) : (
                      <img
                        src={memory.thumbnail_url || memory.media_url}
                        alt={memory.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Status overlay */}
                    <div className="absolute top-1 left-1">
                      <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                        memory.is_active ? 'bg-green-600/80 text-white' : 'bg-red-600/80 text-white'
                      }`}>
                        {memory.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Media type indicator */}
                    <div className="absolute top-1 right-1">
                      <span className="px-1 py-0.5 rounded text-xs font-medium bg-black/60 text-white">
                        {memory.media_type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Memory Info */}
                <div className="flex-grow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white mb-1">{memory.title}</h3>
                      {memory.description && (
                        <p className="text-sm text-slate-300 mb-2 line-clamp-2">{memory.description}</p>
                      )}
                      
                      <div className="flex gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getPositionColor(memory.position)}`}>
                          {memory.position}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300">
                          Order: {memory.display_order}
                        </span>
                      </div>
                      
                      <span className="text-xs text-slate-400">
                        Added {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleReorder(memory, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-300 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleReorder(memory, 'down')}
                        disabled={index === memories.length - 1}
                        className="text-slate-400 hover:text-slate-300 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(memory)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(memory)}
                        className={`transition-colors p-1 ${
                          memory.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                        }`}
                        title={memory.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {memory.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {memories.length === 0 && (
        <div className="text-center py-12">
          <Heart className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Community Memories</h3>
          <p className="text-slate-400 mb-4">Create your first community memory to showcase special moments.</p>
          <Button
            onClick={() => setShowUploadForm(true)}
            variant="secondary"
            className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
          >
            <Plus size={16} />
            Add First Memory
          </Button>
        </div>
      )}
    </Card>
  );
};

export default CommunityMemoriesManager;
