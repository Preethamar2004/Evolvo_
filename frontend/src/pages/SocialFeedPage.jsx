import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Heart, Share2, Plus, Users, Bell, Trophy,
  Target, Flame, Image, Video, Sparkles, CheckCircle2, ChevronRight, UserPlus, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import Sidebar from '@/components/layout/Sidebar'
import { socialApi, dashboardApi } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function SocialFeedPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  
  // Post Creator State
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState('image')
  const [postType, setPostType] = useState('text')
  const [selectedAchievementId, setSelectedAchievementId] = useState('')
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [xpGained, setXpGained] = useState(0)
  
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  // 1. Fetch Feed
  const { data: feed = [], isLoading: isLoadingFeed } = useQuery({
    queryKey: ['social-feed'],
    queryFn: async () => {
      const { data } = await socialApi.getFeed()
      return data
    }
  })

  // 2. Fetch User Achievements & Missions for Sharing
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-sharing'],
    queryFn: async () => {
      const { data } = await dashboardApi.getDashboard()
      return data
    }
  })

  // 3. Fetch Friend Requests
  const { data: friendRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const { data } = await socialApi.getFriendRequests()
      return data
    }
  })

  // 4. Fetch Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await socialApi.getNotifications()
      return data
    }
  })

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: (data) => socialApi.createPost(data),
    onSuccess: () => {
      qc.invalidateQueries(['social-feed'])
      toast.success('Shared to growth feed! 🌱')
      setContent('')
      setMediaUrl('')
      setSelectedAchievementId('')
      setSelectedMissionId('')
      setXpGained(0)
      setPostType('text')
    }
  })

  const toggleLikeMutation = useMutation({
    mutationFn: (postId) => socialApi.toggleLike(postId),
    onSuccess: () => {
      qc.invalidateQueries(['social-feed'])
    }
  })

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }) => socialApi.addComment(postId, content),
    onSuccess: () => {
      qc.invalidateQueries(['social-feed'])
      setNewCommentText('')
      toast.success('Comment posted')
    }
  })

  const friendResponseMutation = useMutation({
    mutationFn: ({ requestId, statusChoice }) => socialApi.respondToFriendRequest(requestId, statusChoice),
    onSuccess: () => {
      qc.invalidateQueries(['friend-requests'])
      qc.invalidateQueries(['social-feed'])
      toast.success('Friend request updated')
    }
  })

  const readNotificationMutation = useMutation({
    mutationFn: (notificationId) => socialApi.markNotificationRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries(['notifications'])
    }
  })

  const handleCreatePost = (e) => {
    e.preventDefault()
    if (!content.trim() && !mediaUrl) {
      toast.error('Post content or media is required')
      return
    }

    createPostMutation.mutate({
      content,
      media_url: mediaUrl || null,
      media_type: mediaUrl ? mediaType : null,
      post_type: postType,
      achievement_id: postType === 'achievement' && selectedAchievementId ? selectedAchievementId : null,
      mission_id: postType === 'mission_completion' && selectedMissionId ? selectedMissionId : null,
      xp_gained: Number(xpGained)
    })
  }

  const handleRespondRequest = (requestId, statusChoice) => {
    friendResponseMutation.mutate({ requestId, statusChoice })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN FEED COLUMN */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Growth <span className="gradient-text">Feed</span>
              </h1>
              <p className="text-sm text-slate-400">Prioritizing real-world achievements, habits, and progress.</p>
            </div>
            
            {/* Notifications Trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer relative"
                style={{ background: 'var(--color-surface-900)', borderColor: 'var(--color-border)' }}
              >
                <Bell size={18} className="text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-80 rounded-2xl border p-4 shadow-xl z-30"
                    style={{ background: 'var(--color-surface-900)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-sm text-slate-200">Notifications</span>
                      <span className="text-xs text-slate-500">{unreadCount} unread</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="text-center text-xs text-slate-500 py-6">All caught up!</div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => readNotificationMutation.mutate(notif.id)}
                            className={`p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                              notif.is_read ? 'opacity-60' : 'bg-indigo-500/5 border border-indigo-500/10'
                            }`}
                          >
                            <span className="text-base">
                              {notif.notification_type === 'like' && '❤️'}
                              {notif.notification_type === 'comment' && '💬'}
                              {notif.notification_type === 'follow' && '👥'}
                              {notif.notification_type === 'achievement_shared' && '🏆'}
                            </span>
                            <div>
                              <p className="text-slate-300">
                                <span className="font-bold text-slate-200">@{notif.sender.username}</span>{' '}
                                {notif.notification_type === 'like' && 'liked your growth post.'}
                                {notif.notification_type === 'comment' && 'commented on your post.'}
                                {notif.notification_type === 'follow' && 'started following you.'}
                                {notif.notification_type === 'achievement_shared' && 'shared a new achievement!'}
                              </p>
                              <span className="text-[10px] text-slate-500">{new Date(notif.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SHARE BOX */}
          <div className="card p-5" style={{ background: 'var(--color-surface-900)' }}>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-indigo-600 flex-shrink-0" style={{ background: 'var(--gradient-brand)' }}>
                  {user?.profile?.avatar_url ? (
                    <img src={user.profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.username?.slice(0, 2).toUpperCase()
                  )}
                </div>
                <textarea
                  placeholder="Share your daily wins, lessons, or progress..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 min-h-[80px] bg-transparent text-slate-200 text-sm outline-none resize-none pt-2"
                />
              </div>

              {/* Media URL Box */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">MEDIA URL (IMAGE / VIDEO)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/40 border text-slate-200 outline-none"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
                {mediaUrl && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">MEDIA TYPE</label>
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/40 border text-slate-200 outline-none"
                      style={{ borderColor: 'var(--color-border)', colorScheme: 'dark' }}
                    >
                      <option value="image">📸 Image Asset</option>
                      <option value="video">🎥 Video Asset</option>
                    </select>
                  </div>
                )}
              </div>

              {/* POST TYPE & DETAILS */}
              <div className="grid sm:grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">POST CATEGORY</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/40 border text-slate-200 outline-none"
                    style={{ borderColor: 'var(--color-border)', colorScheme: 'dark' }}
                  >
                    <option value="text">💬 Regular Thought</option>
                    <option value="achievement">🏆 Share Achievement</option>
                    <option value="mission_completion">🎯 Mission Completion</option>
                    <option value="progress">📈 Personal Progress Log</option>
                  </select>
                </div>

                {/* Conditional dropdowns based on postType selection */}
                {postType === 'achievement' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">CHOOSE ACHIEVEMENT</label>
                    <select
                      value={selectedAchievementId}
                      onChange={(e) => setSelectedAchievementId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/40 border text-slate-200 outline-none"
                      style={{ borderColor: 'var(--color-border)', colorScheme: 'dark' }}
                    >
                      <option value="">-- Select Achievement --</option>
                      {dashboardData?.recent_achievements?.map((a) => (
                        <option key={a.id} value={a.id}>🏆 {a.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {postType === 'mission_completion' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">CHOOSE COMPLETED MISSION</label>
                    <select
                      value={selectedMissionId}
                      onChange={(e) => setSelectedMissionId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/40 border text-slate-200 outline-none"
                      style={{ borderColor: 'var(--color-border)', colorScheme: 'dark' }}
                    >
                      <option value="">-- Select Mission --</option>
                      {dashboardData?.active_missions?.map((m) => (
                        <option key={m.id} value={m.id}>🎯 {m.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* XP Log input */}
                {postType !== 'text' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">XP EARNED / PROGRESS</label>
                    <input
                      type="number"
                      placeholder="e.g. 100 XP"
                      value={xpGained}
                      onChange={(e) => setXpGained(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/40 border text-slate-200 outline-none"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="flex justify-between items-center border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Sparkles size={11} className="text-yellow-400 animate-pulse" /> Boosts Growth Weight
                </span>
                <button
                  type="submit"
                  disabled={createPostMutation.isPending}
                  className="btn btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5"
                  style={{ background: 'var(--gradient-brand)' }}
                >
                  <Plus size={14} /> Share Update
                </button>
              </div>
            </form>
          </div>

          {/* GROWTH FEED FEED */}
          <div className="space-y-4">
            {isLoadingFeed ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 rounded-2xl animate-pulse bg-slate-900/40 w-full" />
              ))
            ) : feed.length === 0 ? (
              <div className="card text-center py-12">
                <Sparkles size={36} className="mx-auto mb-3 text-slate-600 animate-pulse" />
                <p className="text-slate-400">Your feed is currently empty.</p>
                <p className="text-xs text-slate-500 mt-1">Start by posting your first mission check-in!</p>
              </div>
            ) : (
              feed.map((post) => {
                const displayName = post.user.profile?.full_name || post.user.username
                const isLiked = post.likes.some(l => l.user_id === user.id)
                const isExpanded = expandedCommentsPostId === post.id
                
                return (
                  <motion.div 
                    key={post.id}
                    layout
                    className="card p-5 relative overflow-hidden"
                    style={{ background: 'var(--color-surface-900)' }}
                  >
                    
                    {/* Unique Growth Score Indicator (Visible for users) */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <Flame size={10} /> Growth priority score: {post.growth_score.toFixed(2)}
                    </div>

                    <div className="flex gap-3 mb-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-indigo-600 flex-shrink-0" style={{ background: 'var(--gradient-brand)' }}>
                        {post.user.profile?.avatar_url ? (
                          <img src={post.user.profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          post.user.username.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      
                      {/* Meta */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-sm">{displayName}</span>
                          <span className="text-xs text-slate-500">@{post.user.username}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Categorized Badges */}
                          {post.post_type === 'achievement' && (
                            <span className="badge badge-purple text-[10px] py-0.5 px-1.5 flex items-center gap-1 font-semibold">
                              <Trophy size={10} className="text-yellow-400" /> ACHIEVEMENT SHARED
                            </span>
                          )}
                          {post.post_type === 'mission_completion' && (
                            <span className="badge badge-brand text-[10px] py-0.5 px-1.5 flex items-center gap-1 font-semibold">
                              <Target size={10} className="text-blue-400" /> MISSION COMPLETED
                            </span>
                          )}
                          {post.post_type === 'progress' && (
                            <span className="badge badge-gold text-[10px] py-0.5 px-1.5 flex items-center gap-1 font-semibold">
                              <Flame size={10} className="text-orange-400" /> PROGRESS LOG
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">· {new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-4 text-slate-300 text-sm leading-relaxed mb-4">
                      {post.content && <p>{post.content}</p>}

                      {/* Optional XP Callout */}
                      {post.xp_gained > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20">
                          <Sparkles size={12} className="animate-spin" /> Earning +{post.xp_gained} XP toward Level Tier!
                        </div>
                      )}

                      {/* Media Upload Visualizer */}
                      {post.media_url && (
                        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                          {post.media_type === 'video' ? (
                            <video src={post.media_url} controls className="w-full max-h-96 object-cover" />
                          ) : (
                            <img src={post.media_url} alt="Shared media" className="w-full max-h-96 object-cover" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-5 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                      <button 
                        onClick={() => toggleLikeMutation.mutate(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isLiked ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                        {post.likes_count}
                      </button>

                      <button 
                        onClick={() => setExpandedCommentsPostId(isExpanded ? null : post.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        <MessageSquare size={15} />
                        {post.comments_count} Comments
                      </button>
                    </div>

                    {/* Comments section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t mt-4 pt-4 space-y-3 overflow-hidden"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          {/* Write Comment */}
                          <div className="flex gap-2.5">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-950/40 border text-slate-200 outline-none"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                            <button
                              onClick={() => addCommentMutation.mutate({ postId: post.id, content: newCommentText })}
                              className="btn btn-secondary px-3 py-2 text-xs flex items-center justify-center flex-shrink-0"
                            >
                              Comment
                            </button>
                          </div>

                          {/* Dummy / Mock Comments display (since comments have relationships in DB) */}
                          <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                            {post.comments_count === 0 ? (
                              <p className="text-[11px] text-slate-500">No comments yet. Be the first to congratulate them!</p>
                            ) : (
                              // We will render comments if they exist
                              <div className="text-xs text-slate-400 py-1">Comments are loading...</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })
            )}
          </div>

        </section>

        {/* SIDEBAR COLUMNS */}
        <section className="space-y-6">
          
          {/* FRIEND REQUESTS PANEL */}
          <div className="card p-5" style={{ background: 'var(--color-surface-900)' }}>
            <h3 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Users size={16} className="text-indigo-400" /> Pending Requests
            </h3>

            {isLoadingRequests ? (
              <div className="h-10 rounded-xl animate-pulse bg-slate-800/40" />
            ) : friendRequests.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No pending friend requests.</p>
            ) : (
              <div className="space-y-3">
                {friendRequests.map((req) => (
                  <div key={req.id} className="flex justify-between items-center gap-2 bg-slate-950/20 p-2.5 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">@{req.sender.username}</p>
                      <p className="text-[10px] text-slate-500 truncate">{req.sender.profile?.full_name || 'Evolver user'}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button 
                        onClick={() => handleRespondRequest(req.id, 'accepted')}
                        className="btn btn-secondary px-2.5 py-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center gap-0.5"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleRespondRequest(req.id, 'declined')}
                        className="btn btn-ghost px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-red-400"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SOCIAL NETWORK PRINCIPLES INFO CARD */}
          <div className="card p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #131920 0%, #1a2230 100%)', border: '1px solid var(--color-border)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: 'var(--color-brand-600)' }} />
            
            <h3 className="font-bold text-slate-100 text-sm mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Sparkles size={15} style={{ color: 'var(--color-gold-400)' }} /> Growth Engine Active
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Welcome to the first popularity-free social space! In Evolvo, posts sharing **real-world achievements** and **mission progress** naturally score higher in the feed feed than typical text posts. Likes offer minor boosts, but habits and growth are the ultimate rank factors.
            </p>
          </div>

        </section>

      </main>
    </div>
  )
}
