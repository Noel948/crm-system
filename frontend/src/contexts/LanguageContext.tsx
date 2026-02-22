import React, { createContext, useContext, useState, ReactNode } from 'react'

const translations = {
  hu: {
    // Nav
    dashboard: 'Vezérlőpult', leads: 'Leadek', prospect_finder: 'Prospect Kereső',
    notes: 'Jegyzetek', tasks: 'Feladatok', files: 'Fájlok',
    social_monitor: 'Social Monitor', tickets: 'Ticketek', admin_panel: 'Admin Panel',
    // Auth
    sign_out: 'Kijelentkezés', profile: 'Profil', settings: 'Beállítások',
    change_password: 'Jelszó módosítás', save: 'Mentés', cancel: 'Mégse',
    // Greetings
    good_morning: 'Jó reggelt', good_afternoon: 'Jó napot', good_evening: 'Jó estét',
    // Dashboard
    total_leads: 'Összes Lead', active_tasks: 'Aktív Feladatok',
    open_tickets: 'Nyitott Ticketek', recent_notes: 'Legújabb Jegyzetek',
    productivity: 'Produktivitás Áttekintés', won_deals: 'Megnyert Ügyletek',
    in_progress: 'Folyamatban', task_completion: 'Feladat Teljesítés',
    overdue_tasks: 'Késedelmes Feladatok', recent_leads: 'Legújabb Leadek',
    upcoming_tasks: 'Közelgő Feladatok', view_all: 'Összes megtekintése',
    lead_pipeline: 'Lead Csatorna', task_status: 'Feladatok Állapota',
    no_leads_yet: 'Még nincs lead.',
    no_tasks_yet: 'Nincs közelgő feladat.',
    add_first_lead: 'Add hozzá az első leadedet',
    create_task: 'Feladat létrehozása',
    new_lead: 'Új Lead',
    // Lead statuses
    status_new: 'Új', status_contacted: 'Megkeresett', status_qualified: 'Minősített',
    status_proposal: 'Ajánlat', status_won: 'Megnyert', status_lost: 'Elvesztett',
    // Leads page
    search_leads: 'Leadek keresése...', add_lead: 'Lead hozzáadása',
    all_statuses: 'Minden státusz', filter: 'Szűrő',
    name: 'Név', email: 'Email', phone: 'Telefon', company: 'Cég', position: 'Pozíció',
    website: 'Weboldal', address: 'Cím', source: 'Forrás', score: 'Pontszám',
    status: 'Státusz', created: 'Létrehozva', updated: 'Frissítve',
    actions: 'Műveletek', delete: 'Törlés', edit: 'Szerkesztés',
    no_leads: 'Nincs lead. Adj hozzá egyet!',
    lead_added: 'Lead hozzáadva', lead_updated: 'Lead frissítve', lead_deleted: 'Lead törölve',
    confirm_delete: 'Biztosan törlöd ezt a leadeot?',
    // Lead detail
    contact_info: 'Kapcsolati adatok', lead_details: 'Lead részletek',
    social_profiles: 'Közösségi profilok', overview: 'Áttekintés',
    recent_activity: 'Legújabb tevékenységek', no_activity: 'Még nincs tevékenység',
    ai_score: 'AI Pontszám', calculate_ai_score: 'AI Pontszám kiszámítása',
    scoring: 'Pontozás...', online_presence: 'Online jelenlét elemzése',
    web_presence: 'Web jelenlét', contact_completeness: 'Kapcsolati adatok',
    social_coverage: 'Közösségi profilok', online_mentions: 'Online megemlítések',
    website_content: 'Weboldal tartalom', top_mentions: 'Legfőbb megemlítések',
    no_social: 'Nincs közösségi profil hozzáadva',
    // Notes
    add_note: 'Megjegyzés hozzáadása', note_title: 'Cím', note_content: 'Tartalom',
    save_note: 'Megjegyzés mentése', no_notes: 'Még nincs megjegyzés',
    pin: 'Rögzítés', unpin: 'Rögzítés megszüntetése',
    // Tasks
    add_task: 'Feladat hozzáadása', task_title: 'Feladat neve',
    priority: 'Prioritás', due_date: 'Határidő', no_tasks: 'Még nincs feladat',
    done: 'Kész', todo: 'Teendő',
    priority_urgent: 'Sürgős', priority_high: 'Magas', priority_medium: 'Közepes', priority_low: 'Alacsony',
    // Files
    upload_files: 'Fájlok feltöltése', drag_drop: 'Húzd ide a fájlokat',
    or_click: 'vagy kattints a feltöltéshez', no_files: 'Nincs fájl ebben a mappában',
    download: 'Letöltés', new_folder: 'Új mappa', folder_name: 'Mappa neve',
    create_folder: 'Mappa létrehozása', all_files: 'Összes fájl', unfiled: 'Rendezetlen',
    folders: 'Mappák', size: 'Méret', uploaded: 'Feltöltve',
    move_to_folder: 'Mappába helyezés', link_to_lead: 'Lead hozzárendelés',
    // Social Monitor
    keyword: 'Kulcsszó', platforms: 'Platformok', create_monitor: 'Monitor létrehozása',
    refresh: 'Frissítés', no_monitors: 'Még nincs monitor. Hozz létre egyet!',
    no_results: 'Nincs találat. Frissítsd a monitort!',
    sentiment_positive: 'Pozitív', sentiment_neutral: 'Semleges', sentiment_negative: 'Negatív',
    demo_mode: 'Demo mód – adj meg FIRECRAWL_API_KEY-t valódi adatokhoz',
    real_data: 'Valódi adatok Firecrawl-lal',
    // Prospect Finder
    search_keyword: 'Kulcsszó keresés', industry: 'Iparág',
    find_prospects: 'Prospektek keresése', import_lead: 'Lead import',
    added: 'Hozzáadva', import_all: 'Összes importálása',
    social_media: 'Közösségi Média', google_maps: 'Google Maps', profile_scraper: 'Profil Scraper',
    // Profile modal
    full_name: 'Teljes név', current_password: 'Jelenlegi jelszó',
    new_password: 'Új jelszó', confirm_password: 'Jelszó megerősítése',
    language: 'Nyelv', profile_updated: 'Profil frissítve', password_changed: 'Jelszó megváltoztatva',
    // General
    loading: 'Betöltés...', error: 'Hiba', success: 'Sikeres',
    search: 'Keresés', close: 'Bezárás', back: 'Vissza',
    today: 'Ma', tomorrow: 'Holnap', all: 'Összes',
    no_info: 'Nincs adat', followers: 'Követő', posts: 'Poszt',
    match: '% egyezés', relevance: 'Relevancia',
  },
  en: {
    // Nav
    dashboard: 'Dashboard', leads: 'Leads', prospect_finder: 'Prospect Finder',
    notes: 'Notes', tasks: 'Tasks', files: 'Files',
    social_monitor: 'Social Monitor', tickets: 'Tickets', admin_panel: 'Admin Panel',
    // Auth
    sign_out: 'Sign out', profile: 'Profile', settings: 'Settings',
    change_password: 'Change Password', save: 'Save', cancel: 'Cancel',
    // Greetings
    good_morning: 'Good morning', good_afternoon: 'Good afternoon', good_evening: 'Good evening',
    // Dashboard
    total_leads: 'Total Leads', active_tasks: 'Active Tasks',
    open_tickets: 'Open Tickets', recent_notes: 'Recent Notes',
    productivity: 'Productivity Overview', won_deals: 'Won Deals',
    in_progress: 'In Progress', task_completion: 'Task Completion',
    overdue_tasks: 'Overdue Tasks', recent_leads: 'Recent Leads',
    upcoming_tasks: 'Upcoming Tasks', view_all: 'View all',
    lead_pipeline: 'Lead Pipeline', task_status: 'Task Status',
    no_leads_yet: 'No leads yet.',
    no_tasks_yet: 'No upcoming tasks.',
    add_first_lead: 'Add your first lead',
    create_task: 'Create a task',
    new_lead: 'New Lead',
    // Lead statuses
    status_new: 'New', status_contacted: 'Contacted', status_qualified: 'Qualified',
    status_proposal: 'Proposal', status_won: 'Won', status_lost: 'Lost',
    // Leads page
    search_leads: 'Search leads...', add_lead: 'Add Lead',
    all_statuses: 'All statuses', filter: 'Filter',
    name: 'Name', email: 'Email', phone: 'Phone', company: 'Company', position: 'Position',
    website: 'Website', address: 'Address', source: 'Source', score: 'Score',
    status: 'Status', created: 'Created', updated: 'Updated',
    actions: 'Actions', delete: 'Delete', edit: 'Edit',
    no_leads: 'No leads yet. Add one!',
    lead_added: 'Lead added', lead_updated: 'Lead updated', lead_deleted: 'Lead deleted',
    confirm_delete: 'Are you sure you want to delete this lead?',
    // Lead detail
    contact_info: 'Contact Info', lead_details: 'Lead Details',
    social_profiles: 'Social Profiles', overview: 'Overview',
    recent_activity: 'Recent Activity', no_activity: 'No activity yet',
    ai_score: 'AI Score', calculate_ai_score: 'Calculate AI Score',
    scoring: 'Scoring...', online_presence: 'Analyzing online presence',
    web_presence: 'Web Presence', contact_completeness: 'Contact Info',
    social_coverage: 'Social Profiles', online_mentions: 'Online Mentions',
    website_content: 'Website Content', top_mentions: 'Top Mentions',
    no_social: 'No social profiles linked',
    // Notes
    add_note: 'Add Note', note_title: 'Title', note_content: 'Content',
    save_note: 'Save Note', no_notes: 'No notes yet',
    pin: 'Pin', unpin: 'Unpin',
    // Tasks
    add_task: 'Add Task', task_title: 'Task name',
    priority: 'Priority', due_date: 'Due date', no_tasks: 'No tasks yet',
    done: 'Done', todo: 'To Do',
    priority_urgent: 'Urgent', priority_high: 'High', priority_medium: 'Medium', priority_low: 'Low',
    // Files
    upload_files: 'Upload Files', drag_drop: 'Drag files here',
    or_click: 'or click to upload', no_files: 'No files in this folder',
    download: 'Download', new_folder: 'New Folder', folder_name: 'Folder name',
    create_folder: 'Create Folder', all_files: 'All Files', unfiled: 'Unfiled',
    folders: 'Folders', size: 'Size', uploaded: 'Uploaded',
    move_to_folder: 'Move to Folder', link_to_lead: 'Link to Lead',
    // Social Monitor
    keyword: 'Keyword', platforms: 'Platforms', create_monitor: 'Create Monitor',
    refresh: 'Refresh', no_monitors: 'No monitors yet. Create one!',
    no_results: 'No results. Refresh the monitor!',
    sentiment_positive: 'Positive', sentiment_neutral: 'Neutral', sentiment_negative: 'Negative',
    demo_mode: 'Demo mode – add FIRECRAWL_API_KEY for real data',
    real_data: 'Real data via Firecrawl',
    // Prospect Finder
    search_keyword: 'Search keyword', industry: 'Industry',
    find_prospects: 'Find Prospects', import_lead: 'Import Lead',
    added: 'Added', import_all: 'Import All',
    social_media: 'Social Media', google_maps: 'Google Maps', profile_scraper: 'Profile Scraper',
    // Profile modal
    full_name: 'Full name', current_password: 'Current password',
    new_password: 'New password', confirm_password: 'Confirm password',
    language: 'Language', profile_updated: 'Profile updated', password_changed: 'Password changed',
    // General
    loading: 'Loading...', error: 'Error', success: 'Success',
    search: 'Search', close: 'Close', back: 'Back',
    today: 'Today', tomorrow: 'Tomorrow', all: 'All',
    no_info: 'No info', followers: 'followers', posts: 'posts',
    match: '% match', relevance: 'Relevance',
  },
}

type Lang = 'hu' | 'en'
type TranslationKey = keyof typeof translations.hu

interface LanguageContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('crm_lang') as Lang) || 'hu'
  })

  const setLang = (l: Lang) => {
    localStorage.setItem('crm_lang', l)
    setLangState(l)
  }

  const t = (key: TranslationKey): string => translations[lang][key] || translations.hu[key] || key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
