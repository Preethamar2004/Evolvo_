import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Camera, Save, X, Plus, User, Globe, BookOpen,
  Target, Heart, Wrench, MapPin, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import { profileApi } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'

const schema = z.object({
  full_name: z.string().optional(),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  age: z.coerce.number().min(13).max(120).optional().or(z.literal('')),
  country: z.string().optional(),
})

// ─── Tag Input ────────────────────────────────────────────────────
function TagInput({ label, icon: Icon, value = [], onChange, placeholder, color = 'var(--color-brand-400)' }) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  const remove = (tag) => onChange(value.filter((t) => t !== tag))

  return (
    <div className="form-group">
      <label className="form-label flex items-center gap-1.5">
        <Icon size={14} /> {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button type="button" className="btn btn-secondary flex-shrink-0" onClick={add}>
          <Plus size={16} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${color}1a`, color, border: `1px solid ${color}33` }}>
              {tag}
              <button type="button" onClick={() => remove(tag)} className="opacity-70 hover:opacity-100 ml-0.5">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Avatar Section ───────────────────────────────────────────────
function AvatarSection({ profile, onUpload }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    await onUpload(formData)
    setUploading(false)
  }

  return (
    <div className="flex items-center gap-5 mb-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ border: '2px solid var(--color-border)' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <User className="w-10 h-10 text-white" />
            </div>
          )}
        </div>
        <button
          type="button"
          className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ background: 'var(--gradient-brand)' }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Camera size={14} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <h3 className="font-semibold text-slate-100">Profile Photo</h3>
        <p className="text-sm text-slate-400">JPG, PNG or WebP · Max 5MB</p>
      </div>
    </div>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await profileApi.getProfile()
      return data
    },
  })

  // Tag states
  const [skills, setSkills] = useState([])
  const [interests, setInterests] = useState([])
  const [hobbies, setHobbies] = useState([])
  const [goals, setGoals] = useState([])

  // Init tags from fetched profile
  const [initialized, setInitialized] = useState(false)
  if (profile && !initialized) {
    setSkills(profile.skills || [])
    setInterests(profile.interests || [])
    setHobbies(profile.hobbies || [])
    setGoals(profile.goals || [])
    setInitialized(true)
  }

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    values: profile ? {
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      age: profile.age || '',
      country: profile.country || '',
    } : {},
  })

  const updateMutation = useMutation({
    mutationFn: (data) => profileApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated!')
      qc.invalidateQueries(['profile'])
      refreshUser()
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const avatarMutation = useMutation({
    mutationFn: (formData) => profileApi.uploadAvatar(formData),
    onSuccess: () => {
      toast.success('Avatar updated!')
      qc.invalidateQueries(['profile'])
    },
    onError: () => toast.error('Avatar upload failed'),
  })

  const onSubmit = (data) => {
    updateMutation.mutate({
      ...data,
      age: data.age ? Number(data.age) : null,
      skills, interests, hobbies, goals,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
        <Sidebar />
        <main className="flex-1 ml-0 lg:ml-64 p-6 flex items-center justify-center">
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-surface-950)' }}>
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 p-6 max-w-3xl">
        <div className="page-enter">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
              Edit Profile
            </h1>
            <p className="text-slate-400 mt-1">Make your Evolvo profile uniquely yours</p>
          </div>

          <div className="card">
            <AvatarSection profile={profile} onUpload={avatarMutation.mutate} />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Basic Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label flex items-center gap-1.5">
                    <User size={14} /> Full Name
                  </label>
                  <input type="text" className="form-input" placeholder="John Doe" {...register('full_name')} />
                  {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-1.5">
                    <Calendar size={14} /> Age
                  </label>
                  <input type="number" className="form-input" placeholder="25" min={13} max={120} {...register('age')} />
                  {errors.age && <p className="form-error">{errors.age.message}</p>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-1.5">
                  <MapPin size={14} /> Country
                </label>
                <input type="text" className="form-input" placeholder="e.g. India" {...register('country')} />
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-1.5">
                  <BookOpen size={14} /> Bio
                </label>
                <textarea
                  className="form-input resize-none"
                  placeholder="Tell the world about yourself…"
                  rows={3}
                  {...register('bio')}
                />
                {errors.bio && <p className="form-error">{errors.bio.message}</p>}
              </div>

              {/* Tag Inputs */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-semibold text-slate-200 mb-4">Your Profile Tags</h3>
                <div className="space-y-4">
                  <TagInput label="Skills" icon={Wrench} value={skills} onChange={setSkills} placeholder="e.g. Python, Design" color="var(--color-brand-400)" />
                  <TagInput label="Interests" icon={Heart} value={interests} onChange={setInterests} placeholder="e.g. AI, Music" color="var(--color-accent-400)" />
                  <TagInput label="Hobbies" icon={Globe} value={hobbies} onChange={setHobbies} placeholder="e.g. Reading, Gaming" color="var(--color-xp-500)" />
                  <TagInput label="Goals" icon={Target} value={goals} onChange={setGoals} placeholder="e.g. Build a SaaS" color="var(--color-gold-500)" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateMutation.isPending}
                  id="profile-save-btn"
                >
                  {updateMutation.isPending ? <span className="spinner" /> : <Save size={18} />}
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
