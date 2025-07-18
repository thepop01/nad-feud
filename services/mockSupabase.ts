import { User, Question, Answer, Suggestion, GroupedAnswer, LeaderboardUser, UserAnswerHistoryItem, Wallet } from '../types';
import { ADMIN_DISCORD_ID, ROLE_HIERARCHY, DISCORD_ADMIN_ROLE_ID } from './config';

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
  
  // Recalculate percentage based on displayed groups for more "realistic" feel if needed, or keep as is.
  // For simplicity, we'll keep the original percentage of total.
  
  return sortedGroups.map((g, i) => ({
      ...g,
      id: `mock-group-${i}`,
      question_id: 'mock-q-id', // This will be replaced by the calling function
      percentage: parseFloat(g.percentage.toFixed(2))
  }));
};


// --- MOCK STATE ---
let currentUser: User | null = null;
const authChangeListeners: ((user: User | null) => void)[] = [];

const notifyListeners = () => {
    for (const listener of authChangeListeners) {
        try {
            listener(currentUser);
        } catch (e) {
            console.error("Error in auth listener", e);
        }
    }
};

// --- MOCK DATABASE ---
let users: User[] = [
  { id: 'user-1', discord_id: ADMIN_DISCORD_ID, username: 'AdminUser', nickname: 'The Boss', avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png', banner_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809', discord_roles: ['role-other', DISCORD_ADMIN_ROLE_ID], total_score: 150, discord_role: 'Full Access', can_vote: true, is_admin: true },
  { id: 'user-2', discord_id: '1002', username: 'NadsOGPlayer', nickname: 'OG', avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[1].id], total_score: 245, discord_role: ROLE_HIERARCHY[1].name, can_vote: true, is_admin: false },
  { id: 'user-3', discord_id: '1003', username: 'MonPlayer', nickname: null, avatar_url: 'https://cdn.discordapp.com/embed/avatars/2.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[2].id], total_score: 180, discord_role: ROLE_HIERARCHY[2].name, can_vote: true, is_admin: false },
  { id: 'user-4', discord_id: '1004', username: 'NadsPlayer', nickname: 'Nad', avatar_url: 'https://cdn.discordapp.com/embed/avatars/3.png', banner_url: null, discord_roles: [ROLE_HIERARCHY[3].id, 'another-role'], total_score: 310, discord_role: ROLE_HIERARCHY[3].name, can_vote: true, is_admin: false },
  { id: 'user-5', discord_id: '1005', username: 'NoRoleUser', nickname: null, avatar_url: 'https://cdn.discordapp.com/embed/avatars/4.png', banner_url: null, discord_roles: [], total_score: 95, discord_role: null, can_vote: false, is_admin: false },
];

let questions: Question[] = [
  { id: 'q-1', question_text: 'Who is the smartest person you know?', image_url: null, status: 'live', created_at: new Date().toISOString() },
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
    {id: 's-1', user_id: 'user-2', username: 'PlayerOne', avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png', text: "What's the best movie of all time?", created_at: new Date().toISOString()},
];

let wallets: Wallet[] = [
    { id: 'w-1', user_id: 'user-1', address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', created_at: new Date().toISOString() }
]

// --- MOCK API ---
const delay = <T,>(data: T, ms = 300): Promise<T> => new Promise(res => setTimeout(() => res(data), ms));

export const mockSupabase = {
    // === AUTH ===
    loginWithDiscord: async (): Promise<void> => {
        console.log("MOCK: loginWithDiscord called");
        await delay(null, 500);
        currentUser = users[0]; // Log in as admin for demo
        notifyListeners();
    },

    logout: async (): Promise<void> => {
        console.log("MOCK: logout called");
        await delay(null, 200);
        currentUser = null;
        notifyListeners();
    },

    getUser: async (): Promise<User | null> => {
        return delay(currentUser);
    },

    onAuthStateChange: (callback: (user: User | null) => void): { unsubscribe: () => void; } => {
        authChangeListeners.push(callback);
        setTimeout(() => callback(currentUser), 0);
        
        return {
            unsubscribe: () => {
                const index = authChangeListeners.indexOf(callback);
                if (index > -1) {
                    authChangeListeners.splice(index, 1);
                }
            },
        };
    },

  getLiveQuestion: async (): Promise<(Question & { answered: boolean }) | null> => {
    const liveQuestion = questions.find(q => q.status === 'live');
    if (!liveQuestion) return delay(null);
    let hasAnswered = false;
    if(currentUser) {
        hasAnswered = answers.some(a => a.question_id === liveQuestion.id && a.user_id === currentUser.id);
    }
    return delay({ ...liveQuestion, answered: hasAnswered });
  },

  getEndedQuestions: async (): Promise<{ question: Question; groups: GroupedAnswer[] }[]> => {
    const ended = questions.filter(q => q.status === 'ended');
    const result = ended.map(q => ({
      question: q,
      groups: groupedAnswers.filter(ga => ga.question_id === q.id).sort((a,b) => b.count - a.count)
    }));
    return delay(result.sort((a,b) => new Date(b.question.created_at).getTime() - new Date(a.question.created_at).getTime()));
  },

  getLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
    let filteredUsers = users;
    if (roleIdFilter) {
      filteredUsers = users.filter(u => u.discord_roles.includes(roleIdFilter));
    }

    const leaderboard = filteredUsers.map(u => {
        const participated = new Set(answers.filter(a => a.user_id === u.id).map(a => a.question_id));
        return {
            id: u.id,
            discord_id: u.discord_id,
            username: u.username,
            nickname: u.nickname,
            avatar_url: u.avatar_url,
            total_score: u.total_score,
            questions_participated: participated.size,
        }
    }).sort((a, b) => b.total_score - a.total_score);
    return delay(leaderboard);
  },
  
  getWeeklyLeaderboard: async (roleIdFilter?: string): Promise<LeaderboardUser[]> => {
     let filteredUsers = users;
    if (roleIdFilter) {
      filteredUsers = users.filter(u => u.discord_roles.includes(roleIdFilter));
    }
    
    const weeklyLeaderboard = filteredUsers.map(u => {
        const participated = new Set(answers.filter(a => a.user_id === u.id).map(a => a.question_id));
        return {
            id: u.id,
            discord_id: u.discord_id,
            username: u.username,
            nickname: u.nickname,
            avatar_url: u.avatar_url,
            total_score: Math.floor((u.total_score / 5) + (Math.random() * 50)),
            questions_participated: Math.floor(participated.size / 3) + 1,
        }
    }).sort((a, b) => b.total_score - a.total_score);
    return delay(weeklyLeaderboard);
  },

  getUserAnswerHistory: async (userId: string): Promise<UserAnswerHistoryItem[]> => {
    if (!currentUser || currentUser.id !== userId) return delay([]);
    const userAnswers = answers.filter(a => a.user_id === userId);
    const history = userAnswers.map(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        return {
            answer_text: answer.answer_text,
            created_at: answer.created_at,
            questions: question ? { question_text: question.question_text } : null,
        }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return delay(history);
  },

  submitAnswer: async (questionId: string, answerText: string, userId: string): Promise<Answer> => {
    if (!currentUser || currentUser.id !== userId) throw new Error("Mock Auth Error: User not logged in or incorrect user ID.");
    const newAnswer: Answer = {
      id: `a-${Date.now()}`,
      user_id: userId,
      question_id: questionId,
      answer_text: answerText,
      created_at: new Date().toISOString(),
    };
    answers.push(newAnswer);
    return delay(newAnswer);
  },
  
  submitSuggestion: async (text: string, userId: string): Promise<Suggestion> => {
    const user = users.find(u => u.id === userId);
    if (!user || !currentUser || currentUser.id !== userId) throw new Error("Mock Auth Error: User not logged in or incorrect user ID.");
    const newSuggestion: Suggestion = {
      id: `s-${Date.now()}`,
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      text,
      created_at: new Date().toISOString(),
    };
    suggestions.push(newSuggestion);
    return delay(newSuggestion);
  },

  // === WALLET METHODS ===
  getWallets: async (userId: string): Promise<Wallet[]> => {
    if (!currentUser || currentUser.id !== userId) return delay([]);
    return delay(wallets.filter(w => w.user_id === userId));
  },

  addWallet: async (userId: string, address: string): Promise<Wallet> => {
    if (!currentUser || currentUser.id !== userId) throw new Error("Mock Auth Error");
    if (wallets.filter(w => w.user_id === userId).length >= 2) throw new Error("Maximum of 2 wallets allowed.");
    if (wallets.some(w => w.address.toLowerCase() === address.toLowerCase() && w.user_id === userId)) throw new Error("Wallet address already exists.");

    const newWallet: Wallet = {
        id: `w-${Date.now()}`,
        user_id: userId,
        address: address,
        created_at: new Date().toISOString(),
    };
    wallets.push(newWallet);
    return delay(newWallet);
  },

  deleteWallet: async (walletId: string): Promise<void> => {
    if (!currentUser) throw new Error("Mock Auth Error");
    wallets = wallets.filter(w => !(w.id === walletId && w.user_id === currentUser.id));
    return delay(undefined);
  },


  // ADMIN METHODS
  getPendingQuestions: async (): Promise<Question[]> => {
    return delay(questions.filter(q => q.status === 'pending'));
  },

  getSuggestions: async (): Promise<(Suggestion & {users: {username: string, avatar_url: string}})[]> => {
    const populatedSuggestions = suggestions.map(s => {
        const user = users.find(u => u.id === s.user_id);
        return {
            ...s,
            users: {
                username: user?.username || 'Unknown',
                avatar_url: user?.avatar_url || ''
            }
        }
    });
    return delay(populatedSuggestions);
  },
  
  deleteSuggestion: async (id: string): Promise<void> => {
    suggestions = suggestions.filter(s => s.id !== id);
    return delay(undefined);
  },

  createQuestion: async (questionText: string, imageUrl: string | null): Promise<Question> => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question_text: questionText,
      image_url: imageUrl,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    questions.push(newQuestion);
    return delay(newQuestion);
  },

  uploadQuestionImage: async (file: File, userId: string): Promise<string> => {
    console.log(`MOCK: Uploading image ${file.name} for user ${userId}`);
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
    });
  },
  
  startQuestion: async (id: string): Promise<void> => {
    questions.forEach(q => {
        if(q.status === 'live') q.status = 'ended';
    });
    const question = questions.find(q => q.id === id);
    if(question) question.status = 'live';
    return delay(undefined);
  },

  endQuestion: async (id: string): Promise<void> => {
    const question = questions.find(q => q.id === id);
    if (!question || question.status !== 'live') return delay(undefined);

    // 1. Mark question as ended
    question.status = 'ended';
    
    console.log(`MOCK: Simulating Edge Function for ending question ${id}`);
    const relevantAnswers = answers.filter(a => a.question_id === id);
    if (relevantAnswers.length === 0) {
        console.log("MOCK: No answers to process.");
        return delay(undefined);
    }
    const rawAnswerTexts = relevantAnswers.map(a => a.answer_text);

    // 2. Simulate AI grouping
    const newGroups = mockGroupAnswersWithAI(question.question_text, rawAnswerTexts);
    
    // 3. Save grouped answers
    const processedGroups = newGroups.map(group => {
        const finalGroup: GroupedAnswer = {
            ...group,
            id: `ga-${id}-${group.group_text.replace(/\s/g, '-')}`,
            question_id: id,
        };
        groupedAnswers.push(finalGroup);
        return finalGroup;
    });

    console.log("MOCK: Generated Groups:", processedGroups);
    
    // 4. Award points
    relevantAnswers.forEach(answer => {
        const user = users.find(u => u.id === answer.user_id);
        if(!user) return;

        const matchingGroup = processedGroups.find(g => {
            return g.group_text.toLowerCase().includes(answer.answer_text.toLowerCase()) || answer.answer_text.toLowerCase().includes(g.group_text.toLowerCase());
        });
        
        if (matchingGroup) {
            const points = Math.round(matchingGroup.percentage);
            user.total_score += points;
            console.log(`MOCK: Awarded ${points} points to ${user.username}. New score: ${user.total_score}`);
        }
    });

    return delay(undefined);
  },

};