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
        const { unsubscribe } = supaclient.onAuthStateChange((user) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', user?.username || 'null');
          setUser(user);
          setIsLoading(false);
        });

        return () => {
          mounted = false;
          unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    const cleanup = initAuth();
    
    // Reduced timeout for faster loading
    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth loading timeout - forcing resolution');
        setIsLoading(false);
      }
    }, 3000); // Reduced from 10s to 3s

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

  // Simpler loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
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
