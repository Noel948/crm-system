import React, { useEffect, useState, useRef } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { Upload, Download, Trash2, Search, FolderOpen, File, FileText, Image, Archive, Loader2, Link2, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const getFileIcon = (mime: string) => {
  if (mime?.startsWith('image/')) return Image
  if (mime?.includes('pdf') || mime?.includes('text')) return FileText
  if (mime?.includes('zip') || mime?.includes('rar')) return Archive
  return File
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Files() {
  const { toast } = useToast()
  const [files, setFiles] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterLead, setFilterLead] = useState('')
  const [linkingFile, setLinkingFile] = useState<any>(null)
  const [linkLeadId, setLinkLeadId] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (filterLead) params.lead_id = filterLead
      const [fr, lr] = await Promise.all([api.get('/files', { params }), api.get('/leads')])
      setFiles(fr.data)
      setLeads(lr.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchFiles() }, [search, filterLead])

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(fileList).forEach(f => formData.append('files', f))
      await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast('success', `${fileList.length} file(s) uploaded`)
      fetchFiles()
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Upload failed')
    } finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(e.dataTransfer.files)
  }

  const deleteFile = async (id: string) => {
    if (!confirm('Delete this file permanently?')) return
    await api.delete(`/files/${id}`)
    toast('success', 'File deleted')
    fetchFiles()
  }

  const linkToLead = async () => {
    if (!linkingFile) return
    await api.put(`/files/${linkingFile.id}`, { lead_id: linkLeadId || null })
    toast('success', 'File linked to lead')
    setLinkingFile(null)
    fetchFiles()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Files</h1>
          <p className="text-slate-500 text-sm mt-0.5">{files.length} files stored</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} />
      </div>

      {/* Drag and drop zone */}
      <div
        onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}>
        <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-primary-500' : 'text-slate-300'}`} />
        <p className="text-sm font-medium text-slate-600">Drop files here or click to upload</p>
        <p className="text-xs text-slate-400 mt-1">Supports PDF, Word, Excel, images, ZIP (max 50MB)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-56" placeholder="Search files..." />
        </div>
        <select value={filterLead} onChange={e => setFilterLead(e.target.value)} className="input w-48">
          <option value="">All leads</option>
          {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Files */}
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> :
        files.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No files uploaded yet. Drop some files above!</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['File', 'Size', 'Linked Lead', 'Uploaded', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {files.map((file: any) => {
                    const FileIcon = getFileIcon(file.mime_type)
                    return (
                      <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileIcon size={18} className="text-primary-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 truncate max-w-xs">{file.original_name}</p>
                              <p className="text-xs text-slate-400">{file.mime_type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatSize(file.size)}</td>
                        <td className="px-4 py-3">
                          {file.lead_name
                            ? <span className="badge bg-primary-50 text-primary-700">{file.lead_name}</span>
                            : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{format(parseISO(file.created_at), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a href={`/api/files/download/${file.id}`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary-600 transition-colors" title="Download">
                              <Download size={15} />
                            </a>
                            <button onClick={() => { setLinkingFile(file); setLinkLeadId(file.lead_id || '') }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Link to lead">
                              <Link2 size={15} />
                            </button>
                            <button onClick={() => deleteFile(file.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Link modal */}
      {linkingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Link File to Lead</h2>
              <button onClick={() => setLinkingFile(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">File: <strong>{linkingFile.original_name}</strong></p>
            <select value={linkLeadId} onChange={e => setLinkLeadId(e.target.value)} className="input mb-4">
              <option value="">— No lead —</option>
              {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setLinkingFile(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={linkToLead} className="btn-primary flex-1 justify-center">Save Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
