const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');

const PRIORITY_ORDER = { urgent: 1, high: 2, medium: 3, low: 4 };

router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, lead_id, due_soon } = req.query;
    let q = supabase.from('tasks').select('*, leads(name)').eq('user_id', req.user.id);
    if (status) q = q.eq('status', status);
    if (priority) q = q.eq('priority', priority);
    if (lead_id) q = q.eq('lead_id', lead_id);
    if (due_soon === 'true') q = q.lte('due_date', new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)).neq('status', 'done');
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    const tasks = data
      .map(t => ({ ...t, lead_name: t.leads?.name || null, leads: undefined }))
      .sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const { data: all } = await supabase.from('tasks').select('status, priority, due_date').eq('user_id', req.user.id);
    const total = all.length;
    const done = all.filter(t => t.status === 'done').length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = all.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length;
    const byStatus = ['todo', 'in_progress', 'done'].map(s => ({ status: s, cnt: all.filter(t => t.status === s).length }));
    res.json({ total, done, overdue, byStatus, completion_rate: total > 0 ? Math.round((done / total) * 100) : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('tasks').select('*, leads(name)').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Nem található' });
    res.json({ ...data, lead_name: data.leads?.name || null, leads: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, lead_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Cím kötelező' });
    const { data, error } = await supabase.from('tasks')
      .insert({
        id: uuidv4(),
        user_id: req.user.id,
        lead_id: lead_id || null,
        title: title.trim(),
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        due_date: due_date || null,
      })
      .select('*, leads(name)').single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ ...data, lead_name: data.leads?.name || null, leads: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, lead_id } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description || null;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (due_date !== undefined) updates.due_date = due_date || null;
    if (lead_id !== undefined) updates.lead_id = lead_id || null;
    if (status === 'done') updates.completed_at = new Date().toISOString();
    else if (status && status !== 'done') updates.completed_at = null;
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select('*, leads(name)').single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ...data, lead_name: data.leads?.name || null, leads: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
