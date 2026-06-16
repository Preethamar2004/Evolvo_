import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, User, Target, Trophy, Settings,
  Zap, LogOut, Menu, X, ChevronRight, Flame, Sparkles, BarChart2, MessageSquare, Users, Shield, Gamepad2, Activity
} from 'lucide-react'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/entertainment',icon: Gamepad2,       label: 'Entertainment'},
  { to: '/future-self', icon: Sparkles,        label: 'Future Self' },
  { to: '/analytics',   icon: Activity,        label: 'Analytics'   },
  { to: '/personality', icon: Target,          label: 'Personality' },
  { to: '/mentor',      icon: MessageSquare,   label: 'AI Mentor'   },
  { to: '/social',      icon: Users,           label: 'Social Feed' },
  { to: '/guilds',      icon: Shield,          label: 'Guilds'      },
  { to: '/profile',     icon: User,            label: 'Profile'     },
  { to: '/missions',    icon: Flame,           label: 'Missions'    },
  { to: '/achievements',icon: Trophy,          label: 'Achievements'},
  { to: '/leaderboard', icon: BarChart2,       label: 'Leaderboard' },
  { to: '/settings',    icon: Settings,        label: 'Settings'    },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const profile = user?.profile
  const username = user?.username || 'User'
  const displayName = profile?.full_name || username
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-brand)' }}>
          <Zap size={18} className="text-white" />
        </div>
        <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>Evolvo</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )
            }
            style={({ isActive }) => isActive ? { background: 'var(--gradient-brand)', boxShadow: '0 4px 12px rgba(67,97,255,0.3)' } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        {/* User card */}
        <NavLink to="/profile" className="flex items-center gap-3 p-2.5 rounded-xl mb-2 transition-all hover:text-white" style={{ background: 'var(--color-surface-700)' }} onClick={() => setOpen(false)}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden" style={{ background: 'var(--gradient-brand)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">@{username}</p>
          </div>
        </NavLink>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn btn-ghost w-full justify-start text-sm px-3 py-2"
          id="sidebar-logout-btn"
        >
          <LogOut size={16} className="text-slate-500" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl"
        style={{ background: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        {open ? <X size={20} className="text-slate-300" /> : <Menu size={20} className="text-slate-300" />}
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 z-40 transition-transform duration-300',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--color-surface-900)', borderRight: '1px solid var(--color-border)' }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
