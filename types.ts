
import { Database } from './database.types';

export type User = Database['public']['Tables']['users']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type Answer = Database['public']['Tables']['answers']['Row'];
export type GroupedAnswer = Database['public']['Tables']['grouped_answers']['Row'];
export type Suggestion = Database['public']['Tables']['suggestions']['Row'];
export type Wallet = Database['public']['Tables']['wallets']['Row'];

// Custom types for RPCs or specific queries
export type LeaderboardUser = Database['public']['Functions']['get_leaderboard']['Returns'][number];

export interface UserAnswerHistoryItem {
  answer_text: string;
  created_at: string;
  questions: {
    question_text: string;
  } | null;
}
