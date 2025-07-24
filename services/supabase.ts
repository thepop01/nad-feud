
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
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
      setTimeout(() => callback(null), 0);
      return { unsubscribe: () => {} };
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Primary exit condition: No session means the user is logged out.
      if (!session) {
        if (event === 'SIGNED_OUT') {
            console.log("Auth event: SIGNED_OUT");
        }
        callback(null);
        return;
      }

      // We have a session. Let's try to get or create a profile.
      try {
        const authUser = session.user;
        if (!authUser) throw new Error("Session exists but user object is missing.");
        
        // Step 1: Check for an existing profile in our DB.
        const { data: existingProfile, error: fetchError } = await (supabase
            .from('users') as any)
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = "Row not found"
            // A real database error occurred.
            throw fetchError;
        }

        // Step 2: Determine if we can and should sync with Discord.
        // We can only sync if we have a provider_token.
        // We should sync if it's the first sign-in OR if the profile is missing.
        const providerToken = session.provider_token;
        if (providerToken && (!existingProfile || event === 'SIGNED_IN')) {
          console.log(`Auth: Syncing profile from Discord. Event: ${event}, Profile Exists: ${!!existingProfile}`);
          
          // --- Start of Discord Sync Logic ---
          const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`, {
              headers: { Authorization: `Bearer ${providerToken}` }
          });

          if (!memberRes.ok) {
             if (memberRes.status === 404) {
                 console.warn(`User ${authUser.user_metadata.name} is not a member of the required server. Cannot create profile.`);
             } else {
                 console.error('Failed to fetch Discord member data:', memberRes.status, await memberRes.text());
             }
             // If sync fails but they had an old profile, use that. Otherwise, log them out.
             if (existingProfile) {
                callback(existingProfile as User);
             } else {
                await supabase.auth.signOut();
                callback(null);
             }
             return;
          }
          const memberData = await memberRes.json();
          
          const userRes = await fetch(`https://discord.com/api/users/@me`, {
              headers: { Authorization: `Bearer ${providerToken}` }
          });
          if (!userRes.ok) throw new Error(`Failed to fetch Discord global user data: ${userRes.status}`);
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
              : `https://cdn.discordapp.com/embed/avatars/${parseInt(globalUserData.discriminator || '0') % 5}.png`;
          
          const banner_url = globalUserData.banner
              ? `https://cdn.discordapp.com/banners/${discord_id}/${globalUserData.banner}.png?size=1024`
              : null;
          
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
          
          const { data: upsertedUser, error: upsertError } = await (supabase
              .from('users') as any)
              .upsert(userData)
              .select()
              .single();

          if (upsertError) throw upsertError;
          if (!upsertedUser) throw new Error("User upsert did not return a user object.");

          console.log("Auth: Profile sync successful.");
          callback(upsertedUser as User);
          // --- End of Discord Sync Logic ---
        } else if (existingProfile) {
          // We have a profile, but no token to sync. This is the normal "already logged in" state.
          console.log(`Auth: Using existing profile. Event: ${event}`);
          callback(existingProfile as User);
        } else {
          // No token to sync with AND no existing profile. This is an invalid state.
          // The user has a session but we can't get their details.
          console.warn(`Auth: User has session but no profile and no provider token to sync. Logging out.`);
          await supabase.auth.signOut();
          callback(null);
        }
      } catch (error) {
        console.error("Critical error in onAuthStateChange handler. Logging out.", error);
        if (supabase) {
            await supabase.auth.signOut().catch(e => console.error("Sign out failed during error handling:", e));
        }
        callback(null);
      }
    });

    if (!subscription) {
      console.error("Failed to subscribe to auth state changes.");
      setTimeout(() => callback(null), 0);
      return { unsubscribe: () => {} };
    }
    
    return { 
        unsubscribe: () => subscription.unsubscribe()
    };
  },

  // === DATA FETCHING ===
  getLiveQuestions: async (): Promise<(Question & { answered: boolean })[]> => {
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    const { data, error } = await (supabase
      .from('questions') as any)
      .select('*, answers(user_id)')
      .eq('status', 'live');
      
    if (error) throw error;
    
    const questionsWithAnswers = (data as (Question & { answers: { user_id: string }[] })[]) || [];

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
    const { data, error } = await (supabase
      .from('answers') as any)
      .select('answer_text, created_at, questions(question_text)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as UserAnswerHistoryItem[]) || [];
  },

  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase
      .from('answers') as any)
      .insert({ question_id: questionId, answer_text: answerText, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to submit answer, no data returned.");
    return data as Answer;
  },

  submitSuggestion: async (text: string, userId: string): Promise<SuggestionWithUser> => {
     if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase
      .from('suggestions') as any)
      .insert({ text, user_id: userId })
      .select('*, users(username, avatar_url)')
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to submit suggestion, no data returned.");
    return data as SuggestionWithUser;
  },
  
  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase.from('wallets') as any).select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as Wallet[]) || [];
  },

  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase.from('wallets') as any).insert({ user_id: userId, address }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Failed to add wallet, no data returned.");
    return data as Wallet;
  },

  deleteWallet: async (walletId: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { error } = await (supabase.from('wallets') as any).delete().eq('id', walletId);
    if (error) throw error;
  },

  // === ADMIN METHODS ===
  getPendingQuestions: async (): Promise<Question[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('questions') as any)
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    return (data as Question[]) || [];
  },
  
  getSuggestions: async (): Promise<SuggestionWithUser[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('suggestions') as any)
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as SuggestionWithUser[]) || [];
  },
  
  deleteSuggestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase.from('suggestions') as any).delete().eq('id', id);
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
    const { data, error } = await (supabase
      .from('questions') as any)
      .insert({ question_text: questionText, image_url: imageUrl, status: 'pending' })
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
    const { data, error } = await (supabase
        .from('questions') as any)
        .update({ question_text: questionText, image_url: imageUrl })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to update question, no data returned.");
    return data as Question;
  },

  deleteQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase.from('questions') as any).delete().eq('id', id);
    if (error) throw error;
  },
  
  startQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase
      .from('questions') as any)
      .update({ status: 'live' })
      .eq('id', id);

    if (error) throw error;
  },
  
  endQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;

    const { data: answersData, error: answersError } = await (supabase
      .from('answers') as any)
      .select('user_id, answer_text')
      .eq('question_id', id);

    if (answersError) throw answersError;
    const answers = (answersData as any[] | null) || [];
    if (answers.length === 0) {
      console.log("No answers to group, just ending question.");
      const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
      if (updateError) throw updateError;
      return;
    }
    
    const { data: questionData, error: questionError } = await (supabase
        .from('questions') as any)
        .select('question_text')
        .eq('id', id)
        .single();

    if (questionError) throw questionError;
    if (!questionData) {
        console.error(`Question with id ${id} not found. Ending question without scoring.`);
        const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
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
        const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
        if (updateError) throw updateError;
        return;
    }

    const groupedAnswersToInsert = groupedAnswers.map(g => ({
        ...g,
        question_id: id,
    }));

    const { error: insertError } = await (supabase.from('grouped_answers') as any).insert(groupedAnswersToInsert);
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

    const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
    if (updateError) throw updateError;
  },

  resetAllData: async (): Promise<void> => {
      if (!supabase) return;
      const { error: deleteAnswersError } = await (supabase.from('answers') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteAnswersError) throw deleteAnswersError;
      
      const { error: deleteGroupsError } = await (supabase.from('grouped_answers') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteGroupsError) throw deleteGroupsError;

      const { error: resetScoresError } = await (supabase.from('users') as any).update({ total_score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      if(resetScoresError) throw resetScoresError;
  }
};


export const supaclient = useMock ? mockSupabase : realSupabaseClient;
