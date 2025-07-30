import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import EndedQuestionsPage from './pages/EndedQuestionsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import UserProfile from './components/UserProfile';
import CommunityHighlightsPage from './pages/CommunityHighlightsPage';

const AppContent: React.FC = () => {
  // The loading state is now handled by the AuthProvider,
  // so this component will only render when authentication is resolved.
  return (
    <HashRouter>
      <div className="relative min-h-screen text-slate-200 font-sans isolate bg-slate-900">
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ended" element={<EndedQuestionsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/community-highlights" element={<CommunityHighlightsPage />} />
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
