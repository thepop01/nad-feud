


import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet } from '../types';
import { mockSupabase } from './mockSupabase';
import { supabaseUrl, supabaseAnonKey, DISCORD_GUILD_ID, ROLE_HIERARCHY, ADMIN_DISCORD_ID } from './config';


const useMock = supabaseUrl.includes("your-project-ref") || supabaseAnonKey.includes("your-supabase-anon-key");

if (useMock) {
  const warningMessage = `
    ------------------------------------------------------------------
    WARNING: Your Supabase credentials are not set!
    The application is running in OFFLINE MOCK MODE. Data will not be
    persisted and authentication is simulated.

    To connect to a real database, please update the variables in 'services/config.ts'.
    ------------------------------------------------------------------
  `;
  console.warn(warningMessage);
}


const supabase: SupabaseClient<Database> | null = !useMock ? createClient<Database>(supabaseUrl, supabaseAnonKey) : null;

const realSupabaseClient = {
  // === AUTH ===
  loginWithDiscord: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        scopes: 'identify guilds.members.read', // Request server-specific scopes
      },
    });
    if (error) throw error;
  },

  logout: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getInitialUser: async (): Promise<User | null> => {
    if (!supabase) return null;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    const { data: userProfile, error } = await (supabase
        .from('users') as any)
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !userProfile) {
      console.warn("Session found but user profile is missing or errored. Logging out to clear invalid state.", error?.message);
      await supabase.auth.signOut();
      return null;
    }

    return userProfile as User;
  },

  onAuthStateChange: (callback: (user: User | null) => void): { unsubscribe: () => void; } => {
    if (!supabase) return { unsubscribe: () => {} };
    
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session) {
          callback(null);
          return;
        }

        // On a fresh login, we get a valid provider_token and must perform a full data sync with Discord.
        if (event === 'SIGNED_IN') {
          console.log('Auth event: SIGNED_IN. Performing full Discord sync.');
          const { user: authUser, provider_token } = session;
          if (!authUser || !provider_token) {
            throw new Error("Invalid session or provider token for SIGNED_IN event.");
          }

          const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`, {
              headers: { Authorization: `Bearer ${provider_token}` }
          });

          if (!memberRes.ok) {
             if(memberRes.status === 404) {
                 console.warn(`User ${authUser.user_metadata.name} is not a member of the required server. Logging out.`);
             } else {
                 console.error('Failed to fetch Discord member data:', memberRes.statusText);
             }
             await supabase.auth.signOut();
             callback(null);
             return;
          }
          const memberData = await memberRes.json();
          
          const userRes = await fetch(`https://discord.com/api/users/@me`, {
              headers: { Authorization: `Bearer ${provider_token}` }
          });
          if (!userRes.ok) throw new Error('Failed to fetch Discord global user data');
          const globalUserData = await userRes.json();
          
          let discord_role: string | null = null;
          for (const role of ROLE_HIERARCHY) {
              if (memberData.roles.includes(role.id)) {
                  discord_role = role.name;
                  break;
              }
          }
          
          const can_vote = discord_role !== null;
          const discord_id = globalUserData.id;
          const is_admin = discord_id === ADMIN_DISCORD_ID;

          const avatar_url = globalUserData.avatar 
              ? `https://cdn.discordapp.com/avatars/${discord_id}/${globalUserData.avatar}.png`
              : `https://cdn.discordapp.com/embed/avatars/${parseInt(globalUserData.discriminator) % 5}.png`;
          
          const banner_url = globalUserData.banner 
              ? `https://cdn.discordapp.com/banners/${discord_id}/${globalUserData.banner}.png?size=1024` 
              : null;

          const userDataToUpsert = {
              id: authUser.id,
              discord_id: discord_id,
              username: globalUserData.username,
              avatar_url: avatar_url,
              nickname: memberData.nick,
              banner_url: banner_url,
              discord_roles: memberData.roles,
              discord_role: discord_role,
              can_vote: can_vote,
              is_admin: is_admin,
          };
          
          const { error: upsertError } = await (supabase.from('users') as any).upsert(userDataToUpsert, { onConflict: 'id' });
          if (upsertError) throw upsertError;
          
          const { data: updatedUser, error: selectError } = await (supabase.from('users') as any).select('*').eq('id', authUser.id).single();
          if (selectError) throw selectError;

          callback(updatedUser as User | null);
          return;
        }

        // For subsequent events like TOKEN_REFRESHED, update the user state from our DB.
        // The initial session is now handled by `getInitialUser`.
        if (event !== 'INITIAL_SESSION' && session) {
            console.log(`Auth event: ${event}. Fetching user profile from DB.`);
            const { data: userProfile, error } = await (supabase
                .from('users') as any)
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (error) {
                console.error("Error fetching user profile for existing session:", error);
                await supabase.auth.signOut();
                callback(null);
                return;
            }
            callback(userProfile as User | null);
        }

      } catch (error) {
        console.error("Error during auth state change processing:", error);
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch (signOutError) {
                console.error("Error during sign out after another error:", signOutError);
            }
        }
        callback(null);
      }
    });

    return data.subscription || { unsubscribe: () => {} };
  },

  // === DATA FETCHING ===
  getLiveQuestions: async (): Promise<(Question & { answered: boolean })[]> => {
    if (!supabase) return [];

    const { data: liveQuestions, error } = await (supabase
        .from('questions') as any)
        .select('id, question_text, image_url, status, created_at')
        .eq('status', 'live')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching live questions:', error.message);
        return [];
    }
    if (!liveQuestions || liveQuestions.length === 0) {
        return [];
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    let answeredQuestionIds = new Set<string>();

    if (user) {
        const liveQuestionIds = liveQuestions.map((q: any) => q.id);
        const { data: userAnswers, error: answerError } = await (supabase
            .from('answers') as any)
            .select('question_id')
            .eq('user_id', user.id)
            .in('question_id', liveQuestionIds);
        
        if (answerError) {
            console.error('Error fetching user answers for live questions:', answerError.message);
        } else if (userAnswers) {
            answeredQuestionIds = new Set(userAnswers.map((a: any) => a.question_id));
        }
    }
    
    return liveQuestions.map((q: any) => ({
        ...q,
        answered: answeredQuestionIds.has(q.id),
    }));
  },

  getEndedQuestions: async (): Promise<{ question: Question; groups: GroupedAnswer[] }[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase as any).rpc('get_ended_questions');
    if (error) {
        console.error("Error fetching ended questions:", error.message);
        return [];
    }
    if (!data) {
        return [];
    }
    // The RPC returns json, so we need to cast it
    return ((data as unknown as any[]) || []).map((item: any) => ({
        question: item.question as Question,
        groups: (item.groups || []) as GroupedAnswer[]
    }));
  },
  
  getLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
      if (!supabase) return [];
      const { data, error } = await (supabase as any).rpc('get_leaderboard', { role_id_filter: roleIdFilter });
      if (error) {
        console.error("Error fetching leaderboard:", error.message);
        return [];
      }
      return (data as any) || [];
  },

  getWeeklyLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
      if (!supabase) return [];
      const { data, error } = await (supabase as any).rpc('get_weekly_leaderboard', { role_id_filter: roleIdFilter });
      if (error) {
        console.error("Error fetching weekly leaderboard:", error.message);
        return [];
      }
      return (data as any) || [];
  },

  getUserAnswerHistory: async (userId: string): Promise<UserAnswerHistoryItem[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
        .from('answers') as any)
        .select('answer_text, created_at, questions(question_text)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching user answer history:", error.message);
        return [];
    }
    // Supabase TS generator might not create the nested type correctly, so we cast to any.
    return (data as any) || [];
  },
  
  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await (supabase.from('answers') as any)
        .insert({
            question_id: questionId,
            answer_text: answerText,
            user_id: userId,
        })
        .select()
        .single();
    if (error) throw error;
    return data as Answer;
  },

  submitSuggestion: async (text: string, userId: string): Promise<any> => {
    if (!supabase) throw new Error("Supabase client not initialized");
     const { data, error } = await (supabase.from('suggestions') as any)
      .insert({ text, user_id: userId })
      .select(`*, users (username, avatar_url)`)
      .single();

    if (error) throw error;
    
    return data;
  },

  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('wallets') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
      
    if (error) throw error;
    return (data as any) || [];
  },

  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await (supabase.from('wallets') as any)
      .insert({ user_id: userId, address })
      .select()
      .single();
    if (error) throw error;
    return data as Wallet;
  },

  deleteWallet: async (walletId: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase
      .from('wallets') as any)
      .delete()
      .eq('id', walletId);
    if (error) throw error;
  },

  // === ADMIN METHODS ===
  getPendingQuestions: async (): Promise<Question[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
        .from('questions') as any)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any) || [];
  },
  
  getSuggestions: async (): Promise<(Suggestion & {users: {username: string, avatar_url: string}})[]> => {
    if (!supabase) return [];
     const { data, error } = await (supabase
      .from('suggestions') as any)
      .select(`
        id, text, created_at, user_id,
        users ( username, avatar_url )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any) || []; // Cast because of join type
  },

  deleteSuggestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase.from('suggestions') as any).delete().eq('id', id);
    if (error) throw error;
  },

  uploadQuestionImage: async (file: File, userId: string): Promise<string> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    // Organize uploads into user-specific folders for security and organization.
    // This is more likely to comply with storage RLS policies.
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
        throw new Error("Could not get public URL for uploaded image.");
    }
    
    return data.publicUrl;
  },

  createQuestion: async (questionText: string, imageUrl: string | null, userId: string): Promise<Question> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await (supabase.from('questions') as any)
        .insert({ 
            question_text: questionText, 
            image_url: imageUrl, 
            status: 'pending',
            user_id: userId,
        })
        .select()
        .single();
    if (error) throw error;
    return data as Question;
  },

  updateQuestion: async (id: string, questionText: string, imageUrl: string | null): Promise<Question> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await (supabase.from('questions') as any)
        .update({ question_text: questionText, image_url: imageUrl })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data as Question;
  },

  deleteQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase.from('questions') as any).delete().eq('id', id);
    if (error) throw error;
  },

  startQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase.from('questions') as any)
        .update({ status: 'live' })
        .eq('id', id);
    if (error) throw error;
  },
  
  endQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;

    // 1. Mark question as 'ended'
    const { data: question, error: updateError } = await (supabase.from('questions') as any)
        .update({ status: 'ended' })
        .eq('id', id)
        .select()
        .single();

    if (updateError) throw updateError;
    if (!question) throw new Error("Question not found");

    // 2. Fetch all answers for this question
    const { data: answers, error: answersError } = await (supabase.from('answers') as any)
      .select('id, user_id, answer_text')
      .eq('question_id', id);

    if (answersError) throw answersError;
    if (!answers || answers.length === 0) {
      console.log("No answers submitted for this question. Nothing to score.");
      return;
    }
    
    // 3. Invoke the secure edge function to group answers
    console.log("Invoking 'group-and-score' Edge Function...");
    const { data: groupedAnswers, error: functionError } = await supabase.functions.invoke('group-and-score', {
        body: {
            question: question.question_text,
            answers: answers.map((a: any) => a.answer_text)
        }
    });

    if (functionError) {
        console.error("Edge function error:", functionError.message);
        // Optionally revert question status back to 'live'
        await (supabase.from('questions') as any).update({ status: 'live' }).eq('id', id);
        throw functionError;
    }

    // 4. Save the grouped answers to the database
    const groupsToInsert = groupedAnswers.map((g: any) => ({
      ...g,
      question_id: id,
    }));

    const { error: insertGroupsError } = await (supabase.from('grouped_answers') as any).insert(groupsToInsert);
    if (insertGroupsError) throw insertGroupsError;

    // 5. Award points to users
    console.log("Awarding points to users...");
    const scoreUpdates = new Map<string, number>();

    for (const answer of answers) {
      // Find the group the answer belongs to.
      // This logic must be robust. For now, we assume simple semantic similarity was handled by the AI.
      // A simple lowercase check is a good first step.
      const answerTextLower = answer.answer_text.toLowerCase().trim();
      const bestMatch = groupedAnswers.find((group: any) => 
        group.group_text.toLowerCase().trim() === answerTextLower
      );

      if (bestMatch) {
        const points = Math.round(bestMatch.percentage);
        scoreUpdates.set(answer.user_id, (scoreUpdates.get(answer.user_id) || 0) + points);
      }
    }
    
    for (const [userId, points] of scoreUpdates.entries()) {
      if (points > 0) {
        const { error: rpcError } = await supabase.rpc('increment_user_score' as any, { user_id_to_update: userId, score_to_add: points });
        if (rpcError) {
          console.error(`Failed to update score for user ${userId}:`, rpcError.message);
        } else {
          console.log(`Awarded ${points} points to user ${userId}`);
        }
      }
    }
  },

  resetAllData: async (): Promise<void> => {
    if (!supabase) return;
    console.warn("Attempting to reset all game data. This is a destructive operation.");

    // 1. Delete all answers
    const { error: answersError } = await supabase
      .from('answers')
      .delete()
      .gt('created_at', '1970-01-01T00:00:00Z'); // Filter to delete all
    if (answersError) {
      console.error("Error deleting answers:", answersError);
      throw answersError;
    }
    console.log("All answers have been deleted.");

    // 2. Delete all grouped answers
    const { error: groupedAnswersError } = await supabase
      .from('grouped_answers')
      .delete()
      .gt('count', -1); // Filter to delete all
    if (groupedAnswersError) {
      console.error("Error deleting grouped answers:", groupedAnswersError);
      throw groupedAnswersError;
    }
    console.log("All grouped answers have been deleted.");

    // 3. Reset all user scores to 0
    const { error: usersError } = await (supabase
      .from('users') as any)
      .update({ total_score: 0 })
      .gt('total_score', -1); // Filter to update all users with a score
    if (usersError) {
      console.error("Error resetting user scores:", usersError);
      throw usersError;
    }
    console.log("All user scores have been reset to 0.");
  }
};


// The final export combines the real and mock clients.
export const supaclient = useMock ? mockSupabase : realSupabaseClient;