
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
    // Stage 1: Perform a robust initial check for the user session.
    const checkInitialUser = async () => {
      try {
        const initialUser = await supaclient.getInitialUser();
        setUser(initialUser);
      } catch (error) {
        console.error("Error during initial user check:", error);
        setUser(null);
      } finally {
        // This is crucial: always set loading to false to unblock the UI.
        setIsLoading(false);
      }
    };
    
    checkInitialUser();

    // Stage 2: Subscribe to subsequent auth state changes (login/logout).
    const subscription = supaclient.onAuthStateChange((user) => {
      setUser(user);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);


  const login = () => {
    supaclient.loginWithDiscord();
  };

  const logout = async () => {
    await supaclient.logout();
    setUser(null);
  };
  
  const isAdmin = user?.is_admin ?? false;
  const canVote = user?.can_vote ?? false;

  const value = { user, login, logout, isAdmin, canVote, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
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
