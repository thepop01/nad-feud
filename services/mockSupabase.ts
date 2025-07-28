

import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet, SuggestionWithUser, CommunityHighlight, AllTimeCommunityHighlight, HighlightSuggestion, HighlightSuggestionWithUser, TwitterPreview, LinkValidationResult, LinkAnalytics, HighlightWithLinkStatus } from '../types';
import { ADMIN_DISCORD_ID, ROLE_HIERARCHY } from './config';
import { CookieAuth } from '../utils/cookieAuth';

// User persistence helpers (same as in supabase.ts)
const USER_STORAGE_KEY = 'feud-user-profile';

const saveUserToStorage = (user: User) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    console.log('💾 MOCK: User profile saved to localStorage:', user.username);
  } catch (error) {
    console.error('MOCK: Failed to save user to localStorage:', error);
  }
};

const getUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      console.log('📂 MOCK: User profile loaded from localStorage:', user.username);
      return user;
    }
  } catch (error) {
    console.error('MOCK: Failed to load user from localStorage:', error);
  }
  return null;
};

const clearUserFromStorage = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    console.log('🗑️ MOCK: User profile cleared from localStorage');
  } catch (error) {
    console.error('MOCK: Failed to clear user from localStorage:', error);
  }
};

// --- HELPER FUNCTION (MOVED FROM geminiService.ts) ---
const mockGroupAnswersWithAI = (question: string, answers: string[]): GroupedAnswer[] => {
  console.log("MOCK: Using mock AI grouping response for question:", question);
  
  const answerCounts: { [key: string]: string[] } = {};
  answers.forEach(rawAnswer => {
    const key = rawAnswer.toLowerCase().trim().replace(/s$/, ''); // simple grouping: lowercase, trim, remove trailing 's'
    if (!answerCounts[key]) {
      answerCounts[key] = [];
    }
    answerCounts[key].push(rawAnswer);
  });

  const totalAnswers = answers.length;
  if (totalAnswers === 0) return [];

  const groups = Object.entries(answerCounts).map(([key, rawAnswers]) => {
    const count = rawAnswers.length;
    const percentage = (count / totalAnswers) * 100;
    const group_text = key.charAt(0).toUpperCase() + key.slice(1);
    return {
      group_text,
      count,
      percentage,
    };
  });

  const sortedGroups = groups.sort((a, b) => b.count - a.count).slice(0, 8);
  
  return sortedGroups.map((g, i) => ({
      ...g,
      id: `mock-group-${i}`,
      question_id: 'mock-q-id', // This will be replaced by the calling function
      percentage: parseFloat(g.percentage.toFixed(2))
  }));
};


// --- MOCK STATE ---
// Initialize from cookie first, then localStorage as fallback
let currentUser: User | null = CookieAuth.getAuthCookie() || getUserFromStorage();
const authChangeListeners: ((user: User | null, error?: string) => void)[] = [];

const notifyListeners = (error?: string) => {
    console.log("MOCK: Notifying", authChangeListeners.length, "listeners with user:", currentUser?.username || 'null', error ? `error: ${error}` : '');
    for (const listener of authChangeListeners) {
        try {
            listener(currentUser, error);
        } catch (e) {
            console.error("Error in auth listener", e);
        }
    }
};

// --- MOCK DATABASE ---
let users: User[] = [
  { id: 'user-1', discord_id: ADMIN_DISCORD_ID, username: 'AdminUser', nickname: 'The Boss', avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png', banner_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809', discord_roles: ['role-other', ROLE_HIERARCHY[0].id], total_score: 150, discord_role: ROLE_HIERARCHY[0].name, can_vote: true, is_admin: true },
  { id: 'user-2', discord_id: '1002', username: 'NadsOGPlayer', nickname: 'OG', avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[1].id], total_score: 245, discord_role: ROLE_HIERARCHY[1].name, can_vote: true, is_admin: false },
  { id: 'user-3', discord_id: '1003', username: 'MonPlayer', nickname: null, avatar_url: 'https://cdn.discordapp.com/embed/avatars/2.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[0].id], total_score: 180, discord_role: ROLE_HIERARCHY[0].name, can_vote: true, is_admin: false },
  { id: 'user-4', discord_id: '1004', username: 'NadsPlayer', nickname: 'Nad', avatar_url: 'https://cdn.discordapp.com/embed/avatars/3.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[2].id, 'another-role'], total_score: 310, discord_role: ROLE_HIERARCHY[2].name, can_vote: true, is_admin: false },
  { id: 'user-5', discord_id: '1005', username: 'NoRoleUser', nickname: null, avatar_url: 'https://cdn.discordapp.com/embed/avatars/4.png', banner_url: null, discord_roles: [], total_score: 95, discord_role: null, can_vote: false, is_admin: false },
];

let questions: (Question & { answer_type?: 'username' | 'general' })[] = [
  { id: 'q-1', question_text: 'Who is the smartest person you know?', image_url: null, status: 'live', created_at: new Date().toISOString(), answer_type: 'username' },
  { id: 'q-5', question_text: 'What is your favorite color?', image_url: null, status: 'live', created_at: new Date(Date.now() - 3600000).toISOString(), answer_type: 'general' },
  { id: 'q-2', question_text: 'Name a popular programming language.', image_url: null, status: 'ended', created_at: new Date(Date.now() - 86400000).toISOString(), answer_type: 'general' },
  { id: 'q-3', question_text: 'What do you eat for breakfast?', image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800', status: 'ended', created_at: new Date(Date.now() - 172800000).toISOString(), answer_type: 'general' },
  { id: 'q-4', question_text: 'What is a popular cloud provider?', image_url: null, status: 'pending', created_at: new Date(Date.now() - 259200000).toISOString(), answer_type: 'general' },
];

let answers: Answer[] = [
  // Answers for ended question q-2
  { id: 'a-1', user_id: 'user-2', question_id: 'q-2', answer_text: 'javascript', created_at: new Date().toISOString() },
  { id: 'a-2', user_id: 'user-3', question_id: 'q-2', answer_text: 'Python', created_at: new Date().toISOString() },
  { id: 'a-3', user_id: 'user-4', question_id: 'q-2', answer_text: 'JS', created_at: new Date().toISOString() },
  { id: 'a-4', user_id: 'user-5', question_id: 'q-2', answer_text: 'java', created_at: new Date().toISOString() },
  // Answers for ended question q-3
  { id: 'a-5', user_id: 'user-2', question_id: 'q-3', answer_text: 'cereal', created_at: new Date().toISOString() },
  { id: 'a-6', user_id: 'user-3', question_id: 'q-3', answer_text: 'Eggs', created_at: new Date().toISOString() },
  { id: 'a-7', user_id: 'user-4', question_id: 'q-3', answer_text: 'Toast', created_at: new Date().toISOString() },
  // Answer for logged in user (admin)
  { id: 'a-8', user_id: 'user-1', question_id: 'q-2', answer_text: 'Rust', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'a-9', user_id: 'user-1', question_id: 'q-3', answer_text: 'Coffee', created_at: new Date(Date.now() - 172800000).toISOString() },

];

let groupedAnswers: GroupedAnswer[] = [
  { id: 'ga-1', question_id: 'q-2', group_text: 'JavaScript', percentage: 50, count: 2 },
  { id: 'ga-2', question_id: 'q-2', group_text: 'Python', percentage: 25, count: 1 },
  { id: 'ga-3', question_id: 'q-2', group_text: 'Java', percentage: 25, count: 1 },
  { id: 'ga-4', question_id: 'q-3', group_text: 'Cereal', percentage: 33.33, count: 1 },
  { id: 'ga-5', question_id: 'q-3', group_text: 'Eggs', percentage: 33.33, count: 1 },
  { id: 'ga-6', question_id: 'q-3', group_text: 'Toast', percentage: 33.33, count: 1 },
];

let suggestions: Suggestion[] = [
    {id: 's-1', user_id: 'user-2', text: "What's the best movie of all time?", created_at: new Date().toISOString()},
];

let highlightSuggestions: HighlightSuggestion[] = [
    {
        id: 'hs-1',
        user_id: 'user-2',
        twitter_url: 'https://twitter.com/example/status/123456789',
        description: 'Epic gaming moment from last stream!',
        created_at: new Date().toISOString()
    },
];

let wallets: Wallet[] = [
    { id: 'w-1', user_id: 'user-1', address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', created_at: new Date().toISOString() },
];

let linkClicks: LinkAnalytics[] = [
    {
        id: 'lc-1',
        highlight_id: '1',
        link_url: 'https://twitter.com/example/status/1234567890',
        user_id: 'user-1',
        clicked_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        referrer: 'http://localhost:5174',
        community_highlights: {
            title: 'Epic Gaming Moment',
            embedded_link: 'https://twitter.com/example/status/1234567890'
        },
        users: {
            username: 'TestUser',
            avatar_url: 'https://via.placeholder.com/32'
        }
    },
    {
        id: 'lc-2',
        highlight_id: '2',
        link_url: 'https://youtube.com/watch?v=example123',
        user_id: 'user-2',
        clicked_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        referrer: 'http://localhost:5174',
        community_highlights: {
            title: 'Community Celebration',
            embedded_link: 'https://youtube.com/watch?v=example123'
        },
        users: {
            username: 'AnotherUser',
            avatar_url: 'https://via.placeholder.com/32'
        }
    }
];


// --- MOCK SUPABASE CLIENT ---
export const mockSupabase = {
  // === AUTH ===
  loginWithDiscord: () => {
    console.log("MOCK: loginWithDiscord called");
    const adminUser = users.find(u => u.discord_id === ADMIN_DISCORD_ID);
    currentUser = adminUser || users[0] || null;
    if (currentUser) {
      saveUserToStorage(currentUser); // Save to localStorage
      CookieAuth.setAuthCookie(currentUser); // Set authentication cookie
    }
    console.log("MOCK: Logged in as", currentUser?.username);
    setTimeout(notifyListeners, 100);
  },

  logout: async () => {
    console.log("MOCK: logout called");
    clearUserFromStorage(); // Clear from localStorage
    CookieAuth.clearAuthCookie(); // Clear authentication cookie
    currentUser = null;
    setTimeout(notifyListeners, 100);
  },

  clearAuthData: async () => {
    console.log("MOCK: clearAuthData called");
    clearUserFromStorage(); // Clear from localStorage
    CookieAuth.clearAuthCookie(); // Clear authentication cookie
    currentUser = null;
    setTimeout(notifyListeners, 100);
  },

  onAuthStateChange: (callback: (user: User | null, error?: string) => void): { unsubscribe: () => void; } => {
    console.log("MOCK: onAuthStateChange listener added");
    authChangeListeners.push(callback);
    // In a real scenario, this fires with the initial state. The mock hook logic
    // handles the initial state separately, so we don't need to call back immediately here.
    // However, calling it mimics the real behavior closely.
    setTimeout(() => {
      console.log("MOCK: Initial auth state callback with user:", currentUser?.username || 'null');
      callback(currentUser);
    }, 50);
    
    const unsubscribe = () => {
        const index = authChangeListeners.indexOf(callback);
        if (index > -1) authChangeListeners.splice(index, 1);
    };
    
    return { unsubscribe };
  },

  // === DATA FETCHING ===
  getLiveQuestions: async (): Promise<(Question & { answered: boolean })[]> => {
    const liveQs = questions.filter(q => q.status === 'live');
    if (!currentUser) return liveQs.map(q => ({ ...q, answered: false }));
    const answeredIds = new Set(answers.filter(a => a.user_id === currentUser!.id).map(a => a.question_id));
    return liveQs.map(q => ({ ...q, answered: answeredIds.has(q.id) }));
  },

  getEndedQuestions: async (): Promise<{ question: Question; groups: GroupedAnswer[] }[]> => {
    const endedQs = questions.filter(q => q.status === 'ended');
    return endedQs.map(q => ({
      question: q,
      groups: groupedAnswers.filter(g => g.question_id === q.id).sort((a, b) => b.count - a.count)
    }));
  },
  
  getLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
      let filteredUsers = users;
      if (roleIdFilter) {
        filteredUsers = users.filter(u => u.discord_roles?.includes(roleIdFilter));
      }
      return filteredUsers.map(u => ({
          id: u.id,
          discord_id: u.discord_id,
          username: u.username,
          nickname: u.nickname,
          avatar_url: u.avatar_url,
          total_score: u.total_score,
          questions_participated: answers.filter(a => a.user_id === u.id).length,
      })).sort((a, b) => b.total_score - a.total_score);
  },

  getWeeklyLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
      return mockSupabase.getLeaderboard(roleIdFilter);
  },

  getUserAnswerHistory: async (userId: string): Promise<UserAnswerHistoryItem[]> => {
    return answers.filter(a => a.user_id === userId)
      .map(a => ({
        answer_text: a.answer_text,
        created_at: a.created_at,
        questions: questions.find(q => q.id === a.question_id) ? { question_text: questions.find(q => q.id === a.question_id)!.question_text } : null,
      })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  
  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!currentUser || currentUser.id !== userId || !currentUser.can_vote) throw new Error("Mock: Not authorized or cannot vote.");
    const newAnswer: Answer = { id: `a-${Math.random()}`, user_id: userId, question_id: questionId, answer_text: answerText, created_at: new Date().toISOString() };
    answers.push(newAnswer);
    return newAnswer;
  },

  submitSuggestion: async (text: string, userId: string): Promise<SuggestionWithUser> => {
    if (!currentUser || currentUser.id !== userId) throw new Error("Mock: Not authorized");
    const newSuggestion: Suggestion = { id: `s-${Math.random()}`, user_id: userId, text: text, created_at: new Date().toISOString() };
    suggestions.push(newSuggestion);
    const user = users.find(u => u.id === userId);
    return { ...newSuggestion, users: user ? { username: user.username, avatar_url: user.avatar_url } : null };
  },

  submitHighlightSuggestion: async (twitterUrl: string, description: string, userId: string): Promise<HighlightSuggestionWithUser> => {
    if (!currentUser || currentUser.id !== userId) throw new Error("Mock: Not authorized");

    // Enhanced Twitter URL validation
    const isValidTwitterUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Check if it's a valid Twitter/X domain
        if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
          return false;
        }

        // Check if it's a status URL (contains /status/)
        if (!url.includes('/status/')) {
          return false;
        }

        // Check if it has a valid tweet ID (numeric)
        const tweetIdMatch = url.match(/\/status\/(\d+)/);
        if (!tweetIdMatch || !tweetIdMatch[1]) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    };

    if (!isValidTwitterUrl(twitterUrl)) {
      throw new Error("Invalid Twitter URL. Please provide a valid Twitter/X status URL.");
    }

    // Check for duplicate URLs
    const existingSuggestion = highlightSuggestions.find(s => s.twitter_url === twitterUrl);
    if (existingSuggestion) {
      throw new Error("This Twitter URL has already been suggested.");
    }

    const newHighlightSuggestion: HighlightSuggestion = {
      id: `hs-${Math.random()}`,
      user_id: userId,
      twitter_url: twitterUrl,
      description: description || undefined,
      created_at: new Date().toISOString()
    };
    highlightSuggestions.push(newHighlightSuggestion);
    const user = users.find(u => u.id === userId);
    return { ...newHighlightSuggestion, users: user ? { username: user.username, avatar_url: user.avatar_url } : null };
  },

  getHighlightSuggestions: async (): Promise<HighlightSuggestionWithUser[]> => {
    return highlightSuggestions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(suggestion => {
        const user = users.find(u => u.id === suggestion.user_id);
        return { ...suggestion, users: user ? { username: user.username, avatar_url: user.avatar_url } : null };
      });
  },

  deleteHighlightSuggestion: async (suggestionId: string): Promise<void> => {
    const index = highlightSuggestions.findIndex(s => s.id === suggestionId);
    if (index === -1) throw new Error("Highlight suggestion not found");
    highlightSuggestions.splice(index, 1);
  },

  createCommunityHighlight: async (highlight: Omit<CommunityHighlight, 'id' | 'created_at'>): Promise<CommunityHighlight> => {
    const newHighlight: CommunityHighlight = {
      ...highlight,
      id: `ch-${Math.random()}`,
      created_at: new Date().toISOString()
    };
    communityHighlights.push(newHighlight);
    return newHighlight;
  },

  // URL validation (mock implementation)
  validateUrl: async (url: string): Promise<LinkValidationResult> => {
    // Mock validation - simulate different scenarios
    try {
      new URL(url);
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // Simulate some URLs being invalid for testing
    if (url.includes('broken') || url.includes('404')) {
      return { isValid: false, error: 'URL not accessible', status: 404 };
    }

    if (url.includes('timeout')) {
      return { isValid: false, error: 'Request timeout - URL may be inaccessible' };
    }

    // Most URLs are valid in mock mode
    return { isValid: true, status: 200 };
  },

  // Analytics tracking (mock implementation)
  trackLinkClick: async (highlightId: string, linkUrl: string, userId?: string): Promise<void> => {
    const newClick: LinkAnalytics = {
      id: `lc-${Math.random()}`,
      highlight_id: highlightId,
      link_url: linkUrl,
      user_id: userId,
      clicked_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || undefined,
      community_highlights: communityHighlights.find(h => h.id === highlightId) ? {
        title: communityHighlights.find(h => h.id === highlightId)!.title,
        embedded_link: communityHighlights.find(h => h.id === highlightId)!.embedded_link || ''
      } : undefined,
      users: userId ? users.find(u => u.id === userId) ? {
        username: users.find(u => u.id === userId)!.username,
        avatar_url: users.find(u => u.id === userId)!.avatar_url
      } : undefined : undefined
    };
    linkClicks.push(newClick);
    console.log('Mock: Tracked link click:', newClick);
  },

  // Get link analytics (mock implementation)
  getLinkAnalytics: async (highlightId?: string): Promise<LinkAnalytics[]> => {
    let filteredClicks = linkClicks;
    if (highlightId) {
      filteredClicks = linkClicks.filter(click => click.highlight_id === highlightId);
    }
    return filteredClicks.sort((a, b) => new Date(b.clicked_at).getTime() - new Date(a.clicked_at).getTime());
  },

  // Bulk link management (mock implementation)
  getHighlightsWithLinks: async (): Promise<HighlightWithLinkStatus[]> => {
    const highlightsWithLinks = communityHighlights.filter(h => h.embedded_link);

    const highlightsWithStatus = await Promise.all(
      highlightsWithLinks.map(async (highlight) => {
        const linkStatus = highlight.embedded_link
          ? await mockSupabaseService.validateUrl(highlight.embedded_link)
          : { isValid: false, error: 'No link provided' };

        return {
          ...highlight,
          linkStatus
        };
      })
    );

    return highlightsWithStatus;
  },

  // Bulk update links (mock implementation)
  bulkUpdateLinks: async (updates: { id: string; embedded_link: string }[]): Promise<void> => {
    for (const update of updates) {
      const highlightIndex = communityHighlights.findIndex(h => h.id === update.id);
      if (highlightIndex !== -1) {
        communityHighlights[highlightIndex].embedded_link = update.embedded_link;
      }
    }
    console.log('Mock: Bulk updated links:', updates);
  },

  // Mock file upload for Homepage Highlights
  uploadHomepageHighlightMedia: async (file: File, userId: string): Promise<string> => {
    // In mock mode, create a blob URL for preview
    const mockUrl = URL.createObjectURL(file);
    console.log('Mock: Homepage highlight file uploaded:', { fileName: file.name, size: file.size, userId, mockUrl });

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockUrl;
  },

  // Mock file upload for Community Highlights
  uploadCommunityHighlightMedia: async (file: File, userId: string): Promise<string> => {
    // In mock mode, create a blob URL for preview
    const mockUrl = URL.createObjectURL(file);
    console.log('Mock: Community highlight file uploaded:', { fileName: file.name, size: file.size, userId, mockUrl });

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockUrl;
  },

  // Mock file deletion
  deleteHighlightMedia: async (mediaUrl: string): Promise<void> => {
    console.log('Mock: File deleted:', mediaUrl);
    // In mock mode, revoke the blob URL if it's a blob URL
    if (mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }
  },

  // Twitter oEmbed preview (works in mock mode too)
  getTwitterPreview: async (twitterUrl: string): Promise<TwitterPreview | null> => {
    try {
      // In mock mode, we can still call the real Twitter oEmbed API
      const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(twitterUrl)}&omit_script=true&dnt=true`);

      if (!response.ok) {
        // Return mock data if API fails
        return {
          html: '<blockquote class="twitter-tweet"><p>Mock Twitter preview for development</p></blockquote>',
          author_name: 'Mock User',
          author_url: 'https://twitter.com/mockuser',
          provider_name: 'Twitter',
          title: 'Mock Tweet',
          type: 'rich',
          url: twitterUrl,
          version: '1.0',
          width: 550,
          height: 250,
          cache_age: 3153600000
        };
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

  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => wallets.filter(w => w.user_id === userId),
  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (wallets.filter(w => w.user_id === userId).length >= 2) throw new Error("Mock: Wallet limit reached.");
    const newWallet: Wallet = { id: `w-${Math.random()}`, user_id: userId, address, created_at: new Date().toISOString() };
    wallets.push(newWallet);
    return newWallet;
  },
  deleteWallet: async (walletId: string): Promise<void> => { wallets = wallets.filter(w => w.id !== walletId); },

  // === ADMIN METHODS ===
  getPendingQuestions: async (): Promise<Question[]> => questions.filter(q => q.status === 'pending'),
  
  getSuggestions: async (): Promise<SuggestionWithUser[]> => {
    return suggestions.map(s => {
      const suggestionUser = users.find(u => u.id === s.user_id);
      return {
        ...s,
        users: suggestionUser ? { username: suggestionUser.username, avatar_url: suggestionUser.avatar_url } : null
      };
    });
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
    console.log("MOCK: getAllAnswersWithDetails called");
    return answers.map(answer => {
      const question = questions.find(q => q.id === answer.question_id);
      const user = users.find(u => u.id === answer.user_id);

      return {
        id: answer.id,
        answer_text: answer.answer_text,
        created_at: answer.created_at,
        question_id: answer.question_id,
        question_text: question?.question_text || 'Unknown Question',
        question_status: question?.status || 'unknown',
        user_id: answer.user_id,
        username: user?.username || 'Unknown User',
        avatar_url: user?.avatar_url || null,
        discord_role: user?.discord_role || null
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  deleteSuggestion: async (id: string): Promise<void> => { suggestions = suggestions.filter(s => s.id !== id); },

  categorizeSuggestions: async (suggs: { id: string, text: string }[]): Promise<{ id: string; category: string; }[]> => {
    console.log("MOCK: Categorizing suggestions.");
    return new Promise(resolve => {
        setTimeout(() => {
            const result = suggs.map(s => {
                let category = "Miscellaneous";
                if (s.text.toLowerCase().includes("movie") || s.text.toLowerCase().includes("song")) {
                    category = "Pop Culture";
                } else if (s.text.toLowerCase().includes("what is") || s.text.toLowerCase().includes("who is")) {
                    category = "General Knowledge";
                } else if (s.text.toLowerCase().includes("your favorite")) {
                    category = "Personal Opinions";
                }
                return { id: s.id, category };
            });
            resolve(result);
        }, 1000);
    });
  },

  uploadQuestionImage: async (file: File, userId: string): Promise<string> => {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
  },

  createQuestion: async (questionText: string, imageUrl: string | null, answerType: 'username' | 'general' = 'general'): Promise<Question> => {
    if (!currentUser) throw new Error("Mock: User not logged in.");
    const newQuestion: Question & { answer_type: 'username' | 'general' } = {
        id: `q-${Math.random()}`,
        question_text: questionText,
        image_url: imageUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
        answer_type: answerType
    };
    questions.push(newQuestion);
    return newQuestion;
  },

  updateQuestion: async (id: string, questionText: string, imageUrl: string | null, answerType?: 'username' | 'general'): Promise<Question> => {
    const question = questions.find(q => q.id === id) as Question & { answer_type?: 'username' | 'general' };
    if (!question) throw new Error("Mock: Question not found.");
    question.question_text = questionText;
    question.image_url = imageUrl;
    if (answerType) {
      question.answer_type = answerType;
    }
    return question;
  },

  // Create and immediately start a question (for suggestions)
  createAndStartQuestion: async (questionText: string, imageUrl: string | null, answerType: 'username' | 'general' = 'general'): Promise<Question> => {
    if (!currentUser) throw new Error("Mock: User not logged in.");
    const newQuestion: Question & { answer_type: 'username' | 'general' } = {
        id: `q-${Math.random()}`,
        question_text: questionText,
        image_url: imageUrl,
        status: 'live',
        created_at: new Date().toISOString(),
        answer_type: answerType
    };
    questions.push(newQuestion);
    return newQuestion;
  },

  deleteQuestion: async (id: string): Promise<void> => { questions = questions.filter(q => q.id !== id); },

  deleteLiveQuestion: async (id: string): Promise<void> => {
    console.log("MOCK: deleteLiveQuestion called for", id);
    // Delete all answers for this question
    answers = answers.filter(a => a.question_id !== id);
    // Delete the question itself
    questions = questions.filter(q => q.id !== id);
  },

  startQuestion: async (id: string): Promise<void> => {
    const question = questions.find(q => q.id === id);
    if (question) question.status = 'live';
  },
  
  endQuestion: async (id: string): Promise<void> => {
    const question = questions.find(q => q.id === id);
    if (!question) return;
    question.status = 'ended';
    const questionAnswers = answers.filter(a => a.question_id === id);
    if (questionAnswers.length === 0) return;
    const newGroupedAnswers = mockGroupAnswersWithAI(question.question_text, questionAnswers.map(a => a.answer_text));
    newGroupedAnswers.forEach(g => groupedAnswers.push({ ...g, id: `ga-${Math.random()}`, question_id: id }));

    const scoreUpdates = new Map<string, number>();
    for (const answer of questionAnswers) {
      const answerTextLower = answer.answer_text.toLowerCase().trim().replace(/s$/, '');
      const bestMatch = newGroupedAnswers.find(g => g.group_text.toLowerCase().trim().replace(/s$/, '') === answerTextLower);
      if (bestMatch) {
        scoreUpdates.set(answer.user_id, (scoreUpdates.get(answer.user_id) || 0) + Math.round(bestMatch.percentage));
      }
    }
    
    for (const [userId, points] of scoreUpdates.entries()) {
      const user = users.find(u => u.id === userId);
      if (user) user.total_score += points;
    }
  },

  setManualGroupedAnswers: async (questionId: string, manualAnswers: { group_text: string; percentage: number }[]): Promise<void> => {
    console.log("MOCK: setManualGroupedAnswers called for", questionId, manualAnswers);

    // Remove existing grouped answers for this question
    groupedAnswers = groupedAnswers.filter(g => g.question_id !== questionId);

    // Add manual grouped answers
    manualAnswers.forEach((answer, index) => {
      groupedAnswers.push({
        id: `manual-${questionId}-${index}`,
        question_id: questionId,
        group_text: answer.group_text,
        count: Math.round(answer.percentage),
        percentage: answer.percentage
      });
    });

    // Update question status to 'ended'
    const question = questions.find(q => q.id === questionId);
    if (question) {
      question.status = 'ended';
    }

    // Award points based on manual grouping (simplified for mock)
    const questionAnswers = answers.filter(a => a.question_id === questionId);
    questionAnswers.forEach(answer => {
      const bestMatch = manualAnswers.find(g =>
        g.group_text.toLowerCase().includes(answer.answer_text.toLowerCase()) ||
        answer.answer_text.toLowerCase().includes(g.group_text.toLowerCase())
      );
      if (bestMatch) {
        const user = users.find(u => u.id === answer.user_id);
        if (user) {
          user.total_score = (user.total_score || 0) + Math.round(bestMatch.percentage);
        }
      }
    });
  },



  // Mock Community Highlights data
  getCommunityHighlights: async (): Promise<CommunityHighlight[]> => {
    const mockHighlights: CommunityHighlight[] = [
      {
        id: '1',
        title: 'Epic Gaming Moment',
        description: 'Amazing clutch play from our community tournament',
        media_type: 'video',
        media_url: 'https://via.placeholder.com/800x400/8B5CF6/FFFFFF?text=Epic+Gaming+Moment',
        embedded_link: 'https://twitter.com/example/status/1234567890',
        is_active: true,
        display_order: 1,
        uploaded_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 2500000, // 2.5MB
        view_count: 127,
      },
      {
        id: '2',
        title: 'Community Celebration',
        description: 'Our amazing community coming together for a special event',
        media_type: 'gif',
        media_url: 'https://via.placeholder.com/800x400/10B981/FFFFFF?text=Community+Celebration',
        embedded_link: 'https://youtube.com/watch?v=example123',
        is_active: true,
        display_order: 2,
        uploaded_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 850000, // 850KB
        view_count: 89,
      },
      {
        id: '3',
        title: 'Tournament Victory',
        description: 'Championship winning moment from last weekend',
        media_type: 'image',
        media_url: 'https://via.placeholder.com/800x400/F59E0B/FFFFFF?text=Tournament+Victory',
        is_active: true,
        display_order: 3,
        uploaded_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 1200000, // 1.2MB
        view_count: 203,
      },
    ];
    return mockHighlights;
  },

  getAllCommunityHighlights: async (): Promise<CommunityHighlight[]> => {
    return mockSupabase.getCommunityHighlights();
  },

  updateCommunityHighlight: async (id: string, updates: Partial<CommunityHighlight>): Promise<CommunityHighlight> => {
    const updated: CommunityHighlight = {
      id,
      title: 'Updated Highlight',
      media_type: 'image',
      media_url: 'https://via.placeholder.com/400x300',
      is_active: true,
      display_order: 1,
      uploaded_by: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
    console.log('MOCK: Updated community highlight:', updated);
    return updated;
  },

  deleteCommunityHighlight: async (id: string): Promise<void> => {
    console.log('MOCK: Deleted community highlight:', id);
  },

  // Mock All-Time Community Highlights
  getAllTimeHighlights: async (): Promise<AllTimeCommunityHighlight[]> => {
    const mockHighlights: AllTimeCommunityHighlight[] = [
      {
        id: '1',
        title: 'Epic Gaming Moment',
        description: 'Amazing clutch play from our community tournament',
        media_type: 'video',
        media_url: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Epic+Gaming+Moment',
        category: 'gaming',
        is_featured: true,
        display_order: 1,
        uploaded_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 5200000, // 5.2MB
        view_count: 456,
      },
      {
        id: '2',
        title: 'Community Celebration',
        description: 'Our amazing community coming together',
        media_type: 'gif',
        media_url: 'https://via.placeholder.com/400x300/10B981/FFFFFF?text=Community+Celebration',
        category: 'community',
        is_featured: false,
        display_order: 2,
        uploaded_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 1800000, // 1.8MB
        view_count: 234,
      },
      {
        id: '3',
        title: 'Tournament Victory',
        description: 'Championship winning moment',
        media_type: 'image',
        media_url: 'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Tournament+Victory',
        category: 'achievements',
        is_featured: true,
        display_order: 3,
        uploaded_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 950000, // 950KB
        view_count: 678,
      },
    ];
    return mockHighlights;
  },

  createAllTimeHighlight: async (highlight: Omit<AllTimeCommunityHighlight, 'id' | 'created_at' | 'updated_at'>): Promise<AllTimeCommunityHighlight> => {
    const newHighlight: AllTimeCommunityHighlight = {
      ...highlight,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    console.log('MOCK: Created all-time highlight:', newHighlight);
    return newHighlight;
  },

  updateAllTimeHighlight: async (id: string, updates: Partial<AllTimeCommunityHighlight>): Promise<AllTimeCommunityHighlight> => {
    const updated: AllTimeCommunityHighlight = {
      id,
      title: 'Updated All-Time Highlight',
      media_type: 'image',
      media_url: 'https://via.placeholder.com/400x300',
      category: 'gaming',
      is_featured: false,
      display_order: 1,
      uploaded_by: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
    console.log('MOCK: Updated all-time highlight:', updated);
    return updated;
  },

  deleteAllTimeHighlight: async (id: string): Promise<void> => {
    console.log('MOCK: Deleted all-time highlight:', id);
  },

  incrementViewCount: async (table: 'community_highlights' | 'all_time_community_highlights', id: string): Promise<void> => {
    console.log(`MOCK: Incremented view count for ${table} ID: ${id}`);
  },
};
