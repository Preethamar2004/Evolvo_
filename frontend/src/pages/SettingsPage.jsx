import { useState } from 'react'
import { Settings, Lock, Bell, Palette, LogOut, Shield, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Sidebar from '@/components/layout/Sidebar'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/services/apiServices'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Toggles state
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(true)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      setIsChangingPassword(true)
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to change password'
      toast.error(msg)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    toast.success('Logged out successfully')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-screen-md mx-auto w-full page-enter">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <Settings className="text-brand-400" size={28} />
            Settings
          </h1>
          <p className="text-slate-400">Manage your account, security, and preferences.</p>
        </header>

        <div className="space-y-8 pb-12">
          
          {/* SECURITY SECTION */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Security</h2>
                <p className="text-sm text-slate-400">Update your password to keep your account secure.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isChangingPassword || !currentPassword || !newPassword}
                className="btn-primary w-full justify-center mt-2"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>

          {/* NOTIFICATIONS SECTION */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Notifications</h2>
                <p className="text-sm text-slate-400">Choose what you want to be notified about.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div>
                  <h4 className="font-medium text-slate-200">Email Notifications</h4>
                  <p className="text-xs text-slate-400 mt-1">Receive updates about missions and guilds</p>
                </div>
                <button 
                  onClick={() => setEmailNotifs(!emailNotifs)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifs ? 'bg-brand-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${emailNotifs ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div>
                  <h4 className="font-medium text-slate-200">Push Notifications</h4>
                  <p className="text-xs text-slate-400 mt-1">Get instant alerts in your browser</p>
                </div>
                <button 
                  onClick={() => setPushNotifs(!pushNotifs)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${pushNotifs ? 'bg-brand-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${pushNotifs ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div>
                  <h4 className="font-medium text-slate-200">Weekly Progress Report</h4>
                  <p className="text-xs text-slate-400 mt-1">A summary of your stats sent every Sunday</p>
                </div>
                <button 
                  onClick={() => setWeeklyReport(!weeklyReport)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${weeklyReport ? 'bg-brand-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${weeklyReport ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* APPEARANCE SECTION */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Appearance</h2>
                <p className="text-sm text-slate-400">Customize how Evolvo looks on your device.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => document.documentElement.classList.remove('theme-light')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-brand-500 bg-slate-800/50 relative overflow-hidden group hover:border-brand-400 transition-colors"
              >
                <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-12 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg">
                  <div className="w-8 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                </div>
                <span className="font-medium text-brand-400 relative z-10">Dark Mode</span>
              </button>
              
              <button 
                onClick={() => document.documentElement.classList.add('theme-light')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-700/50 bg-slate-800/50 hover:border-brand-500 transition-colors"
              >
                <div className="w-16 h-12 rounded bg-slate-100 border border-slate-300 flex items-center justify-center">
                  <div className="w-8 h-2 rounded-full bg-brand-500" />
                </div>
                <span className="font-medium text-slate-400">Light Mode</span>
              </button>
            </div>
          </section>

          {/* ACCOUNT ACTIONS */}
          <section className="card border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-400">Account Actions</h2>
                <p className="text-sm text-red-400/70">Manage your active sessions or sign out.</p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
              >
                <div className="flex items-center gap-3 font-medium">
                  <LogOut size={18} />
                  Sign Out on This Device
                </div>
                <ChevronRight size={18} />
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
