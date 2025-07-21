
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
    // On initial load, we want to check for a session quickly and without
    // fragile external API calls. supaclient.getUser() is designed for this.
    // It gets the session and fetches the user profile from our own database.
    supaclient.getUser().then(initialUser => {
      setUser(initialUser);
      setIsLoading(false);
    });

    // We still need onAuthStateChange to react to logins/logouts that happen
    // in another tab or when the session is automatically refreshed.
    // The handler for this is more complex, as it syncs data from Discord.
    const subscription = supaclient.onAuthStateChange(updatedUser => {
      // When this fires, it might be because of a login (user object appears),
      // a logout (user becomes null), or a background refresh. We simply
      // update our state to match.
      setUser(updatedUser);
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
