// Media configuration for animations, GIFs, and videos
export interface MediaConfig {
  animations: {
    enabled: boolean;
    backgroundGifs: boolean;
    celebrationGifs: boolean;
    loadingGifs: boolean;
    particleEffects: boolean;
  };
  videos: {
    enabled: boolean;
    autoplay: boolean;
    muted: boolean;
    loop: boolean;
  };
  performance: {
    reducedMotion: boolean;
    lowBandwidth: boolean;
  };
}

// Default configuration
const DEFAULT_CONFIG: MediaConfig = {
  animations: {
    enabled: true,
    backgroundGifs: true,
    celebrationGifs: true,
    loadingGifs: true,
    particleEffects: true,
  },
  videos: {
    enabled: true,
    autoplay: true,
    muted: true,
    loop: true,
  },
  performance: {
    reducedMotion: false,
    lowBandwidth: false,
  },
};

// Storage key for media preferences
const MEDIA_CONFIG_KEY = 'nad-feud-media-config';

export class MediaConfigManager {
  private static config: MediaConfig = DEFAULT_CONFIG;

  /**
   * Load configuration from localStorage
   */
  static loadConfig(): MediaConfig {
    try {
      const stored = localStorage.getItem(MEDIA_CONFIG_KEY);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = { ...DEFAULT_CONFIG, ...parsedConfig };
      }
    } catch (error) {
      console.warn('Failed to load media config, using defaults:', error);
      this.config = DEFAULT_CONFIG;
    }

    // Check for system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.performance.reducedMotion = true;
      this.config.animations.enabled = false;
    }

    return this.config;
  }

  /**
   * Save configuration to localStorage
   */
  static saveConfig(config: Partial<MediaConfig>): void {
    try {
      this.config = { ...this.config, ...config };
      localStorage.setItem(MEDIA_CONFIG_KEY, JSON.stringify(this.config));
      console.log('Media config saved:', this.config);
    } catch (error) {
      console.error('Failed to save media config:', error);
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): MediaConfig {
    return this.config;
  }

  /**
   * Check if animations are enabled
   */
  static areAnimationsEnabled(): boolean {
    return this.config.animations.enabled && !this.config.performance.reducedMotion;
  }

  /**
   * Check if background GIFs are enabled
   */
  static areBackgroundGifsEnabled(): boolean {
    return this.areAnimationsEnabled() && this.config.animations.backgroundGifs;
  }

  /**
   * Check if celebration GIFs are enabled
   */
  static areCelebrationGifsEnabled(): boolean {
    return this.areAnimationsEnabled() && this.config.animations.celebrationGifs;
  }

  /**
   * Check if loading GIFs are enabled
   */
  static areLoadingGifsEnabled(): boolean {
    return this.areAnimationsEnabled() && this.config.animations.loadingGifs;
  }

  /**
   * Check if videos are enabled
   */
  static areVideosEnabled(): boolean {
    return this.config.videos.enabled && !this.config.performance.lowBandwidth;
  }

  /**
   * Get video playback settings
   */
  static getVideoSettings(): { autoplay: boolean; muted: boolean; loop: boolean } {
    return {
      autoplay: this.config.videos.autoplay,
      muted: this.config.videos.muted,
      loop: this.config.videos.loop,
    };
  }

  /**
   * Toggle all animations
   */
  static toggleAnimations(enabled: boolean): void {
    this.saveConfig({
      animations: { ...this.config.animations, enabled }
    });
  }

  /**
   * Toggle videos
   */
  static toggleVideos(enabled: boolean): void {
    this.saveConfig({
      videos: { ...this.config.videos, enabled }
    });
  }

  /**
   * Enable performance mode (disable heavy animations/videos)
   */
  static enablePerformanceMode(): void {
    this.saveConfig({
      animations: {
        enabled: false,
        backgroundGifs: false,
        celebrationGifs: true, // Keep celebrations for UX
        loadingGifs: false,
        particleEffects: false,
      },
      videos: {
        ...this.config.videos,
        enabled: false,
      },
      performance: {
        reducedMotion: true,
        lowBandwidth: true,
      },
    });
  }

  /**
   * Reset to default configuration
   */
  static resetToDefaults(): void {
    this.config = DEFAULT_CONFIG;
    localStorage.removeItem(MEDIA_CONFIG_KEY);
  }
}

// Initialize on load
MediaConfigManager.loadConfig();
