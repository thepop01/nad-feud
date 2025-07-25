
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet, SuggestionWithUser, CommunityHighlight, AllTimeCommunityHighlight } from '../types';
import { mockSupabase } from './mockSupabase';
import { supabaseUrl, supabaseAnonKey, DISCORD_GUILD_ID, ROLE_HIERARCHY, ADMIN_DISCORD_ID, DEBUG_BYPASS_DISCORD_CHECK } from './config';
import { CookieAuth } from '../utils/cookieAuth';

// Utility function for retrying network requests
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
};

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


const supabase: SupabaseClient<Database> | null = !useMock ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : null;

// Manual user persistence helpers
const USER_STORAGE_KEY = 'nad-feud-user-profile';

const saveUserToStorage = (user: User) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    console.log('💾 User profile saved to localStorage:', user.username);
  } catch (error) {
    console.error('Failed to save user to localStorage:', error);
  }
};

const getUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      console.log('📂 User profile loaded from localStorage:', user.username);
      return user;
    }
  } catch (error) {
    console.error('Failed to load user from localStorage:', error);
  }
  return null;
};

const clearUserFromStorage = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    console.log('🗑️ User profile cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear user from localStorage:', error);
  }
};

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
    clearUserFromStorage(); // Clear stored user profile
    CookieAuth.clearAuthCookie(); // Clear authentication cookie
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Clear potentially corrupted auth data
  clearAuthData: async () => {
    if (!supabase) return;
    try {
      clearUserFromStorage(); // Clear stored user profile
      CookieAuth.clearAuthCookie(); // Clear authentication cookie
      await supabase.auth.signOut();
      // Clear any stored session data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      console.log('Cleared potentially corrupted auth data');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  onAuthStateChange: (callback: (user: User | null, error?: string) => void): { unsubscribe: () => void; } => {
    if (!supabase) {
      setTimeout(() => callback(null), 0);
      return { unsubscribe: () => {} };
    }

    // Check for initial session and handle potential corruption
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', { hasSession: !!session, error, userId: session?.user?.id });
        if (error) {
          console.warn('Initial session check failed:', error);
          // Only clear session if it's a critical error, not just network issues
          if (error.message?.includes('Invalid') || error.message?.includes('expired')) {
            console.log('Clearing invalid/expired session');
            await supabase.auth.signOut();
          }
        } else if (session) {
          console.log('Valid session found on startup');
        } else {
          console.log('No session found on startup');
        }
      } catch (error) {
        console.warn('Failed to check initial session:', error);
        // Only clear session for critical errors, not network issues
        if (error instanceof Error && (error.message?.includes('Invalid') || error.message?.includes('expired'))) {
          await supabase.auth.signOut().catch(() => {});
        }
      }
    };

    // Run initial session check
    checkInitialSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 Auth state change: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        hasProviderToken: !!session?.provider_token,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });

      let callbackCalled = false;
      const safeCallback = (user: User | null, error?: string) => {
        if (!callbackCalled) {
          callbackCalled = true;
          clearTimeout(authTimeout);
          callback(user, error);
        }
      };

      // Set a timeout for this auth handler to prevent hanging
      const authTimeout = setTimeout(() => {
        console.error('Auth state change handler timed out');
        safeCallback(null, 'Authentication process timed out. Please try refreshing the page.');
      }, 5000); // 5 second timeout for auth processing (reduced from 8)

      try {
        // Primary exit condition: No session means the user is logged out.
        if (!session) {
          console.log(`🚪 No session found - Event: ${event}`);
          if (event === 'SIGNED_OUT') {
              console.log("Auth event: SIGNED_OUT");
              clearUserFromStorage(); // Clear stored profile on explicit logout
          }
          safeCallback(null);
          return;
        }

        // We have a session. Let's try to get or create a profile.
        const authUser = session.user;
        if (!authUser) throw new Error("Session exists but user object is missing.");
        
        // Step 1: Check for an existing profile in our DB.
        console.log('🔍 Checking for existing profile for user:', authUser.id);
        const { data: existingProfile, error: fetchError } = await (supabase
            .from('users') as any)
            .select('*')
            .eq('id', authUser.id)
            .single();

        console.log('📋 Profile check result:', {
          hasProfile: !!existingProfile,
          username: existingProfile?.username,
          error: fetchError?.code,
          errorMessage: fetchError?.message
        });

        // If no profile in database, check localStorage as fallback
        if (!existingProfile) {
          const storedUser = getUserFromStorage();
          if (storedUser && storedUser.id === authUser.id) {
            console.log('📂 Using stored profile as fallback:', storedUser.username);
            safeCallback(storedUser);
            return;
          }
        }

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = "Row not found"
            // A real database error occurred.
            console.error('❌ Database error fetching profile:', fetchError);
            console.error('❌ This will cause logout. Error details:', {
              code: fetchError.code,
              message: fetchError.message,
              details: fetchError.details
            });
            throw fetchError;
        }

        // Step 2: Determine if we can and should sync with Discord.
        // We can only sync if we have a provider_token.
        // We should sync if it's the first sign-in OR if the profile is missing.
        const providerToken = session.provider_token;
        console.log('🔄 Discord sync decision:', {
          hasProviderToken: !!providerToken,
          hasExistingProfile: !!existingProfile,
          event,
          shouldSync: !!(providerToken && (!existingProfile || event === 'SIGNED_IN'))
        });

        if (providerToken && (!existingProfile || event === 'SIGNED_IN')) {
          console.log(`Auth: Syncing profile from Discord. Event: ${event}, Profile Exists: ${!!existingProfile}`);

          try {
            // --- Start of Discord Sync Logic ---
            let memberData: any = null;
            let globalUserData: any = null;

            if (DEBUG_BYPASS_DISCORD_CHECK) {
              console.log('🚧 DEBUG MODE: Bypassing Discord server membership check');
              // Create fake member data for testing
              memberData = {
                roles: [],
                nick: null
              };
              // Get basic user data from Discord
              const userRes = await retryRequest(() =>
                fetch(`https://discord.com/api/users/@me`, {
                  headers: { Authorization: `Bearer ${providerToken}` }
                })
              );
              if (!userRes.ok) throw new Error(`Failed to fetch Discord user data: ${userRes.status}`);
              globalUserData = await userRes.json();
            } else {
              // Normal Discord server membership check
              const memberRes = await retryRequest(() =>
                fetch(`https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`, {
                  headers: { Authorization: `Bearer ${providerToken}` }
                })
              );

              if (!memberRes.ok) {
                 if (memberRes.status === 404) {
                     console.warn(`❌ User ${authUser.user_metadata.name} is not a member of the required Discord server (${DISCORD_GUILD_ID}).`);
                     console.warn('❌ This is causing immediate logout after login.');
                     console.warn('❌ Check if user is in the Discord server or if DISCORD_GUILD_ID is correct.');
                     safeCallback(null, 'You must be a member of the required Discord server to access this application.');
                 } else {
                     console.error('Failed to fetch Discord member data:', memberRes.status, await memberRes.text());
                     // If sync fails but they had an old profile, use that. Otherwise, show error.
                     if (existingProfile) {
                        console.log('Using existing profile due to Discord API error');
                        safeCallback(existingProfile as User);
                     } else {
                        await supabase.auth.signOut();
                        safeCallback(null, 'Failed to sync with Discord. Please try logging in again.');
                     }
                 }
                 return;
              }
              memberData = await memberRes.json();

              const userRes = await retryRequest(() =>
                fetch(`https://discord.com/api/users/@me`, {
                  headers: { Authorization: `Bearer ${providerToken}` }
                })
              );
              if (!userRes.ok) throw new Error(`Failed to fetch Discord global user data: ${userRes.status}`);
              globalUserData = await userRes.json();
            }
          // User data is already fetched above in the if/else block
          
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
          const user = upsertedUser as User;
          saveUserToStorage(user); // Save to localStorage for persistence
          CookieAuth.setAuthCookie(user); // Set authentication cookie
          safeCallback(user);
          // --- End of Discord Sync Logic ---
          } catch (discordSyncError) {
            console.error("❌ Discord sync failed:", discordSyncError);
            // If sync fails but they had an old profile, use that. Otherwise, show error.
            if (existingProfile) {
              console.log('✅ Using existing profile due to Discord sync error:', existingProfile.username);
              const user = existingProfile as User;
              saveUserToStorage(user); // Save to localStorage for persistence
              CookieAuth.setAuthCookie(user); // Set authentication cookie
              safeCallback(user);
            } else {
              console.error('❌ No existing profile to fall back to, logging out');
              await supabase.auth.signOut();
              const errorMessage = discordSyncError instanceof Error
                ? `Discord sync failed: ${discordSyncError.message}`
                : 'Failed to sync with Discord. Please try logging in again.';
              safeCallback(null, errorMessage);
            }
          }
        } else if (existingProfile) {
          // We have a profile, but no token to sync. This is the normal "already logged in" state.
          // This commonly happens on page refresh when the provider_token expires but the session is still valid.
          console.log(`✅ Auth: Using existing profile. Event: ${event}`, {
            username: existingProfile.username,
            hasProviderToken: !!providerToken,
            reason: providerToken ? 'No sync needed' : 'Provider token expired, using cached profile'
          });
          const user = existingProfile as User;
          saveUserToStorage(user); // Save to localStorage for persistence
          CookieAuth.setAuthCookie(user); // Set authentication cookie
          safeCallback(user);
        } else {
          // No token to sync with AND no existing profile.
          // This can happen on refresh when provider_token expires but session is still valid.
          // Instead of logging out immediately, let's try to create a basic profile from session data.
          console.warn(`⚠️ Auth: User has session but no profile and no provider token. Attempting to create basic profile.`, {
            hasSession: !!session,
            hasProviderToken: !!providerToken,
            hasExistingProfile: !!existingProfile,
            event,
            userMetadata: authUser.user_metadata
          });

          // Try to create a basic profile from available session data
          try {
            const basicUserData = {
              id: authUser.id,
              discord_id: authUser.user_metadata?.provider_id || authUser.user_metadata?.sub || 'unknown',
              username: authUser.user_metadata?.name || authUser.user_metadata?.preferred_username || authUser.email?.split('@')[0] || 'Unknown User',
              avatar_url: authUser.user_metadata?.avatar_url || `https://cdn.discordapp.com/embed/avatars/0.png`,
              banner_url: null,
              nickname: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
              discord_roles: [],
              discord_role: null,
              can_vote: false, // Conservative default - user can re-login to get proper permissions
              is_admin: false
            };

            console.log('🔧 Creating basic profile from session data:', basicUserData);

            const { data: createdUser, error: createError } = await (supabase
              .from('users') as any)
              .upsert(basicUserData)
              .select()
              .single();

            if (createError) {
              console.error('❌ Failed to create basic profile:', createError);
              await supabase.auth.signOut();
              safeCallback(null, 'Failed to create user profile. Please log in again.');
            } else {
              console.log('✅ Basic profile created successfully');
              const user = createdUser as User;
              saveUserToStorage(user); // Save to localStorage for persistence
              CookieAuth.setAuthCookie(user); // Set authentication cookie
              safeCallback(user);
            }
          } catch (profileError) {
            console.error('❌ Error creating basic profile:', profileError);
            await supabase.auth.signOut();
            safeCallback(null, 'Authentication session is invalid. Please log in again.');
          }
        }
      } catch (error) {
        console.error("Critical error in onAuthStateChange handler. Logging out.", error);
        if (supabase) {
            await supabase.auth.signOut().catch(e => console.error("Sign out failed during error handling:", e));
        }
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during authentication.';
        safeCallback(null, errorMessage);
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

  getAllAnswersWithDetails: async (): Promise<{
    id: string;
    answer_text: string;
    created_at: string;
    question_id: string;
    question_text: string;
    question_status: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    discord_role: string | null;
  }[]> => {
    if (!supabase) return [];
    const { data, error } = await (supabase
      .from('answers') as any)
      .select(`
        id,
        answer_text,
        created_at,
        question_id,
        user_id,
        questions(question_text, status),
        users(username, avatar_url, discord_role)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to flatten the nested objects
    return (data || []).map((item: any) => ({
      id: item.id,
      answer_text: item.answer_text,
      created_at: item.created_at,
      question_id: item.question_id,
      question_text: item.questions?.question_text || 'Unknown Question',
      question_status: item.questions?.status || 'unknown',
      user_id: item.user_id,
      username: item.users?.username || 'Unknown User',
      avatar_url: item.users?.avatar_url || null,
      discord_role: item.users?.discord_role || null
    }));
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

  deleteLiveQuestion: async (id: string): Promise<void> => {
    if (!supabase) return;
    // First delete all answers for this question
    const { error: answersError } = await (supabase.from('answers') as any).delete().eq('question_id', id);
    if (answersError) throw answersError;

    // Then delete the question itself
    const { error } = await (supabase.from('questions') as any).delete().eq('id', id);
    if (error) throw error;
  },

  setManualGroupedAnswers: async (questionId: string, manualAnswers: { group_text: string; percentage: number }[]): Promise<void> => {
    if (!supabase) return;

    // First, delete any existing grouped answers for this question
    const { error: deleteError } = await (supabase.from('grouped_answers') as any).delete().eq('question_id', questionId);
    if (deleteError) throw deleteError;

    // Prepare the grouped answers with counts calculated from percentages
    const groupedAnswersToInsert = manualAnswers.map((answer, index) => ({
      question_id: questionId,
      group_text: answer.group_text,
      count: Math.round(answer.percentage), // Use percentage as count for manual entries
      percentage: answer.percentage
    }));

    // Insert the manual grouped answers
    const { error: insertError } = await (supabase.from('grouped_answers') as any).insert(groupedAnswersToInsert);
    if (insertError) throw insertError;

    // Update question status to 'ended'
    const { error: updateError } = await (supabase.from('questions') as any).update({ status: 'ended' }).eq('id', questionId);
    if (updateError) throw updateError;

    // Award points to users based on manual grouping
    const { data: answersData, error: answersError } = await (supabase
      .from('answers') as any)
      .select('user_id, answer_text')
      .eq('question_id', questionId);

    if (answersError) throw answersError;
    const answers = (answersData as any[] | null) || [];

    // Calculate score updates based on manual grouping
    const scoreUpdates = new Map<string, number>();
    for (const answer of answers) {
      const answerTyped = answer as { user_id: string; answer_text: string };
      const answerTextLower = answerTyped.answer_text.toLowerCase().trim();

      // Find best match in manual answers (simple text matching)
      const bestMatch = manualAnswers.find(g =>
        g.group_text.toLowerCase().trim() === answerTextLower ||
        answerTextLower.includes(g.group_text.toLowerCase().trim()) ||
        g.group_text.toLowerCase().trim().includes(answerTextLower)
      );

      if (bestMatch) {
        const currentScore = scoreUpdates.get(answerTyped.user_id) || 0;
        scoreUpdates.set(answerTyped.user_id, currentScore + Math.round(bestMatch.percentage));
      }
    }

    // Apply score updates
    for (const [userId, scoreIncrease] of scoreUpdates.entries()) {
      const { error: scoreError } = await supabase.rpc('increment_user_score', {
        user_id: userId,
        score_increase: scoreIncrease
      });
      if (scoreError) console.error('Error updating score for user:', userId, scoreError);
    }
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
  },

  // Community Highlights Management
  uploadHighlightMedia: async (file: File, bucket: string = 'highlights') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      fileName,
      publicUrl,
      fileSize: file.size
    };
  },

  // Community Highlights CRUD
  getCommunityHighlights: async (): Promise<CommunityHighlight[]> => {
    const { data, error } = await supabase
      .from('community_highlights')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  getAllCommunityHighlights: async (): Promise<CommunityHighlight[]> => {
    const { data, error } = await supabase
      .from('community_highlights')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  createCommunityHighlight: async (highlight: Omit<CommunityHighlight, 'id' | 'created_at' | 'updated_at'>): Promise<CommunityHighlight> => {
    const { data, error } = await supabase
      .from('community_highlights')
      .insert([highlight])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateCommunityHighlight: async (id: string, updates: Partial<CommunityHighlight>): Promise<CommunityHighlight> => {
    const { data, error } = await supabase
      .from('community_highlights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteCommunityHighlight: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('community_highlights')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // All-Time Community Highlights CRUD
  getAllTimeHighlights: async (): Promise<AllTimeCommunityHighlight[]> => {
    const { data, error } = await supabase
      .from('all_time_community_highlights')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  createAllTimeHighlight: async (highlight: Omit<AllTimeCommunityHighlight, 'id' | 'created_at' | 'updated_at'>): Promise<AllTimeCommunityHighlight> => {
    const { data, error } = await supabase
      .from('all_time_community_highlights')
      .insert([highlight])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateAllTimeHighlight: async (id: string, updates: Partial<AllTimeCommunityHighlight>): Promise<AllTimeCommunityHighlight> => {
    const { data, error } = await supabase
      .from('all_time_community_highlights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteAllTimeHighlight: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('all_time_community_highlights')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // View count tracking
  incrementViewCount: async (table: 'community_highlights' | 'all_time_community_highlights', id: string): Promise<void> => {
    const { error } = await supabase
      .from(table)
      .update({ view_count: supabase.raw('view_count + 1') })
      .eq('id', id);

    if (error) throw error;
  },

  // Ended Questions with Top 8 Answers
  getEndedQuestionWithAnswers: async (questionId: string) => {
    // This would fetch the question with its top 8 confirmed answers
    // For now, return mock data structure
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    // In real implementation, this would fetch from a processed_answers table
    // For now, return mock structure
    return {
      question,
      top_answers: [
        { id: '1', group_text: 'Mario', percentage: 35, count: 142, display_order: 1 },
        { id: '2', group_text: 'Link', percentage: 28, count: 113, display_order: 2 },
        { id: '3', group_text: 'Sonic', percentage: 15, count: 61, display_order: 3 },
        { id: '4', group_text: 'Master Chief', percentage: 8, count: 32, display_order: 4 },
        { id: '5', group_text: 'Kratos', percentage: 6, count: 24, display_order: 5 },
        { id: '6', group_text: 'Pikachu', percentage: 4, count: 16, display_order: 6 },
        { id: '7', group_text: 'Lara Croft', percentage: 2, count: 8, display_order: 7 },
        { id: '8', group_text: 'Cloud', percentage: 2, count: 8, display_order: 8 },
      ],
      is_confirmed: true,
      needs_review: false,
    };
  },

  // Admin functions for managing ended questions
  getEndedQuestionsForReview: async () => {
    // This would fetch ended questions that need admin review
    // For now, return mock data
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('status', 'ended')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Mock data for demonstration
    return questions.slice(0, 2).map(q => ({
      question: q,
      top_answers: [
        { id: '1', group_text: 'Mario', percentage: 35, count: 142, display_order: 1 },
        { id: '2', group_text: 'Link', percentage: 28, count: 113, display_order: 2 },
        { id: '3', group_text: 'Sonic', percentage: 15, count: 61, display_order: 3 },
        { id: '4', group_text: 'Master Chief', percentage: 8, count: 32, display_order: 4 },
        { id: '5', group_text: 'Kratos', percentage: 6, count: 24, display_order: 5 },
        { id: '6', group_text: 'Pikachu', percentage: 4, count: 16, display_order: 6 },
        { id: '7', group_text: 'Lara Croft', percentage: 2, count: 8, display_order: 7 },
        { id: '8', group_text: 'Cloud', percentage: 2, count: 8, display_order: 8 },
      ],
      is_confirmed: false,
      needs_review: true,
    }));
  },

  confirmEndedQuestionAnswers: async (questionId: string): Promise<void> => {
    console.log(`Confirming answers for question ${questionId}`);
    // This would update the question status to confirmed
    // For now, just log
  },

  updateEndedQuestionAnswers: async (questionId: string, answers: any[]): Promise<void> => {
    console.log(`Updating answers for question ${questionId}:`, answers);
    // This would update the processed answers in the database
    // For now, just log
  },

  // Submit highlight suggestion
  submitHighlightSuggestion: async (twitterUrl: string, description: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('highlight_suggestions')
      .insert([{
        twitter_url: twitterUrl,
        description: description || null,
        suggested_by: userId,
      }]);

    if (error) throw error;
  },
};


export const supaclient = useMock ? mockSupabase : realSupabaseClient;
