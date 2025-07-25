import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Twitter, ExternalLink, Loader, AlertCircle } from 'lucide-react';
import { TwitterPreview as TwitterPreviewType } from '../types';
import { supaclient } from '../services/supabase';

interface TwitterPreviewProps {
  twitterUrl: string;
  className?: string;
  showFullEmbed?: boolean;
}

const TwitterPreview: React.FC<TwitterPreviewProps> = ({ 
  twitterUrl, 
  className = '',
  showFullEmbed = false 
}) => {
  const [preview, setPreview] = useState<TwitterPreviewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!twitterUrl || (!twitterUrl.includes('twitter.com') && !twitterUrl.includes('x.com'))) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const previewData = await supaclient.getTwitterPreview(twitterUrl);
        setPreview(previewData);
      } catch (err) {
        console.error('Failed to fetch Twitter preview:', err);
        setError('Failed to load Twitter preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [twitterUrl]);

  if (!twitterUrl || (!twitterUrl.includes('twitter.com') && !twitterUrl.includes('x.com'))) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
        <Loader size={16} className="animate-spin text-blue-400" />
        <span className="text-sm text-slate-400">Loading Twitter preview...</span>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
        <AlertCircle size={16} className="text-red-400" />
        <span className="text-sm text-slate-400">Could not load Twitter preview</span>
        <button
          onClick={() => window.open(twitterUrl, '_blank', 'noopener,noreferrer')}
          className="ml-auto p-1 hover:bg-slate-700 rounded transition-colors"
          title="Open Twitter link"
        >
          <ExternalLink size={14} className="text-slate-400 hover:text-blue-400" />
        </button>
      </div>
    );
  }

  if (showFullEmbed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden ${className}`}
      >
        <div className="p-3 border-b border-slate-700 flex items-center gap-2">
          <Twitter size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Twitter Preview</span>
          <button
            onClick={() => window.open(twitterUrl, '_blank', 'noopener,noreferrer')}
            className="ml-auto p-1 hover:bg-slate-700 rounded transition-colors"
            title="Open on Twitter"
          >
            <ExternalLink size={14} className="text-slate-400 hover:text-blue-400" />
          </button>
        </div>
        <div
          className="p-4 twitter-embed"
          dangerouslySetInnerHTML={{ __html: preview.html }}
          style={{
            // Override Twitter's default styles to match our theme
            filter: 'invert(0.1) hue-rotate(200deg) saturate(0.8)',
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors ${className}`}
    >
      <Twitter size={16} className="text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {preview.author_name}
        </p>
        <p className="text-xs text-slate-400">
          Twitter • {preview.provider_name}
        </p>
      </div>
      <button
        onClick={() => window.open(twitterUrl, '_blank', 'noopener,noreferrer')}
        className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
        title="Open on Twitter"
      >
        <ExternalLink size={14} className="text-slate-400 hover:text-blue-400" />
      </button>
    </motion.div>
  );
};

export default TwitterPreview;
