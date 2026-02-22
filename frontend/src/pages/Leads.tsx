import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { Plus, Search, Filter, Trash2, Edit2, ExternalLink, Users, ChevronDown } from 'lucide-react'

const STATUS_TABS = ['all', 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700', proposal: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700',
}
const sourceColors: Record<string, string> = {
  manual: 'bg-slate-100 text-slate-600', social: 'bg-indigo-100 text-indigo-700',
  prospect_finder: 'bg-cyan-100 text-cyan-700', referral: 'bg-pink-100 text-pink-700',
  website: 'bg-green-100 text-green-700',
}

interface Lead { id: string; name: string; email?: string; phone?: string; company?: string; position?: string; status: string; source: string; score: number; notes_count: number; created_at: string }

interface ModalProps { lead?: Lead | null; onClose: () => void; onSave: () => void }

function LeadModal({ lead, onClose, onSave }: ModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '',
    company: lead?.company || '', position: lead?.position || '',
    status: lead?.status || 'new', source: lead?.source || 'manual',
    score: lead?.score || 0, website: '', address: ''
  })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast('error', 'Name is required'); return }
    setLoading(true)
    try {
      if (lead) await api.put(`/leads/${lead.id}`, form)
      else await api.post('/leads', form)
      toast('success', lead ? 'Lead updated' : 'Lead created')
      onSave()
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to save lead')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">{lead ? 'Edit Lead' : 'New Lead'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input value={form.name} onChange={set('name')} className="input" placeholder="John Doe" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={form.phone} onChange={set('phone')} className="input" placeholder="+1 555 0100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input value={form.company} onChange={set('company')} className="input" placeholder="Acme Inc." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
              <input value={form.position} onChange={set('position')} className="input" placeholder="CEO" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className="input">
                {['new','contacted','qualified','proposal','won','lost'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select value={form.source} onChange={set('source')} className="input">
                {['manual','social','prospect_finder','referral','website'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Score (0-100)</label>
              <input type="number" min="0" max="100" value={form.score}
                onChange={e => setForm(f => ({ ...f, score: parseInt(e.target.value) || 0 }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input value={form.website} onChange={set('website')} className="input" placeholder="https://example.com" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const { toast } = useToast()

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (activeTab !== 'all') params.status = activeTab
      if (search) params.search = search
      const { data } = await api.get('/leads', { params })
      setLeads(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchLeads() }, [activeTab, search])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    try {
      await api.delete(`/leads/${id}`)
      toast('success', 'Lead deleted')
      fetchLeads()
    } catch { toast('error', 'Failed to delete lead') }
  }

  const scoreColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-slate-400'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-500 text-sm mt-0.5">{leads.length} {activeTab === 'all' ? 'total' : activeTab} leads</p>
        </div>
        <button onClick={() => { setEditLead(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search by name, email, company..." />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : leads.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No leads found. <button onClick={() => setShowModal(true)} className="text-primary-600 hover:underline">Add your first lead</button></p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Company', 'Status', 'Source', 'Score', 'Notes', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-primary-600">{lead.name}</Link>
                          {lead.email && <p className="text-xs text-slate-400">{lead.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.company || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${sourceColors[lead.source] || 'bg-slate-100 text-slate-600'}`}>{lead.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${scoreColor(lead.score)}`}>{lead.score}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{lead.notes_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/leads/${lead.id}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                          <ExternalLink size={15} />
                        </Link>
                        <button onClick={() => { setEditLead(lead); setShowModal(true) }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(lead.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <LeadModal lead={editLead} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchLeads() }} />}
    </div>
  )
}
