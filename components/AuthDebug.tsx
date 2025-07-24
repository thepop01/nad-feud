import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import { Bug, User, AlertCircle, Loader } from 'lucide-react';

const AuthDebug: React.FC = () => {
  const { user, isLoading, loginError } = useAuth();

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

        <div className="text-xs text-slate-500">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>If "Loading..." persists, check browser console for errors</li>
            <li>If stuck after login, try the "Clear Auth Data" button in the loading screen</li>
            <li>Check network tab for failed API requests</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default AuthDebug;
