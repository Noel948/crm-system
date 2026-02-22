import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { useLanguage } from '../contexts/LanguageContext'
import {
  ArrowLeft, Mail, Phone, Building2, Globe, MapPin, Edit2, Plus, Trash2,
  FolderOpen, Twitter, Linkedin, Instagram, Facebook, Clock, Upload, Download,
  X, Loader2, Zap, ExternalLink, AlertCircle, TrendingUp, ChevronRight, Tag
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  qualified: 'bg-purple-100 text-purple-700 border-purple-200',
  proposal: 'bg-orange-100 text-orange-700 border-orange-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-600',
}
const NOTE_COLORS = ['#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#f3e8ff', '#ffedd5']

type Tab = 'overview' | 'notes' | 'tasks' | 'files' | 'ai'
interface AiResult {
  score: number; breakdown: Record<string, number>
  mentions: Array<{ url: string; title: string; description: string }>
  source: string; summary?: string
}

const scoreColor = (s: number) => s >= 70 ? 'text-green-600' : s >= 40 ? 'text-yellow-600' : 'text-red-500'
const scoreRingCol = (s: number) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444'

function ScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const r = size * 0.4, c = 2 * Math.PI * r
  const pct = Math.min(Math.max(score, 0), 100) / 100
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.08} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreRingCol(score)} strokeWidth={size * 0.08}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [lead, setLead] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#fef9c3' })
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' })
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const load = async () => {
    try {
      const [lR, nR, tR, fR, aR] = await Promise.all([
        api.get(`/leads/${id}`), api.get(`/leads/${id}/notes`),
        api.get(`/leads/${id}/tasks`), api.get(`/leads/${id}/files`),
        api.get(`/leads/${id}/activity`),
      ])
      setLead(lR.data); setEditForm(lR.data)
      setNotes(nR.data); setTasks(tR.data); setFiles(fR.data); setActivity(aR.data)
    } catch { navigate('/leads') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleUpdate = async () => {
    setSaving(true)
    try { await api.put(`/leads/${id}`, editForm); toast('success', t('lead_updated')); setEditing(false); load() }
    catch { toast('error', t('error')) } finally { setSaving(false) }
  }
  const handleDelete = async () => {
    if (!confirm(t('confirm_delete'))) return
    await api.delete(`/leads/${id}`); toast('success', t('lead_deleted')); navigate('/leads')
  }
  const addNote = async () => {
    if (!newNote.title.trim()) return
    await api.post('/notes', { ...newNote, lead_id: id })
    toast('success', t('add_note')); setNewNote({ title: '', content: '', color: '#fef9c3' }); setShowNoteForm(false); load()
  }
  const deleteNote = async (nid: string) => { await api.delete(`/notes/${nid}`); load() }
  const addTask = async () => {
    if (!newTask.title.trim()) return
    await api.post('/tasks', { ...newTask, lead_id: id })
    toast('success', t('add_task')); setNewTask({ title: '', priority: 'medium', due_date: '' }); setShowTaskForm(false); load()
  }
  const completeTask = async (tid: string, done: boolean) => { await api.put(`/tasks/${tid}`, { status: done ? 'done' : 'todo' }); load() }
  const deleteTask = async (tid: string) => { await api.delete(`/tasks/${tid}`); load() }
  const uploadFiles = async (fl: FileList | null) => {
    if (!fl?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(fl).forEach(f => fd.append('files', f))
      fd.append('lead_id', id!)
      await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast('success', t('upload_files')); load()
    } catch { toast('error', t('error')) } finally { setUploading(false) }
  }
  const deleteFile = async (fid: string) => { await api.delete(`/files/${fid}`); load() }
  const runAiScore = async () => {
    setAiLoading(true)
    try {
      const { data } = await api.post(`/leads/${id}/ai-score`)
      setAiResult(data); setLead((l: any) => ({ ...l, score: data.score }))
      toast('success', `AI Score: ${data.score}/100`)
    } catch (err: any) { toast('error', err.response?.data?.error || t('error')) }
    finally { setAiLoading(false) }
  }
  const fmtSize = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  if (!lead) return null

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: t('overview') }, { key: 'notes', label: t('notes'), count: notes.length },
    { key: 'tasks', label: t('tasks'), count: tasks.length }, { key: 'files', label: t('files'), count: files.length },
    { key: 'ai', label: t('ai_score') },
  ]

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/leads" className="hover:text-primary-600 flex items-center gap-1"><ArrowLeft size={14} /> {t('leads')}</Link>
        <ChevronRight size={13} />
        <span className="text-slate-700 font-medium">{lead.name}</span>
      </div>

      {/* Hero */}
      <div className="card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0 shadow-sm">
            {lead.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{lead.name}</h1>
                <p className="text-slate-500 mt-0.5 text-sm">
                  {[lead.position, lead.company].filter(Boolean).join(' · ')}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {lead.status}
                  </span>
                  {lead.source && <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full capitalize">{lead.source}</span>}
                  {(lead.tags || []).map((tag: string) => (
                    <span key={tag} className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full flex items-center gap-1"><Tag size={10}/>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                  <ScoreRing score={lead.score || 0} size={72} />
                  <div className="absolute text-center">
                    <p className={`text-base font-bold leading-none ${scoreColor(lead.score || 0)}`}>{lead.score || 0}</p>
                    <p className="text-[8px] text-slate-400">/100</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-1.5 px-3"><Edit2 size={12}/> {t('edit')}</button>
                  <button onClick={handleDelete} className="btn-danger text-xs py-1.5 px-3"><Trash2 size={12}/> {t('delete')}</button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm">
              {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-primary-600"><Mail size={13} className="text-slate-400"/>{lead.email}</a>}
              {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-primary-600"><Phone size={13} className="text-slate-400"/>{lead.phone}</a>}
              {lead.website && <a href={lead.website} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-primary-600 hover:underline"><Globe size={13}/>{lead.website.replace(/^https?:\/\//,'')}</a>}
              {lead.address && <span className="flex items-center gap-1.5 text-slate-500"><MapPin size={13} className="text-slate-400"/>{lead.address}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('lead_details')}</h3>
          <div className="space-y-2.5">
            {[
              [t('status'), <span key="s" className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status]}`}>{lead.status}</span>],
              [t('source'), <span key="so" className="text-sm capitalize text-slate-700">{lead.source||'—'}</span>],
              [t('score'), <span key="sc" className={`text-sm font-bold ${scoreColor(lead.score||0)}`}>{lead.score||0}/100</span>],
              [t('created'), <span key="cr" className="text-xs text-slate-600">{format(parseISO(lead.created_at),'yyyy.MM.dd')}</span>],
              [t('updated'), <span key="up" className="text-xs text-slate-600">{format(parseISO(lead.updated_at),'yyyy.MM.dd')}</span>],
            ].map(([label, val], i) => (
              <div key={i} className="flex items-center justify-between"><span className="text-xs text-slate-400">{label}</span>{val}</div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('social_profiles')}</h3>
          {!Object.keys(lead.social_profiles||{}).length
            ? <p className="text-sm text-slate-400">{t('no_social')}</p>
            : <div className="space-y-2">
                {Object.entries(lead.social_profiles).map(([p, url]: [string,any]) => {
                  const icons: Record<string,any> = {twitter:Twitter,linkedin:Linkedin,instagram:Instagram,facebook:Facebook}
                  const Icon = icons[p]||Globe
                  const cols: Record<string,string> = {twitter:'text-sky-500',linkedin:'text-blue-600',instagram:'text-pink-500',facebook:'text-indigo-600'}
                  return <a key={p} href={url} target="_blank" rel="noopener" className={`flex items-center gap-2 text-sm hover:underline ${cols[p]||'text-primary-600'}`}><Icon size={14}/><span className="flex-1 truncate capitalize">{p}</span><ExternalLink size={11}/></a>
                })}
              </div>
          }
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Összefoglaló</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[{l:t('notes'),v:notes.length,c:'text-amber-600',b:'bg-amber-50'},{l:t('tasks'),v:tasks.length,c:'text-blue-600',b:'bg-blue-50'},{l:t('files'),v:files.length,c:'text-purple-600',b:'bg-purple-50'}].map(({l,v,c,b})=>(
              <div key={l} className={`${b} rounded-xl p-3`}><p className={`text-xl font-bold ${c}`}>{v}</p><p className="text-xs text-slate-500 mt-0.5">{l}</p></div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
          {TABS.map(({key,label,count})=>(
            <button key={key} onClick={()=>setTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab===key?'border-primary-600 text-primary-600 bg-white':'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}>
              {label}
              {count!==undefined&&count>0&&<span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab===key?'bg-primary-100 text-primary-600':'bg-slate-200 text-slate-500'}`}>{count}</span>}
            </button>
          ))}
        </div>
        <div className="p-5">

          {/* OVERVIEW */}
          {tab==='overview'&&(
            <div>
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary-500"/>{t('recent_activity')}</h3>
              {activity.length===0?<p className="text-slate-400 text-sm">{t('no_activity')}</p>:(
                <div className="relative pl-5">
                  <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-slate-100"/>
                  <div className="space-y-4">
                    {activity.slice(0,15).map((a:any)=>(
                      <div key={a.id} className="relative flex items-start gap-3 text-sm">
                        <div className="absolute -left-3.5 top-1 w-3 h-3 bg-white border-2 border-primary-400 rounded-full"/>
                        <div className="flex-1">
                          <span className="text-slate-700">{a.details}</span>
                          <span className="text-slate-400 ml-2 text-xs">{format(parseISO(a.created_at),'yyyy.MM.dd HH:mm')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {tab==='notes'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">{t('notes')}</h3>
                <button onClick={()=>setShowNoteForm(s=>!s)} className="btn-primary text-sm"><Plus size={14}/>{t('add_note')}</button>
              </div>
              {showNoteForm&&(
                <div className="card border border-primary-200 p-4 space-y-3 bg-primary-50/30">
                  <input value={newNote.title} onChange={e=>setNewNote(f=>({...f,title:e.target.value}))} className="input font-medium" placeholder={t('note_title')}/>
                  <textarea value={newNote.content} onChange={e=>setNewNote(f=>({...f,content:e.target.value}))} className="input min-h-24 resize-none" placeholder={t('note_content')}/>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">{NOTE_COLORS.map(c=><button key={c} type="button" onClick={()=>setNewNote(f=>({...f,color:c}))} className={`w-6 h-6 rounded-full border-2 ${newNote.color===c?'border-slate-600 scale-110':'border-transparent'}`} style={{backgroundColor:c}}/>)}</div>
                    <div className="flex gap-2 ml-auto">
                      <button onClick={()=>setShowNoteForm(false)} className="btn-secondary text-sm">{t('cancel')}</button>
                      <button onClick={addNote} className="btn-primary text-sm">{t('save_note')}</button>
                    </div>
                  </div>
                </div>
              )}
              {notes.length===0?<p className="text-slate-400 text-sm py-4">{t('no_notes')}</p>:(
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((n:any)=>(
                    <div key={n.id} className="rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow group relative" style={{backgroundColor:n.color||'#fef9c3'}}>
                      <button onClick={()=>deleteNote(n.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-black/10"><X size={13}/></button>
                      <p className="font-semibold text-slate-800 text-sm mb-1.5 pr-6">{n.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-4">{n.content||''}</p>
                      <p className="text-xs text-slate-400 mt-3">{format(parseISO(n.updated_at),'yyyy.MM.dd')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TASKS */}
          {tab==='tasks'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">{t('tasks')}</h3>
                <button onClick={()=>setShowTaskForm(s=>!s)} className="btn-primary text-sm"><Plus size={14}/>{t('add_task')}</button>
              </div>
              {showTaskForm&&(
                <div className="card border border-primary-200 p-4 space-y-3 bg-primary-50/30">
                  <input value={newTask.title} onChange={e=>setNewTask(f=>({...f,title:e.target.value}))} className="input" placeholder={t('task_title')}/>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">{t('priority')}</label>
                      <select value={newTask.priority} onChange={e=>setNewTask(f=>({...f,priority:e.target.value}))} className="input">{PRIORITY_OPTIONS.map(p=><option key={p}>{p}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">{t('due_date')}</label>
                      <input type="date" value={newTask.due_date} onChange={e=>setNewTask(f=>({...f,due_date:e.target.value}))} className="input"/></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={()=>setShowTaskForm(false)} className="btn-secondary text-sm">{t('cancel')}</button>
                    <button onClick={addTask} className="btn-primary text-sm">{t('add_task')}</button>
                  </div>
                </div>
              )}
              {tasks.length===0?<p className="text-slate-400 text-sm py-4">{t('no_tasks')}</p>:(
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {tasks.map((task:any)=>(
                    <div key={task.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group ${task.status==='done'?'bg-slate-50/50':'bg-white'}`}>
                      <input type="checkbox" checked={task.status==='done'} onChange={e=>completeTask(task.id,e.target.checked)} className="w-4 h-4 accent-primary-600 rounded cursor-pointer flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status==='done'?'line-through text-slate-400':'text-slate-800'}`}>{task.title}</p>
                        {task.due_date&&<p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={10}/>{task.due_date}</p>}
                      </div>
                      <span className={`badge text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      <button onClick={()=>deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FILES */}
          {tab==='files'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">{t('files')}</h3>
                <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} className="btn-primary text-sm">
                  {uploading?<Loader2 size={14} className="animate-spin"/>:<Upload size={14}/>}
                  {uploading?t('loading'):t('upload_files')}
                </button>
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e=>uploadFiles(e.target.files)}/>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);uploadFiles(e.dataTransfer.files)}}
                onClick={()=>fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragOver?'border-primary-400 bg-primary-50':'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}>
                <Upload size={24} className={`mx-auto mb-2 ${dragOver?'text-primary-500':'text-slate-300'}`}/>
                <p className="text-sm text-slate-500">{t('drag_drop')}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t('or_click')}</p>
              </div>
              {files.length===0?<p className="text-slate-400 text-sm">{t('no_files')}</p>:(
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {files.map((f:any)=>(
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group">
                      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0"><FolderOpen size={16} className="text-primary-400"/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{f.original_name}</p>
                        <p className="text-xs text-slate-400">{fmtSize(f.size)} · {format(parseISO(f.created_at),'yyyy.MM.dd')}</p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <a href={`/api/files/download/${f.id}`} className="p-1.5 hover:bg-primary-100 rounded-lg text-primary-600"><Download size={14}/></a>
                        <button onClick={()=>deleteFile(f.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI SCORE */}
          {tab==='ai'&&(
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Zap size={16} className="text-amber-500"/>{t('ai_score')}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{t('online_presence')}</p>
                </div>
                <button onClick={runAiScore} disabled={aiLoading} className="btn-primary">
                  {aiLoading?<><Loader2 size={15} className="animate-spin"/>{t('scoring')}</>:<><Zap size={15}/>{t('calculate_ai_score')}</>}
                </button>
              </div>
              {!aiResult&&!aiLoading&&(
                <div className="text-center py-12 text-slate-400">
                  <Zap size={40} className="mx-auto mb-3 text-slate-200"/>
                  <p className="font-medium text-slate-600">{t('calculate_ai_score')}</p>
                  <p className="text-sm mt-1">{t('online_presence')}</p>
                </div>
              )}
              {aiLoading&&<div className="flex flex-col items-center justify-center py-12 gap-3"><div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"/><p className="text-slate-500">{t('scoring')}</p></div>}
              {aiResult&&!aiLoading&&(
                <div className="space-y-5">
                  <div className="flex items-center gap-6 p-5 bg-slate-50 rounded-xl">
                    <div className="relative w-[88px] h-[88px] flex items-center justify-center flex-shrink-0">
                      <ScoreRing score={aiResult.score} size={88}/>
                      <div className="absolute text-center">
                        <p className={`text-2xl font-bold leading-none ${scoreColor(aiResult.score)}`}>{aiResult.score}</p>
                        <p className="text-[9px] text-slate-400">/100</p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${scoreColor(aiResult.score)}`}>
                        {aiResult.score>=70?'Erős jelenlét':aiResult.score>=40?'Közepes jelenlét':'Gyenge jelenlét'}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">{aiResult.source==='firecrawl'?'Firecrawl elemzés':'Alap pontozás'}</p>
                      {aiResult.summary&&<p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{aiResult.summary}</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Részletes bontás</h4>
                    <div className="space-y-3">
                      {[{key:'web_presence',label:t('web_presence'),max:25},{key:'contact_info',label:t('contact_completeness'),max:20},{key:'social_profiles',label:t('social_coverage'),max:30},{key:'online_mentions',label:t('online_mentions'),max:20},{key:'website_content',label:t('website_content'),max:15}].map(({key,label,max})=>{
                        const val=aiResult.breakdown[key]||0; const pct=max>0?(val/max)*100:0
                        return <div key={key}><div className="flex items-center justify-between text-sm mb-1"><span className="text-slate-600">{label}</span><span className={`font-semibold ${val>=max*0.7?'text-green-600':val>=max*0.4?'text-yellow-600':'text-red-500'}`}>{val}/{max}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${val>=max*0.7?'bg-green-500':val>=max*0.4?'bg-yellow-400':'bg-red-400'}`} style={{width:`${pct}%`}}/></div></div>
                      })}
                    </div>
                  </div>
                  {aiResult.mentions?.length>0&&(
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('top_mentions')}</h4>
                      <div className="space-y-2">
                        {aiResult.mentions.map((m,i)=>(
                          <a key={i} href={m.url} target="_blank" rel="noopener" className="block p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.title||m.url}</p>
                            {m.description&&<p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</p>}
                            <p className="text-xs text-primary-500 mt-1 truncate flex items-center gap-1"><ExternalLink size={10}/>{m.url}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b"><h2 className="text-lg font-bold">{t('edit')}</h2><button onClick={()=>setEditing(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18}/></button></div>
            <div className="p-5 space-y-3">
              {([['name',t('name')],['email','Email'],['phone',t('phone')],['company',t('company')],['position',t('position')],['website',t('website')],['address',t('address')]] as [string,string][]).map(([k,l])=>(
                <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1">{l}</label><input value={editForm[k]||''} onChange={e=>setEditForm((f:any)=>({...f,[k]:e.target.value}))} className="input"/></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('status')}</label><select value={editForm.status} onChange={e=>setEditForm((f:any)=>({...f,status:e.target.value}))} className="input">{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('score')}</label><input type="number" min="0" max="100" value={editForm.score||0} onChange={e=>setEditForm((f:any)=>({...f,score:parseInt(e.target.value)||0}))} className="input"/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setEditing(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
                <button onClick={handleUpdate} disabled={saving} className="btn-primary flex-1 justify-center">{saving?t('loading'):t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
