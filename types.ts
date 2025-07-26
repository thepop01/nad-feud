
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

export interface HighlightSuggestion {
  id: string;
  user_id: string;
  twitter_url: string;
  description?: string;
  created_at: string;
}

export type HighlightSuggestionWithUser = HighlightSuggestion & {
  users: { username: string | null; avatar_url: string | null; } | null
};

export interface TwitterPreview {
  html: string;
  author_name: string;
  author_url: string;
  provider_name: string;
  title?: string;
  type: string;
  url: string;
  version: string;
  width: number;
  height: number;
  cache_age?: number;
}

export interface LinkValidationResult {
  isValid: boolean;
  status?: number;
  error?: string;
  redirectUrl?: string;
}

export interface LinkAnalytics {
  id: string;
  highlight_id: string;
  link_url: string;
  user_id?: string;
  clicked_at: string;
  user_agent: string;
  referrer?: string;
  community_highlights?: {
    title: string;
    embedded_link: string;
  };
  users?: {
    username: string;
    avatar_url: string;
  };
}

export interface HighlightWithLinkStatus extends CommunityHighlight {
  linkStatus: LinkValidationResult;
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
  created_by?: string;
  is_featured?: boolean;
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
  created_by?: string;
  created_at: string;
  updated_at: string;
  file_size?: number;
  view_count?: number;
}
