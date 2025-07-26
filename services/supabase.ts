
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet, SuggestionWithUser, CommunityHighlight, AllTimeCommunityHighlight, HighlightSuggestion, HighlightSuggestionWithUser, TwitterDataExport } from '../types';
import { mockSupabase } from './mockSupabase';
import { supabaseUrl, supabaseAnonKey, DISCORD_GUILD_ID, ROLE_HIERARCHY, ADMIN_DISCORD_ID, DEBUG_BYPASS_DISCORD_CHECK } from './config';
import { CookieAuth } from '../utils/cookieAuth';
import { extractTwitterUsername, isTwitterUrl } from '../utils/twitterUtils';

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
              // Get basic user data from Discord first to check if admin
              const userRes = await retryRequest(() =>
                fetch(`https://discord.com/api/users/@me`, {
                  headers: { Authorization: `Bearer ${providerToken}` }
                })
              );
              if (!userRes.ok) throw new Error(`Failed to fetch Discord user data: ${userRes.status}`);
              const tempUserData = await userRes.json();

              // Create fake member data for testing - give admin user all roles for testing
              const isAdminUser = tempUserData.id === ADMIN_DISCORD_ID;
              memberData = {
                roles: isAdminUser ? ROLE_HIERARCHY.map(role => role.id) : [ROLE_HIERARCHY[2].id], // Admin gets all roles, others get Nads role
                nick: null
              };
              // Use the user data we already fetched
              globalUserData = tempUserData;
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
          
          console.log('🔍 DEBUG: User roles from Discord:', memberData.roles);
          console.log('🔍 DEBUG: Role hierarchy:', ROLE_HIERARCHY);

          let discord_role: string | null = null;
          for (const role of ROLE_HIERARCHY) {
              console.log(`🔍 DEBUG: Checking role ${role.name} (${role.id}) against user roles`);
              if (memberData.roles.includes(role.id)) {
                  console.log(`✅ DEBUG: Found matching role: ${role.name}`);
                  discord_role = role.name;
                  break;
              }
          }

          const can_vote = discord_role !== null;
          console.log(`🎮 DEBUG: Final role assignment - discord_role: ${discord_role}, can_vote: ${can_vote}`);
          const discord_id = globalUserData.id;
          const is_admin = discord_id === ADMIN_DISCORD_ID;
          console.log(`👑 DEBUG: Admin check - discord_id: ${discord_id}, ADMIN_DISCORD_ID: ${ADMIN_DISCORD_ID}, is_admin: ${is_admin}`);

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

          console.log('🔍 DEBUG: Final user data being upserted:', userData);

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

    console.log('Submitting suggestion to database:', { text, userId });

    const { data, error } = await (supabase
      .from('suggestions') as any)
      .insert({ text, user_id: userId })
      .select('*, users(username, avatar_url)')
      .single();

    console.log('Database response:', { data, error });

    if (error) {
      console.error('Database error details:', error);
      throw error;
    }
    if (!data) throw new Error("Failed to submit suggestion, no data returned.");
    return data as SuggestionWithUser;
  },

  submitHighlightSuggestion: async (twitterUrl: string, description: string, userId: string): Promise<HighlightSuggestionWithUser> => {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // Extract Twitter username from URL
    const twitterUsername = extractTwitterUsername(twitterUrl);

    const { data, error } = await (supabase
      .from('highlight_suggestions') as any)
      .insert({
        twitter_url: twitterUrl,
        twitter_username: twitterUsername,
        description: description || null,
        user_id: userId
      })
      .select('*, users(username, avatar_url)')
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to submit highlight suggestion, no data returned.");
    return data as HighlightSuggestionWithUser;
  },

  getHighlightSuggestions: async (): Promise<HighlightSuggestionWithUser[]> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await (supabase
      .from('highlight_suggestions') as any)
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as HighlightSuggestionWithUser[];
  },

  deleteHighlightSuggestion: async (suggestionId: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { error } = await (supabase
      .from('highlight_suggestions') as any)
      .delete()
      .eq('id', suggestionId);
    if (error) throw error;
  },

  createCommunityHighlight: async (highlight: Omit<CommunityHighlight, 'id' | 'created_at'>): Promise<CommunityHighlight> => {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // Extract Twitter username from embedded_link if it's a Twitter URL
    const highlightWithTwitter = {
      ...highlight,
      twitter_username: highlight.embedded_link && isTwitterUrl(highlight.embedded_link)
        ? extractTwitterUsername(highlight.embedded_link)
        : null
    };

    const { data, error } = await (supabase
      .from('community_highlights') as any)
      .insert(highlightWithTwitter)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to create community highlight, no data returned.");
    return data as CommunityHighlight;
  },

  // Twitter oEmbed preview (no API key required)
  getTwitterPreview: async (twitterUrl: string): Promise<TwitterPreview | null> => {
    try {
      // Extract tweet ID from various Twitter URL formats
      const tweetIdMatch = twitterUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
      if (!tweetIdMatch) {
        throw new Error('Invalid Twitter URL format');
      }

      const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(twitterUrl)}&omit_script=true&dnt=true`);

      if (!response.ok) {
        throw new Error(`Twitter oEmbed API returned ${response.status}`);
      }

      const data = await response.json();

      return {
        html: data.html,
        author_name: data.author_name,
        author_url: data.author_url,
        provider_name: data.provider_name || 'Twitter',
        title: data.title,
        type: data.type,
        url: data.url,
        version: data.version,
        width: data.width,
        height: data.height,
        cache_age: data.cache_age
      };
    } catch (error) {
      console.error('Failed to fetch Twitter preview:', error);
      return null;
    }
  },

  // URL validation to check if URLs are accessible
  validateUrl: async (url: string): Promise<{ isValid: boolean; status?: number; error?: string; redirectUrl?: string }> => {
    try {
      // Basic URL format validation
      try {
        new URL(url);
      } catch {
        return { isValid: false, error: 'Invalid URL format' };
      }

      // For client-side validation, we'll use a simple approach
      // In production, you might want to implement this server-side to avoid CORS issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to avoid downloading content
        signal: controller.signal,
        mode: 'no-cors' // This will limit what we can check, but avoids CORS issues
      });

      clearTimeout(timeoutId);

      return {
        isValid: true,
        status: response.status,
        redirectUrl: response.url !== url ? response.url : undefined
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { isValid: false, error: 'Request timeout - URL may be inaccessible' };
        }
        return { isValid: false, error: error.message };
      }
      return { isValid: false, error: 'Unknown error occurred' };
    }
  },

  // Analytics tracking for external link clicks
  trackLinkClick: async (highlightId: string, linkUrl: string, userId?: string): Promise<void> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      const clickData = {
        highlight_id: highlightId,
        link_url: linkUrl,
        user_id: userId || null,
        clicked_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null
      };

      const { error } = await (supabase
        .from('link_clicks') as any)
        .insert(clickData);

      if (error) {
        console.error('Failed to track link click:', error);
        // Don't throw error - analytics shouldn't break user experience
      }
    } catch (error) {
      console.error('Failed to track link click:', error);
      // Don't throw error - analytics shouldn't break user experience
    }
  },

  // Get link analytics for admin
  getLinkAnalytics: async (highlightId?: string): Promise<LinkAnalytics[]> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      let query = supabase
        .from('link_clicks') as any;

      if (highlightId) {
        query = query.eq('highlight_id', highlightId);
      }

      const { data, error } = await query
        .select(`
          *,
          community_highlights!inner(title, embedded_link),
          users(username, avatar_url)
        `)
        .order('clicked_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LinkAnalytics[];
    } catch (error) {
      console.error('Failed to get link analytics:', error);
      return [];
    }
  },

  // Bulk link management - get all highlights with embedded links
  getHighlightsWithLinks: async (): Promise<HighlightWithLinkStatus[]> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      const { data, error } = await (supabase
        .from('community_highlights') as any)
        .select('*')
        .not('embedded_link', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add link status checking
      const highlightsWithStatus = await Promise.all(
        (data || []).map(async (highlight: CommunityHighlight) => {
          const linkStatus = highlight.embedded_link
            ? await supaclient.validateUrl(highlight.embedded_link)
            : { isValid: false, error: 'No link provided' };

          return {
            ...highlight,
            linkStatus
          };
        })
      );

      return highlightsWithStatus;
    } catch (error) {
      console.error('Failed to get highlights with links:', error);
      return [];
    }
  },

  // Bulk update embedded links
  bulkUpdateLinks: async (updates: { id: string; embedded_link: string }[]): Promise<void> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      const promises = updates.map(update =>
        (supabase
          .from('community_highlights') as any)
          .update({ embedded_link: update.embedded_link })
          .eq('id', update.id)
      );

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.error) {
          throw result.error;
        }
      }
    } catch (error) {
      console.error('Failed to bulk update links:', error);
      throw error;
    }
  },

  // File upload to Supabase Storage for Homepage Highlights
  uploadHomepageHighlightMedia: async (file: File, userId: string): Promise<string> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      // Generate unique filename with timestamp and user ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      // Upload file to homepage-highlights bucket
      const { data, error } = await supabase.storage
        .from('homepage-highlights')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('homepage-highlights')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload homepage highlight media:', error);
      throw error;
    }
  },

  // File upload to Supabase Storage for Community Highlights
  uploadCommunityHighlightMedia: async (file: File, userId: string): Promise<string> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      // Generate unique filename with timestamp and user ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      // Upload file to community-highlights bucket
      const { data, error } = await supabase.storage
        .from('community-highlights')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('community-highlights')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload community highlight media:', error);
      throw error;
    }
  },

  // Delete file from Supabase Storage (works for both buckets)
  deleteHighlightMedia: async (mediaUrl: string): Promise<void> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      // Extract bucket and filename from URL
      const url = new URL(mediaUrl);
      const pathParts = url.pathname.split('/');

      // Determine which bucket based on URL path
      let bucketName = 'highlights'; // fallback
      let fileName = '';

      if (pathParts.includes('homepage-highlights')) {
        bucketName = 'homepage-highlights';
        fileName = pathParts[pathParts.indexOf('homepage-highlights') + 1];
      } else if (pathParts.includes('community-highlights')) {
        bucketName = 'community-highlights';
        fileName = pathParts[pathParts.indexOf('community-highlights') + 1];
      } else {
        // Legacy support for old 'highlights' bucket
        fileName = pathParts.slice(-1)[0];
      }

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([fileName]);

      if (error) {
        console.error('Failed to delete file from storage:', error);
        // Don't throw error for file deletion failures as the database record is more important
      }
    } catch (error) {
      console.error('Failed to delete highlight media:', error);
      // Don't throw error for file deletion failures
    }
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

  // Storage bucket management utilities
  createStorageBuckets: async (): Promise<void> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      // Create homepage-highlights bucket
      const { error: homepageError } = await supabase.storage.createBucket('homepage-highlights', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });

      if (homepageError && !homepageError.message.includes('already exists')) {
        console.error('Failed to create homepage-highlights bucket:', homepageError);
      } else {
        console.log('✅ Homepage highlights bucket ready');
      }

      // Create community-highlights bucket
      const { error: communityError } = await supabase.storage.createBucket('community-highlights', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });

      if (communityError && !communityError.message.includes('already exists')) {
        console.error('Failed to create community-highlights bucket:', communityError);
      } else {
        console.log('✅ Community highlights bucket ready');
      }
    } catch (error) {
      console.error('Failed to create storage buckets:', error);
    }
  },

  // List files in a specific bucket
  listBucketFiles: async (bucketName: 'homepage-highlights' | 'community-highlights'): Promise<any[]> => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 100,
          offset: 0
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to list files in ${bucketName}:`, error);
      return [];
    }
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

  // Get daily highlights (last 24 hours) - server-side filtering
  getDailyHighlights: async (): Promise<CommunityHighlight[]> => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
      .from('community_highlights')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get weekly highlights (last 7 days) - server-side filtering
  getWeeklyHighlights: async (): Promise<CommunityHighlight[]> => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data, error } = await supabase
      .from('community_highlights')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', lastWeek.toISOString())
      .order('created_at', { ascending: false });

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

  updateCommunityHighlight: async (id: string, updates: Partial<CommunityHighlight>): Promise<CommunityHighlight> => {
    // Extract Twitter username if embedded_link is being updated
    const updatesWithTwitter = {
      ...updates,
      ...(updates.embedded_link && {
        twitter_username: isTwitterUrl(updates.embedded_link)
          ? extractTwitterUsername(updates.embedded_link)
          : null
      })
    };

    const { data, error } = await supabase
      .from('community_highlights')
      .update(updatesWithTwitter)
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

  // Get Twitter data for export/datasheet
  getTwitterDataExport: async (): Promise<TwitterDataExport[]> => {
    if (!supabase) throw new Error("Supabase client not initialized.");

    try {
      const twitterData: TwitterDataExport[] = [];

      // Get highlight suggestions with Twitter URLs
      const { data: suggestions, error: suggestionsError } = await (supabase
        .from('highlight_suggestions') as any)
        .select('*, users(username, avatar_url)')
        .not('twitter_url', 'is', null);

      if (suggestionsError) throw suggestionsError;

      // Process suggestions
      if (suggestions) {
        suggestions.forEach((suggestion: any) => {
          const twitterUsername = suggestion.twitter_username || extractTwitterUsername(suggestion.twitter_url);
          if (twitterUsername) {
            twitterData.push({
              id: suggestion.id,
              type: 'suggestion',
              suggester_name: suggestion.users?.username || 'Unknown',
              suggester_username: suggestion.users?.username || 'Unknown',
              twitter_username: twitterUsername,
              twitter_url: suggestion.twitter_url,
              description: suggestion.description,
              created_at: suggestion.created_at,
              status: 'pending'
            });
          }
        });
      }

      // Get community highlights with Twitter URLs
      const { data: highlights, error: highlightsError } = await (supabase
        .from('community_highlights') as any)
        .select('*, users!community_highlights_uploaded_by_fkey(username, avatar_url)')
        .not('embedded_link', 'is', null);

      if (highlightsError) throw highlightsError;

      // Process highlights
      if (highlights) {
        highlights.forEach((highlight: any) => {
          if (isTwitterUrl(highlight.embedded_link)) {
            const twitterUsername = highlight.twitter_username || extractTwitterUsername(highlight.embedded_link);
            if (twitterUsername) {
              twitterData.push({
                id: highlight.id,
                type: 'community_highlight',
                suggester_name: highlight.users?.username || 'Unknown',
                suggester_username: highlight.users?.username || 'Unknown',
                twitter_username: twitterUsername,
                twitter_url: highlight.embedded_link,
                description: highlight.description,
                created_at: highlight.created_at,
                status: 'approved'
              });
            }
          }
        });
      }

      // Sort by creation date (newest first)
      return twitterData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    } catch (error) {
      console.error('Error fetching Twitter data export:', error);
      throw error;
    }
  },

  // Export Twitter data as CSV
  exportTwitterDataAsCSV: async (): Promise<string> => {
    const data = await supaclient.getTwitterDataExport();

    const headers = [
      'ID',
      'Type',
      'Suggester Name',
      'Suggester Username',
      'Twitter Username',
      'Twitter URL',
      'Description',
      'Created At',
      'Status'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        row.id,
        row.type,
        `"${row.suggester_name}"`,
        `"${row.suggester_username}"`,
        `"${row.twitter_username}"`,
        `"${row.twitter_url}"`,
        `"${row.description || ''}"`,
        row.created_at,
        row.status
      ].join(','))
    ];

    return csvRows.join('\n');
  },
};


export const supaclient = useMock ? mockSupabase : realSupabaseClient;
