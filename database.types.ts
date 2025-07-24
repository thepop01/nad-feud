/* 
 * ----------------------------------------------------------------
 * IMPORTANT: THIS IS A PLACEHOLDER FILE
 * ----------------------------------------------------------------
 * For full type safety, you should generate this file from your
 * Supabase database schema.
 *
 * 1. Install the Supabase CLI: `npm install supabase --save-dev`
 * 2. Log in: `npx supabase login`
 * 3. Link your project: `npx supabase link --project-ref <your-project-ref>`
 * 4. Run the generator command from the root of your project:
 *    `npx supabase gen types typescript --linked > database.types.ts`
 *
 * This will overwrite this file with accurate types for your schema,
 * including tables, views, and RPC functions.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      answers: {
        Row: {
          id: string
          user_id: string
          question_id: string
          answer_text: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          answer_text: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          answer_text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      grouped_answers: {
        Row: {
          id: string
          question_id: string
          group_text: string
          percentage: number
          count: number
        }
        Insert: {
          id?: string
          question_id: string
          group_text: string
          percentage: number
          count: number
        }
        Update: {
          id?: string
          question_id?: string
          group_text?: string
          percentage?: number
          count?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: string
          question_text: string
          image_url: string | null
          status: "pending" | "live" | "ended"
          created_at: string
        }
        Insert: {
          id?: string
          question_text: string
          image_url?: string | null
          status?: "pending" | "live" | "ended"
          created_at?: string
        }
        Update: {
          id?: string
          question_text?: string
          image_url?: string | null
          status?: "pending" | "live" | "ended"
          created_at?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          discord_id: string
          username: string
          avatar_url: string
          total_score: number
          nickname: string | null
          banner_url: string | null
          discord_roles: string[] | null
          discord_role: string | null
          can_vote: boolean
          is_admin: boolean
        }
        Insert: {
          id: string
          discord_id: string
          username: string
          avatar_url: string
          total_score?: number
          nickname?: string | null
          banner_url?: string | null
          discord_roles?: string[] | null
          discord_role?: string | null
          can_vote?: boolean
          is_admin?: boolean
        }
        Update: {
          id?: string
          discord_id?: string
          username?: string
          avatar_url?: string
          total_score?: number
          nickname?: string | null
          banner_url?: string | null
          discord_roles?: string[] | null
          discord_role?: string | null
          can_vote?: boolean
          is_admin?: boolean
        }
        Relationships: []
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          address: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          address?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_leaderboard: {
        Args: {
          role_id_filter?: string
        }
        Returns: ({
            id: string,
            discord_id: string,
            username: string,
            nickname: string | null,
            avatar_url: string,
            total_score: number,
            questions_participated: number
        })[]
      }
      get_weekly_leaderboard: {
        Args: {
          role_id_filter?: string
        }
        Returns: ({
            id: string,
            discord_id: string,
            username: string,
            nickname: string | null,
            avatar_url: string,
            total_score: number,
            questions_participated: number
        })[]
      }
      get_ended_questions: {
        Args: Record<string, never>
        Returns: ({
          question: {
            id: string
            question_text: string
            image_url: string | null
            status: "pending" | "live" | "ended"
            created_at: string
          }
          groups: ({
            id: string
            question_id: string
            group_text: string
            percentage: number
            count: number
          })[]
        })[]
      }
      start_question: {
        Args: {
          question_id_to_start: string
        }
        Returns: undefined
      }
      increment_user_score: {
        Args: {
          user_id_to_update: string;
          score_to_add: number;
        };
        Returns: undefined;
      };
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}