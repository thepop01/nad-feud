
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
    setIsLoading(true);
    
    // onAuthStateChange is now hardened to always call the callback,
    // ensuring the app does not hang.
    const { unsubscribe } = supaclient.onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
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
