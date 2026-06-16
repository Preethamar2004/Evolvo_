import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, Zap, Send, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/services/apiServices'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setSubmitted(true)
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-surface-950)' }}>
        <div className="glass rounded-2xl p-10 text-center max-w-md w-full page-enter">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(67, 97, 255, 0.1)', border: '1px solid rgba(67, 97, 255, 0.3)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-brand-400)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check your inbox</h2>
          <p className="text-slate-400 mb-2">
            We sent a password reset link to
          </p>
          <p className="font-semibold text-slate-200 mb-6">{getValues('email')}</p>
          <p className="text-xs text-slate-500 mb-6">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button className="underline" style={{ color: 'var(--color-brand-400)' }} onClick={() => setSubmitted(false)}>
              try again
            </button>
          </p>
          <Link to="/login" className="btn btn-secondary w-full">
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-glow), var(--color-surface-950)' }}>
      <div className="w-full max-w-md page-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--gradient-brand)' }}>
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Forgot Password?</h1>
          <p className="mt-2 text-slate-400">No worries — we&apos;ll send you a reset link</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  id="forgot-email"
                  type="email"
                  className={`form-input pl-10 ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
              id="forgot-submit-btn"
            >
              {isLoading ? <span className="spinner" /> : <Send size={18} />}
              {isLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
