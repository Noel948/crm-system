import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { Plus, Search, Pin, PinOff, Trash2, Edit2, StickyNote, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const COLORS = ['#ffffff', '#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#ede9fe', '#fed7aa', '#fee2e2']
const colorLabels: Record<string, string> = { '#ffffff': 'White', '#fef9c3': 'Yellow', '#dcfce7': 'Green', '#dbeafe': 'Blue', '#fce7f3': 'Pink', '#ede9fe': 'Purple', '#fed7aa': 'Orange', '#fee2e2': 'Red' }

interface Note { id: string; title: string; content: string; color: string; pinned: number; lead_name?: string; lead_id?: string; updated_at: string; created_at: string }

function NoteModal({ note, leads, onClose, onSave }: { note?: Note | null; leads: any[]; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: note?.title || '', content: note?.content || '', color: note?.color || '#fef9c3', pinned: note?.pinned === 1, lead_id: note?.lead_id || '' })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { toast('error', 'Title is required'); return }
    setLoading(true)
    try {
      if (note) await api.put(`/notes/${note.id}`, form)
      else await api.post('/notes', form)
      toast('success', note ? 'Note updated' : 'Note created')
      onSave()
    } catch { toast('error', 'Failed to save note') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{note ? 'Edit Note' : 'New Note'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input text-base font-medium" placeholder="Note title..." required />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="input min-h-32 resize-y" placeholder="Write your note here..." />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-primary-600 scale-110' : 'border-slate-200'}`}
                  style={{ backgroundColor: c }} title={colorLabels[c]} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link to Lead</label>
            <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} className="input">
              <option value="">— No lead —</option>
              {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name} {l.company ? `(${l.company})` : ''}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
            <span className="text-sm text-slate-700">Pin this note</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Save Note'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Notes() {
  const { toast } = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const [nr, lr] = await Promise.all([api.get('/notes', { params: { search: search || undefined } }), api.get('/leads')])
      setNotes(nr.data)
      setLeads(lr.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchNotes() }, [search])

  const togglePin = async (note: Note) => {
    await api.put(`/notes/${note.id}`, { pinned: !note.pinned })
    fetchNotes()
  }

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await api.delete(`/notes/${id}`)
    toast('success', 'Note deleted')
    fetchNotes()
  }

  const pinned = notes.filter(n => n.pinned)
  const unpinned = notes.filter(n => !n.pinned)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{notes.length} notes total</p>
        </div>
        <button onClick={() => { setEditNote(null); setShowModal(true) }} className="btn-primary"><Plus size={16} /> New Note</button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 max-w-sm" placeholder="Search notes..." />
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
        <>
          {pinned.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1"><Pin size={14} /> Pinned</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pinned.map(note => <NoteCard key={note.id} note={note} onEdit={() => { setEditNote(note); setShowModal(true) }} onPin={() => togglePin(note)} onDelete={() => deleteNote(note.id)} />)}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Other Notes</h2>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {unpinned.map(note => <NoteCard key={note.id} note={note} onEdit={() => { setEditNote(note); setShowModal(true) }} onPin={() => togglePin(note)} onDelete={() => deleteNote(note.id)} />)}
              </div>
            </div>
          )}
          {notes.length === 0 && (
            <div className="text-center py-16">
              <StickyNote size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No notes yet. <button onClick={() => setShowModal(true)} className="text-primary-600 hover:underline">Create your first note</button></p>
            </div>
          )}
        </>
      )}

      {showModal && <NoteModal note={editNote} leads={leads} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchNotes() }} />}
    </div>
  )
}

function NoteCard({ note, onEdit, onPin, onDelete }: { note: Note; onEdit: () => void; onPin: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer group"
      style={{ backgroundColor: note.color === '#ffffff' ? '#fffff8' : note.color }}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-900 text-sm flex-1 break-words">{note.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onPin} className="p-1 rounded hover:bg-black/10 transition-colors text-slate-500" title={note.pinned ? 'Unpin' : 'Pin'}>
            {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <button onClick={onEdit} className="p-1 rounded hover:bg-black/10 transition-colors text-slate-500"><Edit2 size={13} /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 transition-colors text-slate-500 hover:text-red-600"><Trash2 size={13} /></button>
        </div>
      </div>
      {note.content && <p className="text-xs text-slate-600 line-clamp-4 flex-1">{note.content}</p>}
      <div className="flex items-center justify-between mt-auto pt-1">
        {note.lead_name && <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">{note.lead_name}</span>}
        <span className="text-xs text-slate-400 ml-auto">{format(parseISO(note.updated_at), 'MMM d')}</span>
      </div>
    </div>
  )
}
