
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

  onAuthStateChange: (callback: (user: User | null) => void): { unsubscribe: () => void; } => {
    if (!supabase) return { unsubscribe: () => {} };
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
          callback(updatedUser);
        } else if (session) {
          // For other events like TOKEN_REFRESHED or USER_UPDATED, just get the profile from our DB
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) throw error;
          callback(userProfile);
        }
      } catch (error) {
        console.error("Error in onAuthStateChange:", error);
        callback(null);
      }
    });

    return { 
        unsubscribe: () => {
            authListener?.subscription?.unsubscribe();
        }
    };
  },

  // === DATA FETCHING ===
  getLiveQuestions: async (): Promise<(Question & { answered: boolean })[]> => {
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    // The type from the query will be (Question & { answers: { user_id: string }[] })[]
    const { data, error } = await supabase
      .from('questions')
      .select('*, answers(user_id)')
      .eq('status', 'live');
      
    if (error) throw error;
    
    if (!userId) {
      return (data || []).map((q) => ({ ...q, answered: false, answers: undefined as never }));
    }
    
    return (data || []).map((q) => ({
      ...q,
      answered: q.answers.some((a) => a.user_id === userId),
      answers: undefined as never, // clean up the join data
    }));
  },

  getEndedQuestions: async (): Promise<{ question: Question, groups: GroupedAnswer[] }[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_ended_questions');
    if (error) throw error;
    // With corrected database types, data is now strongly typed
    return data || [];
  },
  
  getLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_leaderboard', { role_id_filter: roleIdFilter });
    if (error) throw error;
    return data || [];
  },

  getWeeklyLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', { role_id_filter: roleIdFilter });
    if (error) throw error;
    return data || [];
  },
  
  getUserAnswerHistory: async (userId: string): Promise<UserAnswerHistoryItem[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('answers')
      .select('answer_text, created_at, questions(question_text)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as UserAnswerHistoryItem[]) || [];
  },

  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('answers')
      .insert({ question_id: questionId, answer_text: answerText, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  submitSuggestion: async (text: string, userId: string): Promise<any> => {
     if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('suggestions')
      .insert({ text, user_id: userId })
      .select('*, users(username, avatar_url)')
      .single();
    if (error) throw error;
    return data;
  },
  
  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase.from('wallets').insert({ user_id: userId, address }).select().single();
    if (error) throw error;
    return data;
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
    return data || [];
  },
  
  getSuggestions: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  
  deleteSuggestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) throw error;
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
      .insert({ question_text: questionText, image_url: imageUrl, status: 'pending' })
      .select()
      .single();
    if (error) {
      console.error('Error creating question in Supabase:', error);
      throw error;
    }
    return data;
  },

  updateQuestion: async (id: string, questionText: string, imageUrl: string | null): Promise<Question> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
        .from('questions')
        .update({ question_text: questionText, image_url: imageUrl })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
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
      .update({ status: 'live' })
      .eq('id', id);

    if (error) throw error;
  },
  
  endQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;

    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('user_id, answer_text')
      .eq('question_id', id);

    if (answersError) throw answersError;
    if (!answers || answers.length === 0) {
      console.log("No answers to group, just ending question.");
      const { error: updateError } = await supabase.from('questions').update({ status: 'ended' }).eq('id', id);
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
        const { error: updateError } = await supabase.from('questions').update({ status: 'ended' }).eq('id', id);
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
            question: questionData.question_text,
            answers: answers.map(a => a.answer_text)
        }
    });

    if (functionError) throw functionError;
    
    const groupedAnswers = data;
    
    if (!groupedAnswers || groupedAnswers.length === 0) {
        console.log("AI grouping returned no results. Ending question without scoring.");
        const { error: updateError } = await supabase.from('questions').update({ status: 'ended' }).eq('id', id);
        if (updateError) throw updateError;
        return;
    }

    const groupedAnswersToInsert = groupedAnswers.map(g => ({
        ...g,
        question_id: id,
    }));
    const { error: insertError } = await supabase.from('grouped_answers').insert(groupedAnswersToInsert);
    if (insertError) throw insertError;
    
    const scoreUpdates = new Map<string, number>();
     for (const answer of answers) {
        const answerTextLower = answer.answer_text.toLowerCase().trim().replace(/s$/, '');
        const bestMatch = groupedAnswers.find(g => g.group_text.toLowerCase().trim().replace(/s$/, '') === answerTextLower);
        if (bestMatch) {
            const currentScore = scoreUpdates.get(answer.user_id) || 0;
            scoreUpdates.set(answer.user_id, currentScore + Math.round(bestMatch.percentage));
        }
    }

    for (const [userId, points] of scoreUpdates.entries()) {
        await supabase.rpc('increment_user_score', { user_id_to_update: userId, score_to_add: points });
    }

    const { error: updateError } = await supabase.from('questions').update({ status: 'ended' }).eq('id', id);
    if (updateError) throw updateError;
  },

  resetAllData: async (): Promise<void> => {
      if (!supabase) return;
      await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('grouped_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('users').update({ total_score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  }
};


export const supaclient = useMock ? mockSupabase : realSupabaseClient;
