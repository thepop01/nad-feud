
import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Header from './components/Header';
import AnimatedBackground from './components/AnimatedBackground';
import HomePage from './pages/HomePage';
import EndedQuestionsPage from './pages/EndedQuestionsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const AuthErrorDisplay = ({ authError, clearAuthError }: { authError: string | null; clearAuthError: () => void; }) => (
  <AnimatePresence>
    {authError && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-red-800/50 border-b border-red-600/50 text-white overflow-hidden"
        role="alert"
      >
        <div className="container mx-auto flex items-center justify-between p-3 gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
            <span className="text-sm font-medium text-red-200">{authError}</span>
          </div>
          <button onClick={clearAuthError} aria-label="Dismiss error message" className="text-red-300 hover:text-white transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const AppContent: React.FC = () => {
  const { authError, clearAuthError } = useAuth();
  // The loading state is now handled by the AuthProvider,
  // so this component will only render when authentication is resolved.
  return (
    <HashRouter>
      <div className="relative min-h-screen text-slate-200 font-sans isolate">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col min-h-screen">
          <AuthErrorDisplay authError={authError} clearAuthError={clearAuthError} />
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ended" element={<EndedQuestionsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
