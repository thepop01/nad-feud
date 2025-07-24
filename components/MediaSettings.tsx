import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Monitor, Zap, Video, Image, Volume2, Wifi } from 'lucide-react';
import { MediaConfigManager, MediaConfig } from '../utils/mediaConfig';
import Card from './Card';
import Button from './Button';

interface MediaSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MediaSettings: React.FC<MediaSettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<MediaConfig>(MediaConfigManager.getConfig());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(MediaConfigManager.getConfig());
      setHasChanges(false);
    }
  }, [isOpen]);

  const updateConfig = (updates: Partial<MediaConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const updateAnimations = (updates: Partial<MediaConfig['animations']>) => {
    updateConfig({
      animations: { ...config.animations, ...updates }
    });
  };

  const updateVideos = (updates: Partial<MediaConfig['videos']>) => {
    updateConfig({
      videos: { ...config.videos, ...updates }
    });
  };

  const updatePerformance = (updates: Partial<MediaConfig['performance']>) => {
    updateConfig({
      performance: { ...config.performance, ...updates }
    });
  };

  const saveSettings = () => {
    MediaConfigManager.saveConfig(config);
    setHasChanges(false);
    // Reload page to apply changes
    window.location.reload();
  };

  const resetToDefaults = () => {
    MediaConfigManager.resetToDefaults();
    setConfig(MediaConfigManager.getConfig());
    setHasChanges(true);
  };

  const enablePerformanceMode = () => {
    MediaConfigManager.enablePerformanceMode();
    setConfig(MediaConfigManager.getConfig());
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings className="text-purple-400" size={24} />
              <h2 className="text-2xl font-bold text-white">Media Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Animation Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Image className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Animations & GIFs</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Enable All Animations</span>
                  <input
                    type="checkbox"
                    checked={config.animations.enabled}
                    onChange={(e) => updateAnimations({ enabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Background GIFs</span>
                  <input
                    type="checkbox"
                    checked={config.animations.backgroundGifs}
                    onChange={(e) => updateAnimations({ backgroundGifs: e.target.checked })}
                    disabled={!config.animations.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Celebration GIFs</span>
                  <input
                    type="checkbox"
                    checked={config.animations.celebrationGifs}
                    onChange={(e) => updateAnimations({ celebrationGifs: e.target.checked })}
                    disabled={!config.animations.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Loading GIFs</span>
                  <input
                    type="checkbox"
                    checked={config.animations.loadingGifs}
                    onChange={(e) => updateAnimations({ loadingGifs: e.target.checked })}
                    disabled={!config.animations.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Particle Effects</span>
                  <input
                    type="checkbox"
                    checked={config.animations.particleEffects}
                    onChange={(e) => updateAnimations({ particleEffects: e.target.checked })}
                    disabled={!config.animations.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>
              </div>
            </div>

            {/* Video Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Video className="text-green-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Video Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Enable Videos</span>
                  <input
                    type="checkbox"
                    checked={config.videos.enabled}
                    onChange={(e) => updateVideos({ enabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Auto-play Videos</span>
                  <input
                    type="checkbox"
                    checked={config.videos.autoplay}
                    onChange={(e) => updateVideos({ autoplay: e.target.checked })}
                    disabled={!config.videos.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Muted by Default</span>
                  <input
                    type="checkbox"
                    checked={config.videos.muted}
                    onChange={(e) => updateVideos({ muted: e.target.checked })}
                    disabled={!config.videos.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Loop Videos</span>
                  <input
                    type="checkbox"
                    checked={config.videos.loop}
                    onChange={(e) => updateVideos({ loop: e.target.checked })}
                    disabled={!config.videos.enabled}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                </label>
              </div>
            </div>

            {/* Performance Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="text-yellow-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Performance</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Reduced Motion</span>
                  <input
                    type="checkbox"
                    checked={config.performance.reducedMotion}
                    onChange={(e) => updatePerformance({ reducedMotion: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Low Bandwidth Mode</span>
                  <input
                    type="checkbox"
                    checked={config.performance.lowBandwidth}
                    onChange={(e) => updatePerformance({ lowBandwidth: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={enablePerformanceMode}
                  variant="secondary"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500"
                >
                  <Wifi size={16} />
                  Performance Mode
                </Button>
                <Button
                  onClick={resetToDefaults}
                  variant="secondary"
                  className="bg-slate-600 hover:bg-slate-700 text-white focus:ring-slate-500"
                >
                  <Monitor size={16} />
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-700">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              variant="secondary"
              className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
              disabled={!hasChanges}
            >
              Save & Apply
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default MediaSettings;
