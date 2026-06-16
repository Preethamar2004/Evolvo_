import api from '@/lib/api'

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', null, { params: { refresh_token: refreshToken } }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
}

export const profileApi = {
  getProfile: () => api.get('/profile/'),
  getPublicProfile: (username) => api.get(`/profile/${username}`),
  updateProfile: (data) => api.put('/profile/', data),
  uploadAvatar: (formData) =>
    api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

export const dashboardApi = {
  getDashboard: () => api.get('/dashboard/'),
}

export const onboardingApi = {
  getStatus: () => api.get('/onboarding/status'),
  submit: (data) => api.post('/onboarding/submit', data),
  getProfile: () => api.get('/onboarding/profile'),
  regenerate: () => api.post('/onboarding/regenerate'),
  getPublicProfile: (username) => api.get(`/onboarding/public/${username}`),
}

export const missionsApi = {
  getPage: () => api.get('/missions/'),
  getAvailable: (params) => api.get('/missions/available', { params }),
  getCategories: () => api.get('/missions/categories'),
  start: (missionId) => api.post('/missions/start', { mission_id: missionId }),
  logProgress: (userMissionId, increment = 1) =>
    api.post('/missions/progress', { user_mission_id: userMissionId, increment }),
  complete: (userMissionId) =>
    api.post('/missions/complete', { user_mission_id: userMissionId }),
  getAchievements: () => api.get('/missions/achievements'),
  getLeaderboard: (limit = 50) => api.get('/missions/leaderboard', { params: { limit } }),
  seed: () => api.post('/missions/seed'),
}

export const chatApi = {
  getSessions: () => api.get('/chat/sessions'),
  createSession: (title) => api.post('/chat/sessions', { title }),
  deleteSession: (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
  getMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (sessionId, content) => api.post(`/chat/sessions/${sessionId}/messages`, { content }),
}

export const socialApi = {
  getFeed: () => api.get('/social/feed'),
  createPost: (data) => api.post('/social/posts', data),
  toggleLike: (postId) => api.post(`/social/posts/${postId}/like`),
  getComments: (postId) => api.get(`/social/posts/${postId}/comments`),
  addComment: (postId, content) => api.post(`/social/posts/${postId}/comments`, { content }),
  toggleFollow: (userId) => api.post(`/social/follow/${userId}`),
  getFriendRequests: () => api.get('/social/friend-requests'),
  sendFriendRequest: (receiverId) => api.post('/social/friend-requests', { receiver_id: receiverId }),
  respondToFriendRequest: (requestId, statusChoice) => api.post(`/social/friend-requests/${requestId}/respond`, null, { params: { status_choice: statusChoice } }),
  getNotifications: () => api.get('/social/notifications'),
  markNotificationRead: (notificationId) => api.post(`/social/notifications/${notificationId}/read`),
}

export const guildsApi = {
  list: (params) => api.get('/guilds/', { params }),
  create: (data) => api.post('/guilds/', data),
  getDetail: (guildId) => api.get(`/guilds/${guildId}`),
  update: (guildId, data) => api.patch(`/guilds/${guildId}`, data),
  join: (guildId) => api.post(`/guilds/${guildId}/join`),
  leave: (guildId) => api.post(`/guilds/${guildId}/leave`),
  getRecommendations: () => api.get('/guilds/recommendations'),
  getLeaderboard: (params) => api.get('/guilds/leaderboard', { params }),
  sendChat: (guildId, content) => api.post(`/guilds/${guildId}/chat`, { content }),
  getChat: (guildId, params) => api.get(`/guilds/${guildId}/chat`, { params }),
  createChallenge: (guildId, data) => api.post(`/guilds/${guildId}/challenges`, data),
  joinChallenge: (challengeId) => api.post(`/guilds/challenges/${challengeId}/join`),
  logProgress: (challengeId, increment = 1) => api.post(`/guilds/challenges/${challengeId}/progress`, { increment }),
  getMemberLeaderboard: (guildId) => api.get(`/guilds/${guildId}/members/leaderboard`),
  seed: () => api.post('/guilds/seed'),
}


// ─── Phase 7 & 8 Additions ───────────────────────────────────────────────────

export const getEntertainmentRecommendations = async () => {
    return (await api.get('/entertainment/recommendations')).data;
};

export const getMovies = async () => {
    return (await api.get('/entertainment/movies')).data;
};

export const getGamingTournaments = async () => {
    return (await api.get('/entertainment/gaming')).data;
};

export const getSportsChallenges = async () => {
    return (await api.get('/entertainment/sports')).data;
};

export const getFunQuests = async () => {
    return (await api.get('/entertainment/quests')).data;
};

export const getFutureSelfSimulation = async () => {
    return (await api.get('/future-self/')).data;
};

export const runFutureSelfSimulation = async () => {
    return (await api.post('/future-self/simulate')).data;
};

export const getAnalyticsDashboard = async () => {
    return (await api.get('/analytics/dashboard')).data;
};
