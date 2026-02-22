import React from 'react'
import { Link } from 'react-router-dom'
import { Target, Users, Search, CheckSquare, FolderOpen, Radio, Ticket, BarChart2, Shield, ArrowRight, Star, Zap, Globe, Lock } from 'lucide-react'

const features = [
  { icon: Users, title: 'Lead Management', desc: 'Track leads through every stage of your pipeline with smart status tracking and scoring.' },
  { icon: Search, title: 'Prospect Finder', desc: 'Discover new leads across social platforms with our AI-powered prospect finder.' },
  { icon: Radio, title: 'Social Monitor', desc: 'Monitor brand mentions and keywords across all major social media platforms in real time.' },
  { icon: CheckSquare, title: 'Task System', desc: 'Stay on top of your work with priority tasks, due dates, and lead-linked action items.' },
  { icon: FolderOpen, title: 'File Management', desc: 'Upload, organize, and link documents directly to your leads and contacts.' },
  { icon: Ticket, title: 'Ticket System', desc: 'Handle support requests efficiently with a full-featured helpdesk ticketing system.' },
  { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Get a bird\'s-eye view of your productivity, pipeline health, and team performance.' },
  { icon: Shield, title: 'Admin Control', desc: 'Full admin panel for user management, permissions, and system configuration.' },
]

const stats = [
  { value: '10k+', label: 'Active Users' },
  { value: '500k+', label: 'Leads Managed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'User Rating' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-100 sticky top-0 z-50 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Target size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">NexaCRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <Zap size={14} className="text-yellow-300" />
            <span>The all-in-one CRM platform for modern teams</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Grow your business<br />
            <span className="text-primary-300">smarter, faster.</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
            NexaCRM combines lead management, social media monitoring, task tracking, and file management — all in one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-3 rounded-xl text-lg transition-colors shadow-lg">
              Start for free <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 font-semibold px-8 py-3 rounded-xl text-lg transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary-950 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold text-primary-300 mb-1">{value}</div>
                <div className="text-white/60 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything you need to grow</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From finding new prospects to closing deals and managing support — NexaCRM has every tool your team needs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <Icon size={22} className="text-primary-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get started in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up for free in seconds. No credit card required.' },
              { step: '02', title: 'Add your leads', desc: 'Import or add leads manually. Or use our prospect finder to discover new ones.' },
              { step: '03', title: 'Close more deals', desc: 'Track progress, set tasks, monitor social media, and close deals faster.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">{step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to supercharge your sales?</h2>
          <p className="text-xl text-white/80 mb-8">Join thousands of teams already using NexaCRM to grow faster.</p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-xl">
            Start for free today <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white/60 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
              <Target size={14} className="text-white" />
            </div>
            <span className="font-semibold text-white">NexaCRM</span>
          </div>
          <p className="text-sm">© 2024 NexaCRM. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm">
            <Lock size={14} />
            <span>Enterprise-grade security</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
