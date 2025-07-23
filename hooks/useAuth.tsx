
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
    // This effect runs once on mount to establish the auth state.
    // setIsLoading(true) is handled by the AppContent component on initial load.
    
    // The supaclient's onAuthStateChange is hardened to always call its callback,
    // so we don't need extra try/catch or timeouts here.
    const { unsubscribe } = supaclient.onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);


  const login = () => {
    try {
      supaclient.loginWithDiscord();
    } catch (error) {
      console.error("Error during login attempt:", error);
    }
  };

  const logout = async () => {
    try {
      await supaclient.logout();
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  
  const isAdmin = user?.is_admin ?? false;
  const canVote = user?.can_vote ?? false;

  const value = { user, login, logout, isAdmin, canVote, isLoading };

  return (
    <AuthContext.Provider value={value}>
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
