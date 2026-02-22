import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { Plus, Search, CheckSquare, Clock, AlertCircle, Trash2, Edit2, X, Check } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}
const priorityDot: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-400', low: 'bg-slate-300' }
const statusCols = ['todo', 'in_progress', 'done']
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const statusBg: Record<string, string> = { todo: 'bg-slate-50 border-slate-200', in_progress: 'bg-blue-50 border-blue-200', done: 'bg-green-50 border-green-200' }

interface Task { id: string; title: string; description?: string; status: string; priority: string; due_date?: string; lead_name?: string; lead_id?: string; completed_at?: string }

function TaskModal({ task, leads, onClose, onSave }: { task?: Task | null; leads: any[]; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: task?.title || '', description: task?.description || '', status: task?.status || 'todo', priority: task?.priority || 'medium', due_date: task?.due_date || '', lead_id: task?.lead_id || '' })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { toast('error', 'Title is required'); return }
    setLoading(true)
    try {
      if (task) await api.put(`/tasks/${task.id}`, form)
      else await api.post('/tasks', form)
      toast('success', task ? 'Task updated' : 'Task created')
      onSave()
    } catch { toast('error', 'Failed to save task') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Task title..." required />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-20 resize-none" placeholder="Description (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                {statusCols.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                {['low','medium','high','urgent'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link to Lead</label>
            <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} className="input">
              <option value="">— No lead —</option>
              {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Save Task'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const [tr, lr] = await Promise.all([api.get('/tasks'), api.get('/leads')])
      setTasks(tr.data)
      setLeads(lr.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchTasks() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    await api.delete(`/tasks/${id}`)
    toast('success', 'Task deleted')
    fetchTasks()
  }

  const moveTask = async (task: Task, newStatus: string) => {
    await api.put(`/tasks/${task.id}`, { status: newStatus })
    fetchTasks()
  }

  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const tasksByStatus = (status: string) => filteredTasks.filter(t => t.status === status)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tasks.filter(t => t.status !== 'done').length} active, {tasks.filter(t => t.status === 'done').length} completed</p>
        </div>
        <button onClick={() => { setEditTask(null); setShowModal(true) }} className="btn-primary"><Plus size={16} /> New Task</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-56" placeholder="Search tasks..." />
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input w-36">
          <option value="all">All priorities</option>
          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto">
          {(['kanban','list'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === m ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
        viewMode === 'kanban' ? (
          <div className="grid md:grid-cols-3 gap-4">
            {statusCols.map(status => (
              <div key={status} className={`rounded-xl border p-4 min-h-48 ${statusBg[status]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700 text-sm">{statusLabels[status]}</h3>
                  <span className="bg-white border border-slate-200 text-xs font-medium px-2 py-0.5 rounded-full text-slate-500">{tasksByStatus(status).length}</span>
                </div>
                <div className="space-y-2">
                  {tasksByStatus(status).map(task => (
                    <TaskCard key={task.id} task={task} onEdit={() => { setEditTask(task); setShowModal(true) }} onDelete={() => handleDelete(task.id)} onMove={moveTask} allStatuses={statusCols} />
                  ))}
                  {tasksByStatus(status).length === 0 && <p className="text-xs text-slate-400 text-center py-4">No tasks here</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center"><CheckSquare size={40} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-400">No tasks found</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                    <button onClick={() => moveTask(task, task.status === 'done' ? 'todo' : 'done')}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-primary-400'}`}>
                      {task.status === 'done' && <Check size={11} className="text-white" />}
                    </button>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                      {task.lead_name && <p className="text-xs text-primary-600">{task.lead_name}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge text-xs border ${priorityColors[task.priority]}`}>{task.priority}</span>
                      {task.due_date && <span className={`text-xs flex items-center gap-1 ${task.status !== 'done' && isPast(parseISO(task.due_date)) ? 'text-red-600 font-medium' : 'text-slate-400'}`}><Clock size={11} />{task.due_date}</span>}
                      <button onClick={() => { setEditTask(task); setShowModal(true) }} className="p-1 text-slate-400 hover:text-slate-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {showModal && <TaskModal task={editTask} leads={leads} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchTasks() }} />}
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete, onMove, allStatuses }: { task: Task; onEdit: () => void; onDelete: () => void; onMove: (t: Task, s: string) => void; allStatuses: string[] }) {
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date))
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className={`text-sm font-medium flex-1 ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-0.5 text-slate-400 hover:text-slate-600"><Edit2 size={12} /></button>
          <button onClick={onDelete} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
        </div>
      </div>
      {task.lead_name && <p className="text-xs text-primary-600 mb-1">{task.lead_name}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className={`badge text-xs ${priorityColors[task.priority]}`}>{task.priority}</span>
        <div className="flex items-center gap-1">
          {task.due_date && <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}><Clock size={10} />{task.due_date}</span>}
          {isOverdue && <AlertCircle size={12} className="text-red-500" />}
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {allStatuses.filter(s => s !== task.status).map(s => (
          <button key={s} onClick={() => onMove(task, s)} className="text-xs text-primary-600 hover:underline">→ {statusLabels[s]}</button>
        ))}
      </div>
    </div>
  )
}
