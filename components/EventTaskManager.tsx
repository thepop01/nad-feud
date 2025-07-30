import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Edit, Trash2, Play, StopCircle, UploadCloud, X, ExternalLink, Target, Calendar, Image as ImageIcon, Video, Film } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import { supaclient } from '../services/supabase';
import { EventTask } from '../types';
import { useAuth } from '../hooks/useAuth';

const EventTaskManager: React.FC = () => {
  const { user } = useAuth();
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link_url: '',
    media_type: 'image' as 'image' | 'video' | 'gif',
    status: 'live' as 'live' | 'ended',
    display_order: 1,
    submission_type: 'none' as 'none' | 'link' | 'link_media',
    submission_title: '',
    submission_description: ''
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  useEffect(() => {
    fetchEventTasks();
  }, []);

  const fetchEventTasks = async () => {
    try {
      setIsLoading(true);
      const tasks = await supaclient.getAllEventsTasks();
      setEventTasks(tasks);
    } catch (error) {
      console.error('Error fetching event tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      link_url: '',
      media_type: 'image',
      status: 'live',
      display_order: 1,
      submission_type: 'none',
      submission_title: '',
      submission_description: ''
    });
    setMediaFile(null);
    setMediaPreview('');
    setIsCreating(false);
    setEditingTask(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      
      // Determine media type based on file type
      if (file.type.startsWith('video/')) {
        setFormData(prev => ({ ...prev, media_type: 'video' }));
      } else if (file.type === 'image/gif') {
        setFormData(prev => ({ ...prev, media_type: 'gif' }));
      } else {
        setFormData(prev => ({ ...prev, media_type: 'image' }));
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      let mediaUrl = editingTask?.media_url || '';
      
      // Upload new media if file is selected
      if (mediaFile) {
        mediaUrl = await supaclient.uploadEventTaskMedia(mediaFile, user.id);
      }

      const taskData = {
        ...formData,
        media_url: mediaUrl,
        uploaded_by: user.id,
        created_by: user.id,
        file_size: mediaFile?.size || editingTask?.file_size || 0,
        view_count: editingTask?.view_count || 0
      };

      if (editingTask) {
        await supaclient.updateEventTask(editingTask.id, taskData);
      } else {
        await supaclient.createEventTask(taskData);
      }

      await fetchEventTasks();
      resetForm();
    } catch (error) {
      console.error('Error saving event task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (task: EventTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      link_url: task.link_url || '',
      media_type: task.media_type,
      status: task.status,
      display_order: task.display_order,
      submission_type: task.submission_type || 'none',
      submission_title: task.submission_title || '',
      submission_description: task.submission_description || ''
    });
    setMediaPreview(task.media_url);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event/task?')) return;
    
    try {
      await supaclient.deleteEventTask(id);
      await fetchEventTasks();
    } catch (error) {
      console.error('Error deleting event task:', error);
    }
  };

  const handleStatusToggle = async (task: EventTask) => {
    try {
      const newStatus = task.status === 'live' ? 'ended' : 'live';
      await supaclient.updateEventTask(task.id, { status: newStatus });
      await fetchEventTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Events & Tasks Management</h2>
          <p className="text-slate-400 mt-1">Manage ongoing events, tasks, and missions</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle size={20} />
          Create Event/Task
        </Button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              {editingTask ? 'Edit Event/Task' : 'Create New Event/Task'}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Event/Task Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter event/task name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Link URL
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Describe the event or task"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'live' | 'ended' }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="1"
                />
              </div>
            </div>

            {/* Submission Options */}
            <div className="border border-slate-600 rounded-lg p-4 bg-slate-800/50">
              <h3 className="text-lg font-medium text-white mb-4">Submission Settings</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Submission Type
                </label>
                <select
                  value={formData.submission_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, submission_type: e.target.value as 'none' | 'link' | 'link_media' }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="none">No Submission</option>
                  <option value="link">Link Only</option>
                  <option value="link_media">Link + Media Upload</option>
                </select>
              </div>

              {formData.submission_type !== 'none' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Submission Title
                    </label>
                    <input
                      type="text"
                      value={formData.submission_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, submission_title: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Submit Your Entry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Submission Description
                    </label>
                    <textarea
                      value={formData.submission_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, submission_description: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="Instructions for users on what to submit"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Media {!editingTask && '*'}
              </label>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="media-upload"
                  required={!editingTask}
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <UploadCloud className="mx-auto mb-4 text-slate-400" size={48} />
                  <p className="text-slate-400 mb-2">
                    Click to upload image or video
                  </p>
                  <p className="text-slate-500 text-sm">
                    Supports JPG, PNG, GIF, MP4, WebM
                  </p>
                </label>
              </div>

              {mediaPreview && (
                <div className="mt-4">
                  <p className="text-sm text-slate-300 mb-2">Preview:</p>
                  {formData.media_type === 'video' ? (
                    <video
                      src={mediaPreview}
                      className="w-full max-w-md h-48 object-contain bg-slate-900 rounded-lg"
                      controls
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-contain bg-slate-900 rounded-lg"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Saving...' : (editingTask ? 'Update Event/Task' : 'Create Event/Task')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Events/Tasks List */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-6">All Events & Tasks</h3>
        
        {eventTasks.length === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto mb-4 text-slate-400" size={48} />
            <p className="text-slate-400">No events or tasks created yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Media Thumbnail */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 flex items-center justify-center">
                    {task.media_type === 'video' ? (
                      <video
                        src={task.media_url}
                        className="max-w-full max-h-full object-contain"
                        muted
                      />
                    ) : (
                      <img
                        src={task.media_url}
                        alt={task.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{task.name}</h4>
                        {task.description && (
                          <p className="text-slate-300 text-sm mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            task.status === 'live' 
                              ? 'bg-green-900/50 text-green-300' 
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {task.status.toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                          {task.view_count > 0 && (
                            <span>{task.view_count} views</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {task.link_url && (
                          <button
                            onClick={() => window.open(task.link_url, '_blank')}
                            className="p-2 text-slate-400 hover:text-purple-400 transition-colors"
                            title="Open Link"
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusToggle(task)}
                          className={`p-2 transition-colors ${
                            task.status === 'live'
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-slate-400 hover:text-green-400'
                          }`}
                          title={task.status === 'live' ? 'End Event' : 'Make Live'}
                        >
                          {task.status === 'live' ? <StopCircle size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EventTaskManager;
