import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Crown, Star, Flame, Zap, TrendingUp,
  Medal, Award, Sparkles
} from 'lucide-react'
import { missionsApi } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'

// ─── Helpers ───────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'var(--color-surface-700)' }} />
  )
}

function Avatar({ name, avatar, size = 40 }) {
  const initials = (name || '??').slice(0, 2).toUpperCase()
  return (
    <div
      className="rounded-xl flex items-center justify-center font-bold text-white overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: 'var(--gradient-brand)', fontSize: size * 0.35 }}
    >
      {avatar
        ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
        : initials}
    </div>
  )
}

const RANK_META = {
  1: { icon: Crown,  color: '#fbbf24', label: '👑', size: 28, glow: 'rgba(251,191,36,0.5)' },
  2: { icon: Medal,  color: '#94a3b8', label: '🥈', size: 24, glow: 'rgba(148,163,184,0.3)' },
  3: { icon: Award,  color: '#f97316', label: '🥉', size: 24, glow: 'rgba(249,115,22,0.3)' },
}

// ─── Top 3 Podium ──────────────────────────────────────────────────

function PodiumCard({ entry, isMe }) {
  const meta = RANK_META[entry.rank]
  if (!meta) return null

  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
  const orders = { 1: 'order-2', 2: 'order-1', 3: 'order-3' }

  return (
    <div className={`flex flex-col items-center gap-2 ${orders[entry.rank]}`}>
      {/* Name + Avatar */}
      <div className="flex flex-col items-center gap-1 mb-1">
        <div className="relative">
          <Avatar name={entry.full_name || entry.username} avatar={entry.avatar_url} size={entry.rank === 1 ? 56 : 44} />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">{meta.label}</span>
        </div>
        <p className="text-xs font-semibold text-slate-300 text-center max-w-20 truncate">
          {entry.full_name || entry.username}
        </p>
        <span className="badge badge-brand text-xs">Lv.{entry.level}</span>
      </div>

      {/* Podium block */}
      <div
        className={`w-24 ${heights[entry.rank]} rounded-t-xl flex flex-col items-center justify-center gap-1 relative overflow-hidden`}
        style={{
          background: isMe
            ? 'var(--gradient-brand)'
            : `linear-gradient(135deg, ${meta.color}22, ${meta.color}11)`,
          border: `1px solid ${meta.color}44`,
          boxShadow: isMe ? `0 0 20px ${meta.glow}` : `0 0 12px ${meta.glow}`,
        }}
      >
        <span className="text-2xl font-black" style={{ color: meta.color }}>#{entry.rank}</span>
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#4ade80' }}>
          <Zap size={10} />{entry.total_xp_earned.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// ─── Rank Row ──────────────────────────────────────────────────────

function RankRow({ entry, isMe }) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.005]"
      style={{
        background: isMe ? 'rgba(67,97,255,0.08)' : 'var(--color-surface-800)',
        border: `1px solid ${isMe ? 'rgba(67,97,255,0.3)' : 'var(--color-border)'}`,
        boxShadow: isMe ? '0 0 16px rgba(67,97,255,0.15)' : 'none',
      }}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {entry.rank <= 3
          ? <span className="text-lg">{['👑', '🥈', '🥉'][entry.rank - 1]}</span>
          : <span className="text-sm font-bold text-slate-400">#{entry.rank}</span>}
      </div>

      {/* Avatar */}
      <Avatar name={entry.full_name || entry.username} avatar={entry.avatar_url} size={38} />

      {/* Name + stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-100 truncate">
            {entry.full_name || entry.username}
          </p>
          {isMe && (
            <span className="badge badge-brand text-xs">You</span>
          )}
          <span className="badge text-xs" style={{ background: 'rgba(67,97,255,0.1)', color: '#6b8eff', border: '1px solid rgba(67,97,255,0.2)' }}>
            Lv.{entry.level}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Trophy size={10} style={{ color: '#fbbf24' }} />{entry.achievement_count}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Flame size={10} style={{ color: '#f87171' }} />{entry.streak_days}d
          </span>
        </div>
      </div>

      {/* XP */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
          {entry.total_xp_earned.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500">XP</p>
      </div>
    </div>
  )
}

// ─── Leaderboard Page ──────────────────────────────────────────────

export default function LeaderboardPage() {
  const user = useAuthStore(s => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await missionsApi.getLeaderboard(50)
      return data
    },
    staleTime: 60_000,
  })

  const top3 = data?.entries?.slice(0, 3) || []
  const rest = data?.entries?.slice(3) || []

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-lg">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mb-8 page-enter">
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--color-surface-800) 0%, var(--color-surface-700) 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-2xl" style={{ background: '#fbbf24' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} style={{ color: '#fbbf24' }} />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Hall of Fame</span>
              </div>
              <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                <span className="gradient-text">Leaderboard</span>
              </h1>
              <p className="text-slate-400 mb-3">Top Evolvers ranked by total XP earned.</p>
              {data?.my_rank && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(67,97,255,0.12)', border: '1px solid rgba(67,97,255,0.25)' }}
                >
                  <TrendingUp size={15} style={{ color: '#6b8eff' }} />
                  <span className="text-sm font-semibold text-slate-200">
                    Your rank: <span style={{ color: '#6b8eff' }}>#{data.my_rank}</span>
                    {' '}of {data.total_players?.toLocaleString()} players
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Podium ─────────────────────────────────────────── */}
        {isLoading ? (
          <Skeleton className="h-56 mb-8" />
        ) : top3.length > 0 ? (
          <section className="mb-8 page-enter">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Crown size={15} style={{ color: '#fbbf24' }} /> Top Champions
            </h2>
            <div
              className="rounded-2xl p-6 flex items-end justify-center gap-4"
              style={{
                background: 'var(--color-surface-800)',
                border: '1px solid var(--color-border)',
                minHeight: 200,
              }}
            >
              {top3.map(e => (
                <PodiumCard key={e.username} entry={e} isMe={e.username === user?.username} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Rankings ──────────────────────────────────────── */}
        <section className="page-enter">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Star size={15} style={{ color: '#6b8eff' }} /> Rankings
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : data?.entries?.length === 0 ? (
            <div className="card text-center py-16">
              <Trophy size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No players on the leaderboard yet. Complete missions to earn XP!</p>
            </div>
          ) : (
            <>
              {/* Top 3 in list too */}
              <div className="space-y-2 mb-3">
                {top3.map(e => (
                  <RankRow key={e.username} entry={e} isMe={e.username === user?.username} />
                ))}
              </div>

              {rest.length > 0 && (
                <>
                  <div className="h-px mb-3" style={{ background: 'var(--color-border)' }} />
                  <div className="space-y-2">
                    {rest.map(e => (
                      <RankRow key={e.username} entry={e} isMe={e.username === user?.username} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
