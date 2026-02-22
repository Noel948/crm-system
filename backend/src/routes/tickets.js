const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    let q = supabase.from('tickets').select('*, user:users!tickets_user_id_fkey(name), assigned:users!tickets_assigned_to_fkey(name)');
    if (req.user.role !== 'admin') q = q.or(`user_id.eq.${req.user.id},assigned_to.eq.${req.user.id}`);
    if (status) q = q.eq('status', status);
    if (priority) q = q.eq('priority', priority);
    if (category) q = q.eq('category', category);
    q = q.order('updated_at', { ascending: false });
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data.map(t => ({ ...t, user_name: t.user?.name, assigned_name: t.assigned?.name, user: undefined, assigned: undefined })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', auth, async (req, res) => {
  try {
    let q = supabase.from('tickets').select('status');
    if (req.user.role !== 'admin') q = q.or(`user_id.eq.${req.user.id},assigned_to.eq.${req.user.id}`);
    const { data } = await q;
    const open = data.filter(t => t.status === 'open').length;
    const in_progress = data.filter(t => t.status === 'in_progress').length;
    const resolved = data.filter(t => t.status === 'resolved').length;
    res.json({ open, in_progress, resolved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { data: ticket, error } = await supabase.from('tickets')
      .select('*, user:users!tickets_user_id_fkey(name), assigned:users!tickets_assigned_to_fkey(name)')
      .eq('id', req.params.id).single();
    if (error || !ticket) return res.status(404).json({ error: 'Nem található' });
    const { data: messages } = await supabase.from('ticket_messages')
      .select('*, user:users(name, role)').eq('ticket_id', req.params.id).order('created_at');
    res.json({
      ...ticket,
      user_name: ticket.user?.name, assigned_name: ticket.assigned?.name,
      user: undefined, assigned: undefined,
      messages: (messages || []).map(m => ({ ...m, user_name: m.user?.name, user_role: m.user?.role, user: undefined }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Cím kötelező' });
    const id = uuidv4();
    const { data, error } = await supabase.from('tickets')
      .insert({ id, user_id: req.user.id, title, description: description || null, priority: priority || 'medium', category: category || 'general' })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (description) await supabase.from('ticket_messages').insert({ id: uuidv4(), ticket_id: id, user_id: req.user.id, message: description });
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, status, priority, category, assigned_to } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (category !== undefined) updates.category = category;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
    const { data, error } = await supabase.from('tickets').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: t } = await supabase.from('tickets').select('user_id').eq('id', req.params.id).single();
    if (!t) return res.status(404).json({ error: 'Nem található' });
    if (t.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Hozzáférés megtagadva' });
    await supabase.from('ticket_messages').delete().eq('ticket_id', req.params.id);
    await supabase.from('tickets').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { message, is_internal } = req.body;
    if (!message) return res.status(400).json({ error: 'Üzenet kötelező' });
    const id = uuidv4();
    await supabase.from('ticket_messages').insert({ id, ticket_id: req.params.id, user_id: req.user.id, message, is_internal: is_internal || false });
    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);
    const { data } = await supabase.from('ticket_messages').select('*, user:users(name, role)').eq('id', id).single();
    res.status(201).json({ ...data, user_name: data.user?.name, user_role: data.user?.role, user: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
