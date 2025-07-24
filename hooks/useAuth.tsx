import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { supaclient } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
  canVote: boolean;
  isLoading: boolean;
  loginError: string | null;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Setting up authentication listener');

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Authentication loading timeout - forcing completion');
      setIsLoading(false);
      setLoginError('Authentication timed out. Please try refreshing the page or clear your browser data.');
    }, 8000); // 8 second timeout (reduced from 10)

    // Additional safety timeout - shorter timeout for immediate feedback
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout triggered - ensuring loading state is resolved');
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000); // 3 second safety timeout

    // This effect runs once on mount to set up the authentication listener.
    // The supaclient is designed to handle initialization and call the callback
    // with the initial session state (or null).
    const { unsubscribe } = supaclient.onAuthStateChange((user, error) => {
      console.log('Auth state change received:', { user: !!user, error, userDetails: user?.username });

      // Clear both timeouts since we got a response
      clearTimeout(loadingTimeout);
      clearTimeout(safetyTimeout);

      setUser(user);
      setIsLoading(false);

      // Handle authentication errors
      if (error) {
        console.error('Auth error received:', error);
        setLoginError(error);
      } else if (user) {
        console.log('User authenticated successfully:', user.username);
        // Clear any previous errors on successful login
        setLoginError(null);
      } else {
        console.log('User logged out or no session');
      }
    });

    // The cleanup function provided by useEffect will be called when the component
    // unmounts, ensuring we don't have memory leaks from the subscription.
    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []); // The empty dependency array ensures this effect runs only once.


  const login = async () => {
    try {
      setLoginError(null); // Clear any previous errors
      setIsLoading(true);
      await supaclient.loginWithDiscord();
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error instanceof Error ? error.message : 'Failed to login with Discord. Please try again.');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supaclient.logout();
      setUser(null);
      setLoginError(null); // Clear any login errors on logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearLoginError = () => {
    setLoginError(null);
  };

  const clearAuthData = async () => {
    try {
      setIsLoading(true);
      await supaclient.clearAuthData?.();
      setUser(null);
      setLoginError(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      setIsLoading(false);
    }
  };

  const isAdmin = user?.is_admin ?? false;
  const canVote = user?.can_vote ?? false;

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-8"></div>
          <p className="text-slate-400 mb-4">Loading authentication...</p>
          <p className="text-slate-500 text-sm mb-6">
            If this takes too long, you may need to clear your authentication data.
          </p>
          <button
            onClick={clearAuthData}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            Clear Auth Data & Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, canVote, isLoading, loginError, clearLoginError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
