import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Upload, Link, X, CheckCircle, AlertCircle } from 'lucide-react';
import { EventTask } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';

interface EventSubmissionBarProps {
  eventTask: EventTask;
  className?: string;
}

const EventSubmissionBar: React.FC<EventSubmissionBarProps> = ({
  eventTask,
  className = ''
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    link: '',
    description: ''
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please log in to submit');
      setSubmitStatus('error');
      return;
    }

    if (!submissionData.link.trim()) {
      setErrorMessage('Link is required');
      setSubmitStatus('error');
      return;
    }

    if (eventTask.submission_type === 'link_media' && !mediaFile) {
      setErrorMessage('Media upload is required');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      let mediaUrl = '';

      // Upload media if provided
      if (mediaFile) {
        mediaUrl = await supaclient.uploadSubmissionMedia(mediaFile, user.id);
      }

      // Submit the event submission
      await supaclient.submitEventSubmission({
        event_id: eventTask.id,
        user_id: user.id,
        username: user.username,
        discord_user_id: user.discord_user_id,
        avatar_url: user.avatar_url,
        submission_link: submissionData.link,
        submission_media: mediaUrl || undefined,
        description: submissionData.description || undefined
      });

      setSubmitStatus('success');
      setSubmissionData({ link: '', description: '' });
      setMediaFile(null);
      setMediaPreview('');

      // Auto-collapse after success
      setTimeout(() => {
        setIsExpanded(false);
        setSubmitStatus('idle');
      }, 3000);
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!eventTask.submission_type || eventTask.submission_type === 'none') {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-indigo-900/50 via-purple-900/50 to-pink-900/50 backdrop-blur-lg border border-slate-700 rounded-2xl overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Send size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">
                {eventTask.submission_title || 'Submit Your Entry'}
              </h3>
              <p className="text-slate-400 text-sm">
                {eventTask.submission_description || `Submit your ${eventTask.submission_type === 'link_media' ? 'link and media' : 'link'} for this event`}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Expanded Form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-700"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Link Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Link size={16} className="inline mr-2" />
                  Link *
                </label>
                <input
                  type="url"
                  value={submissionData.link}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, link: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={submissionData.description}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Tell us about your submission..."
                />
              </div>

              {/* Media Upload (if required) */}
              {eventTask.submission_type === 'link_media' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Upload size={16} className="inline mr-2" />
                    Media Upload *
                  </label>
                  
                  {!mediaPreview ? (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleMediaChange}
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer">
                        <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                        <p className="text-slate-400">Click to upload image or video</p>
                        <p className="text-slate-500 text-sm mt-1">Max 10MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      {mediaFile?.type.startsWith('video/') ? (
                        <video
                          src={mediaPreview}
                          className="w-full h-32 object-contain bg-slate-800 rounded-lg"
                          controls
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full h-32 object-contain bg-slate-800 rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={removeMedia}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Status Messages */}
              {submitStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                  <CheckCircle size={16} />
                  <span>Submission successful! Thank you for participating.</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !user}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Entry'}
                </button>
              </div>

              {!user && (
                <p className="text-slate-400 text-sm text-center">
                  Please log in to submit your entry
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventSubmissionBar;
