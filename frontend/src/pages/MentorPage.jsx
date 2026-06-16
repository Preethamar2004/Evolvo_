import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Send, Plus, Trash2, Brain, Bot, User,
  Sparkles, Flame, RefreshCw, Zap, Lightbulb, ChevronRight, HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Sidebar from '@/components/layout/Sidebar'
import { chatApi } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import { motion, AnimatePresence } from 'framer-motion'

// Helper to render simple Markdown into JSX
function RenderMarkdown({ text }) {
  if (!text) return null

  // Split by newlines
  const lines = text.split('\n')
  return (
    <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        // Headers ###
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-slate-100 mt-4 mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              {line.replace('### ', '')}
            </h3>
          )
        }
        // Headers ####
        if (line.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-sm font-bold text-slate-200 mt-3 mb-1">
              {line.replace('#### ', '')}
            </h4>
          )
        }
        // Bullet list points (* or -)
        if (line.startsWith('* ') || line.startsWith('- ')) {
          const content = line.substring(2)
          return (
            <div key={idx} className="flex items-start gap-2 ml-4 my-1">
              <span className="text-brand-400 mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <p>{parseInlineBold(content)}</p>
            </div>
          )
        }
        // Numbered list points (e.g. 1. )
        const numMatch = line.match(/^(\d+)\.\s(.*)/)
        if (numMatch) {
          const num = numMatch[1]
          const content = numMatch[2]
          return (
            <div key={idx} className="flex items-start gap-2.5 ml-4 my-1">
              <span className="text-xs font-bold text-indigo-400 mt-0.5 bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                {num}
              </span>
              <p className="pt-0.5">{parseInlineBold(content)}</p>
            </div>
          )
        }
        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />
        }

        // Regular paragraph
        return <p key={idx}>{parseInlineBold(line)}</p>
      })}
    </div>
  )
}

// Inline Bold formatting parser
function parseInlineBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function MentorPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  // Fetch list of chat sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: async () => {
      const { data } = await chatApi.getSessions()
      return data
    }
  })

  // Fetch messages of current active session
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat-messages', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return []
      const { data } = await chatApi.getMessages(activeSessionId)
      return data
    },
    enabled: !!activeSessionId
  })

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (title) => chatApi.createSession(title),
    onSuccess: (data) => {
      qc.invalidateQueries(['chat-sessions'])
      setActiveSessionId(data.data.id)
    }
  })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId) => chatApi.deleteSession(sessionId),
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries(['chat-sessions'])
      toast.success('Session deleted')
      if (activeSessionId === deletedId) {
        setActiveSessionId(null)
      }
    }
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ sessionId, content }) => chatApi.sendMessage(sessionId, content),
    onMutate: async ({ content }) => {
      // Optimistic update user message in cache
      await qc.cancelQueries(['chat-messages', activeSessionId])
      const previousMessages = qc.getQueryData(['chat-messages', activeSessionId]) || []
      
      qc.setQueryData(['chat-messages', activeSessionId], [
        ...previousMessages,
        {
          id: 'temp-id-' + Date.now(),
          session_id: activeSessionId,
          role: 'user',
          content,
          created_at: new Date().toISOString()
        }
      ])
      
      setIsTyping(true)
      return { previousMessages }
    },
    onSuccess: () => {
      qc.invalidateQueries(['chat-messages', activeSessionId])
      qc.invalidateQueries(['chat-sessions'])
    },
    onError: (err, newMsg, context) => {
      qc.setQueryData(['chat-messages', activeSessionId], context.previousMessages)
      toast.error('Failed to send message')
    },
    onSettled: () => {
      setIsTyping(false)
    }
  })

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Initial selection of the latest session
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id)
    }
  }, [sessions])

  const handleStartNewSession = () => {
    createSessionMutation.mutate('New Chat Session')
  }

  const handleSendMessage = (textToSend = inputText) => {
    if (!textToSend.trim()) return

    if (!activeSessionId) {
      // Create session first, then send
      createSessionMutation.mutate('New Chat Session', {
        onSuccess: (newSession) => {
          sendMessageMutation.mutate({ sessionId: newSession.data.id, content: textToSend })
        }
      })
    } else {
      sendMessageMutation.mutate({ sessionId: activeSessionId, content: textToSend })
    }
    setInputText('')
  }

  const handleSuggestionClick = (suggestionText) => {
    handleSendMessage(suggestionText)
  }

  // Pre-configured Starter Suggestions
  const suggestions = [
    { text: "Help me improve in cricket.", icon: "🏏", color: "#f59e0b" },
    { text: "Suggest movies for me.", icon: "🎬", color: "#6b8eff" },
    { text: "Help me become an AI Engineer.", icon: "🚀", color: "#a855f7" },
    { text: "I feel demotivated.", icon: "❤️", color: "#ef4444" },
    { text: "Suggest a startup idea.", icon: "💡", color: "#22c55e" }
  ]

  const displayName = user?.profile?.full_name || user?.username || 'Evolver'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 flex flex-col h-screen overflow-hidden">
        
        {/* Main Inner Grid */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* SESSIONS LIST SIDEBAR */}
          <aside className="w-64 border-r hidden md:flex flex-col flex-shrink-0" style={{ background: 'var(--color-surface-900)', borderColor: 'var(--color-border)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-slate-200 text-sm tracking-wide">CHAT HISTORY</span>
              <button 
                onClick={handleStartNewSession}
                className="btn btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
                disabled={createSessionMutation.isPending}
              >
                <Plus size={14} /> New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoadingSessions ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl animate-pulse bg-slate-800/40 m-1" />
                ))
              ) : sessions.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">No previous chats</div>
              ) : (
                sessions.map((session) => {
                  const isActive = activeSessionId === session.id
                  return (
                    <div 
                      key={session.id}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                        isActive 
                          ? 'text-white' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                      style={isActive ? { background: 'var(--color-surface-800)', border: '1px solid var(--color-border)' } : {}}
                      onClick={() => setActiveSessionId(session.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <MessageSquare size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                        <span className="truncate pr-2">{session.title}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSessionMutation.mutate(session.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded transition-all"
                        title="Delete Session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* CHAT WINDOW */}
          <section className="flex-1 flex flex-col min-w-0 relative">
            
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6 z-10" style={{ background: 'var(--color-surface-900)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Bot size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-100 text-sm">Evolvo AI Mentor</h2>
                  <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Always Active
                  </p>
                </div>
              </div>

              {/* Mobile Only: New session trigger */}
              <button 
                onClick={handleStartNewSession}
                className="md:hidden btn btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
                disabled={createSessionMutation.isPending}
              >
                <Plus size={14} /> New
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Empty state / Suggesstions */}
              {(!activeSessionId || messages.length === 0) && !isLoadingMessages ? (
                <div className="max-w-2xl mx-auto py-12 flex flex-col items-center">
                  
                  {/* Branding Animation */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 8px 32px rgba(67,97,255,0.3)' }}
                  >
                    <Sparkles size={28} className="text-white" />
                  </motion.div>

                  <h3 className="text-2xl font-black text-slate-100 text-center mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    Your Personal Growth Accelerator
                  </h3>
                  <p className="text-slate-400 text-center text-sm max-w-md mb-8 leading-relaxed">
                    Evolvo acts as your Coach, Mentor, Friend, Motivator, and Guide. Ask a question, request a step-by-step action plan, or choose a starter topic below.
                  </p>

                  {/* Suggestions Grid */}
                  <div className="grid sm:grid-cols-2 gap-4 w-full">
                    {suggestions.map((sug, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                        onClick={() => handleSuggestionClick(sug.text)}
                        className="p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-3.5"
                        style={{ background: 'var(--color-surface-800)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-slate-800/60 border border-slate-700/50">
                          {sug.icon}
                        </div>
                        <span className="text-sm font-semibold text-slate-200">{sug.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  
                  {/* Load/Render Message Thread */}
                  {isLoadingMessages ? (
                    <div className="space-y-4">
                      <div className="h-10 w-2/3 bg-slate-850 animate-pulse rounded-xl" />
                      <div className="h-24 w-full bg-slate-800 animate-pulse rounded-xl" />
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isUser = msg.role === 'user'
                      return (
                        <div 
                          key={msg.id}
                          className={`flex gap-4 items-start ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Avatar left */}
                          {!isUser && (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
                              <Bot size={16} />
                            </div>
                          )}

                          {/* Bubble */}
                          <div 
                            className={`p-4 rounded-2xl max-w-[85%] border shadow-sm ${
                              isUser 
                                ? 'bg-indigo-650 text-white rounded-tr-none' 
                                : 'bg-surface-800 text-slate-300 rounded-tl-none'
                            }`}
                            style={{ 
                              backgroundColor: isUser ? '#312e81' : 'var(--color-surface-800)', 
                              borderColor: isUser ? 'rgba(99,102,241,0.2)' : 'var(--color-border)' 
                            }}
                          >
                            <RenderMarkdown text={msg.content} />
                          </div>

                          {/* Avatar right */}
                          {isUser && (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-indigo-600 flex-shrink-0 overflow-hidden" style={{ background: 'var(--gradient-brand)' }}>
                              {user?.profile?.avatar_url ? (
                                <img src={user.profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-4 items-start justify-start">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
                        <Bot size={16} />
                      </div>
                      <div className="p-4 rounded-2xl bg-surface-800 border rounded-tl-none flex items-center gap-1" style={{ backgroundColor: 'var(--color-surface-800)', borderColor: 'var(--color-border)' }}>
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t" style={{ background: 'var(--color-surface-900)', borderColor: 'var(--color-border)' }}>
              <div className="max-w-3xl mx-auto flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask Evolvo anything..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-3 rounded-xl text-slate-100 text-sm outline-none border transition-all"
                  style={{ 
                    backgroundColor: 'var(--color-surface-950)', 
                    borderColor: 'var(--color-border)',
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="btn btn-primary p-3 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--gradient-brand)' }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

          </section>

        </div>
      </main>
    </div>
  )
}
