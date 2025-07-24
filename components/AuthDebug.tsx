import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import Button from './Button';
import { Bug, User, AlertCircle, Loader, Database, Trash2 } from 'lucide-react';

const AuthDebug: React.FC = () => {
  const { user, isLoading, loginError } = useAuth();
  const [storageInfo, setStorageInfo] = useState<any>(null);

  const checkStorage = () => {
    const info = {
      localStorage: {} as any,
      sessionStorage: {} as any,
      cookies: document.cookie
    };

    // Check localStorage for Supabase data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) {
        try {
          info.localStorage[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          info.localStorage[key] = localStorage.getItem(key);
        }
      }
    }

    // Check sessionStorage for Supabase data
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('supabase')) {
        try {
          info.sessionStorage[key] = JSON.parse(sessionStorage.getItem(key) || '');
        } catch {
          info.sessionStorage[key] = sessionStorage.getItem(key);
        }
      }
    }

    setStorageInfo(info);
  };

  const clearAllAuthData = () => {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear cookies (basic approach)
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      if (name.trim().includes('supabase')) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    });

    alert('Auth data cleared! Please refresh the page.');
  };

  useEffect(() => {
    checkStorage();
  }, [user, isLoading]);

  return (
    <Card>
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Bug className="text-blue-400" />
          Authentication Debug Info
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Loader className={`${isLoading ? 'animate-spin text-yellow-400' : 'text-gray-500'}`} size={16} />
              <span className="font-medium">Loading State</span>
            </div>
            <p className={`${isLoading ? 'text-yellow-400' : 'text-green-400'}`}>
              {isLoading ? 'Loading...' : 'Loaded'}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className={`${user ? 'text-green-400' : 'text-gray-500'}`} size={16} />
              <span className="font-medium">User State</span>
            </div>
            <p className={`${user ? 'text-green-400' : 'text-gray-400'}`}>
              {user ? `Logged in as ${user.username}` : 'Not logged in'}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`${loginError ? 'text-red-400' : 'text-gray-500'}`} size={16} />
              <span className="font-medium">Error State</span>
            </div>
            <p className={`${loginError ? 'text-red-400' : 'text-gray-400'}`}>
              {loginError || 'No errors'}
            </p>
          </div>
        </div>

        {user && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h4 className="font-medium text-white mb-2">User Details:</h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Discord ID:</strong> {user.discord_id}</p>
              <p><strong>Can Vote:</strong> {user.can_vote ? 'Yes' : 'No'}</p>
              <p><strong>Is Admin:</strong> {user.is_admin ? 'Yes' : 'No'}</p>
              <p><strong>Role:</strong> {user.discord_role || 'None'}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button onClick={checkStorage} variant="secondary" className="text-xs px-3 py-1">
            <Database size={14} className="mr-1" />
            Check Storage
          </Button>
          <Button onClick={clearAllAuthData} variant="secondary" className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700">
            <Trash2 size={14} className="mr-1" />
            Clear All Auth Data
          </Button>
          <Button onClick={() => window.location.reload()} variant="secondary" className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700">
            🔄 Test Refresh
          </Button>
        </div>

        {storageInfo && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h4 className="font-medium text-white mb-2">Browser Storage:</h4>
            <div className="text-xs text-slate-300 space-y-2">
              <div>
                <strong>LocalStorage:</strong>
                <pre className="bg-slate-900 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(storageInfo.localStorage, null, 2)}
                </pre>
              </div>
              <div>
                <strong>SessionStorage:</strong>
                <pre className="bg-slate-900 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(storageInfo.sessionStorage, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">
          <p><strong>Troubleshooting Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Check browser console for detailed auth logs (look for 🔐 emojis)</li>
            <li>Click "Check Storage" to see what auth data is stored</li>
            <li>If logging out after refresh, check if session/profile exists in storage</li>
            <li>Try "Clear All Auth Data" if storage seems corrupted</li>
            <li>Check Network tab for failed Discord API or Supabase requests</li>
          </ol>
        </div>
      </div>
    </Card>
  );
};

export default AuthDebug;
