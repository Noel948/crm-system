const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');
const { firecrawlSearch, firecrawlScrape } = require('../utils/firecrawl');

const logActivity = async (userId, action, entityId, details) => {
  await supabase.from('activity_log').insert({ id: uuidv4(), user_id: userId, action, entity_type: 'lead', entity_id: entityId, details });
};

// GET all leads
router.get('/', auth, async (req, res) => {
  try {
    const { status, search, source } = req.query;
    let q = supabase.from('leads').select('*').eq('user_id', req.user.id);
    if (status && status !== 'all') q = q.eq('status', status);
    if (source) q = q.eq('source', source);
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    q = q.order('updated_at', { ascending: false });
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { data: all } = await supabase.from('leads').select('status, source').eq('user_id', req.user.id);
    const { data: recent } = await supabase.from('leads').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(5);
    const byStatus = {};
    const bySource = {};
    (all || []).forEach(l => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      bySource[l.source] = (bySource[l.source] || 0) + 1;
    });
    res.json({
      total: all.length,
      byStatus: Object.entries(byStatus).map(([status, cnt]) => ({ status, cnt })),
      bySource: Object.entries(bySource).map(([source, cnt]) => ({ source, cnt })),
      recent: recent || []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Google Maps Places search
router.post('/search/google-maps', auth, async (req, res) => {
  try {
    const { query, location, radius = 5000, type } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'GOOGLE_MAPS_API_KEY nincs beállítva a .env fájlban' });
    if (!query) return res.status(400).json({ error: 'Keresési kifejezés kötelező' });

    const searchQuery = location ? `${query} in ${location}` : query;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}${type ? `&type=${type}` : ''}`;
    const { data: searchData } = await axios.get(textSearchUrl);

    if (searchData.status === 'REQUEST_DENIED') return res.status(400).json({ error: 'Google Maps API kulcs érvénytelen vagy a Places API nincs engedélyezve' });
    if (searchData.status === 'ZERO_RESULTS') return res.json([]);

    // Get details for first 10 results (phone + website)
    const places = searchData.results.slice(0, 10);
    const leads = await Promise.all(places.map(async (place) => {
      let phone = null, website = null;
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,opening_hours&key=${apiKey}`;
        const { data: details } = await axios.get(detailsUrl);
        phone = details.result?.formatted_phone_number || null;
        website = details.result?.website || null;
      } catch (_) {}
      return {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone,
        website,
        rating: place.rating || null,
        user_ratings_total: place.user_ratings_total || 0,
        types: (place.types || []).filter(t => !['point_of_interest','establishment'].includes(t)).slice(0, 3),
        place_id: place.place_id,
        location: place.geometry?.location,
        business_status: place.business_status,
      };
    }));
    res.json(leads);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('leads').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Lead nem található' });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create lead
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, company, position, status, source, score, social_profiles, tags, address, website, place_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Név kötelező' });
    const id = uuidv4();
    const { data, error } = await supabase.from('leads').insert({
      id, user_id: req.user.id, name,
      email: email || null, phone: phone || null,
      company: company || null, position: position || null,
      status: status || 'new', source: source || 'manual',
      score: score || 0,
      social_profiles: social_profiles || {},
      tags: tags || [],
      address: address || null, website: website || null,
      place_id: place_id || null,
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(req.user.id, 'created_lead', id, `Létrehozott lead: ${name}`);
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update lead
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, company, position, status, source, score, social_profiles, tags, address, website } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (company !== undefined) updates.company = company || null;
    if (position !== undefined) updates.position = position || null;
    if (status !== undefined) updates.status = status;
    if (source !== undefined) updates.source = source;
    if (score !== undefined) updates.score = score;
    if (social_profiles !== undefined) updates.social_profiles = social_profiles;
    if (tags !== undefined) updates.tags = tags;
    if (address !== undefined) updates.address = address || null;
    if (website !== undefined) updates.website = website || null;
    const { data, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Lead nem található' });
    await logActivity(req.user.id, 'updated_lead', req.params.id, `Frissített lead: ${data.name}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: lead } = await supabase.from('leads').select('name').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!lead) return res.status(404).json({ error: 'Lead nem található' });
    await supabase.from('leads').delete().eq('id', req.params.id);
    await logActivity(req.user.id, 'deleted_lead', req.params.id, `Törölt lead: ${lead.name}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/notes', auth, async (req, res) => {
  const { data } = await supabase.from('notes').select('*').eq('lead_id', req.params.id).order('pinned', { ascending: false }).order('updated_at', { ascending: false });
  res.json(data || []);
});

router.get('/:id/tasks', auth, async (req, res) => {
  const { data } = await supabase.from('tasks').select('*').eq('lead_id', req.params.id).eq('user_id', req.user.id);
  res.json(data || []);
});

router.get('/:id/files', auth, async (req, res) => {
  const { data } = await supabase.from('files').select('*').eq('lead_id', req.params.id).eq('user_id', req.user.id).order('created_at', { ascending: false });
  res.json(data || []);
});

router.get('/:id/activity', auth, async (req, res) => {
  const { data } = await supabase.from('activity_log').select('*, users(name)').eq('entity_id', req.params.id).order('created_at', { ascending: false }).limit(50);
  res.json((data || []).map(a => ({ ...a, user_name: a.users?.name, users: undefined })));
});

// AI Score - analyze lead's online presence
router.post('/:id/ai-score', auth, async (req, res) => {
  try {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!lead) return res.status(404).json({ error: 'Lead nem található' });

    const hasFirecrawl = !!process.env.FIRECRAWL_API_KEY;

    // Base scores from existing data
    const webPresenceScore = lead.website ? 25 : 0;
    const contactScore = (lead.email ? 10 : 0) + (lead.phone ? 10 : 0);
    const socialScore = Math.min(Object.keys(lead.social_profiles || {}).length * 10, 30);

    if (!hasFirecrawl) {
      const total = Math.min(webPresenceScore + contactScore + socialScore, 100);
      return res.json({
        score: total,
        breakdown: { web_presence: webPresenceScore, contact_info: contactScore, social_profiles: socialScore, online_mentions: 0, website_content: 0 },
        mentions: [],
        source: 'basic',
        summary: 'FIRECRAWL_API_KEY nélkül csak az ismert adatok alapján pontozunk.'
      });
    }

    // Firecrawl: search for mentions
    const searchQuery = `"${lead.name}"${lead.company ? ` "${lead.company}"` : ''}`;
    let mentions = [];
    try {
      const results = await firecrawlSearch(searchQuery, 5);
      mentions = (results || []).slice(0, 3);
    } catch (_) {}

    const mentionsScore = Math.min((mentions.length) * 7, 20);

    // Firecrawl: scrape website if available
    let websiteScore = 0;
    let websiteData = null;
    if (lead.website) {
      try {
        websiteData = await firecrawlScrape(lead.website);
        if (websiteData) websiteScore = 15;
      } catch (_) {}
    }

    const total = Math.min(webPresenceScore + contactScore + socialScore + mentionsScore + websiteScore, 100);

    // Save score back to lead
    await supabase.from('leads').update({ score: total }).eq('id', req.params.id);
    await logActivity(req.user.id, 'ai_scored', req.params.id, `AI Pontszám kiszámítva: ${total}/100`);

    res.json({
      score: total,
      breakdown: {
        web_presence: webPresenceScore,
        contact_info: contactScore,
        social_profiles: socialScore,
        online_mentions: mentionsScore,
        website_content: websiteScore
      },
      mentions: mentions.map(m => ({ url: m.url, title: m.title, description: m.description })),
      website_summary: websiteData,
      source: 'firecrawl'
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
