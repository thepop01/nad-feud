import { User } from '../types';

// Cookie configuration
const AUTH_COOKIE_NAME = 'nad-feud-auth';
const COOKIE_EXPIRY_DAYS = 7;

/**
 * Cookie utility functions for authentication persistence
 */
export class CookieAuth {
  /**
   * Set authentication cookie with user data
   */
  static setAuthCookie(user: User): void {
    try {
      const userData = {
        id: user.id,
        username: user.username,
        discord_id: user.discord_id,
        avatar_url: user.avatar_url,
        can_vote: user.can_vote,
        is_admin: user.is_admin,
        discord_role: user.discord_role,
        timestamp: Date.now() // For expiry validation
      };

      const cookieValue = btoa(JSON.stringify(userData)); // Base64 encode for security
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);

      document.cookie = `${AUTH_COOKIE_NAME}=${cookieValue}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
      
      console.log('🍪 Authentication cookie set for user:', user.username, 'expires:', expiryDate.toISOString());
    } catch (error) {
      console.error('❌ Failed to set authentication cookie:', error);
    }
  }

  /**
   * Get user data from authentication cookie
   */
  static getAuthCookie(): User | null {
    try {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=`)
      );

      if (!authCookie) {
        console.log('🍪 No authentication cookie found');
        return null;
      }

      const cookieValue = authCookie.split('=')[1];
      const userData = JSON.parse(atob(cookieValue)); // Base64 decode

      // Check if cookie is expired (additional safety check)
      const cookieAge = Date.now() - userData.timestamp;
      const maxAge = COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (cookieAge > maxAge) {
        console.log('🍪 Authentication cookie expired, removing...');
        CookieAuth.clearAuthCookie();
        return null;
      }

      console.log('🍪 Authentication cookie found for user:', userData.username);
      
      // Return user object (without timestamp)
      const { timestamp, ...userWithoutTimestamp } = userData;
      return userWithoutTimestamp as User;
    } catch (error) {
      console.error('❌ Failed to read authentication cookie:', error);
      CookieAuth.clearAuthCookie(); // Clear corrupted cookie
      return null;
    }
  }

  /**
   * Clear authentication cookie
   */
  static clearAuthCookie(): void {
    try {
      document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
      console.log('🍪 Authentication cookie cleared');
    } catch (error) {
      console.error('❌ Failed to clear authentication cookie:', error);
    }
  }

  /**
   * Check if user has valid authentication cookie
   */
  static hasValidAuthCookie(): boolean {
    return CookieAuth.getAuthCookie() !== null;
  }

  /**
   * Update existing cookie with new user data (refresh without changing expiry)
   */
  static updateAuthCookie(user: User): void {
    if (CookieAuth.hasValidAuthCookie()) {
      CookieAuth.setAuthCookie(user);
      console.log('🍪 Authentication cookie updated for user:', user.username);
    }
  }

  /**
   * Get cookie expiry information
   */
  static getCookieInfo(): { hasCookie: boolean; expiresIn?: string; username?: string } {
    const user = CookieAuth.getAuthCookie();
    if (!user) {
      return { hasCookie: false };
    }

    // Calculate remaining time (approximate, since we don't store exact expiry in cookie data)
    const remainingDays = Math.max(0, COOKIE_EXPIRY_DAYS - Math.floor((Date.now() - (user as any).timestamp || 0) / (24 * 60 * 60 * 1000)));
    
    return {
      hasCookie: true,
      expiresIn: `${remainingDays} days`,
      username: user.username
    };
  }
}

/**
 * Hook for easy cookie auth integration in components
 */
export const useCookieAuth = () => {
  return {
    setAuthCookie: CookieAuth.setAuthCookie,
    getAuthCookie: CookieAuth.getAuthCookie,
    clearAuthCookie: CookieAuth.clearAuthCookie,
    hasValidAuthCookie: CookieAuth.hasValidAuthCookie,
    updateAuthCookie: CookieAuth.updateAuthCookie,
    getCookieInfo: CookieAuth.getCookieInfo
  };
};
