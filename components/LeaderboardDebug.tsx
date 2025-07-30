import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import Button from './Button';
import { Trophy, AlertCircle, CheckCircle, Play, User } from 'lucide-react';

const LeaderboardDebug: React.FC = () => {
  const { user, hasRequiredRole, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${isError ? '❌' : '✅'} ${message}`;
    setResults(prev => [...prev, formattedMessage]);
    console.log(formattedMessage);
  };

  const runLeaderboardTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Starting leaderboard access test...');
      
      // Test 1: Check if user is logged in
      if (!user) {
        addResult('No user logged in', true);
        return;
      }
      addResult(`User logged in: ${user.username}`);

      // Test 2: Check user role details
      addResult(`Discord ID: ${user.discord_id}`);
      addResult(`Discord Role: ${user.discord_role || 'None'}`);
      addResult(`Is Admin: ${user.is_admin ? 'Yes' : 'No'}`);
      addResult(`Can Vote: ${user.can_vote ? 'Yes' : 'No'}`);

      // Test 3: Check role matching logic
      const requiredRoles = ['Mon', 'NadsOG', 'Nads', 'Full Access'];
      const roleMatches = user.discord_role ? requiredRoles.includes(user.discord_role) : false;
      addResult(`Exact role match: ${roleMatches ? 'Yes' : 'No'}`);

      if (user.discord_role) {
        const lowerRole = user.discord_role.toLowerCase();
        const containsMon = lowerRole.includes('mon');
        const containsNads = lowerRole.includes('nads');
        const containsFullAccess = lowerRole.includes('full access');
        
        addResult(`Role contains 'mon': ${containsMon ? 'Yes' : 'No'}`);
        addResult(`Role contains 'nads': ${containsNads ? 'Yes' : 'No'}`);
        addResult(`Role contains 'full access': ${containsFullAccess ? 'Yes' : 'No'}`);
      }

      // Test 4: Check final hasRequiredRole result
      addResult(`Has Required Role: ${hasRequiredRole ? 'Yes' : 'No'}`);

      // Test 5: Try to access leaderboard data
      if (hasRequiredRole) {
        addResult('Testing leaderboard data access...');
        
        const { supaclient } = await import('../services/supabase');
        
        try {
          const leaderboardData = await supaclient.getLeaderboard();
          addResult(`Leaderboard data retrieved: ${leaderboardData.length} users`);
          
          const weeklyData = await supaclient.getWeeklyLeaderboard();
          addResult(`Weekly leaderboard data retrieved: ${weeklyData.length} users`);
          
          addResult('🎉 Leaderboard access test passed!');
        } catch (error) {
          addResult(`Leaderboard data access failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
        }
      } else {
        addResult('Skipping data access test - no required role', true);
        
        // Provide specific guidance
        if (!user.discord_role) {
          addResult('❗ No Discord role found - check Discord integration', true);
        } else if (!user.is_admin && !requiredRoles.some(role => 
          user.discord_role?.toLowerCase().includes(role.toLowerCase())
        )) {
          addResult(`❗ Role "${user.discord_role}" doesn't match required roles: ${requiredRoles.join(', ')}`, true);
        }
      }

    } catch (error) {
      addResult(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
      console.error('Leaderboard test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testLeaderboardNavigation = () => {
    addResult('Testing leaderboard page navigation...');
    
    try {
      // Try to navigate to leaderboard
      window.location.hash = '#/leaderboard';
      addResult('Navigation attempted - check if page loads');
    } catch (error) {
      addResult(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="text-yellow-400" size={20} />
        <h3 className="text-lg font-bold text-white">Leaderboard Access Debug</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runLeaderboardTest}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Play size={16} />
            {isLoading ? 'Running Tests...' : 'Test Leaderboard Access'}
          </Button>
          <Button
            onClick={testLeaderboardNavigation}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Trophy size={16} />
            Try Navigate to Leaderboard
          </Button>
        </div>

        {!user && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-yellow-400" size={16} />
              <span className="text-yellow-300">Please log in to test leaderboard access</span>
            </div>
          </div>
        )}

        {user && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="text-blue-400" size={16} />
              <span className="text-blue-300 font-medium">Current User Info</span>
            </div>
            <div className="text-slate-300 text-sm space-y-1">
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Discord Role:</strong> {user.discord_role || 'None'}</p>
              <p><strong>Is Admin:</strong> {user.is_admin ? 'Yes' : 'No'}</p>
              <p><strong>Leaderboard Access:</strong> <span className={hasRequiredRole ? 'text-green-400' : 'text-red-400'}>{hasRequiredRole ? 'Yes' : 'No'}</span></p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h4 className="text-white font-medium mb-2">Test Results:</h4>
            <div className="space-y-1 font-mono text-sm">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`${
                    result.includes('❌') ? 'text-red-300' : 
                    result.includes('❗') ? 'text-yellow-300' :
                    'text-green-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <div className="text-blue-300 font-medium mb-1">Required Roles for Leaderboard</div>
          <div className="text-blue-200 text-sm">
            <p>• Mon</p>
            <p>• NadsOG</p>
            <p>• Nads</p>
            <p>• Full Access</p>
            <p>• Admin (any admin user)</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LeaderboardDebug;
