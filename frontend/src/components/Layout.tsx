import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from './Toast'
import api from '../api/client'
import {
  LayoutDashboard, Users, Search, StickyNote, CheckSquare, FolderOpen,
  Radio, Ticket, ShieldCheck, LogOut, Menu, Target, ChevronDown,
  User, Settings, Lock, Globe, X, Eye, EyeOff
} from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', company: user?.company || '', phone: user?.phone || '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      await api.put('/auth/me', profileForm)
      updateUser(profileForm)
      toast('success', t('profile_updated'))
      setShowProfileModal(false)
    } catch { toast('error', t('error')) }
    finally { setProfileSaving(false) }
  }

  const savePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) { toast('error', 'A jelszavak nem egyeznek'); return }
    if (pwForm.new_password.length < 6) { toast('error', 'Minimum 6 karakter'); return }
    setPwSaving(true)
    try {
      await api.put('/auth/me/password', { current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast('success', t('password_changed'))
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      setShowPasswordModal(false)
    } catch (err: any) { toast('error', err.response?.data?.error || t('error')) }
    finally { setPwSaving(false) }
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/leads', icon: Users, label: t('leads') },
    { to: '/prospect-finder', icon: Search, label: t('prospect_finder') },
    { to: '/notes', icon: StickyNote, label: t('notes') },
    { to: '/tasks', icon: CheckSquare, label: t('tasks') },
    { to: '/files', icon: FolderOpen, label: t('files') },
    { to: '/social-monitor', icon: Radio, label: t('social_monitor') },
    { to: '/tickets', icon: Ticket, label: t('tickets') },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-primary-400 rounded-lg flex items-center justify-center flex-shrink-0">
          <Target size={18} className="text-white" />
        </div>
        {sidebarOpen && <span className="text-white font-bold text-lg">NexaCRM</span>}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
            onClick={() => setMobileSidebarOpen(false)}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="flex-1">{label}</span>}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mt-2 border-t border-white/10 pt-4 ${
                isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
            onClick={() => setMobileSidebarOpen(false)}
          >
            <ShieldCheck size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>{t('admin_panel')}</span>}
          </NavLink>
        )}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-white/50 text-xs truncate capitalize">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className={`hidden md:flex flex-col bg-primary-950 transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-primary-950 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileSidebarOpen(!mobileSidebarOpen) }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2" ref={dropdownRef}>
            <button onClick={() => setProfileOpen(p => !p)}
              className="flex items-center gap-2 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name?.split(' ')[0]}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-4 top-14 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                  <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setProfileOpen(false); setProfileForm({ name: user?.name || '', company: user?.company || '', phone: user?.phone || '' }); setShowProfileModal(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <User size={15} className="text-slate-400" /> {t('profile')}
                </button>
                <button onClick={() => { setProfileOpen(false); setShowSettingsModal(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <Settings size={15} className="text-slate-400" /> {t('settings')}
                </button>
                <button onClick={() => { setProfileOpen(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); setShowPasswordModal(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <Lock size={15} className="text-slate-400" /> {t('change_password')}
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl">
                    <LogOut size={15} /> {t('sign_out')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{t('profile')}</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('full_name')}</label>
                <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input value={user?.email || ''} className="input bg-slate-50 cursor-not-allowed" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('company')}</label>
                <input value={profileForm.company} onChange={e => setProfileForm(f => ({ ...f, company: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('phone')}</label>
                <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowProfileModal(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
                <button onClick={saveProfile} disabled={profileSaving} className="btn-primary flex-1 justify-center">
                  {profileSaving ? t('loading') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{t('change_password')}</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {([['current_password', t('current_password')], ['new_password', t('new_password')], ['confirm', t('confirm_password')]] as [string, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'}
                      value={(pwForm as any)[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      className="input pr-10" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
                <button onClick={savePassword} disabled={pwSaving} className="btn-primary flex-1 justify-center">
                  {pwSaving ? t('loading') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{t('settings')}</h2>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Globe size={14} /> {t('language')}
                </label>
                <div className="flex gap-2">
                  {(['hu', 'en'] as const).map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        lang === l ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                      }`}>
                      {l === 'hu' ? '🇭🇺 Magyar' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
