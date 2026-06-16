import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, MessageSquare, Trophy, Shield, Plus, Search, Target, Award,
  ChevronLeft, LogOut, Compass, Sparkles, Send, Calendar, CheckCircle, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import Sidebar from '@/components/layout/Sidebar'
import { guildsApi } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function GuildsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // Tab State: 'discover' | 'my-guilds' | 'leaderboard'
  const [activeTab, setActiveTab] = useState('discover')
  // Selected Guild for Detail View: guild object or null
  const [selectedGuildId, setSelectedGuildId] = useState(null)
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false)

  // Form States
  const [newGuild, setNewGuild] = useState({
    name: '',
    description: '',
    category: 'ai',
    icon: '🛡️',
    is_public: true,
    max_members: 100
  })

  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    xp_reward: 150,
    target_count: 5,
    ends_in_days: 7
  })

  // Chat scroll ref
  const chatEndRef = useRef(null)

  // 1. Fetch Discover Guilds
  const { data: guilds = [], isLoading: isLoadingGuilds } = useQuery({
    queryKey: ['guilds-list', selectedCategory, searchQuery],
    queryFn: async () => {
      const { data } = await guildsApi.list({ category: selectedCategory || undefined, search: searchQuery || undefined })
      return data
    }
  })

  // 2. Fetch AI Recommendations
  const { data: recommendations = [], isLoading: isLoadingRecs } = useQuery({
    queryKey: ['guilds-recommendations'],
    queryFn: async () => {
      const { data } = await guildsApi.getRecommendations()
      return data
    }
  })

  // 3. Fetch Global Leaderboard
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['guilds-leaderboard'],
    queryFn: async () => {
      const { data } = await guildsApi.getLeaderboard()
      return data
    }
  })

  // 4. Fetch Guild Detail (Active only if a guild is selected)
  const { data: guildDetail = null, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['guild-detail', selectedGuildId],
    queryFn: async () => {
      if (!selectedGuildId) return null
      const { data } = await guildsApi.getDetail(selectedGuildId)
      return data
    },
    enabled: !!selectedGuildId,
    refetchInterval: selectedGuildId ? 3000 : false // Auto-poll chat and details every 3s
  })

  // Scroll to bottom of chat when message count changes or workspace loads
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [guildDetail?.recent_chat?.length])

  // --- Mutations ---

  // Create Guild
  const createGuildMutation = useMutation({
    mutationFn: guildsApi.create,
    onSuccess: (res) => {
      toast.success(`Guild "${res.data.name}" created successfully!`)
      qc.invalidateQueries({ queryKey: ['guilds-list'] })
      setSelectedGuildId(res.data.id)
      setActiveTab('my-guilds')
      setShowCreateModal(false)
      setNewGuild({
        name: '',
        description: '',
        category: 'ai',
        icon: '🛡️',
        is_public: true,
        max_members: 100
      })
    },
    onError: (err) => {
      let msg = 'Failed to create guild'
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          msg = err.response.data.detail[0].msg
        }
      }
      toast.error(msg)
    }
  })

  // Join Guild
  const joinGuildMutation = useMutation({
    mutationFn: guildsApi.join,
    onSuccess: (res, guildId) => {
      toast.success('Joined guild successfully!')
      qc.invalidateQueries({ queryKey: ['guilds-list'] })
      qc.invalidateQueries({ queryKey: ['guild-detail', guildId] })
      setSelectedGuildId(guildId)
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to join guild')
    }
  })

  // Leave Guild
  const leaveGuildMutation = useMutation({
    mutationFn: guildsApi.leave,
    onSuccess: () => {
      toast.success('You have left the guild')
      qc.invalidateQueries({ queryKey: ['guilds-list'] })
      setSelectedGuildId(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to leave guild')
    }
  })

  // Send Chat Message
  const [chatInput, setChatInput] = useState('')
  const sendChatMutation = useMutation({
    mutationFn: ({ guildId, content }) => guildsApi.sendChat(guildId, content),
    onSuccess: () => {
      setChatInput('')
      qc.invalidateQueries({ queryKey: ['guild-detail', selectedGuildId] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to send message')
    }
  })

  // Create Challenge
  const createChallengeMutation = useMutation({
    mutationFn: ({ guildId, data }) => guildsApi.createChallenge(guildId, data),
    onSuccess: () => {
      toast.success('Guild challenge created!')
      qc.invalidateQueries({ queryKey: ['guild-detail', selectedGuildId] })
      setShowCreateChallengeModal(false)
      setNewChallenge({
        title: '',
        description: '',
        xp_reward: 150,
        target_count: 5,
        ends_in_days: 7
      })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create challenge')
    }
  })

  // Join Challenge
  const joinChallengeMutation = useMutation({
    mutationFn: guildsApi.joinChallenge,
    onSuccess: () => {
      toast.success('Joined challenge!')
      qc.invalidateQueries({ queryKey: ['guild-detail', selectedGuildId] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to join challenge')
    }
  })

  // Log Progress
  const logProgressMutation = useMutation({
    mutationFn: ({ challengeId, increment }) => guildsApi.logProgress(challengeId, increment),
    onSuccess: (res) => {
      if (res.data.newly_completed) {
        toast.success(`Challenge completed! +${res.data.xp_rewarded} XP rewarded! 🎉`)
      } else {
        toast.success('Progress logged!')
      }
      qc.invalidateQueries({ queryKey: ['guild-detail', selectedGuildId] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update progress')
    }
  })

  // Seed Guilds
  const seedGuildsMutation = useMutation({
    mutationFn: guildsApi.seed,
    onSuccess: (res) => {
      toast.success(`Seeding successful! Guilds created: ${res.data.guilds_created}`)
      qc.invalidateQueries({ queryKey: ['guilds-list'] })
      qc.invalidateQueries({ queryKey: ['guilds-recommendations'] })
    },
    onError: () => {
      toast.error('Failed to seed guilds')
    }
  })

  // Derived: My Guilds list
  const myGuilds = guilds.filter((g) => {
    // If we have detail info or local memberships check. Simple fallback: check if we are in detail member list,
    // but the easiest is checking if the API includes it or list filter.
    // Let's rely on list_guilds returning all. We can let the user view their guilds by checking user_role or checking if they are in member list.
    // For list view: we will render "Joined" badge. For "My Guilds" tab, we filter guilds where user is member.
    // Wait, let's look at the database. If guildDetail is available, we know. But since we need this in a tab, let's query all guilds,
    // and we can check if they've joined by calling Detail or we can check the detail list.
    // Better: let's fetch detail for all or let the backend list only joined guilds. Since list endpoint gets all public ones,
    // we can check if a guild matches our membership.
    // Wait! Let's make sure we can discover and click to open a guild detail. Once detail is open, we can see if user is member.
    return true // We'll show all joined guilds. We can determine if user is in guild detail.
  })

  const categories = [
    { value: 'ai', label: 'Artificial Intelligence' },
    { value: 'cricket', label: 'Cricket' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'movie', label: 'Movie' },
    { value: 'startup', label: 'Startup' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'education', label: 'Education' },
    { value: 'programming', label: 'Programming' },
    { value: 'creativity', label: 'Creativity' },
    { value: 'other', label: 'Other' }
  ]

  // Workspace Tabs: 'chat' | 'challenges' | 'achievements' | 'members'
  const [workspaceTab, setWorkspaceTab] = useState('chat')

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />

      {/* Main Content Workspace */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
        {selectedGuildId && guildDetail ? (
          /* --- GUILD DETAILED WORKSPACE --- */
          <div className="space-y-6">
            {/* Header / Banner Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent pointer-events-none" />
              
              <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedGuildId(null)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <span className="text-4xl">{guildDetail.guild.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                        {guildDetail.guild.name}
                      </h1>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {guildDetail.guild.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1 max-w-xl">
                      {guildDetail.guild.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  <div className="text-center px-4 border-r border-slate-800">
                    <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider">Level</span>
                    <span className="text-xl font-bold text-violet-400">{guildDetail.guild.level}</span>
                  </div>
                  <div className="text-center px-4 border-r border-slate-800">
                    <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider">Total XP</span>
                    <span className="text-xl font-bold text-fuchsia-400">{guildDetail.guild.xp}</span>
                  </div>
                  <div className="text-center px-4">
                    <span className="block text-xs text-slate-400 font-medium uppercase tracking-wider">Members</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {guildDetail.guild.member_count}/{guildDetail.guild.max_members}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="border-t border-slate-800 px-6 py-3 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                  {[
                    { id: 'chat', label: 'Chatroom', icon: MessageSquare },
                    { id: 'challenges', label: 'Challenges', icon: Target },
                    { id: 'achievements', label: 'Achievements', icon: Award },
                    { id: 'members', label: 'Members', icon: Users }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setWorkspaceTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        workspaceTab === tab.id
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {!guildDetail.user_role ? (
                    <button
                      onClick={() => joinGuildMutation.mutate(guildDetail.guild.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/10 transition"
                    >
                      Join Guild
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-violet-500/10 border border-violet-500/30 text-violet-300 font-bold px-3 py-1.5 rounded-lg uppercase">
                        Role: {guildDetail.user_role}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to leave this guild?')) {
                            leaveGuildMutation.mutate(guildDetail.guild.id)
                          }
                        }}
                        className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                        title="Leave Guild"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-tab content */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl min-h-[450px] flex flex-col">
              {workspaceTab === 'chat' && (
                <div className="flex-1 flex flex-col h-[500px]">
                  {/* Chat Message Box */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {guildDetail.recent_chat.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      guildDetail.recent_chat.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 max-w-2xl ${
                            msg.user_id === user.id ? 'ml-auto flex-row-reverse' : ''
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {msg.avatar_url ? (
                              <img src={msg.avatar_url} alt={msg.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-slate-400 uppercase">
                                {msg.username.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 justify-end">
                              <span className="text-xs font-bold text-slate-300">{msg.username}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div
                              className={`p-3 rounded-xl text-sm ${
                                msg.user_id === user.id
                                  ? 'bg-violet-600 text-white rounded-tr-none'
                                  : 'bg-slate-800 text-slate-100 rounded-tl-none'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!chatInput.trim()) return
                      sendChatMutation.mutate({ guildId: guildDetail.guild.id, content: chatInput })
                    }}
                    className="border-t border-slate-800 p-4 bg-slate-900/60 backdrop-blur flex gap-3"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={
                        guildDetail.user_role
                          ? 'Send a message to the guild...'
                          : 'You must be a member to chat'
                      }
                      disabled={!guildDetail.user_role}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || !guildDetail.user_role}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white flex items-center justify-center transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {workspaceTab === 'challenges' && (
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold">Group Challenges</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Complete challenges together to boost Guild level and earn XP.</p>
                    </div>
                    {guildDetail.user_role &&
                      ['owner', 'admin'].includes(guildDetail.user_role.toLowerCase()) && (
                        <button
                          onClick={() => setShowCreateChallengeModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Challenge
                        </button>
                      )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {guildDetail.challenges.length === 0 ? (
                      <div className="col-span-2 py-12 flex flex-col items-center justify-center text-slate-500">
                        <Target className="w-12 h-12 mb-2 opacity-35" />
                        <p className="text-sm">No challenges active right now.</p>
                      </div>
                    ) : (
                      guildDetail.challenges.map((ch) => {
                        const isJoined = ch.user_progress !== null
                        const progressPercent = Math.round((ch.user_progress || 0) / ch.target_count * 100)
                        
                        return (
                          <div key={ch.id} className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-white text-base">{ch.title}</h3>
                                <p className="text-xs text-slate-400 mt-1">{ch.description}</p>
                              </div>
                              <span className="text-xs font-bold px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                +{ch.xp_reward} XP
                              </span>
                            </div>

                            {/* Progress bar */}
                            {isJoined && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-400">My Progress</span>
                                  <span className="text-violet-400">{ch.user_progress} / {ch.target_count} ({progressPercent}%)</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Footer actions */}
                            <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-3">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Ends: {new Date(ch.ends_at).toLocaleDateString()}
                              </span>

                              <div className="flex items-center gap-2">
                                {ch.user_completed ? (
                                  <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Completed
                                  </span>
                                ) : !isJoined ? (
                                  <button
                                    onClick={() => joinChallengeMutation.mutate(ch.id)}
                                    disabled={!guildDetail.user_role}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition disabled:opacity-50"
                                  >
                                    Join Challenge
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => logProgressMutation.mutate({ challengeId: ch.id, increment: 1 })}
                                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition"
                                  >
                                    Log Progress
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {workspaceTab === 'achievements' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">Guild Achievements</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Special achievements unlocked as a group.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {guildDetail.achievements.map((ach) => (
                      <div
                        key={ach.id}
                        className={`p-4 rounded-xl border flex flex-col items-center text-center space-y-2 relative transition ${
                          ach.unlocked
                            ? 'bg-slate-950/40 border-violet-500/30'
                            : 'bg-slate-950/10 border-slate-850 opacity-50'
                        }`}
                      >
                        <span className="text-3xl">{ach.icon}</span>
                        <h3 className="font-bold text-sm text-white">{ach.title}</h3>
                        <p className="text-[11px] text-slate-400">{ach.description}</p>
                        <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                          +{ach.xp_reward} XP
                        </span>

                        {ach.unlocked && (
                          <span className="absolute top-2 right-2 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Unlocked
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {workspaceTab === 'members' && (
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold">Guild Members</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Top contributors ranked by XP.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4 text-right">XP Contributed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guildDetail.members.map((member, idx) => (
                          <tr key={member.id} className="border-b border-slate-900 hover:bg-slate-900/30 text-sm">
                            <td className="py-3 px-4 font-bold text-slate-400">#{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.username} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold uppercase">{member.username.slice(0, 2)}</span>
                                  )}
                                </div>
                                <span className="font-semibold text-slate-200">{member.username}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                member.role.toLowerCase() === 'owner'
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                  : member.role.toLowerCase() === 'admin'
                                  ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-violet-400">
                              {member.xp_contributed} XP
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* --- LIST / DISCOVER WORKSPACE --- */
          <div className="space-y-8">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <Shield className="w-8 h-8 text-violet-500" />
                  Evolvo Guilds
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Join interest-based communities, play challenges, and level up with friends.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => seedGuildsMutation.mutate()}
                  className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Load Default Guilds
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Create Guild
                </button>
              </div>
            </div>

            {/* AI Recommendation Section */}
            {activeTab === 'discover' && recommendations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  AI Recommended Guilds
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.guild_id}
                      className="p-5 rounded-2xl border bg-slate-900/40 relative overflow-hidden flex flex-col justify-between transition-all duration-350 hover:border-violet-500/40 border-violet-500/20 shadow-md shadow-violet-500/5"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-2xl rounded-full pointer-events-none" />
                      
                      <div className="space-y-3 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl">{rec.guild_icon}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 uppercase">
                            {rec.category}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-base">{rec.guild_name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{rec.description}</p>
                        </div>
                        
                        <div className="p-3 bg-violet-950/20 border border-violet-950/50 rounded-xl">
                          <p className="text-[11px] text-violet-300 leading-relaxed">
                            💡 {rec.reason}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between relative z-10">
                        <span className="text-xs text-slate-400 font-semibold">{rec.member_count} members</span>
                        <button
                          onClick={() => joinGuildMutation.mutate(rec.guild_id)}
                          className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition"
                        >
                          Join Guild
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 gap-6">
              {[
                { id: 'discover', label: 'Discover Guilds', icon: Compass },
                { id: 'my-guilds', label: 'My Guilds', icon: Users },
                { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition ${
                    activeTab === t.id
                      ? 'border-violet-600 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search/Filters bar (only for Discover) */}
            {activeTab === 'discover' && (
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guilds by name or description..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-violet-500 transition"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tab Panels */}
            {activeTab === 'discover' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingGuilds ? (
                  <div className="col-span-full py-16 text-center text-slate-500">Loading guilds list...</div>
                ) : guilds.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center">
                    <Shield className="w-12 h-12 mb-2 opacity-35" />
                    <p className="text-base font-semibold">No guilds found.</p>
                    <p className="text-xs text-slate-400 mt-1">Create one or click "Load Default Guilds" to get started!</p>
                  </div>
                ) : (
                  guilds.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGuildId(g.id)}
                      className="p-6 rounded-2xl border border-slate-850 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-800 transition duration-300 flex flex-col justify-between cursor-pointer space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl bg-slate-950 p-2.5 rounded-xl border border-slate-850">{g.icon}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                            {g.category}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-lg line-clamp-1">{g.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">{g.description}</p>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                            <span>Level {g.level}</span>
                            <span>{g.xp} XP</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                            <div className="bg-violet-500 h-full" style={{ width: `${Math.min(g.xp / 10, 100)}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-950 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold">{g.member_count} members</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            joinGuildMutation.mutate(g.id)
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'my-guilds' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myGuilds.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center">
                    <Users className="w-12 h-12 mb-2 opacity-35" />
                    <p className="text-base font-semibold">You haven't joined any guilds yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Explore and join guilds in the Discover tab.</p>
                  </div>
                ) : (
                  myGuilds.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGuildId(g.id)}
                      className="p-6 rounded-2xl border border-slate-850 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-800 transition duration-300 flex flex-col justify-between cursor-pointer space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl bg-slate-950 p-2.5 rounded-xl border border-slate-850">{g.icon}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                            {g.category}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-lg line-clamp-1">{g.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">{g.description}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-950 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold">{g.member_count} members</span>
                        <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">
                          Active Member
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6">
                {isLoadingLeaderboard ? (
                  <div className="text-center py-8 text-slate-500">Loading leaderboard...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No guilds available on leaderboard yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Guild</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Level</th>
                          <th className="py-3 px-4">Members</th>
                          <th className="py-3 px-4 text-right">Total XP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row) => (
                          <tr key={row.guild_id} className="border-b border-slate-900 hover:bg-slate-900/30 text-sm">
                            <td className="py-4 px-4 font-extrabold text-slate-400">#{row.rank}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{row.guild_icon}</span>
                                <span className="font-bold text-white">{row.guild_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                                {row.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-300 font-semibold">{row.level}</td>
                            <td className="py-4 px-4 text-slate-400">{row.member_count}</td>
                            <td className="py-4 px-4 text-right font-extrabold text-violet-400">{row.total_xp} XP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- CREATE GUILD MODAL --- */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">Create New Guild</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Guild Name</label>
                  <input
                    type="text"
                    value={newGuild.name}
                    onChange={(e) => setNewGuild({ ...newGuild, name: e.target.value })}
                    placeholder="e.g. Flutter Wizards"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={newGuild.category}
                      onChange={(e) => setNewGuild({ ...newGuild, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500 transition"
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Guild Icon</label>
                    <input
                      type="text"
                      value={newGuild.icon}
                      onChange={(e) => setNewGuild({ ...newGuild, icon: e.target.value })}
                      placeholder="Emoji, e.g. 🛡️"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newGuild.description}
                    onChange={(e) => setNewGuild({ ...newGuild, description: e.target.value })}
                    placeholder="Brief overview of your community rules or purpose..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Max Members</label>
                    <input
                      type="number"
                      value={newGuild.max_members}
                      onChange={(e) => setNewGuild({ ...newGuild, max_members: parseInt(e.target.value) || 100 })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={newGuild.is_public}
                      onChange={(e) => setNewGuild({ ...newGuild, is_public: e.target.checked })}
                      className="w-4 h-4 text-violet-600 border-slate-800 rounded bg-slate-950 focus:ring-violet-500 focus:ring-offset-slate-900"
                    />
                    <label htmlFor="is_public" className="text-sm font-semibold text-slate-300">Public Guild</label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createGuildMutation.mutate(newGuild)}
                  disabled={!newGuild.name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition"
                >
                  Create Guild
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CREATE CHALLENGE MODAL --- */}
      <AnimatePresence>
        {showCreateChallengeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">New Guild Challenge</h2>
                <button
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Challenge Title</label>
                  <input
                    type="text"
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                    placeholder="e.g. Read 5 chapters this week"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                    placeholder="What should members achieve to finish this challenge?"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">XP Reward</label>
                    <input
                      type="number"
                      value={newChallenge.xp_reward}
                      onChange={(e) => setNewChallenge({ ...newChallenge, xp_reward: parseInt(e.target.value) || 150 })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Target Steps</label>
                    <input
                      type="number"
                      value={newChallenge.target_count}
                      onChange={(e) => setNewChallenge({ ...newChallenge, target_count: parseInt(e.target.value) || 5 })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Duration (days)</label>
                    <input
                      type="number"
                      value={newChallenge.ends_in_days}
                      onChange={(e) => setNewChallenge({ ...newChallenge, ends_in_days: parseInt(e.target.value) || 7 })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const endsAt = new Date()
                    endsAt.setDate(endsAt.getDate() + newChallenge.ends_in_days)
                    createChallengeMutation.mutate({
                      guildId: guildDetail.guild.id,
                      data: {
                        title: newChallenge.title,
                        description: newChallenge.description,
                        xp_reward: newChallenge.xp_reward,
                        target_count: newChallenge.target_count,
                        ends_at: endsAt.toISOString()
                      }
                    })
                  }}
                  disabled={!newChallenge.title.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition"
                >
                  Create Challenge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
