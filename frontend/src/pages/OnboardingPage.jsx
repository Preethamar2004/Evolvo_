import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ArrowRight, ArrowLeft, Zap, Sparkles, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingApi } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'

// ─── Question definitions ─────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'hobbies',
    step: 1,
    icon: '🎨',
    title: 'What are your hobbies?',
    subtitle: 'Things you love doing in your free time',
    color: '#6b8eff',
    placeholder: 'e.g. Painting, Cooking, Blogging…',
    suggestions: ['Reading', 'Photography', 'Cooking', 'Gaming', 'Drawing', 'Music', 'Writing', 'Hiking', 'Dancing', 'Gardening'],
  },
  {
    id: 'interests',
    step: 2,
    icon: '🔭',
    title: 'What are your interests?',
    subtitle: 'Topics and subjects you are passionate about',
    color: '#a855f7',
    placeholder: 'e.g. AI, Space, History…',
    suggestions: ['Technology', 'Science', 'Philosophy', 'Psychology', 'Business', 'Art', 'Health', 'Finance', 'Politics', 'Travel'],
  },
  {
    id: 'sports',
    step: 3,
    icon: '⚽',
    title: 'What sports do you enjoy?',
    subtitle: 'Physical activities you love or want to try',
    color: '#22c55e',
    placeholder: 'e.g. Football, Swimming, Yoga…',
    suggestions: ['Football', 'Basketball', 'Tennis', 'Swimming', 'Running', 'Yoga', 'Cycling', 'Gym', 'Cricket', 'Martial Arts'],
  },
  {
    id: 'movies',
    step: 4,
    icon: '🎬',
    title: 'What movies do you enjoy?',
    subtitle: 'Genres or specific films you love',
    color: '#f59e0b',
    placeholder: 'e.g. Sci-Fi, Thrillers, Documentaries…',
    suggestions: ['Sci-Fi', 'Action', 'Drama', 'Comedy', 'Documentaries', 'Horror', 'Fantasy', 'Anime', 'Thriller', 'Biography'],
  },
  {
    id: 'games',
    step: 5,
    icon: '🎮',
    title: 'What games do you enjoy?',
    subtitle: 'Video games, board games, or any type of games',
    color: '#ec4899',
    placeholder: 'e.g. Strategy, FPS, Chess…',
    suggestions: ['Strategy', 'RPG', 'FPS', 'Puzzle', 'Sports games', 'Chess', 'Card games', 'Simulation', 'Adventure', 'MOBA'],
  },
  {
    id: 'skills_to_learn',
    step: 6,
    icon: '🛠️',
    title: 'What skills do you want to learn?',
    subtitle: 'Abilities you want to develop or master',
    color: '#06b6d4',
    placeholder: 'e.g. Python, Guitar, Public Speaking…',
    suggestions: ['Python', 'Design', 'Marketing', 'Leadership', 'Public Speaking', 'Machine Learning', 'Investing', 'Writing', 'Video Editing', 'Photography'],
  },
  {
    id: 'career_goals',
    step: 7,
    icon: '💼',
    title: 'What career do you want?',
    subtitle: 'Your professional aspirations and dream roles',
    color: '#8b5cf6',
    placeholder: 'e.g. Software Engineer, Entrepreneur…',
    suggestions: ['Software Engineer', 'Entrepreneur', 'Designer', 'Data Scientist', 'Doctor', 'Teacher', 'Artist', 'Manager', 'Researcher', 'Lawyer'],
  },
  {
    id: 'personal_goals',
    step: 8,
    icon: '🎯',
    title: 'What are your personal goals?',
    subtitle: 'Life milestones you want to achieve',
    color: '#f43f5e',
    placeholder: 'e.g. Travel the world, Write a book…',
    suggestions: ['Travel the world', 'Build a business', 'Get fit', 'Learn a language', 'Write a book', 'Buy a house', 'Run a marathon', 'Start a family', 'Volunteer', 'Save money'],
  },
  {
    id: 'strengths',
    step: 9,
    icon: '💪',
    title: 'What are your strengths?',
    subtitle: 'Things you naturally excel at',
    color: '#10b981',
    placeholder: 'e.g. Problem Solving, Empathy…',
    suggestions: ['Problem Solving', 'Creativity', 'Empathy', 'Leadership', 'Communication', 'Persistence', 'Adaptability', 'Teamwork', 'Analytical thinking', 'Resilience'],
  },
  {
    id: 'areas_to_improve',
    step: 10,
    icon: '🌱',
    title: 'What areas do you want to improve?',
    subtitle: 'Honest self-assessment of your growth areas',
    color: '#f97316',
    placeholder: 'e.g. Focus, Confidence, Time management…',
    suggestions: ['Focus', 'Confidence', 'Time Management', 'Discipline', 'Patience', 'Social skills', 'Emotional intelligence', 'Productivity', 'Stress management', 'Decision-making'],
  },
]

// ─── Tag Input Component ──────────────────────────────────────────
function TagInput({ value = [], onChange, placeholder, color, suggestions }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const add = useCallback((tag) => {
    const trimmed = (typeof tag === 'string' ? tag : input).trim()
    if (trimmed && !value.includes(trimmed) && value.length < 8) {
      onChange([...value, trimmed])
    }
    setInput('')
    setShowSuggestions(false)
  }, [input, value, onChange])

  const remove = (tag) => onChange(value.filter((t) => t !== tag))

  const filteredSuggestions = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            className="form-input flex-1"
            placeholder={placeholder}
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          <button
            type="button"
            className="btn flex-shrink-0 text-white"
            style={{ background: color, padding: '0 1rem' }}
            onClick={add}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-10 top-full mt-1 left-0 right-0 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}
            >
              {filteredSuggestions.slice(0, 5).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseDown={() => add(s)}
                >
                  <span style={{ color }}>+ </span>{s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick suggestion pills */}
      <div className="flex flex-wrap gap-2">
        {suggestions.filter((s) => !value.includes(s)).slice(0, 6).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            + {s}
          </button>
        ))}
      </div>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
            >
              {tag}
              <button type="button" onClick={() => remove(tag)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">{value.length}/8 added • Press Enter or click + to add</p>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────
function StepProgress({ current, total }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span>Question {current} of {total}</span>
        <span>{Math.round((current / total) * 100)}% complete</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-700)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-brand)' }}
          initial={{ width: 0 }}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {/* Step dots */}
      <div className="flex gap-1 mt-3 justify-center">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i + 1 === current ? 24 : 8,
              height: 8,
              background: i + 1 <= current ? 'var(--color-brand-500)' : 'var(--color-surface-600)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Analyzing Screen ─────────────────────────────────────────────
function AnalyzingScreen() {
  const steps = [
    'Processing your answers…',
    'Mapping personality dimensions…',
    'Calculating your scores…',
    'Identifying growth opportunities…',
    'Crafting your profile…',
  ]
  const [stepIdx, setStepIdx] = useState(0)

  useState(() => {
    const interval = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length)
    }, 1200)
    return () => clearInterval(interval)
  })

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Pulsing orb */}
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full animate-pulse" style={{ background: 'var(--gradient-brand)', opacity: 0.3, position: 'absolute', inset: -12 }} />
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
          <Sparkles className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        AI is analyzing you…
      </h2>
      <p className="text-slate-400 mb-8">Google Gemini is generating your unique personality profile</p>

      <AnimatePresence mode="wait">
        <motion.p
          key={stepIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-sm font-medium"
          style={{ color: 'var(--color-brand-400)' }}
        >
          {steps[stepIdx]}
        </motion.p>
      </AnimatePresence>

      <div className="flex gap-2 mt-6">
        {[0.1, 0.2, 0.3].map((d, i) => (
          <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-brand-400)', animationDelay: `${d}s` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Onboarding Page ─────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const refreshUser = useAuthStore((s) => s.refreshUser)

  const [currentStep, setCurrentStep] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [answers, setAnswers] = useState(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, []]))
  )

  const q = QUESTIONS[currentStep]
  const isLast = currentStep === QUESTIONS.length - 1
  const canProceed = answers[q.id].length > 0

  const updateAnswer = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  const next = () => {
    if (!canProceed) {
      toast.error('Please add at least one answer before continuing')
      return
    }
    if (isLast) { handleSubmit(); return }
    setCurrentStep((s) => s + 1)
  }

  const back = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    setIsAnalyzing(true)
    try {
      await onboardingApi.submit(answers)
      await refreshUser()
      toast.success('Your personality profile is ready! 🚀')
      navigate('/personality', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed. Please try again.')
      setIsAnalyzing(false)
    }
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-surface-950)' }}>
        <div className="w-full max-w-md">
          <AnalyzingScreen />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-10" style={{ background: 'var(--gradient-glow), var(--color-surface-950)' }}>
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl transition-colors duration-700" style={{ background: q.color }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl" style={{ background: 'var(--color-accent-600)' }} />
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold gradient-text text-lg" style={{ fontFamily: 'var(--font-display)' }}>Evolvo</span>
          </div>
          <p className="text-sm text-slate-400">Personality Discovery · Powered by Google Gemini AI</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <StepProgress current={currentStep + 1} total={QUESTIONS.length} />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glass rounded-2xl p-8 mb-6"
          >
            {/* Question header */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${q.color}20`, border: `1px solid ${q.color}40` }}
              >
                {q.icon}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: q.color }}>
                  Question {q.step}
                </div>
                <h2 className="text-xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
                  {q.title}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">{q.subtitle}</p>
              </div>
            </div>

            {/* Tag input */}
            <TagInput
              value={answers[q.id]}
              onChange={(val) => updateAnswer(q.id, val)}
              placeholder={q.placeholder}
              color={q.color}
              suggestions={q.suggestions}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={back}
            disabled={currentStep === 0}
            className="btn btn-secondary flex-shrink-0"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex-1 text-center text-xs text-slate-500">
            {QUESTIONS.slice(0, currentStep).filter((q2) => answers[q2.id].length > 0).length}/{QUESTIONS.length} answered
          </div>

          <button
            onClick={next}
            className="btn flex-shrink-0 text-white"
            style={{ background: canProceed ? q.color : 'var(--color-surface-600)', cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            {isLast ? (
              <><Sparkles size={16} /> Analyze Me</>
            ) : (
              <>Next <ArrowRight size={16} /></>
            )}
          </button>
        </div>

        {/* Skip hint */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Your answers are private and used only to generate your personality profile.
        </p>
      </div>
    </div>
  )
}
