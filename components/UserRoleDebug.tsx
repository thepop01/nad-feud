import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import { User, Shield, Info } from 'lucide-react';

const UserRoleDebug: React.FC = () => {
  const { user, isAdmin, canVote, hasRequiredRole } = useAuth();

  if (!user) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User className="text-red-400" size={20} />
          <h3 className="text-lg font-bold text-white">User Role Debug</h3>
        </div>
        <p className="text-red-400">No user logged in</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-blue-400" size={20} />
        <h3 className="text-lg font-bold text-white">User Role Debug</h3>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Username:</span>
            <span className="text-white ml-2">{user.username}</span>
          </div>
          <div>
            <span className="text-slate-400">Discord ID:</span>
            <span className="text-white ml-2">{user.discord_id}</span>
          </div>
          <div>
            <span className="text-slate-400">Discord Role:</span>
            <span className="text-white ml-2">{user.discord_role || 'None'}</span>
          </div>
          <div>
            <span className="text-slate-400">Is Admin:</span>
            <span className={`ml-2 ${isAdmin ? 'text-green-400' : 'text-red-400'}`}>
              {isAdmin ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Can Vote:</span>
            <span className={`ml-2 ${canVote ? 'text-green-400' : 'text-red-400'}`}>
              {canVote ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Leaderboard Access:</span>
            <span className={`ml-2 ${hasRequiredRole ? 'text-green-400' : 'text-red-400'}`}>
              {hasRequiredRole ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        <div className="bg-slate-700/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="text-yellow-400" size={16} />
            <span className="text-yellow-300 font-medium">Role Requirements</span>
          </div>
          <div className="text-slate-300 text-sm space-y-1">
            <p><strong>Leaderboard Access:</strong> MON, NADS OG, NADS, Full Access, or Admin</p>
            <p><strong>Admin Panel:</strong> Admin role required</p>
            <p><strong>Voting:</strong> Can Vote permission required</p>
          </div>
        </div>

        {user.discord_role && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <div className="text-blue-300 font-medium mb-1">Role Analysis</div>
            <div className="text-blue-200 text-sm space-y-1">
              <p>Raw role: "{user.discord_role}"</p>
              <p>Lowercase: "{user.discord_role.toLowerCase()}"</p>
              <p>Contains 'mon': {user.discord_role.toLowerCase().includes('mon') ? 'Yes' : 'No'}</p>
              <p>Contains 'nads': {user.discord_role.toLowerCase().includes('nads') ? 'Yes' : 'No'}</p>
              <p>Contains 'full access': {user.discord_role.toLowerCase().includes('full access') ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UserRoleDebug;
