import { Zap, Target, Trophy, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>Evolvo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn btn-ghost text-sm py-2 px-4">Sign In</Link>
            <Link to="/register" className="btn btn-primary text-sm py-2 px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--color-brand-600)' }} />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--color-accent-600)' }} />
        </div>
        <div className="max-w-4xl mx-auto relative page-enter">
          <div className="inline-flex items-center gap-2 badge badge-brand mb-6 py-1.5 px-4">
            <Zap size={13} />
            <span>Your Personal Evolution Platform</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Level Up Your
            <br />
            <span className="gradient-text">Real Life</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Evolvo gamifies your personal growth — track missions, earn XP, unlock achievements, and become the best version of yourself.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn btn-primary text-base py-3 px-8">
              Start Evolving <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary text-base py-3 px-8">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-display)' }}>
            Everything you need to <span className="gradient-text">grow</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'XP & Levels', desc: 'Earn experience points for completing missions and level up your profile.', color: 'var(--color-brand-400)' },
              { icon: Target, title: 'Missions', desc: 'Set meaningful goals and break them into trackable missions.', color: 'var(--color-accent-400)' },
              { icon: Trophy, title: 'Achievements', desc: 'Unlock badges for milestones and showcase your journey.', color: 'var(--color-gold-400)' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}1a`, border: `1px solid ${color}33` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-slate-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-slate-500 text-sm" style={{ borderColor: 'var(--color-border)' }}>
        © 2026 Evolvo · Built to accelerate human potential
      </footer>
    </div>
  )
}
