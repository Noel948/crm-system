import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { Users, BarChart2, Activity, Trash2, Edit2, Plus, Shield, ShieldOff, X, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

type AdminTab = 'overview' | 'users' | 'activity'

function UserModal({ user: editUser, onClose, onSave }: { user?: any; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ name: editUser?.name || '', email: editUser?.email || '', role: editUser?.role || 'user', company: editUser?.company || '', phone: editUser?.phone || '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editUser) await api.put(`/admin/users/${editUser.id}`, form)
      else await api.post('/admin/users', form)
      toast('success', editUser ? 'User updated' : 'User created')
      onSave()
    } catch (err: any) { toast('error', err.response?.data?.error || 'Failed to save user') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{editUser ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" placeholder="••••••••" required={!editUser} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? <Loader2 size={15} className="animate-spin" /> : null}{loading ? 'Saving...' : 'Save User'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const { user: me } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sr, ur, ar] = await Promise.all([api.get('/admin/stats'), api.get('/admin/users'), api.get('/admin/activity')])
      setStats(sr.data)
      setUsers(ur.data)
      setActivity(ar.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user? All their data will be removed.')) return
    try { await api.delete(`/admin/users/${id}`); toast('success', 'User deleted'); fetchData() }
    catch (err: any) { toast('error', err.response?.data?.error || 'Failed to delete user') }
  }

  const toggleRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    await api.put(`/admin/users/${user.id}`, { ...user, role: newRole })
    toast('success', `Role changed to ${newRole}`)
    fetchData()
  }

  const actionColors: Record<string, string> = { created_lead: 'bg-green-100 text-green-700', updated_lead: 'bg-blue-100 text-blue-700', deleted_lead: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-500 text-sm">System management and user control</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['overview','users','activity'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
        <>
          {tab === 'overview' && stats && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: stats.users, color: 'bg-primary-500', icon: Users },
                  { label: 'Total Leads', value: stats.leads, color: 'bg-emerald-500', icon: BarChart2 },
                  { label: 'Total Tasks', value: stats.tasks, color: 'bg-amber-500', icon: Activity },
                  { label: 'Open Tickets', value: stats.openTickets, color: 'bg-violet-500', icon: Activity },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500">{label}</span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><BarChart2 size={16} /> Leads by Status</h3>
                  <div className="space-y-2">
                    {(stats.leadsPerStatus || []).map((s: any) => (
                      <div key={s.status} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-24 capitalize">{s.status}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.round((s.cnt / stats.leads) * 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-slate-700 w-8 text-right">{s.cnt}</span>
                      </div>
                    ))}
                    {(stats.leadsPerStatus || []).length === 0 && <p className="text-slate-400 text-sm">No leads yet</p>}
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Users size={16} /> Top Users by Tasks</h3>
                  <div className="space-y-2">
                    {(stats.tasksPerUser || []).slice(0, 5).map((u: any) => (
                      <div key={u.name} className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">
                          {u.name?.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-600 flex-1 truncate">{u.name}</span>
                        <span className="text-sm font-semibold text-slate-700">{u.cnt} tasks</span>
                      </div>
                    ))}
                    {(stats.tasksPerUser || []).length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => { setEditUser(null); setShowUserModal(true) }} className="btn-primary"><Plus size={15} /> Add User</button>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{['User', 'Role', 'Company', 'Leads', 'Tasks', 'Last Login', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                                {u.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{u.name}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{u.company || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{u.lead_count}</td>
                          <td className="px-4 py-3 text-slate-600">{u.task_count}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{u.last_login ? format(parseISO(u.last_login), 'MMM d, HH:mm') : 'Never'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleRole(u)} disabled={u.id === me?.id}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary-600 transition-colors disabled:opacity-30" title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}>
                                {u.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                              </button>
                              <button onClick={() => { setEditUser(u); setShowUserModal(true) }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => deleteUser(u.id)} disabled={u.id === me?.id} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2">
                <Activity size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-700">Recent Activity Log</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {activity.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No activity recorded</div>
                ) : activity.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
                      {a.user_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700">{a.details || a.action}</span>
                      <span className="text-sm text-slate-400"> — {a.user_name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {a.action && <span className={`badge text-xs ${actionColors[a.action] || 'bg-slate-100 text-slate-600'}`}>{a.action.replace(/_/g, ' ')}</span>}
                      <span className="text-xs text-slate-400">{format(parseISO(a.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showUserModal && <UserModal user={editUser} onClose={() => setShowUserModal(false)} onSave={() => { setShowUserModal(false); fetchData() }} />}
    </div>
  )
}
