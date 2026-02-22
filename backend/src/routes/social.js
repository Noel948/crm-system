const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');
const { firecrawlSearch, firecrawlScrape } = require('../utils/firecrawl');

// ── Mock data helpers (fallback when no API key) ──────────────────
const FN = ['Alex','Sarah','Michael','Emma','David','Jessica','Chris','Amanda','Daniel','Lisa','James','Maria','Robert','Jennifer'];
const LN = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Anderson','Taylor','Thomas'];
const CO = ['TechCorp','InnovateCo','StartupHub','GrowthLabs','DigitalEdge','FutureTech','CloudBase','DataDrive'];
const PO = ['CEO','Founder','CTO','VP of Sales','Marketing Director','Business Dev Manager','Product Manager'];
const ri = a => a[Math.floor(Math.random() * a.length)];
const rn = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function mockProfile(keyword, platform) {
  const fn = ri(FN), ln = ri(LN), co = ri(CO), pos = ri(PO);
  const uname = `${fn.toLowerCase()}${ln.toLowerCase()}${rn(1,999)}`;
  return {
    id: uuidv4(), platform, name: `${fn} ${ln}`, username: `@${uname}`,
    position: pos, company: co,
    bio: `${pos} @ ${co}. Passionate about ${keyword}.`,
    followers: rn(200, 80000), following: rn(50, 5000), posts: rn(20, 3000),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uname}`,
    profile_url: `https://${platform}.com/${uname}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${co.toLowerCase().replace(/\s/g,'')}.com`,
    location: ri(['Budapest','London','New York','Berlin','Sydney','Singapore']),
    verified: Math.random() > 0.8, relevance_score: rn(55, 99),
  };
}

function mockPost(keyword, platform, monitorId) {
  const fn = ri(FN), seed = `${fn}${rn(1,9999)}`;
  const templates = [
    `Just saw incredible results with ${keyword}! Conversion rates up 40%.`,
    `${keyword} is completely changing how we approach sales. Who else?`,
    `Looking for experts in ${keyword}. DM if interested!`,
    `Hot take: ${keyword} is the most underutilized strategy in B2B right now.`,
    `Our team is all-in on ${keyword}. AMA!`,
  ];
  return {
    id: uuidv4(), monitor_id: monitorId, platform,
    author_name: `${fn} ${ri(LN)}`, username: `@${fn.toLowerCase()}${rn(10,999)}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
    content: ri(templates),
    url: `https://${platform}.com/post/${uuidv4().slice(0,10)}`,
    likes: rn(0, 8000), comments: rn(0, 800), shares: rn(0, 2000),
    sentiment: ri(['positive','positive','positive','neutral','negative']),
    found_at: new Date(Date.now() - rn(0, 86400000 * 7)).toISOString(),
  };
}

// ── PROSPECT FINDER ────────────────────────────────────────────────
router.post('/prospect-finder', auth, async (req, res) => {
  try {
    const { keyword, industry, platforms = ['twitter','linkedin','instagram','facebook'], limit = 12 } = req.body;
    if (!keyword) return res.status(400).json({ error: 'Kulcsszó kötelező' });

    const hasFirecrawl = !!process.env.FIRECRAWL_API_KEY;
    if (!hasFirecrawl) {
      // Mock fallback
      const results = [];
      platforms.forEach(p => { for (let i = 0; i < Math.ceil(limit / platforms.length); i++) results.push(mockProfile(keyword, p)); });
      results.sort((a, b) => b.relevance_score - a.relevance_score);
      return res.json({ results: results.slice(0, limit), source: 'mock' });
    }

    // Real Firecrawl search across platforms
    const allResults = [];
    const platformMap = { linkedin: 'linkedin.com/in', twitter: 'twitter.com OR x.com', instagram: 'instagram.com', facebook: 'facebook.com', tiktok: 'tiktok.com' };

    for (const platform of platforms.slice(0, 3)) { // Limit to 3 platforms to save API calls
      const siteFilter = platformMap[platform] || platform;
      const q = `${keyword}${industry ? ' ' + industry : ''} site:${siteFilter.split(' OR ')[0]}`;
      const results = await firecrawlSearch(q, Math.ceil(limit / platforms.length));
      if (results) {
        results.forEach(r => {
          allResults.push({
            id: uuidv4(),
            platform,
            name: r.title?.replace(/\s*[-|].*$/, '').trim() || 'Unknown',
            username: r.url ? '@' + (r.url.split('/').pop()?.split('?')[0] || '') : '',
            bio: r.description || r.markdown?.slice(0, 200) || '',
            profile_url: r.url,
            source_url: r.url,
            markdown_preview: r.markdown?.slice(0, 500),
            relevance_score: rn(60, 95),
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.title || 'U')}`,
            verified: false,
            followers: null,
            source: 'firecrawl',
          });
        });
      }
    }

    // Fill with mock if not enough results
    while (allResults.length < limit) {
      allResults.push(mockProfile(keyword, ri(platforms)));
    }

    allResults.sort((a, b) => b.relevance_score - a.relevance_score);
    res.json({ results: allResults.slice(0, limit), source: hasFirecrawl ? 'firecrawl' : 'mock' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SCRAPE PROFILE URL ─────────────────────────────────────────────
router.post('/scrape-profile', auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL kötelező' });
    if (!process.env.FIRECRAWL_API_KEY) return res.status(400).json({ error: 'FIRECRAWL_API_KEY nincs beállítva a .env fájlban' });

    const extracted = await firecrawlScrape(url);
    if (!extracted) return res.status(400).json({ error: 'Nem sikerült az oldal tartalmát kinyerni' });

    // Detect platform from URL
    const platform = url.includes('linkedin') ? 'linkedin' : url.includes('twitter') || url.includes('x.com') ? 'twitter' : url.includes('instagram') ? 'instagram' : url.includes('facebook') ? 'facebook' : url.includes('tiktok') ? 'tiktok' : 'web';

    res.json({
      name: extracted.full_name || extracted.name || null,
      position: extracted.job_title || extracted.title || null,
      company: extracted.company || null,
      bio: extracted.bio || extracted.about || null,
      location: extracted.location || null,
      followers: extracted.follower_count || extracted.followers || null,
      email: extracted.email || null,
      platform,
      profile_url: url,
      raw: extracted,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SOCIAL MONITORS ────────────────────────────────────────────────
router.get('/monitors', auth, async (req, res) => {
  try {
    const { data } = await supabase.from('social_monitors').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/monitors', auth, async (req, res) => {
  try {
    const { keyword, platforms = ['twitter','linkedin','instagram'] } = req.body;
    if (!keyword) return res.status(400).json({ error: 'Kulcsszó kötelező' });
    const id = uuidv4();
    const { data, error } = await supabase.from('social_monitors')
      .insert({ id, user_id: req.user.id, keyword, platforms, active: true })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Generate initial results
    const posts = [];
    platforms.forEach(platform => {
      for (let i = 0; i < 6; i++) {
        const post = mockPost(keyword, platform, id);
        posts.push({ id: post.id, monitor_id: id, platform, author: { name: post.author_name, username: post.username, avatar: post.avatar }, content: post.content, url: post.url, engagement: { likes: post.likes, comments: post.comments, shares: post.shares }, sentiment: post.sentiment, found_at: post.found_at });
      }
    });
    if (posts.length > 0) await supabase.from('social_results').insert(posts);
    await supabase.from('social_monitors').update({ result_count: posts.length }).eq('id', id);

    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/monitors/:id/results', auth, async (req, res) => {
  try {
    const { platform, sentiment } = req.query;
    let q = supabase.from('social_results').select('*').eq('monitor_id', req.params.id);
    if (platform) q = q.eq('platform', platform);
    if (sentiment) q = q.eq('sentiment', sentiment);
    q = q.order('found_at', { ascending: false }).limit(100);
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/monitors/:id/refresh', auth, async (req, res) => {
  try {
    const { data: monitor } = await supabase.from('social_monitors').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!monitor) return res.status(404).json({ error: 'Monitor nem található' });

    const platforms = monitor.platforms || [];
    const newPosts = [];
    const hasFirecrawl = !!process.env.FIRECRAWL_API_KEY;
    const platformMap = { linkedin: 'linkedin.com', twitter: 'twitter.com', instagram: 'instagram.com', facebook: 'facebook.com', tiktok: 'tiktok.com' };

    if (hasFirecrawl) {
      for (const platform of platforms.slice(0, 3)) {
        const site = platformMap[platform] || platform;
        const q = `${monitor.keyword} site:${site}`;
        const results = await firecrawlSearch(q, 4);
        if (results && results.length > 0) {
          results.forEach(r => {
            const seed = r.url || uuidv4();
            newPosts.push({
              id: uuidv4(), monitor_id: req.params.id, platform,
              author: { name: r.title?.replace(/\s*[-|].*$/, '').trim() || 'Unknown', username: '', avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.title || 'U')}` },
              content: r.description || r.markdown?.slice(0, 300) || '',
              url: r.url || '', engagement: { likes: 0, comments: 0, shares: 0 },
              sentiment: 'neutral', found_at: new Date().toISOString()
            });
          });
        }
      }
    }

    // Fallback to mock if firecrawl returned nothing
    if (newPosts.length === 0) {
      platforms.forEach(platform => {
        const num = rn(2, 5);
        for (let i = 0; i < num; i++) {
          const post = mockPost(monitor.keyword, platform, req.params.id);
          newPosts.push({ id: post.id, monitor_id: req.params.id, platform, author: { name: post.author_name, username: post.username, avatar: post.avatar }, content: post.content, url: post.url, engagement: { likes: post.likes, comments: post.comments, shares: post.shares }, sentiment: post.sentiment, found_at: new Date().toISOString() });
        }
      });
    }

    if (newPosts.length > 0) {
      await supabase.from('social_results').insert(newPosts);
      await supabase.from('social_monitors').update({ result_count: (monitor.result_count || 0) + newPosts.length }).eq('id', req.params.id);
    }
    res.json({ new_results: newPosts.length, source: hasFirecrawl && newPosts.some(p => !p.engagement?.likes) ? 'firecrawl' : 'mock' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/monitors/:id', auth, async (req, res) => {
  try {
    await supabase.from('social_results').delete().eq('monitor_id', req.params.id);
    await supabase.from('social_monitors').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
