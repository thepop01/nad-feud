import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import Card from './Card';
import { AlertCircle, RefreshCw } from 'lucide-react';

const LoginErrorDemo: React.FC = () => {
  const { user, login, loginError, clearLoginError, isLoading } = useAuth();

  if (user) {
    return null; // Don't show demo if user is logged in
  }

  return (
    <Card>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertCircle className="text-yellow-400" />
          Login Error Handling Demo
        </h3>
        
        <p className="text-slate-400">
          This demonstrates the improved login error handling. Try logging in to see how errors are displayed.
        </p>

        {loginError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 mt-0.5" size={20} />
              <div className="flex-1">
                <h4 className="text-red-400 font-medium mb-1">Login Error</h4>
                <p className="text-red-300 text-sm">{loginError}</p>
              </div>
              <Button
                onClick={clearLoginError}
                variant="secondary"
                className="px-2 py-1 text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={login} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Logging in...
              </>
            ) : (
              'Test Login with Discord'
            )}
          </Button>
          
          {loginError && (
            <Button 
              onClick={() => {
                clearLoginError();
                login();
              }}
              variant="secondary"
              disabled={isLoading}
            >
              Retry Login
            </Button>
          )}
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Improvements made:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>User-friendly error messages displayed in header</li>
            <li>Retry mechanism for Discord API failures (3 attempts with exponential backoff)</li>
            <li>Better error handling for network issues</li>
            <li>Graceful fallback to existing profiles when Discord sync fails</li>
            <li>Clear error states and loading indicators</li>
            <li>Dismissible error notifications</li>
            <li><strong>Fixed infinite loading issue:</strong> Added timeouts and "Clear Auth Data" button</li>
            <li>Automatic cleanup of corrupted authentication tokens</li>
            <li>Better session validation on app startup</li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm font-medium mb-1">✅ Loading Issue Fixed</p>
          <p className="text-green-300 text-xs">
            The app now has a 10-second timeout for authentication loading. If you get stuck on the loading screen,
            you'll see a "Clear Auth Data & Retry" button that will fix the issue without needing to manually delete cookies.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default LoginErrorDemo;
