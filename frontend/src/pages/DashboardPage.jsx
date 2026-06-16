import { useQuery } from '@tanstack/react-query'
import {
  Zap, Star, Target, Flame, Trophy, TrendingUp,
  CheckCircle2, Clock, ArrowRight, Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { dashboardApi } from '@/services/apiServices'
import Sidebar from '@/components/layout/Sidebar'

// ─── XP Progress Bar ─────────────────────────────────────────────
function XPBar({ percent }) {
  return (
    <div className="xp-bar-track">
      <div className="xp-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}1a`, border: `1px solid ${color}33` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Mission Card ─────────────────────────────────────────────────
function MissionCard({ mission }) {
  const percent = Math.round(mission.progress * 100)
  const difficultyColor = {
    easy: 'var(--color-xp-400)',
    medium: 'var(--color-gold-400)',
    hard: '#f87171',
  }[mission.difficulty?.toLowerCase()] || 'var(--color-brand-400)'

  return (
    <div className="card hover:scale-[1.01] transition-transform">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{mission.icon || '🎯'}</span>
          <div>
            <h4 className="font-semibold text-slate-100 text-sm">{mission.title}</h4>
            {mission.category && (
              <span className="badge badge-brand text-xs mt-0.5">{mission.category}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-xp-400)' }}>
          <Zap size={12} />
          +{mission.xp_reward} XP
        </div>
      </div>
      {mission.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{mission.description}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="xp-bar-track flex-1" style={{ height: '6px' }}>
          <div className="xp-bar-fill" style={{ width: `${percent}%`, background: difficultyColor }} />
        </div>
        <span className="text-xs font-medium text-slate-400">{percent}%</span>
      </div>
    </div>
  )
}

// ─── Achievement Badge ────────────────────────────────────────────
function AchievementBadge({ achievement }) {
  const rarityColor = {
    common: '#94a3b8',
    rare: 'var(--color-brand-400)',
    epic: 'var(--color-accent-400)',
    legendary: 'var(--color-gold-400)',
  }[achievement.rarity] || '#94a3b8'

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-700)', border: '1px solid var(--color-border)' }}>
      <span className="text-2xl">{achievement.icon || '🏆'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{achievement.title}</p>
        <p className="text-xs capitalize font-medium" style={{ color: rarityColor }}>{achievement.rarity}</p>
      </div>
      <div className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-xp-400)' }}>
        +{achievement.xp_reward}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`rounded-xl animate-pulse ${className}`} style={{ background: 'var(--color-surface-700)' }} />
}

// ─── Dashboard Page ───────────────────────────────────────────────
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await dashboardApi.getDashboard()
      return data
    },
    staleTime: 30_000,
  })

  const gm = data?.gamification
  const firstName = data?.user?.profile?.full_name?.split(' ')[0] || user?.username || 'Evolver'

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-xl">
        {/* ── Welcome Hero ─────────────────────────────────────── */}
        <section className="mb-8 page-enter">
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-surface-800) 0%, var(--color-surface-700) 100%)', border: '1px solid var(--color-border)' }}>
            {/* Glow blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-2xl" style={{ background: 'var(--color-brand-600)' }} />
            <div className="absolute bottom-0 right-1/3 w-32 h-32 rounded-full opacity-15 blur-2xl" style={{ background: 'var(--color-accent-600)' }} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} style={{ color: 'var(--color-gold-400)' }} />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Daily Boost Active</span>
              </div>
              <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Welcome back, <span className="gradient-text">{firstName}</span>! 👋
              </h1>
              <p className="text-slate-400">Keep pushing — every action counts toward your evolution.</p>

              {/* XP + Level */}
              {gm && (
                <div className="mt-5 max-w-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-brand">
                        <Star size={11} /> Level {gm.level}
                      </span>
                      <span className="text-sm text-slate-400">{gm.xp.toLocaleString()} XP</span>
                    </div>
                    <span className="text-xs text-slate-500">{gm.xp_to_next_level.toLocaleString()} to next</span>
                  </div>
                  <XPBar percent={gm.level_progress_percent} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Stat Cards ────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatCard icon={Zap} label="Total XP" value={gm?.total_xp_earned?.toLocaleString() ?? '—'} color="var(--color-brand-400)" sub="All time earned" />
              <StatCard icon={Star} label="Level" value={gm?.level ?? '—'} color="var(--color-accent-400)" sub="Current tier" />
              <StatCard icon={Trophy} label="Achievements" value={data?.achievement_count ?? 0} color="var(--color-gold-400)" sub="Badges earned" />
              <StatCard icon={Flame} label="Streak" value={`${gm?.streak_days ?? 0}d`} color="#f87171" sub="Day streak" />
            </>
          )}
        </section>

        {/* ── Active Missions ───────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Target size={20} style={{ color: 'var(--color-brand-400)' }} />
              Active Missions
            </h2>
            <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={() => navigate('/missions')}>
              View all <ArrowRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : data?.active_missions?.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.active_missions.map((m) => <MissionCard key={m.id} mission={m} />)}
            </div>
          ) : (
            <div className="card text-center py-10">
              <Target size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No active missions yet</p>
              <p className="text-sm text-slate-500 mt-1">Start a mission to track your progress</p>
            </div>
          )}
        </section>

        {/* ── Recent Achievements ───────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Trophy size={20} style={{ color: 'var(--color-gold-400)' }} />
              Recent Achievements
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : data?.recent_achievements?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_achievements.map((a) => <AchievementBadge key={a.id} achievement={a} />)}
            </div>
          ) : (
            <div className="card text-center py-10">
              <Trophy size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No achievements yet</p>
              <p className="text-sm text-slate-500 mt-1">Complete missions to earn your first badge</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
