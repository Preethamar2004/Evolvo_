import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Star, Zap, Lock, Crown, Shield, Flame,
  Target, TrendingUp, Sparkles, CheckCircle2, Filter
} from 'lucide-react'
import { missionsApi } from '@/services/apiServices'
import Sidebar from '@/components/layout/Sidebar'

// ─── Rarity Config ─────────────────────────────────────────────────

const RARITY_META = {
  common:    { label: 'Common',    color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', gradient: 'linear-gradient(135deg, #374151, #1f2937)' },
  rare:      { label: 'Rare',      color: '#6b8eff', glow: 'rgba(107,142,255,0.4)', gradient: 'linear-gradient(135deg, #1e3a8a, #1e1b4b)' },
  epic:      { label: 'Epic',      color: '#c084fc', glow: 'rgba(192,132,252,0.4)', gradient: 'linear-gradient(135deg, #4c1d95, #2e1065)' },
  legendary: { label: 'Legendary', color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', gradient: 'linear-gradient(135deg, #78350f, #451a03)' },
}

// ─── Helpers ──────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'var(--color-surface-700)' }}
    />
  )
}

// ─── Achievement Badge Card ─────────────────────────────────────────

function AchievementCard({ ach }) {
  const meta = RARITY_META[ach.rarity] || RARITY_META.common
  const badgeColor = ach.badge_color || meta.color

  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300"
      style={{
        background: ach.is_earned
          ? meta.gradient
          : 'var(--color-surface-800)',
        border: `1px solid ${ach.is_earned ? `${badgeColor}50` : 'var(--color-border)'}`,
        boxShadow: ach.is_earned ? `0 0 20px ${meta.glow}` : 'none',
        opacity: ach.is_earned ? 1 : 0.65,
      }}
    >
      {/* Glow pulse for earned */}
      {ach.is_earned && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${badgeColor}15 0%, transparent 70%)` }}
        />
      )}

      <div className="relative">
        {/* Icon + Lock */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{
              background: ach.is_earned ? `${badgeColor}25` : 'var(--color-surface-700)',
              border: `2px solid ${ach.is_earned ? `${badgeColor}60` : 'rgba(255,255,255,0.05)'}`,
              boxShadow: ach.is_earned ? `0 0 12px ${badgeColor}40` : 'none',
            }}
          >
            {ach.is_earned ? ach.icon || '🏆' : <Lock size={20} className="text-slate-600" />}
          </div>

          {/* Rarity badge */}
          <span
            className="badge text-xs"
            style={{
              background: `${badgeColor}18`,
              color: badgeColor,
              border: `1px solid ${badgeColor}33`,
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm mb-1" style={{ color: ach.is_earned ? '#f1f5f9' : '#64748b' }}>
          {ach.title}
        </h3>

        {/* Description */}
        <p className="text-xs mb-3 line-clamp-2" style={{ color: ach.is_earned ? '#94a3b8' : '#475569' }}>
          {ach.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {ach.xp_reward > 0 ? (
            <div
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: ach.is_earned ? '#4ade80' : '#374151' }}
            >
              <Zap size={11} />
              +{ach.xp_reward} XP
            </div>
          ) : <div />}

          {ach.is_earned ? (
            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: badgeColor }}>
              <CheckCircle2 size={12} />
              {ach.earned_at ? new Date(ach.earned_at).toLocaleDateString() : 'Earned'}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Lock size={11} /> Locked
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Stats Banner ──────────────────────────────────────────────────

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

// ─── Achievements Page ─────────────────────────────────────────────

export default function AchievementsPage() {
  const [filter, setFilter] = useState('all') // all / earned / locked / rarity
  const [rarityFilter, setRarityFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data } = await missionsApi.getAchievements()
      return data
    },
    staleTime: 30_000,
  })

  // Combined & filtered list
  const allAchs = data ? [...data.earned, ...data.locked] : []
  const displayed = allAchs.filter(a => {
    if (filter === 'earned' && !a.is_earned) return false
    if (filter === 'locked' && a.is_earned) return false
    if (rarityFilter && a.rarity !== rarityFilter) return false
    return true
  })

  // Rarity breakdown
  const breakdown = ['common', 'rare', 'epic', 'legendary'].map(r => ({
    rarity: r,
    earned: (data?.earned || []).filter(a => a.rarity === r).length,
    total: allAchs.filter(a => a.rarity === r).length,
  }))

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-xl">
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
            <div className="absolute bottom-0 right-1/4 w-32 h-32 rounded-full opacity-15 blur-2xl" style={{ background: '#c084fc' }} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} style={{ color: '#fbbf24' }} />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Trophy Room</span>
              </div>
              <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                <span className="gradient-text">Achievements</span>
              </h1>
              <p className="text-slate-400 mb-5">Unlock badges by completing missions, building streaks, and leveling up.</p>

              {/* Stats row */}
              {data && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatItem icon={Trophy} label="Total Earned" value={data.total_earned} color="#fbbf24" />
                  <StatItem icon={Zap} label="XP from Badges" value={`${data.total_xp_from_achievements.toLocaleString()}`} color="#4ade80" />
                  <StatItem icon={Shield} label="Total Available" value={allAchs.length} color="#6b8eff" />
                  <StatItem
                    icon={TrendingUp}
                    label="Completion"
                    value={allAchs.length > 0 ? `${Math.round((data.total_earned / allAchs.length) * 100)}%` : '0%'}
                    color="#c084fc"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Rarity Breakdown ────────────────────────────────── */}
        {!isLoading && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {breakdown.map(({ rarity, earned, total }) => {
              const meta = RARITY_META[rarity]
              return (
                <div
                  key={rarity}
                  className="rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: rarityFilter === rarity ? meta.gradient : 'var(--color-surface-800)',
                    border: `1px solid ${rarityFilter === rarity ? `${meta.color}50` : 'var(--color-border)'}`,
                    boxShadow: rarityFilter === rarity ? `0 0 12px ${meta.glow}` : 'none',
                  }}
                  onClick={() => setRarityFilter(f => f === rarity ? '' : rarity)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold capitalize" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-xs font-bold text-slate-200">{earned}/{total}</span>
                  </div>
                  <div className="xp-bar-track" style={{ height: '4px' }}>
                    <div
                      className="xp-bar-fill"
                      style={{ width: total > 0 ? `${(earned / total) * 100}%` : '0%', background: meta.color }}
                    />
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* ── Filter Bar ─────────────────────────────────────── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'all',    label: 'All',    count: allAchs.length },
            { id: 'earned', label: '✅ Earned', count: data?.total_earned || 0 },
            { id: 'locked', label: '🔒 Locked', count: data?.locked?.length || 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="btn btn-secondary text-xs py-1.5 px-4"
              style={
                filter === tab.id
                  ? { background: 'var(--gradient-brand)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(67,97,255,0.35)' }
                  : {}
              }
            >
              {tab.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full ml-1"
                style={
                  filter === tab.id
                    ? { background: 'rgba(255,255,255,0.2)' }
                    : { background: 'var(--color-surface-700)', color: '#64748b' }
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Grid ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-16">
            <Trophy size={48} className="mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Achievements Found</h3>
            <p className="text-slate-500">Complete missions and level up to unlock achievements!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 page-enter">
            {displayed.map(a => <AchievementCard key={a.id} ach={a} />)}
          </div>
        )}
      </main>
    </div>
  )
}
