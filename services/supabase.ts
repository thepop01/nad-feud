
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

          const userData: Omit<User, 'total_score'> = {
              id: authUser.id,
              discord_id: discord_id,
              username: globalUserData.username,
              nickname: memberData.nick || globalUserData.global_name,
              avatar_url: avatar_url,
              banner_url: banner_url,
              discord_roles: memberData.roles,
              discord_role,
              can_vote,
              is_admin
          };
          
          const { data: updatedUser, error } = await (supabase
              .from('users') as any)
              .upsert(userData)
              .select()
              .single();

          if (error) throw error;
          callback(updatedUser as User);
        } else if (session) {
          // For other events like TOKEN_REFRESHED or USER_UPDATED, just get the profile from our DB
          const { data: userProfile, error } = await (supabase
            .from('users') as any)
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) throw error;
          callback(userProfile as User);
        }
      } catch (error) {
        console.error("Error in onAuthStateChange:", error);
        callback(null);
      }
    });
    return { unsubscribe: data.subscription.unsubscribe };
  },

  // === DATA FETCHING ===
  getLiveQuestions: async (): Promise<(Question & { answered: boolean })[]> => {
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    const { data: questions, error } = await (supabase.from('questions') as any)
      .select('*, answers(user_id)')
      .eq('status', 'live');
      
    if (error) throw error;
    
    if (!userId) {
      return questions.map((q: any) => ({ ...q, answered: false, answers: undefined }));
    }
    
    return questions.map((q: any) => ({
      ...q,
      answered: q.answers.some((a: any) => a.user_id === userId),
      answers: undefined, // clean up the join data
    }));
  },

  getEndedQuestions: async (): Promise<{ question: Question, groups: GroupedAnswer[] }[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_ended_questions');
    if (error) throw error;
    return (data as any).map((item: any) => ({
        question: item.question as Question,
        groups: item.groups as GroupedAnswer[],
    }));
  },
  
  getLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_leaderboard', { role_id_filter: roleIdFilter });
    if (error) throw error;
    return data as any;
  },

  getWeeklyLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', { role_id_filter: roleIdFilter });
    if (error) throw error;
    return data as any;
  },
  
  getUserAnswerHistory: async (userId: string): Promise<UserAnswerHistoryItem[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase.from('answers') as any)
      .select('answer_text, created_at, questions(question_text)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase.from('answers') as any)
      .insert({ question_id: questionId, answer_text: answerText, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  submitSuggestion: async (text: string, userId: string): Promise<any> => {
     if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase.from('suggestions') as any)
      .insert({ text, user_id: userId })
      .select('*, users(username, avatar_url)')
      .single();
    if (error) throw error;
    return data;
  },
  
  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase.from('wallets') as any).select('*').eq('user_id', userId);
    if (error) throw error;
    return data as Wallet[];
  },

  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase.from('wallets') as any).insert({ user_id: userId, address }).select().single();
    if (error) throw error;
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
    const { data, error } = await (supabase.from('questions') as any)
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    return data;
  },
  
  getSuggestions: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase.from('suggestions') as any)
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  deleteSuggestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) throw error;
  },

  uploadQuestionImage: async (file: File, userId: string): Promise<string> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    // Supabase bucket names can only contain lowercase letters, numbers, and hyphens.
    // Using a hyphenated name is valid.
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
      .insert({ question_text: questionText, image_url: imageUrl })
      .select()
      .single();
    if (error) {
      console.error('Error creating question in Supabase:', error);
      throw error;
    }
    return data as Question;
  },

  updateQuestion: async (id: string, questionText: string, imageUrl: string | null): Promise<Question> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
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
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
  },
  
  startQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.rpc('start_question', { question_id_to_start: id });
    if (error) throw error;
  },
  
  endQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;

    // 1. Fetch all answers for the question
    const { data: answers, error: answersError } = await (supabase
        .from('answers') as any)
        .select('user_id, answer_text')
        .eq('question_id', id);

    if (answersError) throw answersError;
    if (answers.length === 0) {
      console.log("No answers to group, just ending question.");
      const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
      if (updateError) throw updateError;
      return;
    }
    
    // 2. Fetch the question text
    const { data: questionData, error: questionError } = await (supabase
        .from('questions') as any)
        .select('question_text')
        .eq('id', id)
        .single();
    if (questionError) throw questionError;

    // 3. Call the Edge Function to group answers
    type AIGroupedAnswer = {
      group_text: string;
      count: number;
      percentage: number;
    };
    // By manually stringifying the body, we prevent a TypeScript type-checking issue ("Type instantiation is excessively deep")
    // that can occur when passing complex objects to the `invoke` function.
    const { data, error: functionError } = await supabase.functions.invoke('group-and-score', {
        body: JSON.stringify({
            question: questionData.question_text,
            answers: answers.map((a: any) => a.answer_text)
        })
    });

    if (functionError) throw functionError;
    
    const groupedAnswers = data as AIGroupedAnswer[] | null;
    
    // If grouping returns no results, we can still end the question without scores.
    if (!groupedAnswers || groupedAnswers.length === 0) {
        console.log("AI grouping returned no results. Ending question without scoring.");
        const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
        if (updateError) throw updateError;
        return;
    }

    // 4. Save grouped answers to the database
    const groupedAnswersToInsert = groupedAnswers.map(g => ({
        ...g,
        question_id: id,
    }));
    const { error: insertError } = await (supabase.from('grouped_answers') as any).insert(groupedAnswersToInsert);
    if (insertError) throw insertError;
    
    // 5. Update user scores based on groups
    const scoreUpdates = new Map<string, number>();
     for (const answer of answers) {
        const answerTextLower = answer.answer_text.toLowerCase().trim().replace(/s$/, '');
        // Find the best matching group
        const bestMatch = groupedAnswers.find(g => g.group_text.toLowerCase().trim().replace(/s$/, '') === answerTextLower);
        if (bestMatch) {
            const currentScore = scoreUpdates.get(answer.user_id) || 0;
            scoreUpdates.set(answer.user_id, currentScore + Math.round(bestMatch.percentage));
        }
    }

    for (const [userId, points] of scoreUpdates.entries()) {
        await supabase.rpc('increment_user_score', { user_id_to_update: userId, score_to_add: points });
    }

    // 6. Finally, update the question status to 'ended'
    const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', id);
    if (updateError) throw updateError;
  },

  resetAllData: async (): Promise<void> => {
      if (!supabase) return;
      await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('grouped_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (supabase.from('users') as any).update({ total_score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  }
};


export const supaclient = useMock ? mockSupabase : realSupabaseClient;
