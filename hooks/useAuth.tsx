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
    
    const initAuth = async () => {
      try {
        // Always ensure loading resolves, even on error
        const { unsubscribe } = supaclient.onAuthStateChange((user) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', user?.username || 'null');
          setUser(user);
          setIsLoading(false);
        });

        // Cleanup function
        return () => {
          mounted = false;
          unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false); // Critical: Always resolve loading
        }
      }
    };

    const cleanup = initAuth();
    
    // Failsafe: Force resolve loading after 10 seconds
    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth loading timeout - forcing resolution');
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      cleanup?.then(fn => fn?.());
      clearTimeout(timeout);
    };
  }, []);

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
