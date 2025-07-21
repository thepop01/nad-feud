export interface User {
  id: string; // UUID from Supabase auth
  discord_id: string;
  username: string;
  avatar_url: string;
  total_score: number;
  nickname: string | null;
  banner_url: string | null;
  discord_roles: string[]; // All raw role IDs from Discord
  discord_role: string | null; // Highest priority role name (e.g., 'NadsOG')
  can_vote: boolean;
  is_admin: boolean;
}

export interface Question {
  id: string; // UUID
  question_text: string;
  image_url: string | null;
  status: 'live' | 'ended' | 'pending';
  created_at: string; // ISO string
}

export interface Answer {
  id: string; // UUID
  user_id: string;
  question_id: string;
  answer_text: string;
  created_at: string; // ISO string
}

export interface GroupedAnswer {
  id: string; // UUID
  question_id: string;
  group_text: string;
  percentage: number;
  count: number;
}

export interface Suggestion {
  id: string; // UUID
  user_id: string;
  text: string;
  created_at: string; // ISO string
}

export interface LeaderboardUser extends Omit<User, 'discord_roles' | 'discord_role' | 'can_vote' | 'is_admin' | 'banner_url'> {
  questions_participated: number;
}

export interface UserAnswerHistoryItem {
  answer_text: string;
  created_at: string;
  questions: {
    question_text: string;
  } | null;
}

export interface Wallet {
  id: string; // UUID
  user_id: string;
  address: string;
  created_at: string;
}