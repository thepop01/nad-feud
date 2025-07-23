import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Header from './components/Header';
import AnimatedBackground from './components/AnimatedBackground';
import HomePage from './pages/HomePage';
import EndedQuestionsPage from './pages/EndedQuestionsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong!</h1>
            <p className="mb-4">Please refresh the page or clear your browser data.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <div className="min-h-screen bg-gray-900 text-white">
            <AnimatedBackground />
            <Header />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/ended" element={<EndedQuestionsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
