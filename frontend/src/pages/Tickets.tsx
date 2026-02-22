import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { Plus, Ticket, Send, ChevronRight, X, AlertCircle, Clock, CheckCircle, Circle } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-600',
}
const statusIcons: Record<string, any> = { open: Circle, in_progress: Clock, resolved: CheckCircle, closed: CheckCircle }
const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600', medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
}
const categoryLabels: Record<string, string> = { general: 'General', technical: 'Technical', billing: 'Billing', feature: 'Feature Request', bug: 'Bug Report' }

function CreateTicketModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: 'general' })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { toast('error', 'Title is required'); return }
    setLoading(true)
    try {
      await api.post('/tickets', form)
      toast('success', 'Ticket created')
      onSave()
    } catch { toast('error', 'Failed to create ticket') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">New Ticket</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Brief description of the issue" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-24 resize-none" placeholder="Describe the issue in detail..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                {['low','medium','high','urgent'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Creating...' : 'Create Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Tickets() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [users, setUsers] = useState<any[]>([])

  const fetchTickets = async () => {
    const params: any = {}
    if (filterStatus) params.status = filterStatus
    if (filterPriority) params.priority = filterPriority
    const { data } = await api.get('/tickets', { params })
    setTickets(data)
    setLoading(false)
  }

  const fetchTicketDetail = async (id: string) => {
    const { data } = await api.get(`/tickets/${id}`)
    setSelected(data)
  }

  useEffect(() => {
    fetchTickets()
    if (user?.role === 'admin') api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {})
  }, [filterStatus, filterPriority])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected) return
    setSending(true)
    try {
      await api.post(`/tickets/${selected.id}/messages`, { message: newMessage })
      setNewMessage('')
      fetchTicketDetail(selected.id)
    } catch { toast('error', 'Failed to send message') }
    finally { setSending(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/tickets/${id}`, { status })
    fetchTickets()
    if (selected?.id === id) fetchTicketDetail(id)
    toast('success', 'Status updated')
  }

  const deleteTicket = async (id: string) => {
    if (!confirm('Delete this ticket?')) return
    await api.delete(`/tickets/${id}`)
    if (selected?.id === id) setSelected(null)
    fetchTickets()
    toast('success', 'Ticket deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tickets.filter(t => t.status === 'open').length} open tickets</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Ticket</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-40">
          <option value="">All statuses</option>
          {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input w-36">
          <option value="">All priorities</option>
          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-5 gap-5">
        {/* Ticket list */}
        <div className="md:col-span-2 space-y-2">
          {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> :
            tickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No tickets found</p>
              </div>
            ) : (
              tickets.map(t => {
                const StatusIcon = statusIcons[t.status] || Circle
                return (
                  <div key={t.id} onClick={() => fetchTicketDetail(t.id)}
                    className={`card p-4 cursor-pointer hover:border-primary-300 transition-all ${selected?.id === t.id ? 'border-primary-400 bg-primary-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-slate-900 text-sm flex-1 line-clamp-2">{t.title}</p>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${statusColors[t.status]}`}>{t.status.replace('_',' ')}</span>
                      <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                      <span className="text-xs text-slate-400 ml-auto">{format(parseISO(t.created_at), 'MMM d')}</span>
                    </div>
                    {t.category && <p className="text-xs text-slate-400 mt-1">{categoryLabels[t.category] || t.category}</p>}
                  </div>
                )
              })
            )}
        </div>

        {/* Ticket detail */}
        <div className="md:col-span-3">
          {!selected ? (
            <div className="card p-16 text-center">
              <Ticket size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Select a ticket to view details</p>
            </div>
          ) : (
            <div className="card flex flex-col h-[600px]">
              {/* Ticket header */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="font-bold text-slate-900 flex-1">{selected.title}</h2>
                  <button onClick={() => deleteTicket(selected.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`badge ${statusColors[selected.status]}`}>{selected.status.replace('_',' ')}</span>
                  <span className={`badge ${priorityColors[selected.priority]}`}>{selected.priority}</span>
                  {selected.category && <span className="badge bg-slate-100 text-slate-600">{categoryLabels[selected.category] || selected.category}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Change status:</span>
                  {['open','in_progress','resolved','closed'].map(s => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${selected.status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                      {s.replace('_',' ')}
                    </button>
                  ))}
                </div>
                {user?.role === 'admin' && (
                  <div className="mt-2">
                    <select value={selected.assigned_to || ''} onChange={async e => { await api.put(`/tickets/${selected.id}`, { assigned_to: e.target.value || null }); fetchTicketDetail(selected.id) }} className="input text-xs w-48">
                      <option value="">Unassigned</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(selected.messages || []).map((msg: any) => {
                  const isMe = msg.user_id === user?.id
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${isMe ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {msg.user_name?.charAt(0)}
                      </div>
                      <div className={`max-w-xs lg:max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                          {msg.message}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>{msg.user_name}</span>
                          <span>·</span>
                          <span>{format(parseISO(msg.created_at), 'MMM d, HH:mm')}</span>
                          {msg.user_role === 'admin' && <span className="badge bg-primary-50 text-primary-700 text-xs">Admin</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(selected.messages || []).length === 0 && <p className="text-center text-sm text-slate-400 py-8">No messages yet</p>}
              </div>

              {/* Reply */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="input flex-1" placeholder="Type a message... (Enter to send)" />
                  <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="btn-primary px-3">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); fetchTickets() }} />}
    </div>
  )
}
