


import { createClient, SupabaseClient, Subscription, AuthError } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet, SuggestionWithUser } from '../types';
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

  onAuthStateChange: (callback: (user: User | null) => void): { unsubscribe: () => void; } => {
    if (!supabase) {
      // For mock mode, ensure the callback fires to avoid a hung loading state.
      setTimeout(() => callback(null), 0);
      return { unsubscribe: () => {} };
    }
    
    // This call returns the subscription object and a potential error.
    const subResult = supabase.auth.onAuthStateChange(async (event, session) => {
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
          
          // Construct user data conforming to the `users.Insert` type
          const userData: Database['public']['Tables']['users']['Insert'] = {
              id: authUser.id,
              discord_id: discord_id,
              username: globalUserData.username,
              avatar_url: avatar_url,
              banner_url: banner_url,
              nickname: memberData.nick || globalUserData.global_name,
              discord_roles: memberData.roles,
              discord_role,
              can_vote,
              is_admin
          };
          
          const { data: updatedUser, error } = await supabase
              .from('users')
              .upsert(userData)
              .select()
              .single();

          if (error) throw error;
          if (!updatedUser) {
            console.error("User upsert did not return a user object.");
            callback(null);
            return;
          }
          callback(updatedUser as User);
        } else if (session) {
          // Add a guard clause to handle corrupted/invalid session objects from localStorage
          if (!session.user || !session.user.id) {
            console.warn("Session object is invalid. Logging out to clear corrupted state.", session);
            await supabase.auth.signOut();
            callback(null);
            return;
          }

          // For other events like INITIAL_SESSION, TOKEN_REFRESHED, or USER_UPDATED, just get the profile from our DB
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
             console.error("Error fetching user profile during auth state change. This could be a network issue or the user might not exist in the 'users' table. Logging out.", error);
             await supabase.auth.signOut();
             callback(null);
             return;
          }

          if (!userProfile) {
            console.warn(`User session found, but no profile in 'users' table for id ${session.user.id}. Logging out.`);
            await supabase.auth.signOut();
            callback(null);
            return;
          }
          
          callback(userProfile as User);
        }
      } catch (error) {
        console.error("Error in onAuthStateChange handler:", error);
        callback(null);
      }
    });

    const subscriptionError = (subResult as { error: AuthError | null }).error;
    if (subscriptionError) {
      console.error("Error subscribing to auth changes:", subscriptionError);
      throw subscriptionError;
    }

    if (!subResult.data || !subResult.data.subscription) {
      console.warn("Auth subscription did not return a subscription object.");
      return { unsubscribe: () => {} };
    }
    
    return { 
        unsubscribe: () => {
            subResult.data.subscription!.unsubscribe();
        }
    };
  },

  // === DATA FETCHING ===
  getLiveQuestions: async (): Promise<(Question & { answered: boolean })[]> => {
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    const { data, error } = await supabase
      .from('questions')
      .select('*, answers(user_id)')
      .eq('status', 'live');
      
    if (error) throw error;
    
    const questionsWithAnswers = (data as any[] as (Question & { answers: { user_id: string }[] })[]) || [];

    if (!userId) {
      return questionsWithAnswers.map((q) => ({ ...q, answered: false }));
    }
    
    return questionsWithAnswers.map((q) => ({
      ...q,
      answered: q.answers ? q.answers.some((a: { user_id: string }) => a.user_id === userId) : false,
    }));
  },

  getEndedQuestions: async (): Promise<{ question: Question, groups: GroupedAnswer[] }[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_ended_questions');
    if (error) throw error;
    return (data as any) || [];
  },
  
  getLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_leaderboard', { role_id_filter: roleIdFilter });
    if (error) throw error;
    return (data as any) || [];
  },

  getWeeklyLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', { role_id_filter: roleIdFilter });
    if (error) throw error;
    return (data as any) || [];
  },
  
  getUserAnswerHistory: async (userId: string): Promise<UserAnswerHistoryItem[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('answers')
      .select('answer_text, created_at, questions(question_text)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[] as UserAnswerHistoryItem[]) || [];
  },

  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('answers')
      .insert({ question_id: questionId, answer_text: answerText, user_id: userId } as any)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to submit answer, no data returned.");
    return data as Answer;
  },

  submitSuggestion: async (text: string, userId: string): Promise<SuggestionWithUser> => {
     if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('suggestions')
      .insert({ text, user_id: userId } as any)
      .select('*, users(username, avatar_url)')
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to submit suggestion, no data returned.");
    return data as SuggestionWithUser;
  },
  
  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as Wallet[]) || [];
  },

  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase.from('wallets').insert({ user_id: userId, address } as any).select().single();
    if (error) throw error;
    if (!data) throw new Error("Failed to add wallet, no data returned.");
    return data as Wallet;
  },

  deleteWallet: async (walletId: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { error } = await supabase.from('wallets').delete().eq('id', walletId);
    if (error) throw error;
  },

  // === ADMIN METHODS ===
  getPendingQuestions: async (): Promise<Question[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    return (data as Question[]) || [];
  },
  
  getSuggestions: async (): Promise<SuggestionWithUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[] as SuggestionWithUser[]) || [];
  },
  
  deleteSuggestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) throw error;
  },

  categorizeSuggestions: async (suggestions: { id: string, text: string }[]): Promise<{ id: string; category: string; }[]> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase.functions.invoke('categorize-suggestions', {
        body: suggestions,
    });
    if (error) throw error;
    return data;
  },

  uploadQuestionImage: async (file: File, userId: string): Promise<string> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const bucketName = 'question-images';
    const filePath = `${userId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  },

  createQuestion: async (questionText: string, imageUrl: string | null): Promise<Question> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('questions')
      .insert({ question_text: questionText, image_url: imageUrl, status: 'pending' } as any)
      .select()
      .single();
    if (error) {
      console.error('Error creating question in Supabase:', error);
      throw error;
    }
    if (!data) throw new Error("Failed to create question, no data returned.");
    return data as Question;
  },

  updateQuestion: async (id: string, questionText: string, imageUrl: string | null): Promise<Question> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
        .from('questions')
        .update({ question_text: questionText, image_url: imageUrl } as any)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to update question, no data returned.");
    return data as Question;
  },

  deleteQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
  },
  
  startQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
      .from('questions')
      .update({ status: 'live' } as any)
      .eq('id', id);

    if (error) throw error;
  },
  
  endQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;

    const { data: answersData, error: answersError } = await supabase
      .from('answers')
      .select('user_id, answer_text')
      .eq('question_id', id);

    if (answersError) throw answersError;
    const answers = (answersData as any[] | null) || [];
    if (answers.length === 0) {
      console.log("No answers to group, just ending question.");
      const { error: updateError } = await supabase.from('questions').update({ status: 'ended' } as any).eq('id', id);
      if (updateError) throw updateError;
      return;
    }
    
    const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('question_text')
        .eq('id', id)
        .single();

    if (questionError) throw questionError;
    if (!questionData) {
        console.error(`Question with id ${id} not found. Ending question without scoring.`);
        const { error: updateError } = await supabase.from('questions').update({ status: 'ended' } as any).eq('id', id);
        if (updateError) throw updateError;
        return;
    }

    type AIGroupedAnswer = {
      group_text: string;
      count: number;
      percentage: number;
    };
    
    const { data, error: functionError } = await supabase.functions.invoke<AIGroupedAnswer[]>('group-and-score', {
        body: {
            question: (questionData as any).question_text,
            answers: answers.map(a => (a as any).answer_text)
        }
    });

    if (functionError) throw functionError;
    
    const groupedAnswers = data;
    
    if (!groupedAnswers || groupedAnswers.length === 0) {
        console.log("AI grouping returned no results. Ending question without scoring.");
        const { error: updateError } = await supabase.from('questions').update({ status: 'ended' } as any).eq('id', id);
        if (updateError) throw updateError;
        return;
    }

    const groupedAnswersToInsert = groupedAnswers.map(g => ({
        ...g,
        question_id: id,
    }));

    const { error: insertError } = await supabase.from('grouped_answers').insert(groupedAnswersToInsert as any);
    if (insertError) throw insertError;
    
    const scoreUpdates = new Map<string, number>();
     for (const answer of answers) {
        const answerTyped = answer as { user_id: string; answer_text: string };
        const answerTextLower = answerTyped.answer_text.toLowerCase().trim().replace(/s$/, '');
        const bestMatch = groupedAnswers.find(g => g.group_text.toLowerCase().trim().replace(/s$/, '') === answerTextLower);
        if (bestMatch) {
            const currentScore = scoreUpdates.get(answerTyped.user_id) || 0;
            scoreUpdates.set(answerTyped.user_id, currentScore + Math.round(bestMatch.percentage));
        }
    }

    for (const [userId, points] of scoreUpdates.entries()) {
        const { error: rpcError } = await supabase.rpc('increment_user_score', { user_id_to_update: userId, score_to_add: points });
        if(rpcError) console.error(`Failed to increment score for user ${userId}:`, rpcError);
    }

    const { error: updateError } = await supabase.from('questions').update({ status: 'ended' } as any).eq('id', id);
    if (updateError) throw updateError;
  },

  resetAllData: async (): Promise<void> => {
      if (!supabase) return;
      const { error: deleteAnswersError } = await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteAnswersError) throw deleteAnswersError;
      
      const { error: deleteGroupsError } = await supabase.from('grouped_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteGroupsError) throw deleteGroupsError;

      const { error: resetScoresError } = await supabase.from('users').update({ total_score: 0 } as any).neq('id', '00000000-0000-0000-0000-000000000000');
      if(resetScoresError) throw resetScoresError;
  }
};


export const supaclient = useMock ? mockSupabase : realSupabaseClient;