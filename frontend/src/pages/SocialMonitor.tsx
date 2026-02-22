import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { Plus, RefreshCw, Trash2, Twitter, Linkedin, Instagram, Facebook, Globe, Radio, Heart, MessageCircle, Share2, TrendingUp, TrendingDown, Minus, UserPlus, Loader2, X, Activity } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const platformIcon: Record<string, any> = { twitter: Twitter, linkedin: Linkedin, instagram: Instagram, facebook: Facebook }
const platformColor: Record<string, string> = { twitter: 'text-sky-500 bg-sky-50', linkedin: 'text-blue-600 bg-blue-50', instagram: 'text-pink-500 bg-pink-50', facebook: 'text-indigo-600 bg-indigo-50' }
const sentimentStyle: Record<string, string> = { positive: 'bg-green-100 text-green-700', neutral: 'bg-slate-100 text-slate-600', negative: 'bg-red-100 text-red-700' }
const sentimentIcon: Record<string, any> = { positive: TrendingUp, neutral: Minus, negative: TrendingDown }

const PLATFORMS = [
  { id: 'twitter', label: 'Twitter/X' }, { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' }, { id: 'facebook', label: 'Facebook' },
]

export default function SocialMonitor() {
  const { toast } = useToast()
  const [monitors, setMonitors] = useState<any[]>([])
  const [activeMonitor, setActiveMonitor] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newPlatforms, setNewPlatforms] = useState(['twitter', 'linkedin', 'instagram'])
  const [creating, setCreating] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterSentiment, setFilterSentiment] = useState('')
  const [importingId, setImportingId] = useState<string | null>(null)

  const fetchMonitors = async () => {
    const { data } = await api.get('/social/monitors')
    setMonitors(data)
    setLoading(false)
  }

  const fetchResults = async (monitorId: string) => {
    setLoadingResults(true)
    const params: any = {}
    if (filterPlatform) params.platform = filterPlatform
    if (filterSentiment) params.sentiment = filterSentiment
    const { data } = await api.get(`/social/monitors/${monitorId}/results`, { params })
    setResults(data)
    setLoadingResults(false)
  }

  useEffect(() => { fetchMonitors() }, [])
  useEffect(() => { if (activeMonitor) fetchResults(activeMonitor.id) }, [activeMonitor?.id, filterPlatform, filterSentiment])

  const createMonitor = async () => {
    if (!newKeyword.trim()) { toast('error', 'Enter a keyword'); return }
    setCreating(true)
    try {
      const { data } = await api.post('/social/monitors', { keyword: newKeyword, platforms: newPlatforms })
      await fetchMonitors()
      setActiveMonitor(data)
      setNewKeyword('')
      setShowCreateForm(false)
      toast('success', `Monitor created for "${data.keyword}"`)
    } catch { toast('error', 'Failed to create monitor') }
    finally { setCreating(false) }
  }

  const refreshMonitor = async () => {
    if (!activeMonitor) return
    setRefreshing(true)
    try {
      const { data } = await api.post(`/social/monitors/${activeMonitor.id}/refresh`)
      toast('success', `${data.new_results} new results found`)
      fetchResults(activeMonitor.id)
      fetchMonitors()
    } catch { toast('error', 'Refresh failed') }
    finally { setRefreshing(false) }
  }

  const deleteMonitor = async (id: string) => {
    if (!confirm('Delete this monitor and all its results?')) return
    await api.delete(`/social/monitors/${id}`)
    if (activeMonitor?.id === id) { setActiveMonitor(null); setResults([]) }
    fetchMonitors()
    toast('success', 'Monitor deleted')
  }

  const importAsLead = async (result: any) => {
    setImportingId(result.id)
    try {
      await api.post('/leads', {
        name: result.author.name, source: 'social',
        social_profiles: { [result.platform]: result.url },
      })
      toast('success', `${result.author.name} added as lead`)
    } catch { toast('error', 'Failed to import') }
    finally { setImportingId(null) }
  }

  const togglePlatform = (id: string) => setNewPlatforms(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(p => p !== id) : prev) : [...prev, id]
  )

  const sentimentCounts = { positive: results.filter(r => r.sentiment === 'positive').length, neutral: results.filter(r => r.sentiment === 'neutral').length, negative: results.filter(r => r.sentiment === 'negative').length }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Social Monitor</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track keywords and brand mentions across social platforms</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-primary"><Plus size={16} /> New Monitor</button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
        <strong>Demo Mode:</strong> Results are simulated. Real social monitoring requires platform API access with developer credentials.
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Create New Monitor</h3>
            <button onClick={() => setShowCreateForm(false)}><X size={18} className="text-slate-400" /></button>
          </div>
          <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} className="input" placeholder="Keyword to monitor (e.g. your brand, competitor, topic)" />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ id, label }) => {
                const Icon = platformIcon[id] || Globe
                return (
                  <button key={id} type="button" onClick={() => togglePlatform(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${newPlatforms.includes(id) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Icon size={14} />{label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreateForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={createMonitor} disabled={creating} className="btn-primary">
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}
              {creating ? 'Creating...' : 'Start Monitoring'}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {/* Monitor list */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Active Monitors ({monitors.length})</h3>
          {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> :
            monitors.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Activity size={32} className="mx-auto mb-2 text-slate-200" />
                No monitors yet
              </div>
            ) : (
              monitors.map(m => (
                <div key={m.id} onClick={() => setActiveMonitor(m)}
                  className={`card p-4 cursor-pointer hover:border-primary-300 transition-all ${activeMonitor?.id === m.id ? 'border-primary-400 bg-primary-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">"{m.keyword}"</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.platforms.map((p: string) => {
                          const Icon = platformIcon[p] || Globe
                          return <span key={p} className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium ${platformColor[p]}`}><Icon size={10} />{p}</span>
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{m.result_count} results</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteMonitor(m.id) }} className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
        </div>

        {/* Results */}
        <div className="md:col-span-2 space-y-4">
          {!activeMonitor ? (
            <div className="card p-16 text-center">
              <Radio size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Select a monitor to view results</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">"{activeMonitor.keyword}"</h3>
                  <p className="text-sm text-slate-500">{results.length} results</p>
                </div>
                <button onClick={refreshMonitor} disabled={refreshing} className="btn-secondary text-sm">
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {/* Sentiment summary */}
              <div className="grid grid-cols-3 gap-3">
                {(['positive','neutral','negative'] as const).map(s => {
                  const Icon = sentimentIcon[s]
                  return (
                    <div key={s} className={`rounded-xl p-3 text-center ${sentimentStyle[s]}`}>
                      <Icon size={18} className="mx-auto mb-1" />
                      <div className="text-lg font-bold">{sentimentCounts[s]}</div>
                      <div className="text-xs capitalize">{s}</div>
                    </div>
                  )
                })}
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="input w-40 text-sm">
                  <option value="">All platforms</option>
                  {activeMonitor.platforms.map((p: string) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} className="input w-36 text-sm">
                  <option value="">All sentiment</option>
                  {['positive','neutral','negative'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Posts */}
              {loadingResults ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {results.length === 0 ? <div className="text-center py-8 text-slate-400">No results match filters</div> :
                    results.map((r: any) => {
                      const PIcon = platformIcon[r.platform] || Globe
                      const SentIcon = sentimentIcon[r.sentiment]
                      return (
                        <div key={r.id} className="card p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <img src={r.author.avatar} alt={r.author.name} className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0"
                              onError={e => { (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author.name)}&background=6366f1&color=fff` }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-slate-900">{r.author.name}</span>
                                <span className="text-xs text-slate-400">{r.author.username}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${platformColor[r.platform]}`}><PIcon size={10} />{r.platform}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ml-auto ${sentimentStyle[r.sentiment]}`}><SentIcon size={10} />{r.sentiment}</span>
                              </div>
                              <p className="text-sm text-slate-700 mb-2">{r.content}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Heart size={11} />{r.engagement.likes?.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><MessageCircle size={11} />{r.engagement.comments?.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><Share2 size={11} />{r.engagement.shares?.toLocaleString()}</span>
                                <span className="ml-auto">{format(parseISO(r.found_at), 'MMM d, HH:mm')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <button onClick={() => importAsLead(r)} disabled={importingId === r.id}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors">
                              {importingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                              Import as Lead
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
