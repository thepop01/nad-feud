

import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet, SuggestionWithUser, CommunityMemory, BackgroundMedia } from '../types';
import { ADMIN_DISCORD_ID, ROLE_HIERARCHY } from './config';
import { CookieAuth } from '../utils/cookieAuth';

// User persistence helpers (same as in supabase.ts)
const USER_STORAGE_KEY = 'nad-feud-user-profile';

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

// Mock community memories data
let communityMemories: CommunityMemory[] = [
  {
    id: 'memory-1',
    title: 'Epic Game Night',
    description: 'Amazing community game night with everyone!',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
    position: 'center',
    is_active: true,
    display_order: 1,
    uploaded_by: 'admin-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'memory-2',
    title: 'Community Celebration',
    description: 'Celebrating our awesome community!',
    media_type: 'gif',
    media_url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
    position: 'left',
    is_active: true,
    display_order: 2,
    uploaded_by: 'admin-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'memory-3',
    title: 'Fun Times',
    description: 'Just having fun together!',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    position: 'right',
    is_active: true,
    display_order: 3,
    uploaded_by: 'admin-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// Mock background media data
let backgroundMedia: BackgroundMedia[] = [
  {
    id: 'bg-1',
    name: 'Gaming Background 1',
    media_type: 'gif',
    media_url: 'https://media.giphy.com/media/3o6Zt9PivJAtA1xXyg/giphy.gif',
    thumbnail_url: 'https://media.giphy.com/media/3o6Zt9PivJAtA1xXyg/200w.gif',
    category: 'gaming',
    is_active: true,
    intensity: 'medium',
    uploaded_by: 'admin-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bg-2',
    name: 'Celebration Fireworks',
    media_type: 'gif',
    media_url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    thumbnail_url: 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif',
    category: 'celebration',
    is_active: true,
    intensity: 'high',
    uploaded_by: 'admin-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bg-3',
    name: 'Subtle Particles',
    media_type: 'gif',
    media_url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    thumbnail_url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200w.gif',
    category: 'subtle',
    is_active: true,
    intensity: 'low',
    uploaded_by: 'admin-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

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
  { id: 'user-1', discord_id: ADMIN_DISCORD_ID, username: 'AdminUser', nickname: 'The Boss', avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png', banner_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809', discord_roles: ['role-other', ROLE_HIERARCHY[0].id], total_score: 150, discord_role: 'Full Access', can_vote: true, is_admin: true },
  { id: 'user-2', discord_id: '1002', username: 'NadsOGPlayer', nickname: 'OG', avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[1].id], total_score: 245, discord_role: ROLE_HIERARCHY[1].name, can_vote: true, is_admin: false },
  { id: 'user-3', discord_id: '1003', username: 'MonPlayer', nickname: null, avatar_url: 'https://cdn.discordapp.com/embed/avatars/2.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[2].id], total_score: 180, discord_role: ROLE_HIERARCHY[2].name, can_vote: true, is_admin: false },
  { id: 'user-4', discord_id: '1004', username: 'NadsPlayer', nickname: 'Nad', avatar_url: 'https://cdn.discordapp.com/embed/avatars/3.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[3].id, 'another-role'], total_score: 310, discord_role: ROLE_HIERARCHY[3].name, can_vote: true, is_admin: false },
  { id: 'user-5', discord_id: '1005', username: 'NoRoleUser', nickname: null, avatar_url: 'https://cdn.discordapp.com/embed/avatars/4.png', banner_url: null, discord_roles: [], total_score: 95, discord_role: null, can_vote: false, is_admin: false },
];

let questions: Question[] = [
  { id: 'q-1', question_text: 'Who is the smartest person you know?', image_url: null, status: 'live', created_at: new Date().toISOString() },
  { id: 'q-5', question_text: 'What is your favorite color?', image_url: null, status: 'live', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'q-2', question_text: 'Name a popular programming language.', image_url: null, status: 'ended', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'q-3', question_text: 'What do you eat for breakfast?', image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800', status: 'ended', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'q-4', question_text: 'What is a popular cloud provider?', image_url: null, status: 'pending', created_at: new Date(Date.now() - 259200000).toISOString() },
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

let wallets: Wallet[] = [
    { id: 'w-1', user_id: 'user-1', address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', created_at: new Date().toISOString() },
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

  createQuestion: async (questionText: string, imageUrl: string | null): Promise<Question> => {
    if (!currentUser) throw new Error("Mock: User not logged in.");
    const newQuestion: Question = { 
        id: `q-${Math.random()}`, 
        question_text: questionText, 
        image_url: imageUrl, 
        status: 'pending', 
        created_at: new Date().toISOString() 
    };
    questions.push(newQuestion);
    return newQuestion;
  },

  updateQuestion: async (id: string, questionText: string, imageUrl: string | null): Promise<Question> => {
    const question = questions.find(q => q.id === id);
    if (!question) throw new Error("Mock: Question not found.");
    question.question_text = questionText;
    question.image_url = imageUrl;
    return question;
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

  resetAllData: async (): Promise<void> => {
    answers = [];
    groupedAnswers = [];
    users.forEach(u => u.total_score = 0);
  },

  // Community Memories Management
  getCommunityMemories: async (): Promise<CommunityMemory[]> => {
    console.log("MOCK: getCommunityMemories called");
    return [...communityMemories];
  },

  createCommunityMemory: async (memory: Omit<CommunityMemory, 'id' | 'created_at' | 'updated_at'>): Promise<CommunityMemory> => {
    console.log("MOCK: createCommunityMemory called", memory);
    const newMemory: CommunityMemory = {
      ...memory,
      id: `memory-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    communityMemories.push(newMemory);
    return newMemory;
  },

  updateCommunityMemory: async (id: string, updates: Partial<CommunityMemory>): Promise<CommunityMemory> => {
    console.log("MOCK: updateCommunityMemory called", id, updates);
    const index = communityMemories.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Memory not found');

    communityMemories[index] = {
      ...communityMemories[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return communityMemories[index];
  },

  deleteCommunityMemory: async (id: string): Promise<void> => {
    console.log("MOCK: deleteCommunityMemory called", id);
    const index = communityMemories.findIndex(m => m.id === id);
    if (index !== -1) {
      communityMemories.splice(index, 1);
    }
  },

  // Background Media Management
  getBackgroundMedia: async (): Promise<BackgroundMedia[]> => {
    console.log("MOCK: getBackgroundMedia called");
    return [...backgroundMedia];
  },

  createBackgroundMedia: async (media: Omit<BackgroundMedia, 'id' | 'created_at' | 'updated_at'>): Promise<BackgroundMedia> => {
    console.log("MOCK: createBackgroundMedia called", media);
    const newMedia: BackgroundMedia = {
      ...media,
      id: `bg-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    backgroundMedia.push(newMedia);
    return newMedia;
  },

  updateBackgroundMedia: async (id: string, updates: Partial<BackgroundMedia>): Promise<BackgroundMedia> => {
    console.log("MOCK: updateBackgroundMedia called", id, updates);
    const index = backgroundMedia.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Background media not found');

    backgroundMedia[index] = {
      ...backgroundMedia[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return backgroundMedia[index];
  },

  deleteBackgroundMedia: async (id: string): Promise<void> => {
    console.log("MOCK: deleteBackgroundMedia called", id);
    const index = backgroundMedia.findIndex(m => m.id === id);
    if (index !== -1) {
      backgroundMedia.splice(index, 1);
    }
  },
};
