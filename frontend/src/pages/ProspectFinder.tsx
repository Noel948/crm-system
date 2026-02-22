import React, { useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import {
  Search, UserPlus, Twitter, Linkedin, Instagram, Facebook, Globe,
  Users, Star, CheckCircle, Loader2, MapPin, Building2, Phone, ExternalLink,
  Link, AlertCircle, Zap, Map
} from 'lucide-react'

// ─── Platform helpers ────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'twitter',   label: 'Twitter/X', icon: Twitter,   color: 'bg-sky-100 text-sky-600' },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,  color: 'bg-blue-100 text-blue-700' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-100 text-pink-600' },
  { id: 'facebook',  label: 'Facebook',  icon: Facebook,  color: 'bg-indigo-100 text-indigo-700' },
]
const platformIcon = (p: string) => {
  const map: Record<string, any> = { twitter: Twitter, linkedin: Linkedin, instagram: Instagram, facebook: Facebook }
  return map[p] || Globe
}
const platformColor: Record<string, string> = {
  twitter: 'text-sky-500', linkedin: 'text-blue-600', instagram: 'text-pink-500', facebook: 'text-indigo-600'
}
const formatCount = (n: number | null) =>
  n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString()

// ─── Reusable import button ──────────────────────────────────────────────────
function ImportBtn({ imported, loading, onClick }: { imported: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={imported || loading}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
        imported ? 'bg-green-100 text-green-700 cursor-default' : 'bg-primary-600 hover:bg-primary-700 text-white'
      }`}>
      {loading ? <Loader2 size={12} className="animate-spin" /> :
        imported ? <><CheckCircle size={12} /> Hozzáadva</> : <><UserPlus size={12} /> Lead import</>}
    </button>
  )
}

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'social',  label: 'Közösségi Média', icon: Users },
  { id: 'maps',    label: 'Google Maps',     icon: Map },
  { id: 'scraper', label: 'Profil Scraper',  icon: Link },
]

// ════════════════════════════════════════════════════════════════════════════
export default function ProspectFinder() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('social')

  // ── Social tab state ──
  const [keyword, setKeyword] = useState('')
  const [industry, setIndustry] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['twitter', 'linkedin', 'instagram', 'facebook'])
  const [limit, setLimit] = useState(12)
  const [socialResults, setSocialResults] = useState<any[]>([])
  const [socialSource, setSocialSource] = useState<string | null>(null)
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialImported, setSocialImported] = useState<Set<string>>(new Set())
  const [socialImportingId, setSocialImportingId] = useState<string | null>(null)

  // ── Maps tab state ──
  const [mapsQuery, setMapsQuery] = useState('')
  const [mapsLocation, setMapsLocation] = useState('')
  const [mapsType, setMapsType] = useState('')
  const [mapsResults, setMapsResults] = useState<any[]>([])
  const [mapsLoading, setMapsLoading] = useState(false)
  const [mapsImported, setMapsImported] = useState<Set<string>>(new Set())
  const [mapsImportingId, setMapsImportingId] = useState<string | null>(null)
  const [mapsError, setMapsError] = useState<string | null>(null)

  // ── Scraper tab state ──
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scrapeResult, setScrapeResult] = useState<any | null>(null)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeImported, setScrapeImported] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)

  // ─── Social handlers ────────────────────────────────────────────────────
  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(p => p !== id) : prev) : [...prev, id]
    )
  }

  const searchSocial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) { toast('error', 'Adj meg egy kulcsszót'); return }
    setSocialLoading(true); setSocialResults([]); setSocialSource(null)
    try {
      const { data } = await api.post('/social/prospect-finder', { keyword, industry, platforms: selectedPlatforms, limit })
      setSocialResults(data.results || data)
      setSocialSource(data.source || null)
      if ((data.results || data).length === 0) toast('info', 'Nem található eredmény. Próbálj más kulcsszót.')
    } catch { toast('error', 'Keresés sikertelen') }
    finally { setSocialLoading(false) }
  }

  const importSocialLead = async (profile: any) => {
    setSocialImportingId(profile.id)
    try {
      await api.post('/leads', {
        name: profile.name, email: profile.email || null,
        company: profile.company || null, position: profile.position || null,
        source: 'prospect_finder', score: profile.relevance_score || null,
        social_profiles: { [profile.platform]: profile.profile_url },
      })
      setSocialImported(prev => new Set([...prev, profile.id]))
      toast('success', `${profile.name} hozzáadva leadként`)
    } catch { toast('error', 'Import sikertelen') }
    finally { setSocialImportingId(null) }
  }

  // ─── Maps handlers ──────────────────────────────────────────────────────
  const searchMaps = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mapsQuery.trim()) { toast('error', 'Adj meg egy keresési kifejezést'); return }
    setMapsLoading(true); setMapsResults([]); setMapsError(null)
    try {
      const { data } = await api.post('/leads/search/google-maps', {
        query: mapsQuery, location: mapsLocation || undefined, type: mapsType || undefined
      })
      if (data.error) { setMapsError(data.error); return }
      setMapsResults(Array.isArray(data) ? data : (data.results || []))
      if ((data.results || []).length === 0) toast('info', 'Nem található eredmény ezen a területen.')
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Google Maps keresés sikertelen'
      setMapsError(msg)
    }
    finally { setMapsLoading(false) }
  }

  const importMapsLead = async (place: any) => {
    setMapsImportingId(place.place_id)
    try {
      await api.post('/leads', {
        name: place.name, company: place.name,
        address: place.address, phone: place.phone || null,
        website: place.website || null, source: 'google_maps',
        score: place.rating ? Math.round(place.rating * 20) : null,
      })
      setMapsImported(prev => new Set([...prev, place.place_id]))
      toast('success', `${place.name} hozzáadva leadként`)
    } catch { toast('error', 'Import sikertelen') }
    finally { setMapsImportingId(null) }
  }

  // ─── Scraper handler ────────────────────────────────────────────────────
  const scrapeProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scrapeUrl.trim()) { toast('error', 'Add meg a profil URL-t'); return }
    setScrapeLoading(true); setScrapeResult(null); setScrapeError(null); setScrapeImported(false)
    try {
      const { data } = await api.post('/social/scrape-profile', { url: scrapeUrl })
      setScrapeResult(data)
    } catch (err: any) {
      setScrapeError(err.response?.data?.error || 'Scraping sikertelen')
    }
    finally { setScrapeLoading(false) }
  }

  const importScrapedLead = async () => {
    if (!scrapeResult) return
    try {
      await api.post('/leads', {
        name: scrapeResult.name || 'Ismeretlen', email: scrapeResult.email || null,
        company: scrapeResult.company || null, position: scrapeResult.position || null,
        source: 'scraper',
        social_profiles: { [scrapeResult.platform]: scrapeResult.profile_url },
      })
      setScrapeImported(true)
      toast('success', 'Lead sikeresen importálva')
    } catch { toast('error', 'Import sikertelen') }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prospect Finder</h1>
        <p className="text-slate-500 text-sm mt-0.5">Valódi leadek keresése közösségi médiából és Google Maps-ből</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── SOCIAL TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          <div className="card p-6">
            <form onSubmit={searchSocial} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kulcsszó *</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={keyword} onChange={e => setKeyword(e.target.value)}
                      className="input pl-9" placeholder="pl. startup alapító, marketing igazgató..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Iparág (opcionális)</label>
                  <input value={industry} onChange={e => setIndustry(e.target.value)}
                    className="input" placeholder="pl. SaaS, fintech, egészségügy..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Platformok</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(({ id, label, icon: Icon, color }) => (
                    <button key={id} type="button" onClick={() => togglePlatform(id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        selectedPlatforms.includes(id)
                          ? `${color} border-transparent ring-2 ring-offset-1 ring-primary-400`
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>
                      <Icon size={15} />
                      {label}
                      {selectedPlatforms.includes(id) && <CheckCircle size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Max találat</label>
                  <select value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="input w-36">
                    {[8, 12, 20, 30].map(n => <option key={n} value={n}>{n} találat</option>)}
                  </select>
                </div>
                <button type="submit" disabled={socialLoading} className="btn-primary mt-6 px-8">
                  {socialLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {socialLoading ? 'Keresés...' : 'Keresés'}
                </button>
              </div>
            </form>
          </div>

          {/* Source indicator */}
          {socialSource === 'mock' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={16} />
              <strong>Demo mód:</strong> Az eredmények mintaadatok. Add meg a FIRECRAWL_API_KEY-t valódi kereséshez.
            </div>
          )}
          {socialSource === 'firecrawl' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
              <Zap size={16} />
              <strong>Valódi adatok:</strong> Az eredmények Firecrawl segítségével lettek lekérve.
            </div>
          )}

          {/* Loading */}
          {socialLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-slate-500">Keresés {selectedPlatforms.length} platformon...</p>
            </div>
          )}

          {/* Results */}
          {!socialLoading && socialResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">{socialResults.length} prospect találva: „{keyword}"</h2>
                <button onClick={() => Promise.all(socialResults.filter(r => !socialImported.has(r.id)).map(importSocialLead))}
                  className="btn-secondary text-sm">
                  <Users size={15} /> Összes importálása
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {socialResults.map((profile: any) => {
                  const PIcon = platformIcon(profile.platform)
                  const isImported = socialImported.has(profile.id)
                  return (
                    <div key={profile.id} className="card p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <img src={profile.avatar} alt={profile.name}
                          className="w-12 h-12 rounded-full bg-slate-100"
                          onError={e => { (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=6366f1&color=fff` }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-slate-900 truncate">{profile.name}</p>
                            {profile.verified && <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-400">{profile.username}</p>
                        </div>
                        <div className={`flex-shrink-0 ${platformColor[profile.platform] || 'text-slate-400'}`}>
                          <PIcon size={18} />
                        </div>
                      </div>
                      {(profile.position || profile.company) && (
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <Building2 size={12} />
                          {[profile.position, profile.company].filter(Boolean).join(' @ ')}
                        </p>
                      )}
                      {profile.location && (
                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                          <MapPin size={12} />{profile.location}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{profile.bio}</p>
                      {profile.followers != null && (
                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                          <span><strong className="text-slate-600">{formatCount(profile.followers)}</strong> követő</span>
                          {profile.posts != null && <span><strong className="text-slate-600">{formatCount(profile.posts)}</strong> poszt</span>}
                        </div>
                      )}
                      {profile.profile_url && (
                        <a href={profile.profile_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1 mb-3 truncate">
                          <ExternalLink size={11} /> Profil megtekintése
                        </a>
                      )}
                      <div className="flex items-center justify-between">
                        {profile.relevance_score != null ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Star size={12} className="text-amber-400" />
                            <span className="font-semibold text-slate-700">{profile.relevance_score}% egyezés</span>
                          </div>
                        ) : <span />}
                        <ImportBtn imported={isImported} loading={socialImportingId === profile.id}
                          onClick={() => importSocialLead(profile)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!socialLoading && socialResults.length === 0 && keyword && (
            <div className="text-center py-16">
              <Search size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Használd a fenti keresőt a prospektek megtalálásához</p>
            </div>
          )}
        </div>
      )}

      {/* ── MAPS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'maps' && (
        <div className="space-y-6">
          <div className="card p-6">
            <form onSubmit={searchMaps} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Keresés *</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={mapsQuery} onChange={e => setMapsQuery(e.target.value)}
                      className="input pl-9" placeholder="pl. ügyvédi iroda, étterem..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Helyszín</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={mapsLocation} onChange={e => setMapsLocation(e.target.value)}
                      className="input pl-9" placeholder="pl. Budapest, New York..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Típus (opcionális)</label>
                  <select value={mapsType} onChange={e => setMapsType(e.target.value)} className="input">
                    <option value="">Bármilyen</option>
                    <option value="restaurant">Étterem</option>
                    <option value="lawyer">Ügyvédi iroda</option>
                    <option value="doctor">Orvosi rendelő</option>
                    <option value="gym">Edzőterem</option>
                    <option value="store">Bolt</option>
                    <option value="real_estate_agency">Ingatlaniroda</option>
                    <option value="accounting">Könyvelő</option>
                    <option value="car_dealer">Autókereskedő</option>
                    <option value="beauty_salon">Szépségszalon</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={mapsLoading} className="btn-primary px-8">
                {mapsLoading ? <Loader2 size={16} className="animate-spin" /> : <Map size={16} />}
                {mapsLoading ? 'Keresés...' : 'Google Maps keresés'}
              </button>
            </form>
          </div>

          {mapsError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>Hiba:</strong> {mapsError}
                {mapsError.includes('GOOGLE_MAPS_API_KEY') && (
                  <p className="mt-1 text-xs">Add meg a GOOGLE_MAPS_API_KEY értékét a backend .env fájlban, és engedélyezd a Google Places API-t a Google Cloud Console-ban.</p>
                )}
              </div>
            </div>
          )}

          {mapsLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-slate-500">Google Maps keresés folyamatban...</p>
            </div>
          )}

          {!mapsLoading && mapsResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">{mapsResults.length} üzlet találva</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {mapsResults.map((place: any) => {
                  const isImported = mapsImported.has(place.place_id)
                  return (
                    <div key={place.place_id} className="card p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{place.name}</p>
                          {place.rating != null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star size={12} className="text-amber-400" />
                              <span className="text-xs text-slate-600 font-medium">{place.rating}</span>
                              {place.user_ratings_total && (
                                <span className="text-xs text-slate-400">({place.user_ratings_total} értékelés)</span>
                              )}
                            </div>
                          )}
                        </div>
                        {place.business_status === 'OPERATIONAL' && (
                          <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Nyitva</span>
                        )}
                      </div>
                      <div className="space-y-1.5 mb-4">
                        {place.address && (
                          <p className="text-xs text-slate-500 flex items-start gap-1.5">
                            <MapPin size={12} className="mt-0.5 flex-shrink-0" /> {place.address}
                          </p>
                        )}
                        {place.phone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone size={12} className="flex-shrink-0" /> {place.phone}
                          </p>
                        )}
                        {place.website && (
                          <a href={place.website} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1.5 truncate">
                            <Globe size={12} className="flex-shrink-0" /> {place.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {place.types?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {place.types.slice(0, 3).map((t: string) => (
                              <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {t.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ImportBtn imported={isImported} loading={mapsImportingId === place.place_id}
                        onClick={() => importMapsLead(place)} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!mapsLoading && mapsResults.length === 0 && !mapsError && (
            <div className="text-center py-16">
              <Map size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Google Maps Lead kereső</p>
              <p className="text-slate-400 text-sm mt-1">Keress üzleteket és vállalkozásokat Google Maps segítségével</p>
            </div>
          )}
        </div>
      )}

      {/* ── SCRAPER TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'scraper' && (
        <div className="space-y-6">
          <div className="card p-6">
            <p className="text-sm text-slate-600 mb-4">
              Illessz be egy LinkedIn, Twitter/X, Instagram vagy Facebook profil URL-t, és automatikusan kinyerjük az adatokat Firecrawl segítségével.
            </p>
            <form onSubmit={scrapeProfile} className="flex gap-3">
              <div className="relative flex-1">
                <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)}
                  className="input pl-9 w-full" placeholder="https://www.linkedin.com/in/example..." />
              </div>
              <button type="submit" disabled={scrapeLoading} className="btn-primary px-6">
                {scrapeLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {scrapeLoading ? 'Scraping...' : 'Adatok lekérése'}
              </button>
            </form>
          </div>

          {scrapeError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>Hiba:</strong> {scrapeError}
                {scrapeError.includes('FIRECRAWL_API_KEY') && (
                  <p className="mt-1 text-xs">Add meg a FIRECRAWL_API_KEY értékét a backend .env fájlban. Regisztrálj itt: firecrawl.dev</p>
                )}
              </div>
            </div>
          )}

          {scrapeLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-slate-500">Profil adatok kinyerése...</p>
            </div>
          )}

          {scrapeResult && !scrapeLoading && (
            <div className="card p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold">
                    {(scrapeResult.name || '?')[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{scrapeResult.name || 'Ismeretlen'}</h3>
                    {scrapeResult.position && (
                      <p className="text-sm text-slate-500">{scrapeResult.position}{scrapeResult.company ? ` @ ${scrapeResult.company}` : ''}</p>
                    )}
                    <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                      {scrapeResult.platform}
                    </span>
                  </div>
                </div>
                <ImportBtn imported={scrapeImported} loading={false} onClick={importScrapedLead} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {scrapeResult.bio && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Bio</p>
                    <p className="text-slate-700">{scrapeResult.bio}</p>
                  </div>
                )}
                {scrapeResult.location && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Helyszín</p>
                    <p className="text-slate-700 flex items-center gap-1"><MapPin size={14} />{scrapeResult.location}</p>
                  </div>
                )}
                {scrapeResult.email && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Email</p>
                    <p className="text-slate-700">{scrapeResult.email}</p>
                  </div>
                )}
                {scrapeResult.followers && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Követők</p>
                    <p className="text-slate-700">{formatCount(scrapeResult.followers)}</p>
                  </div>
                )}
                {scrapeResult.profile_url && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Profil URL</p>
                    <a href={scrapeResult.profile_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1 text-xs truncate">
                      <ExternalLink size={12} />{scrapeResult.profile_url}
                    </a>
                  </div>
                )}
              </div>

              {scrapeResult.raw && Object.keys(scrapeResult.raw).length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Nyers adatok megtekintése</summary>
                  <pre className="mt-2 text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-48 text-slate-600">
                    {JSON.stringify(scrapeResult.raw, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {!scrapeResult && !scrapeLoading && !scrapeError && (
            <div className="text-center py-16">
              <Link size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Profil Scraper</p>
              <p className="text-slate-400 text-sm mt-1">Illessz be egy profil URL-t a fenti mezőbe</p>
              <p className="text-xs text-slate-300 mt-1">LinkedIn · Twitter/X · Instagram · Facebook · TikTok</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
