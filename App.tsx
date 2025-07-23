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

const AppContent: React.FC = () => {
  const { isLoading } = useAuth();

  // Display a full-screen loader during the initial auth check
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-slate-900 z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="relative min-h-screen text-slate-200 font-sans isolate">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col min-h-screen">
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
