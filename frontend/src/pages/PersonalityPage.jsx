import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RefreshCw, Brain, Zap, Dumbbell, Palette, Crown,
  MessageSquare, Users, TrendingUp, Target, Star,
  AlertTriangle, Lightbulb, Flame, ChevronRight, Lock, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingApi } from '@/services/apiServices'
import Sidebar from '@/components/layout/Sidebar'

// ─── Score definitions ────────────────────────────────────────────
const SCORE_CONFIG = [
  { key: 'knowledge_score',     label: 'Knowledge',     icon: Brain,        color: '#6b8eff', bg: 'rgba(107,142,255,0.12)' },
  { key: 'fitness_score',       label: 'Fitness',       icon: Dumbbell,     color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  { key: 'creativity_score',    label: 'Creativity',    icon: Palette,      color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  { key: 'leadership_score',    label: 'Leadership',    icon: Crown,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { key: 'communication_score', label: 'Communication', icon: MessageSquare,color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  { key: 'social_score',        label: 'Social',        icon: Users,        color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
]

// ─── Animated Circular Score ──────────────────────────────────────
function CircularScore({ score, label, icon: Icon, color, bg, delay = 0 }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: 'backOut' }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          {/* Progress */}
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: delay + 0.2, duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-0.5" style={{ background: bg }}>
            <Icon size={18} style={{ color }} />
          </div>
          <span className="text-lg font-bold text-slate-100">{score}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
    </motion.div>
  )
}

// ─── Radar Chart (SVG) ────────────────────────────────────────────
function RadarChart({ scores }) {
  const size = 260
  const center = size / 2
  const maxR = 100
  const labels = ['Knowledge', 'Fitness', 'Creativity', 'Leadership', 'Communication', 'Social']
  const values = [
    scores.knowledge_score,
    scores.fitness_score,
    scores.creativity_score,
    scores.leadership_score,
    scores.communication_score,
    scores.social_score,
  ]
  const n = labels.length

  const toXY = (idx, val) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2
    const r = (val / 100) * maxR
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  const axisPoints = labels.map((_, i) => toXY(i, 100))
  const dataPoints = values.map((v, i) => toXY(i, v))
  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  // Grid rings
  const rings = [20, 40, 60, 80, 100]

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((r) => {
          const pts = Array.from({ length: n }, (_, i) => toXY(i, r))
          return (
            <polygon
              key={r}
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          )
        })}

        {/* Axis lines */}
        {axisPoints.map((p, i) => (
          <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}

        {/* Data polygon */}
        <motion.polygon
          points={polygon}
          fill="rgba(67,97,255,0.2)"
          stroke="#4361ff"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(67,97,255,0.4))' }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          style={{ transformOrigin: `${center}px ${center}px`, filter: 'drop-shadow(0 0 8px rgba(67,97,255,0.4))' }}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={SCORE_CONFIG[i].color} style={{ filter: `drop-shadow(0 0 4px ${SCORE_CONFIG[i].color})` }} />
        ))}

        {/* Labels */}
        {axisPoints.map((p, i) => {
          const labelX = center + (maxR + 20) * Math.cos((Math.PI * 2 * i) / n - Math.PI / 2)
          const labelY = center + (maxR + 20) * Math.sin((Math.PI * 2 * i) / n - Math.PI / 2)
          return (
            <text key={i} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill={SCORE_CONFIG[i].color} fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">
              {labels[i]}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Section tag list ─────────────────────────────────────────────
function TagList({ items, color }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map((item, i) => (
        <motion.span
          key={item}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="text-sm px-3 py-1.5 rounded-full font-medium"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
        >
          {item}
        </motion.span>
      ))}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────
function InsightCard({ icon: Icon, title, color, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <h3 className="font-bold text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`rounded-xl animate-pulse ${className}`} style={{ background: 'var(--color-surface-700)' }} />
}

// ─── Main Page ────────────────────────────────────────────────────
export default function PersonalityPage() {
  const qc = useQueryClient()

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['personality-profile'],
    queryFn: async () => {
      const { data } = await onboardingApi.getProfile()
      return data
    },
    staleTime: 5 * 60_000,
    retry: false,
  })

  const regenerateMutation = useMutation({
    mutationFn: () => onboardingApi.regenerate(),
    onSuccess: () => {
      qc.invalidateQueries(['personality-profile'])
      toast.success('Profile regenerated! ✨')
    },
    onError: () => toast.error('Regeneration failed. Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
        <Sidebar />
        <main className="flex-1 ml-0 lg:ml-64 p-6 space-y-6">
          <Skeleton className="h-52 w-full" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </main>
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
        <Sidebar />
        <main className="flex-1 ml-0 lg:ml-64 p-6 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <Lock size={48} className="mx-auto mb-4 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-200 mb-2">No Profile Yet</h2>
            <p className="text-slate-400 mb-6">Complete onboarding to generate your AI personality profile.</p>
            <a href="/onboarding" className="btn btn-primary">Start Onboarding</a>
          </div>
        </main>
      </div>
    )
  }

  const s = profile.scores

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-xl">

        {/* ── Hero Banner ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #131920 0%, #1a2230 100%)', border: '1px solid var(--color-border)' }}
        >
          {/* Glow blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: '#4361ff' }} />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: '#a855f7' }} />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Emoji avatar */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: 'var(--gradient-brand)', boxShadow: '0 8px 32px rgba(67,97,255,0.4)' }}>
              {profile.personality_emoji || '⚡'}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="badge badge-brand">
                  <Sparkles size={11} /> AI Generated
                </span>
                {profile.archetype_tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="badge badge-purple">{tag}</span>
                ))}
              </div>
              <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                <span className="gradient-text">{profile.personality_type || 'Your Personality'}</span>
              </h1>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{profile.personality_summary}</p>

              {/* Motivation badge */}
              {profile.motivation_style && (
                <div className="flex items-center gap-2 mt-4">
                  <Flame size={16} style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-semibold text-slate-200">{profile.motivation_style}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-sm text-slate-400">{profile.motivation_description}</span>
                </div>
              )}
            </div>

            {/* Regenerate */}
            <button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="btn btn-secondary flex-shrink-0"
              title="Regenerate personality profile"
            >
              <RefreshCw size={15} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
              {regenerateMutation.isPending ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </motion.section>

        {/* ── Scores Grid ──────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-2">
            <Star size={18} style={{ color: 'var(--color-brand-400)' }} />
            Personality Scores
          </h2>

          <div className="card">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Circular scores */}
              <div className="grid grid-cols-3 gap-6 justify-items-center">
                {SCORE_CONFIG.map((cfg, i) => (
                  <CircularScore
                    key={cfg.key}
                    score={s[cfg.key]}
                    label={cfg.label}
                    icon={cfg.icon}
                    color={cfg.color}
                    bg={cfg.bg}
                    delay={i * 0.08}
                  />
                ))}
              </div>

              {/* Radar chart */}
              <div>
                <RadarChart scores={s} />
                <p className="text-center text-xs text-slate-500 mt-2">Personality Radar</p>
              </div>
            </div>

            {/* Score bars */}
            <div className="mt-8 space-y-3 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {SCORE_CONFIG.map((cfg, i) => (
                <div key={cfg.key} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-medium text-slate-400 text-right flex-shrink-0">{cfg.label}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-700)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}60` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${s[cfg.key]}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-8 text-xs font-bold flex-shrink-0" style={{ color: cfg.color }}>{s[cfg.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Insights Grid ────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <InsightCard icon={TrendingUp} title="Identified Strengths" color="#22c55e" delay={0.1}>
            <div className="space-y-2">
              {profile.identified_strengths?.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(34,197,94,0.15)' }}>
                    <span style={{ color: '#22c55e', fontSize: 10 }}>✓</span>
                  </div>
                  {s}
                </div>
              ))}
            </div>
          </InsightCard>

          <InsightCard icon={AlertTriangle} title="Areas for Growth" color="#f59e0b" delay={0.15}>
            <div className="space-y-2">
              {profile.identified_weaknesses?.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <span style={{ color: '#f59e0b', fontSize: 10 }}>!</span>
                  </div>
                  {w}
                </div>
              ))}
            </div>
          </InsightCard>

          <InsightCard icon={Lightbulb} title="Growth Opportunities" color="#a855f7" delay={0.2}>
            <div className="space-y-2">
              {profile.growth_opportunities?.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <ChevronRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#a855f7' }} />
                  {g}
                </div>
              ))}
            </div>
          </InsightCard>

          <InsightCard icon={Target} title="Recommended Missions" color="#6b8eff" delay={0.25}>
            <div className="space-y-2">
              {profile.recommended_missions?.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: 'rgba(107,142,255,0.15)', color: '#6b8eff' }}>
                    {i + 1}
                  </div>
                  {m}
                </div>
              ))}
            </div>
          </InsightCard>
        </section>

        {/* ── Recommended Skills & Archetypes ──────────────────── */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-bold text-slate-100 mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Zap size={16} style={{ color: 'var(--color-brand-400)' }} /> Skills to Learn
            </h3>
            <p className="text-xs text-slate-500 mb-3">Recommended based on your profile</p>
            <TagList items={profile.recommended_skills || []} color="var(--color-brand-400)" />
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-100 mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Star size={16} style={{ color: 'var(--color-gold-400)' }} /> Your Archetypes
            </h3>
            <p className="text-xs text-slate-500 mb-3">Personality archetypes that define you</p>
            <TagList items={profile.archetype_tags || []} color="var(--color-gold-400)" />
          </div>
        </section>
      </main>
    </div>
  )
}
