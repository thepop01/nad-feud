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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    // Failsafe timer to prevent the app from getting stuck on the loading screen.
    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth loading timeout - forcing resolution');
        setIsLoading(false);
      }
    }, 10000);

    try {
      // supaclient.onAuthStateChange returns an object with an unsubscribe method.
      // We store this method to be called on cleanup.
      const subscription = supaclient.onAuthStateChange((user) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', user?.username || 'null');
        setUser(user);
        setIsLoading(false); // This will also clear the timeout if it hasn't fired
      });
      unsubscribe = subscription.unsubscribe;
    } catch (error) {
      console.error('Auth initialization error:', error);
      // If subscription fails, ensure we don't hang in a loading state.
      if (mounted) {
        setUser(null);
        setIsLoading(false);
      }
    }

    // Cleanup function. This will be called when the component unmounts.
    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      clearTimeout(timeout);
    };
  }, []); // The empty dependency array ensures this effect runs only once on mount.


  const login = () => {
    try {
      supaclient.loginWithDiscord();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await supaclient.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = user?.is_admin ?? false;
  const canVote = user?.can_vote ?? false;

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, canVote, isLoading }}>
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
