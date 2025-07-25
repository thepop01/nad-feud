import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, ExternalLink, CheckCircle, AlertCircle, RefreshCw, Save, Trash2, Edit2 } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { HighlightWithLinkStatus } from '../types';
import { supaclient } from '../services/supabase';

const BulkLinkManager: React.FC = () => {
  const [highlights, setHighlights] = useState<HighlightWithLinkStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLinks, setEditingLinks] = useState<Record<string, string>>({});
  const [selectedHighlights, setSelectedHighlights] = useState<Set<string>>(new Set());

  const fetchHighlights = async () => {
    setIsLoading(true);
    try {
      const data = await supaclient.getHighlightsWithLinks();
      setHighlights(data);
    } catch (error) {
      console.error('Failed to fetch highlights with links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAllLinks = async () => {
    setIsValidating(true);
    try {
      const updatedHighlights = await Promise.all(
        highlights.map(async (highlight) => {
          if (highlight.embedded_link) {
            const linkStatus = await supaclient.validateUrl(highlight.embedded_link);
            return { ...highlight, linkStatus };
          }
          return highlight;
        })
      );
      setHighlights(updatedHighlights);
    } catch (error) {
      console.error('Failed to validate links:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleLinkEdit = (highlightId: string, newLink: string) => {
    setEditingLinks(prev => ({ ...prev, [highlightId]: newLink }));
  };

  const saveLinkChanges = async () => {
    if (Object.keys(editingLinks).length === 0) return;

    setIsSaving(true);
    try {
      const updates = Object.entries(editingLinks).map(([id, embedded_link]) => ({
        id,
        embedded_link
      }));

      await supaclient.bulkUpdateLinks(updates);
      setEditingLinks({});
      await fetchHighlights(); // Refresh data
      alert('Links updated successfully!');
    } catch (error) {
      console.error('Failed to update links:', error);
      alert('Failed to update links');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHighlightSelection = (highlightId: string) => {
    setSelectedHighlights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(highlightId)) {
        newSet.delete(highlightId);
      } else {
        newSet.add(highlightId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedHighlights(new Set(highlights.map(h => h.id)));
  };

  const deselectAll = () => {
    setSelectedHighlights(new Set());
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  const validLinks = highlights.filter(h => h.linkStatus.isValid).length;
  const invalidLinks = highlights.filter(h => !h.linkStatus.isValid).length;
  const pendingChanges = Object.keys(editingLinks).length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link className="text-purple-400" size={24} />
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Link Management</h2>
            <p className="text-slate-400 text-sm">
              Manage embedded links across all highlights
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={validateAllLinks}
            disabled={isValidating}
          >
            <RefreshCw size={16} className={isValidating ? 'animate-spin' : ''} />
            {isValidating ? 'Validating...' : 'Validate All'}
          </Button>
          
          {pendingChanges > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={saveLinkChanges}
              disabled={isSaving}
            >
              <Save size={16} />
              Save Changes ({pendingChanges})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{highlights.length}</div>
          <div className="text-sm text-slate-400">Total Highlights</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-300">{validLinks}</div>
          <div className="text-sm text-slate-400">Valid Links</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-300">{invalidLinks}</div>
          <div className="text-sm text-slate-400">Invalid Links</div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="secondary" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
          <span className="text-sm text-slate-400">
            {selectedHighlights.size} selected
          </span>
        </div>
      </div>

      {/* Highlights List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading highlights...</p>
        </div>
      ) : highlights.length === 0 ? (
        <div className="text-center py-8">
          <Link className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No highlights with embedded links found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {highlights.map((highlight) => (
            <motion.div
              key={highlight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border transition-colors ${
                selectedHighlights.has(highlight.id)
                  ? 'bg-purple-900/20 border-purple-600/50'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedHighlights.has(highlight.id)}
                  onChange={() => toggleHighlightSelection(highlight.id)}
                  className="mt-1 w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-white truncate">{highlight.title}</h3>
                    {highlight.linkStatus.isValid ? (
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={editingLinks[highlight.id] ?? highlight.embedded_link ?? ''}
                        onChange={(e) => handleLinkEdit(highlight.id, e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter embedded link URL"
                      />
                      
                      {highlight.embedded_link && (
                        <button
                          onClick={() => window.open(highlight.embedded_link, '_blank', 'noopener,noreferrer')}
                          className="p-2 hover:bg-slate-700 rounded transition-colors"
                          title="Test link"
                        >
                          <ExternalLink size={14} className="text-slate-400 hover:text-slate-300" />
                        </button>
                      )}
                    </div>
                    
                    {!highlight.linkStatus.isValid && highlight.linkStatus.error && (
                      <p className="text-xs text-red-400">
                        Error: {highlight.linkStatus.error}
                      </p>
                    )}
                    
                    {highlight.linkStatus.redirectUrl && (
                      <p className="text-xs text-slate-400">
                        Redirects to: {highlight.linkStatus.redirectUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default BulkLinkManager;
