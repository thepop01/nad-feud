

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet, SuggestionWithUser, AdminAnswerLogItem } from '../types';
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

/**
 * A custom storage adapter that uses cookies for session persistence.
 * This allows the user's session to be stored for a specific duration (7 days).
 */
const cookieStorage = {
  getItem: (key: string): string | null => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.startsWith(key + '=')) {
        return decodeURIComponent(cookie.substring(key.length + 1));
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    const date = new Date();
    // Set cookie to expire in 7 days
    date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${key}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax;Secure`;
  },
  removeItem: (key: string): void => {
    // Set cookie to expire in the past to delete it
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  },
};

const supabase: SupabaseClient<Database> | null = !useMock
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: cookieStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Encapsulates the logic for synchronizing a user's profile with Discord.
 * Fetches member-specific and global user data from the Discord API,
 * consolidates it, and upserts it into the Supabase 'users' table.
 * 
 * @param session The user's Supabase auth session, containing the provider token.
 * @param supabaseClient The active Supabase client instance.
 * @returns The updated user profile from the database.
 * @throws An error if the sync process fails at any step.
 */
async function syncDiscordProfile(session: Session, supabaseClient: SupabaseClient<Database>): Promise<User> {
  const { user: authUser, provider_token } = session;
  if (!authUser || !provider_token) {
    throw new Error("Missing auth user or provider token for sync.");
  }

  // Fetch server-specific member data (roles, nickname)
  const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`, {
    headers: { Authorization: `Bearer ${provider_token}` }
  });

  if (!memberRes.ok) {
    if (memberRes.status === 404) {
      throw new Error(`Login failed: You are not a member of the required Discord server.`);
    }
    const errorText = await memberRes.text().catch(() => '');
    throw new Error(`Failed to fetch Discord member data: ${memberRes.status}. ${errorText}`);
  }
  const memberData = await memberRes.json();
  
  // Fetch global user data (username, avatar)
  const userRes = await fetch(`https://discord.com/api/users/@me`, {
    headers: { Authorization: `Bearer ${provider_token}` }
  });
  if (!userRes.ok) {
    throw new Error(`Failed to fetch Discord global user data: ${userRes.status}`);
  }
  const globalUserData = await userRes.json();
  
  // Determine user's primary role based on the defined hierarchy
  let discord_role: string | null = null;
  for (const role of ROLE_HIERARCHY) {
    if (memberData.roles.includes(role.id)) {
      discord_role = role.name;
      break; 
    }
  }

  // Set permissions and profile details based on fetched data
  const can_vote = discord_role !== null;
  const discord_id = globalUserData.id;
  const is_admin = discord_id === ADMIN_DISCORD_ID;

  const avatar_url = globalUserData.avatar
    ? `https://cdn.discordapp.com/avatars/${discord_id}/${globalUserData.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(globalUserData.discriminator || '0') % 5}.png`;

  const banner_url = globalUserData.banner
    ? `https://cdn.discordapp.com/banners/${discord_id}/${globalUserData.banner}.png?size=1024`
    : null;
    
  const profileData: Database['public']['Tables']['users']['Insert'] = {
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

  // Upsert the consolidated profile data into our database
  const { data: upsertedUser, error: upsertError } = await (supabaseClient
    .from('users') as any) 
    .upsert(profileData)
    .select()
    .single();

  if (upsertError) throw upsertError;
  if (!upsertedUser) throw new Error("User upsert operation did not return a profile.");

  console.log("Auth: Profile sync successful.");
  return upsertedUser as User;
}


const realSupabaseClient = {
  // === AUTH ===
  loginWithDiscord: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        scopes: 'identify guilds.members.read',
      },
    });
    if (error) throw error;
  },

  logout: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange: (callback: (user: User | null, error: string | null) => void): { unsubscribe: () => void; } => {
    if (!supabase) {
      setTimeout(() => callback(null, 'Application is in offline mode.'), 0);
      return { unsubscribe: () => {} };
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // This top-level try-catch handles critical failures. If anything inside fails,
      // we sign the user out to ensure a consistent, clean state.
      try {
        // Condition 1: User is not logged in.
        if (!session) {
          if (event === 'SIGNED_OUT') console.log("Auth event: SIGNED_OUT");
          callback(null, null);
          return;
        }

        const authUser = session.user;
        if (!authUser) {
          throw new Error("Session exists but user object is missing.");
        }

        // Fetch the user's profile from our database. This is the source of truth if Discord sync fails.
        const { data: existingProfile, error: fetchError } = await (supabase
            .from('users') as any)
            .select('*')
            .eq('id', authUser.id)
            .single();

        // Handle database errors that aren't just "row not found".
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        // Condition 2: Sync with Discord if we have a token and it's a new sign-in or a refresh.
        const shouldSync = session.provider_token && (!existingProfile || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED');
        if (shouldSync) {
            console.log(`Auth: Attempting to sync profile from Discord. Event: ${event}`);
            try {
              const syncedProfile = await syncDiscordProfile(session, supabase);
              callback(syncedProfile, null);
            } catch (syncError) {
              console.warn("Auth: Discord profile sync failed.", syncError);
              // RESILIENCE: If sync fails but we have an old profile, use that.
              // This keeps the app working even if the Discord API is temporarily down.
              if (existingProfile) {
                  console.log("Auth: Falling back to existing profile.");
                  callback(existingProfile as User, null);
              } else {
                  // If sync fails for a new user, we must log them out as we have no data.
                  console.error("Auth: Sync failed for a new user with no existing profile. Logging out.");
                  throw syncError; 
              }
            }
        } 
        // Condition 3: User is already logged in and we have their profile data.
        else if (existingProfile) {
          console.log(`Auth: Using existing profile. Event: ${event}`);
          callback(existingProfile as User, null);
        } 
        // Condition 4: Edge case - user has a session but no profile and no way to get one.
        else {
          throw new Error(`Auth: User has session but no profile and no provider token to sync.`);
        }
      } catch (error: any) {
        console.error("Critical error in onAuthStateChange handler. Logging out.", error);
        if (supabase) {
            await supabase.auth.signOut().catch(e => console.error("Sign out failed during error handling:", e));
        }
        const errorMessage = error.message || 'A critical authentication error occurred. Please try logging in again.';
        callback(null, errorMessage);
      }
    });

    if (!subscription) {
      console.error("Failed to subscribe to auth state changes.");
      // Ensure the app doesn't hang on load if the subscription itself fails.
      setTimeout(() => callback(null, 'Could not initialize authentication listener.'), 0);
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
  getAllAnswersForAdmin: async (): Promise<AdminAnswerLogItem[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('answers') as any)
      .select('created_at, answer_text, users(id, username, nickname), questions(question_text)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AdminAnswerLogItem[]) || [];
  },
  
  getPendingQuestions: async (): Promise<Question[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('questions') as any)
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    return (data as Question[]) || [];
  },
  
  getReviewingQuestions: async (): Promise<(Question & { grouped_answers: GroupedAnswer[] })[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('questions') as any)
      .select('*, grouped_answers(*)')
      .eq('status', 'reviewing');
    if (error) throw error;
    return (data as any[]) || [];
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
    // We need to delete grouped answers and answers first due to foreign key constraints
    await (supabase.from('grouped_answers') as any).delete().eq('question_id', id);
    await (supabase.from('answers') as any).delete().eq('question_id', id);
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

    // 1. Get all answers for the question
    const { data: answersData, error: answersError } = await (supabase
      .from('answers') as any).select('user_id, answer_text').eq('question_id', id);
    if (answersError) throw answersError;
    const answers = (answersData as any[] | null) || [];

    // If no one answered, just move to review, though there's nothing to review.
    if (answers.length === 0) {
      console.log("No answers to group, moving to review status.");
      const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'reviewing' }).eq('id', id);
      if (updateError) throw updateError;
      return;
    }
    
    // 2. Get the question text
    const { data: questionData, error: questionError } = await (supabase
        .from('questions') as any).select('question_text').eq('id', id).single();
    if (questionError) throw questionError;

    // 3. Invoke the AI function to group answers
    type AIGroupedAnswer = { group_text: string; count: number; percentage: number; };
    const { data, error: functionError } = await supabase.functions.invoke<AIGroupedAnswer[]>('group-and-score', {
        body: {
            question: (questionData as any).question_text,
            answers: answers.map(a => (a as any).answer_text)
        }
    });
    if (functionError) throw functionError;
    const groupedAnswers = data;
    
    // 4. Insert the AI-generated groups into the database
    if (groupedAnswers && groupedAnswers.length > 0) {
        const groupedAnswersToInsert = groupedAnswers.map(g => ({ ...g, question_id: id }));
        const { error: insertError } = await (supabase.from('grouped_answers') as any).insert(groupedAnswersToInsert);
        if (insertError) throw insertError;
    }

    // 5. Update the question status to 'reviewing'. Scoring is now deferred.
    const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'reviewing' }).eq('id', id);
    if (updateError) throw updateError;
  },

  deleteGroupedAnswer: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await (supabase.from('grouped_answers') as any).delete().eq('id', id);
    if (error) throw error;
  },
  
  updateGroupedAnswer: async (id: string, updates: { group_text: string, count: number }): Promise<GroupedAnswer> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase
      .from('grouped_answers') as any)
      .update({ group_text: updates.group_text, count: updates.count })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to update grouped answer.");
    return data as GroupedAnswer;
  },
  
  approveQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;

    // 1. Fetch all answers and final (potentially edited) groups for the question
    const [answersRes, groupsRes] = await Promise.all([
      (supabase.from('answers') as any).select('user_id, answer_text').eq('question_id', id),
      (supabase.from('grouped_answers') as any).select('*').eq('question_id', id)
    ]);
    if (answersRes.error) throw answersRes.error;
    if (groupsRes.error) throw groupsRes.error;
    const answers = (answersRes.data as any[]) || [];
    const groups = (groupsRes.data as GroupedAnswer[]) || [];
    if (groups.length === 0 || answers.length === 0) { // No groups or answers, just end it
      await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
      return;
    }

    // 2. Recalculate percentages based on the final counts
    const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
    const updatedGroups = groups.map(g => ({
      ...g,
      percentage: totalCount > 0 ? parseFloat(((g.count / totalCount) * 100).toFixed(2)) : 0
    }));
    const { error: upsertError } = await (supabase.from('grouped_answers') as any).upsert(updatedGroups);
    if (upsertError) throw upsertError;

    // 3. Calculate score updates based on final groups
    const scoreUpdates = new Map<string, number>();
    for (const answer of answers) {
      const answerTyped = answer as { user_id: string; answer_text: string };
      const answerTextLower = answerTyped.answer_text.toLowerCase().trim().replace(/s$/, '');
      const bestMatch = updatedGroups.find(g => g.group_text.toLowerCase().trim().replace(/s$/, '') === answerTextLower);
      if (bestMatch) {
        const currentScore = scoreUpdates.get(answerTyped.user_id) || 0;
        scoreUpdates.set(answerTyped.user_id, currentScore + Math.round(bestMatch.percentage));
      }
    }

    // 4. Apply score updates in parallel using the RPC
    const scorePromises = [];
    for (const [userId, points] of scoreUpdates.entries()) {
        if(points > 0) {
            scorePromises.push(supabase.rpc('increment_user_score', { user_id_to_update: userId, score_to_add: points }));
        }
    }
    await Promise.all(scorePromises);

    // 5. Mark the question as 'ended'
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