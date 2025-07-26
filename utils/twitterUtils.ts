/**
 * Utility functions for extracting Twitter usernames and handling Twitter URLs
 */

/**
 * Extracts the Twitter username from a Twitter/X URL
 * @param url - The Twitter/X URL
 * @returns The username without @ symbol, or null if not found
 */
export function extractTwitterUsername(url: string): string | null {
  if (!url) return null;
  
  try {
    // Handle various Twitter URL formats:
    // https://twitter.com/username/status/123456789
    // https://x.com/username/status/123456789
    // https://twitter.com/username
    // https://x.com/username
    
    const twitterRegex = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)(?:\/|$|\?)/;
    const match = url.match(twitterRegex);
    
    if (match && match[1]) {
      const username = match[1];
      
      // Filter out common Twitter paths that aren't usernames
      const excludedPaths = [
        'home', 'explore', 'notifications', 'messages', 'bookmarks',
        'lists', 'profile', 'more', 'compose', 'search', 'settings',
        'help', 'display', 'your_twitter_data', 'personalization',
        'privacy_and_safety', 'notifications', 'accessibility',
        'about', 'download', 'jobs', 'press', 'blog', 'status',
        'terms', 'privacy', 'cookies', 'ads_info', 'brand', 'advertise',
        'marketing', 'business', 'developers', 'directory', 'settings',
        'logout', 'suspended', 'account', 'login', 'signup', 'oauth',
        'intent', 'share', 'hashtag', 'search', 'i', 'web', 'mobile'
      ];
      
      if (!excludedPaths.includes(username.toLowerCase())) {
        return username;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting Twitter username:', error);
    return null;
  }
}

/**
 * Validates if a URL is a Twitter/X URL
 * @param url - The URL to validate
 * @returns true if it's a Twitter/X URL
 */
export function isTwitterUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('twitter.com') || url.includes('x.com');
}

/**
 * Formats a Twitter username with @ symbol
 * @param username - The username without @ symbol
 * @returns The username with @ symbol
 */
export function formatTwitterUsername(username: string): string {
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Creates a Twitter profile URL from username
 * @param username - The username (with or without @)
 * @returns The full Twitter profile URL
 */
export function createTwitterProfileUrl(username: string): string {
  if (!username) return '';
  const cleanUsername = username.replace('@', '');
  return `https://x.com/${cleanUsername}`;
}

/**
 * Extracts tweet ID from Twitter URL
 * @param url - The Twitter URL
 * @returns The tweet ID or null if not found
 */
export function extractTweetId(url: string): string | null {
  if (!url) return null;
  
  const tweetIdMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return tweetIdMatch ? tweetIdMatch[1] : null;
}
