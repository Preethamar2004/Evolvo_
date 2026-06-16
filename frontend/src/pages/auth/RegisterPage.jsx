import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Zap, UserPlus, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be under 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, underscores, and hyphens only'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const requirements = [
  { label: 'At least 8 characters', test: (v) => v?.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [registered, setRegistered] = useState(false)
  const navigate = useNavigate()
  const { register: registerUser, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const passwordValue = watch('password', '')

  const onSubmit = async (data) => {
    const { confirmPassword, ...payload } = data
    const result = await registerUser(payload)
    if (result.success) {
      setRegistered(true)
      toast.success('Account created! Please sign in.')
    } else {
      toast.error(result.error || 'Registration failed')
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-surface-950)' }}>
        <div className="glass rounded-2xl p-10 text-center max-w-md w-full page-enter">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-xp-400)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">You&apos;re in!</h2>
          <p className="text-slate-400 mb-6">Your Evolvo account has been created successfully.</p>
          <button className="btn btn-primary w-full" onClick={() => navigate('/login')}>
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-glow), var(--color-surface-950)' }}>
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--color-accent-600)' }} />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--color-brand-600)' }} />
      </div>

      <div className="w-full max-w-md page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--gradient-brand)' }}>
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Join <span className="gradient-text">Evolvo</span>
          </h1>
          <p className="mt-2 text-slate-400">Start your personal evolution today</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-fullname">Full Name</label>
              <input
                id="reg-fullname"
                type="text"
                className={`form-input ${errors.full_name ? 'error' : ''}`}
                placeholder="John Doe"
                {...register('full_name')}
              />
              {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                <input
                  id="reg-username"
                  type="text"
                  className={`form-input pl-8 ${errors.username ? 'error' : ''}`}
                  placeholder="evolvouser"
                  {...register('username')}
                />
              </div>
              {errors.username && <p className="form-error">{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input pr-12 ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password requirements */}
              <div className="mt-2 space-y-1">
                {requirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-2 text-xs" style={{ color: req.test(passwordValue) ? 'var(--color-xp-400)' : '#475569' }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${req.test(passwordValue) ? '' : 'bg-slate-600'}`} style={req.test(passwordValue) ? { background: 'var(--color-xp-500)' } : {}} />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`form-input pr-12 ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={isLoading}
              id="register-submit-btn"
            >
              {isLoading ? <span className="spinner" /> : <UserPlus size={18} />}
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="divider mt-6 mb-4">or</div>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--color-brand-400)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
