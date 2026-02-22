const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { lead_id, search, pinned } = req.query;
    let q = supabase.from('notes').select('*, leads(name)').eq('user_id', req.user.id);
    if (lead_id) q = q.eq('lead_id', lead_id);
    if (pinned === 'true') q = q.eq('pinned', true);
    if (search) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    q = q.order('pinned', { ascending: false }).order('updated_at', { ascending: false });
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data.map(n => ({ ...n, lead_name: n.leads?.name || null, leads: undefined })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, color, pinned, lead_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Cím kötelező' });
    const { data, error } = await supabase.from('notes')
      .insert({ id: uuidv4(), user_id: req.user.id, lead_id: lead_id || null, title, content: content || '', color: color || '#ffffff', pinned: pinned || false })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (lead_id) await supabase.from('leads').update({ notes_count: supabase.raw('notes_count + 1') }).eq('id', lead_id);
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, color, pinned, lead_id } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (color !== undefined) updates.color = color;
    if (pinned !== undefined) updates.pinned = pinned;
    if (lead_id !== undefined) updates.lead_id = lead_id || null;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('notes').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: note } = await supabase.from('notes').select('lead_id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!note) return res.status(404).json({ error: 'Nem található' });
    await supabase.from('notes').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
