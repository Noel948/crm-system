import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import api from '../api/client'
import { Users, CheckSquare, StickyNote, Ticket, TrendingUp, Clock, AlertCircle, Plus, ArrowRight, Target, Zap } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6', contacted: '#f59e0b', qualified: '#8b5cf6',
  proposal: '#f97316', won: '#10b981', lost: '#ef4444',
}
const statusBadge: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700', proposal: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700',
}
const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-600',
}
const PIE_COLORS = ['#10b981', '#3b82f6', '#94a3b8']

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [leadStats, setLeadStats] = useState<any>(null)
  const [taskStats, setTaskStats] = useState<any>(null)
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [recentNotes, setRecentNotes] = useState<any[]>([])
  const [ticketStats, setTicketStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [ls, ts, tks, tasks, notes] = await Promise.all([
          api.get('/leads/stats'),
          api.get('/tasks/stats'),
          api.get('/tickets/stats'),
          api.get('/tasks?status=todo&limit=5'),
          api.get('/notes?limit=4'),
        ])
        setLeadStats(ls.data)
        setTaskStats(ts.data)
        setTicketStats(tks.data)
        setRecentLeads(ls.data.recent || [])
        setUpcomingTasks(tasks.data.slice(0, 5))
        setRecentNotes(notes.data.slice(0, 4))
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const formatDue = (date: string | null) => {
    if (!date) return null
    const d = parseISO(date)
    if (isToday(d)) return { label: t('today'), color: 'text-orange-600' }
    if (isTomorrow(d)) return { label: t('tomorrow'), color: 'text-yellow-600' }
    return { label: format(d, 'MMM d'), color: 'text-slate-500' }
  }

  const greeting = new Date().getHours() < 12 ? t('good_morning') : new Date().getHours() < 17 ? t('good_afternoon') : t('good_evening')

  // Chart data
  const STATUS_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
  const barData = STATUS_ORDER.map(s => ({
    status: s,
    cnt: leadStats?.byStatus?.find((x: any) => x.status === s)?.cnt || 0,
    fill: STATUS_COLORS[s],
  }))

  const taskDone = taskStats?.done || 0
  const taskInProgress = taskStats?.in_progress || 0
  const taskTodo = Math.max((taskStats?.total || 0) - taskDone - taskInProgress, 0)
  const taskPieData = [
    { name: t('done'), value: taskDone, color: PIE_COLORS[0] },
    { name: t('in_progress'), value: taskInProgress, color: PIE_COLORS[1] },
    { name: t('todo'), value: taskTodo, color: PIE_COLORS[2] },
  ].filter(d => d.value > 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/leads" className="btn-primary hidden sm:inline-flex">
          <Plus size={16} /> {t('new_lead')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('total_leads')} value={leadStats?.total || 0} color="bg-primary-500" sub="All time" />
        <StatCard icon={CheckSquare} label={t('active_tasks')} value={Math.max((taskStats?.total || 0) - (taskStats?.done || 0), 0)} color="bg-emerald-500" sub={`${taskStats?.overdue || 0} overdue`} />
        <StatCard icon={StickyNote} label={t('notes')} value={recentNotes.length} color="bg-amber-500" sub="Recent" />
        <StatCard icon={Ticket} label={t('open_tickets')} value={ticketStats?.open || 0} color="bg-violet-500" sub={`${ticketStats?.in_progress || 0} in progress`} />
      </div>

      {/* Productivity */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary-600" />
          <h2 className="font-semibold text-slate-900">{t('productivity')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('won_deals'), value: leadStats?.byStatus?.find((s: any) => s.status === 'won')?.cnt || 0, icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
            { label: t('in_progress'), value: leadStats?.byStatus?.find((s: any) => s.status === 'qualified')?.cnt || 0, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: t('task_completion'), value: `${taskStats?.completion_rate || 0}%`, icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: t('overdue_tasks'), value: taskStats?.overdue || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4`}>
              <Icon size={20} className={`${color} mb-2`} />
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead Pipeline Chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">{t('lead_pipeline')}</h2>
          {(leadStats?.total || 0) === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              {t('no_leads_yet')} <Link to="/leads" className="text-primary-600 hover:underline ml-1">{t('add_first_lead')}</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'Leads']} />
                <Bar dataKey="cnt" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Task Completion Donut */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">{t('task_status')}</h2>
          {(taskStats?.total || 0) === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              {t('no_tasks_yet')} <Link to="/tasks" className="text-primary-600 hover:underline ml-1">{t('create_task')}</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {taskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v, name]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">{t('recent_leads')}</h2>
            <Link to="/leads" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              {t('view_all')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {t('no_leads_yet')} <Link to="/leads" className="text-primary-600 hover:underline">{t('add_first_lead')}</Link>
              </div>
            ) : recentLeads.map((lead: any) => (
              <Link to={`/leads/${lead.id}`} key={lead.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                  {lead.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{lead.name}</p>
                  <p className="text-xs text-slate-400 truncate">{lead.company || lead.email || t('no_info')}</p>
                </div>
                <span className={`badge ${statusBadge[lead.status] || 'bg-slate-100 text-slate-600'}`}>{lead.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">{t('upcoming_tasks')}</h2>
            <Link to="/tasks" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              {t('view_all')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {t('no_tasks_yet')} <Link to="/tasks" className="text-primary-600 hover:underline">{t('create_task')}</Link>
              </div>
            ) : upcomingTasks.map((task: any) => {
              const due = formatDue(task.due_date)
              return (
                <div key={task.id} className="flex items-center gap-3 p-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                    {task.lead_name && <p className="text-xs text-slate-400">{task.lead_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                    {due && <span className={`text-xs font-medium ${due.color} flex items-center gap-1`}><Clock size={12} />{due.label}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Notes */}
      {recentNotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">{t('recent_notes')}</h2>
            <Link to="/notes" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              {t('view_all')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentNotes.map((note: any) => (
              <div key={note.id} className="rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                style={{ backgroundColor: note.color === '#ffffff' ? '#fffbeb' : note.color }}>
                <p className="font-medium text-slate-800 text-sm mb-1 truncate">{note.title}</p>
                <p className="text-xs text-slate-500 line-clamp-3">{note.content || 'No content'}</p>
                <p className="text-xs text-slate-400 mt-2">{format(parseISO(note.updated_at), 'MMM d')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
