
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import { Crown, Shield, Home, X, AlertCircle, Star } from 'lucide-react';





const Header: React.FC = () => {
  const { user, login, logout, isAdmin, loginError, clearLoginError } = useAuth();

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-purple-500/20 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
    }`;

  return (
    <>
      {loginError && (
        <div className="bg-red-500/90 backdrop-blur-sm border-b border-red-400/50 sticky top-0 z-30">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-white text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
              <button
                onClick={clearLoginError}
                className="p-1 hover:bg-red-400/20 rounded transition-colors"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-20">
        <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-2xl font-bold text-white flex items-center gap-3">
              Feud
            </NavLink>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={navLinkClasses}>
              <Home size={16} /> Home
            </NavLink>
            <NavLink to="/community-highlights" className={navLinkClasses}>
              <Star size={16} /> Highlights
            </NavLink>
            <NavLink to="/leaderboard" className={navLinkClasses}>
              <Crown size={16} /> Leaderboard
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClasses}>
                <Shield size={16} /> Admin
              </NavLink>
            )}
          </nav>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-3">
                <NavLink to="/profile" className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-700/50 transition-colors">
                  <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full" />
                  <span className="font-medium text-white hidden sm:block">{user.nickname || user.username}</span>
                </NavLink>
                <Button onClick={logout} variant="secondary" className="px-3 py-1.5 text-xs">
                  Logout
                </Button>
              </div>
            ) : (
              <Button onClick={login}>Login with Discord</Button>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;