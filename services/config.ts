

// ====================================================================================
// IMPORTANT: REPLACE WITH YOUR SUPABASE & DISCORD CONFIG
// ====================================================================================

// Find these in your Supabase Project -> Settings -> API
// The user's redirect URL suggests the project ref is 'czgytqyexrizboaddflu'
export const supabaseUrl = "https://czgytqyexrizboaddflu.supabase.co"; 
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z3l0cXlleHJpemJvYWRkZmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTUzOTIsImV4cCI6MjA2ODQzMTM5Mn0.V08KFMNQwFWMx9PAamT8XmM9UZzztHpcvusamAb4Clw"; // Replace with your actual anon key

// --- Discord Configuration ---

// Your specific Discord Server ID
export const DISCORD_GUILD_ID = '1036357772826120242';

// The specific Discord User ID that should have admin rights
export const ADMIN_DISCORD_ID = '1172958200455245827';

// --- Role Configuration ---
// These are the roles that grant a user permission to vote/participate.
// The order of this array defines the priority. The highest role a user has will be their primary role.
const FULL_ACCESS_ROLE_ID = '1072682201658970112';
const NADSOG_ROLE_ID = '1046330093569593418';
const MON_ROLE_ID = '1037873237159321612';
const NADS_ROLE_ID = '1051562453495971941';

// The role that was previously used for admin checks, kept for reference/leaderboard filtering.
// Admin access is now determined by ADMIN_DISCORD_ID.
export const DISCORD_ADMIN_ROLE_ID = FULL_ACCESS_ROLE_ID;

// Defines the role hierarchy for determining a user's primary role.
// Order matters: Higher in the list means higher priority.
export const ROLE_HIERARCHY = [
  { name: 'Full Access', id: FULL_ACCESS_ROLE_ID },
  { name: 'NadsOG', id: NADSOG_ROLE_ID },
  { name: 'Mon', id: MON_ROLE_ID },
  { name: 'Nads', id: NADS_ROLE_ID },
];

// Define roles that can be used to filter the leaderboard.
export const FILTERABLE_ROLES = [
  { name: 'Full Access', id: FULL_ACCESS_ROLE_ID },
  { name: 'NadsOG', id: NADSOG_ROLE_ID },
  { name: 'Mon', id: MON_ROLE_ID },
];
