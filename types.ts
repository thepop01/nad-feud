
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

export type SuggestionWithUser = Suggestion & { users: { username: string | null; avatar_url: string | null; } | null };

export interface CategorizedSuggestionGroup {
  category: string;
  suggestions: SuggestionWithUser[];
}

export interface CommunityHighlight {
  id: string;
  title: string;
  description?: string;
  media_type: 'image' | 'video' | 'gif';
  media_url: string;
  thumbnail_url?: string;
  embedded_link?: string;
  is_active: boolean;
  display_order: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  file_size?: number;
  view_count?: number;
}

export interface AllTimeCommunityHighlight {
  id: string;
  title: string;
  description?: string;
  media_type: 'image' | 'video' | 'gif';
  media_url: string;
  thumbnail_url?: string;
  embedded_link?: string;
  category: 'gaming' | 'community' | 'events' | 'achievements' | 'memories';
  is_featured: boolean;
  display_order: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  file_size?: number;
  view_count?: number;
}

export interface EndedQuestionWithAnswers {
  question: Question;
  top_answers: Array<{
    id: string;
    group_text: string;
    percentage: number;
    count: number;
    display_order: number;
  }>;
  is_confirmed: boolean;
  needs_review: boolean;
}
