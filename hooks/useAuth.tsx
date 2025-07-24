
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
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs once on mount to set up the authentication listener.
    const { unsubscribe } = supaclient.onAuthStateChange((user, error) => {
      setUser(user);
      setAuthError(error);
      setIsLoading(false);
    });

    // The cleanup function provided by useEffect will be called when the component
    // unmounts, ensuring we don't have memory leaks from the subscription.
    return () => {
      unsubscribe();
    };
  }, []); // The empty dependency array ensures this effect runs only once.


  const login = async () => {
    setAuthError(null); // Clear previous errors on new login attempt
    try {
      await supaclient.loginWithDiscord();
    } catch (error: any) {
      console.error('Login error:', error);
       // This error is for pre-redirect issues. It's rare but good to handle.
      setAuthError(error.message || 'Failed to initiate login. Please check your connection and try again.');
    }
  };

  const logout = async () => {
    try {
      await supaclient.logout();
      setUser(null);
      setAuthError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError('Failed to log out. Please try again.');
    }
  };
  
  const clearAuthError = () => setAuthError(null);

  const isAdmin = user?.is_admin ?? false;
  const canVote = user?.can_vote ?? false;

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, canVote, isLoading, authError, clearAuthError }}>
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
