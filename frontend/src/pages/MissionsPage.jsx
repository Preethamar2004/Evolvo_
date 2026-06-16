import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Target, Zap, Flame, Clock, CheckCircle2, Play,
  Filter, Search, Star, Trophy, Calendar, TrendingUp,
  BookOpen, Code2, Brain, Dumbbell, Film,
  Gamepad2, MessageSquare, Users, Lightbulb, Palette,
  ChevronDown, ChevronUp, ArrowRight, Sparkles, Shield,
  RefreshCw, Plus, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { missionsApi } from '@/services/apiServices'
import Sidebar from '@/components/layout/Sidebar'

// ─── Constants ────────────────────────────────────────────────────

const CATEGORY_META = {
  Education:       { icon: BookOpen,     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  Programming:     { icon: Code2,        color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  'AI Learning':   { icon: Brain,        color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  Sports:          { icon: Trophy,       color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  Cricket:         { icon: Target,       color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  Fitness:         { icon: Dumbbell,     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  Movies:          { icon: Film,         color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  Gaming:          { icon: Gamepad2,     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  Communication:   { icon: MessageSquare,color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  Leadership:      { icon: Users,        color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  Entrepreneurship:{ icon: Lightbulb,    color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  Creativity:      { icon: Palette,      color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
}

const DIFFICULTY_META = {
  easy:      { label: 'Easy',      color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  medium:    { label: 'Medium',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  hard:      { label: 'Hard',      color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  legendary: { label: 'Legendary', color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
}

const TYPE_META = {
  daily:     { label: 'Daily',     color: '#38bdf8', icon: '⚡' },
  weekly:    { label: 'Weekly',    color: '#a78bfa', icon: '📅' },
  monthly:   { label: 'Monthly',   color: '#fbbf24', icon: '🗓️' },
  permanent: { label: 'Permanent', color: '#94a3b8', icon: '♾️' },
}

// ─── Helpers ──────────────────────────────────────────────────────

function pct(p) { return Math.round((p || 0) * 100) }

function timeLeft(expiresAt) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - new Date()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

// ─── Small Components ──────────────────────────────────────────────

function DiffBadge({ difficulty }) {
  const meta = DIFFICULTY_META[difficulty?.toLowerCase()] || DIFFICULTY_META.easy
  return (
    <span
      className="badge"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
    >
      {meta.label}
    </span>
  )
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type?.toLowerCase()] || TYPE_META.permanent
  return (
    <span
      className="badge"
      style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}33` }}
    >
      {meta.icon} {meta.label}
    </span>
  )
}

function CategoryIcon({ category, size = 18 }) {
  const meta = CATEGORY_META[category] || { icon: Target, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
  const Icon = meta.icon
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: 40, height: 40, background: meta.bg, border: `1px solid ${meta.color}33` }}
    >
      <Icon size={size} style={{ color: meta.color }} />
    </div>
  )
}

function ProgressRing({ percent, size = 48, stroke = 4, color = '#4361ff' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (percent / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'var(--color-surface-700)' }}
    />
  )
}

// ─── Active Mission Card ───────────────────────────────────────────

function ActiveMissionCard({ mission, onComplete, onProgress }) {
  const percent = pct(mission.progress)
  const diff = DIFFICULTY_META[mission.difficulty?.toLowerCase()] || DIFFICULTY_META.easy
  const tLeft = timeLeft(mission.expires_at)
  const catMeta = CATEGORY_META[mission.category] || { color: '#6b8eff' }

  return (
    <div
      className="card group hover:scale-[1.01] transition-all duration-300"
      style={{ borderLeft: `3px solid ${catMeta.color}` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <CategoryIcon category={mission.category} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-100 text-sm leading-tight">{mission.title}</h4>
            <div className="flex-shrink-0">
              <ProgressRing percent={percent} size={44} color={diff.color} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <DiffBadge difficulty={mission.difficulty} />
            <TypeBadge type={mission.mission_type} />
            {tLeft && (
              <span className="badge" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.7rem' }}>
                <Clock size={10} /> {tLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      {mission.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{mission.description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">
            {mission.current_count} / {mission.target_count} steps
          </span>
          <span style={{ color: diff.color }}>{percent}%</span>
        </div>
        <div className="xp-bar-track" style={{ height: '6px' }}>
          <div
            className="xp-bar-fill"
            style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${diff.color}, ${diff.color}99)` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-xp-400)' }}>
          <Zap size={12} /> +{mission.xp_reward} XP
        </div>
        <div className="flex gap-2">
          {mission.target_count > 1 && (
            <button
              className="btn btn-secondary text-xs py-1.5 px-3"
              onClick={() => onProgress(mission.id, 1)}
              style={{ fontSize: '0.75rem' }}
            >
              <Plus size={12} /> Log Step
            </button>
          )}
          <button
            className="btn btn-primary text-xs py-1.5 px-3"
            onClick={() => onComplete(mission.id)}
            style={{ fontSize: '0.75rem' }}
          >
            <CheckCircle2 size={12} /> Complete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Available Mission Card ────────────────────────────────────────

function AvailableMissionCard({ mission, onStart }) {
  const diff = DIFFICULTY_META[mission.difficulty?.toLowerCase()] || DIFFICULTY_META.easy
  const catMeta = CATEGORY_META[mission.category] || { color: '#6b8eff' }

  return (
    <div
      className="card group hover:border-opacity-60 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
      style={{ borderLeft: `3px solid ${catMeta.color}55` }}
      onClick={() => onStart(mission.id)}
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="text-2xl flex-shrink-0">{mission.icon || '🎯'}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-200 text-sm leading-tight mb-1">{mission.title}</h4>
          <div className="flex flex-wrap items-center gap-1.5">
            <DiffBadge difficulty={mission.difficulty} />
            <TypeBadge type={mission.mission_type} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-xp-400)' }}>
          <Zap size={11} /> +{mission.xp_reward}
        </div>
      </div>
      {mission.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{mission.description}</p>
      )}
      {mission.target_count > 1 && (
        <p className="text-xs text-slate-600">Target: {mission.target_count} steps</p>
      )}
      <div className="flex justify-end mt-3">
        <button className="btn btn-secondary text-xs py-1.5 px-3 group-hover:btn-primary" style={{ fontSize: '0.75rem' }}>
          <Play size={11} /> Start Mission
        </button>
      </div>
    </div>
  )
}

// ─── Completed Mission Card ────────────────────────────────────────

function CompletedMissionCard({ mission }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-700)', border: '1px solid rgba(74,222,128,0.15)' }}>
      <div className="text-xl flex-shrink-0">{mission.icon || '✅'}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{mission.title}</p>
        <p className="text-xs text-slate-500">{mission.category} · {new Date(mission.completed_at).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: '#4ade80' }}>
        <CheckCircle2 size={12} /> +{mission.xp_reward} XP
      </div>
    </div>
  )
}

// ─── Section Wrapper ───────────────────────────────────────────────

function Section({ title, icon: Icon, color, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-8">
      <button
        className="flex items-center justify-between w-full mb-4 group"
        onClick={() => setOpen(v => !v)}
      >
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Icon size={20} style={{ color }} />
          {title}
          {count !== undefined && (
            <span className="badge" style={{ background: `${color}18`, color, border: `1px solid ${color}33`, fontSize: '0.7rem' }}>
              {count}
            </span>
          )}
        </h2>
        {open ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
      </button>
      {open && children}
    </div>
  )
}

// ─── Missions Page ─────────────────────────────────────────────────

export default function MissionsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('active')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['missions-page'],
    queryFn: async () => {
      const { data } = await missionsApi.getPage()
      return data
    },
    staleTime: 15_000,
  })

  const startMutation = useMutation({
    mutationFn: (missionId) => missionsApi.start(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['missions-page'])
      queryClient.invalidateQueries(['dashboard'])
      toast.success('🎯 Mission started! Good luck!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Could not start mission')
    },
  })

  const progressMutation = useMutation({
    mutationFn: ({ id, increment }) => missionsApi.logProgress(id, increment),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['missions-page'])
      queryClient.invalidateQueries(['dashboard'])
      const d = res.data
      if (d.status === 'completed') {
        toast.success(`🏆 Mission Completed! +${d.xp_reward} XP earned!`)
      } else {
        toast.success(`⚡ Progress logged! ${Math.round(d.progress * 100)}% done`)
      }
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Could not log progress'),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => missionsApi.complete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['missions-page'])
      queryClient.invalidateQueries(['dashboard'])
      toast.success(`🏆 Mission Completed! +${res.data.xp_reward} XP earned!`)
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Could not complete mission'),
  })

  const seedMutation = useMutation({
    mutationFn: () => missionsApi.seed(),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['missions-page'])
      toast.success(`✨ Seeded ${res.data.missions_added} missions & ${res.data.achievements_added} achievements!`)
    },
    onError: () => toast.error('Seeding failed'),
  })

  // Filter available missions
  const filteredAvailable = useMemo(() => {
    if (!data?.available) return []
    return data.available.filter(m => {
      if (filterCategory && m.category !== filterCategory) return false
      if (filterDifficulty && m.difficulty !== filterDifficulty) return false
      if (filterType && m.mission_type !== filterType) return false
      if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
          !m.category.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data?.available, filterCategory, filterDifficulty, filterType, search])

  const allActive = [...(data?.daily || []), ...(data?.weekly || []), ...(data?.monthly || []), ...(data?.active || [])]
  const totalActive = allActive.length
  const totalCompleted = data?.completed?.length || 0

  const tabs = [
    { id: 'active',    label: 'In Progress', count: totalActive },
    { id: 'available', label: 'Available',   count: filteredAvailable.length },
    { id: 'completed', label: 'Completed',   count: totalCompleted },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-xl">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mb-8 page-enter">
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--color-surface-800) 0%, var(--color-surface-700) 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-2xl" style={{ background: '#4361ff' }} />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full opacity-15 blur-2xl" style={{ background: '#a855f7' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} style={{ color: '#fbbf24' }} />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Mission Control</span>
              </div>
              <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Your <span className="gradient-text">Missions</span>
              </h1>
              <p className="text-slate-400 mb-4">Convert real-life activities into epic quests. Earn XP, unlock achievements, level up.</p>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(67,97,255,0.1)', border: '1px solid rgba(67,97,255,0.2)' }}>
                  <Target size={16} style={{ color: '#6b8eff' }} />
                  <span className="text-sm font-semibold text-slate-200">{totalActive} Active</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
                  <span className="text-sm font-semibold text-slate-200">{totalCompleted} Completed</span>
                </div>
                <button
                  className="btn btn-ghost text-xs py-2 px-3"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  title="Seed missions & achievements"
                >
                  <RefreshCw size={14} className={seedMutation.isPending ? 'animate-spin' : ''} />
                  {seedMutation.isPending ? 'Seeding…' : 'Load Mission Catalog'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--color-surface-800)', border: '1px solid var(--color-border)', width: 'fit-content' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5"
              style={
                activeTab === tab.id
                  ? { background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 2px 8px rgba(67,97,255,0.35)' }
                  : { color: '#94a3b8' }
              }
            >
              {tab.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={
                  activeTab === tab.id
                    ? { background: 'rgba(255,255,255,0.2)' }
                    : { background: 'var(--color-surface-700)', color: '#64748b' }
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Active / In Progress ────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="page-enter">
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
              </div>
            ) : allActive.length === 0 ? (
              <div className="card text-center py-16">
                <Target size={48} className="mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No Active Missions</h3>
                <p className="text-slate-500 mb-6">Head to the Available tab to start your first mission!</p>
                <button className="btn btn-primary mx-auto" onClick={() => setActiveTab('available')}>
                  <Play size={16} /> Browse Missions
                </button>
              </div>
            ) : (
              <>
                {data?.daily?.length > 0 && (
                  <Section title="Daily Missions" icon={Zap} color="#38bdf8" count={data.daily.length}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {data.daily.map(m => (
                        <ActiveMissionCard
                          key={m.id}
                          mission={m}
                          onComplete={(id) => completeMutation.mutate(id)}
                          onProgress={(id, inc) => progressMutation.mutate({ id, increment: inc })}
                        />
                      ))}
                    </div>
                  </Section>
                )}
                {data?.weekly?.length > 0 && (
                  <Section title="Weekly Missions" icon={Calendar} color="#a78bfa" count={data.weekly.length}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {data.weekly.map(m => (
                        <ActiveMissionCard
                          key={m.id}
                          mission={m}
                          onComplete={(id) => completeMutation.mutate(id)}
                          onProgress={(id, inc) => progressMutation.mutate({ id, increment: inc })}
                        />
                      ))}
                    </div>
                  </Section>
                )}
                {data?.monthly?.length > 0 && (
                  <Section title="Monthly Missions" icon={TrendingUp} color="#fbbf24" count={data.monthly.length}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {data.monthly.map(m => (
                        <ActiveMissionCard
                          key={m.id}
                          mission={m}
                          onComplete={(id) => completeMutation.mutate(id)}
                          onProgress={(id, inc) => progressMutation.mutate({ id, increment: inc })}
                        />
                      ))}
                    </div>
                  </Section>
                )}
                {data?.active?.length > 0 && (
                  <Section title="Permanent Missions" icon={Shield} color="#94a3b8" count={data.active.length}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {data.active.map(m => (
                        <ActiveMissionCard
                          key={m.id}
                          mission={m}
                          onComplete={(id) => completeMutation.mutate(id)}
                          onProgress={(id, inc) => progressMutation.mutate({ id, increment: inc })}
                        />
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Available Missions ──────────────────────────────── */}
        {activeTab === 'available' && (
          <div className="page-enter">
            {/* Search & Filter bar */}
            <div className="flex gap-3 mb-5 flex-wrap">
              <div className="flex-1 min-w-52 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="form-input pl-9"
                  placeholder="Search missions…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" onClick={() => setSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                className="btn btn-secondary px-4 text-sm"
                onClick={() => setShowFilters(v => !v)}
              >
                <Filter size={15} /> Filters
                {(filterCategory || filterDifficulty || filterType) && (
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="card mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="form-label text-xs mb-1.5 block">Category</label>
                  <select className="form-input text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {Object.keys(CATEGORY_META).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs mb-1.5 block">Difficulty</label>
                  <select className="form-input text-sm" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs mb-1.5 block">Type</label>
                  <select className="form-input text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="card text-center py-16">
                <Search size={40} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">No missions found. Try adjusting your filters.</p>
                {data?.available?.length === 0 && (
                  <p className="text-slate-500 text-sm mt-2">
                    Click <strong>Load Mission Catalog</strong> to populate missions.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAvailable.map(m => (
                  <AvailableMissionCard
                    key={m.id}
                    mission={m}
                    onStart={(id) => startMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Completed ───────────────────────────────────────── */}
        {activeTab === 'completed' && (
          <div className="page-enter">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : data?.completed?.length === 0 ? (
              <div className="card text-center py-16">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No Completed Missions Yet</h3>
                <p className="text-slate-500">Complete missions to see your history here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.completed.map(m => (
                  <CompletedMissionCard key={m.id} mission={m} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
