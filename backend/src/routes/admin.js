const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth, adminOnly } = require('../middleware/auth');

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'noelsivak@gmail.com').toLowerCase();

router.use(auth, adminOnly);

// Ensure owner is always protected
const isOwnerProtected = (user) => user.is_owner || user.email?.toLowerCase() === OWNER_EMAIL;

router.get('/stats', async (req, res) => {
  try {
    const [users, leads, tasks, notes, files, tickets, monitors, openTickets, leadsPerStatus, activity] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase.from('files').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('social_monitors').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('leads').select('status'),
      supabase.from('activity_log').select('*, users(name)').order('created_at', { ascending: false }).limit(20),
    ]);

    const statusCounts = {};
    (leadsPerStatus.data || []).forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

    const { data: usersData } = await supabase.from('users').select('id, name, email, role, is_owner, created_at');
    const taskCounts = {};
    const { data: tasksData } = await supabase.from('tasks').select('user_id');
    (tasksData || []).forEach(t => { taskCounts[t.user_id] = (taskCounts[t.user_id] || 0) + 1; });

    res.json({
      users: users.count || 0, leads: leads.count || 0, tasks: tasks.count || 0,
      notes: notes.count || 0, files: files.count || 0,
      tickets: tickets.count || 0, openTickets: openTickets.count || 0,
      monitors: monitors.count || 0,
      leadsPerStatus: Object.entries(statusCounts).map(([status, cnt]) => ({ status, cnt })),
      tasksPerUser: (usersData || []).map(u => ({ name: u.name, cnt: taskCounts[u.id] || 0 })).sort((a, b) => b.cnt - a.cnt).slice(0, 10),
      recentActivity: (activity.data || []).map(a => ({ ...a, user_name: a.users?.name, users: undefined })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const { data } = await supabase.from('users').select('id,name,email,role,company,phone,is_owner,created_at,last_login').order('created_at', { ascending: false });
    const { data: leadCounts } = await supabase.from('leads').select('user_id');
    const { data: taskCounts } = await supabase.from('tasks').select('user_id');
    const lc = {}, tc = {};
    (leadCounts || []).forEach(l => lc[l.user_id] = (lc[l.user_id] || 0) + 1);
    (taskCounts || []).forEach(t => tc[t.user_id] = (tc[t.user_id] || 0) + 1);
    res.json((data || []).map(u => ({ ...u, lead_count: lc[u.id] || 0, task_count: tc[u.id] || 0 })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, company, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Név, email és jelszó kötelező' });
    const { data: ex } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (ex) return res.status(400).json({ error: 'Ez az email már foglalt' });
    const id = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    const isOwner = email.toLowerCase() === OWNER_EMAIL;
    const { data, error } = await supabase.from('users')
      .insert({ id, name, email: email.toLowerCase(), password: hashed, role: isOwner ? 'admin' : (role || 'user'), company: company || null, phone: phone || null, is_owner: isOwner })
      .select('id,name,email,role,is_owner').single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { data: target } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (!target) return res.status(404).json({ error: 'Felhasználó nem található' });

    // Owner protection
    if (isOwnerProtected(target) && req.user.id !== target.id) {
      return res.status(403).json({ error: 'Az owner fiók nem módosítható más által' });
    }

    const { name, email, role, company, phone, password } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (company !== undefined) updates.company = company || null;
    if (phone !== undefined) updates.phone = phone || null;
    // Cannot change owner's role
    if (role && !isOwnerProtected(target)) updates.role = role;
    if (password) updates.password = await bcrypt.hash(password, 10);

    await supabase.from('users').update(updates).eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Saját magadat nem törölheted' });
    const { data: target } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (!target) return res.status(404).json({ error: 'Felhasználó nem található' });
    if (isOwnerProtected(target)) return res.status(403).json({ error: 'Az owner fiók nem törölhető' });
    await supabase.from('users').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/activity', async (req, res) => {
  try {
    const { limit = 50, user_id } = req.query;
    let q = supabase.from('activity_log').select('*, users(name)').order('created_at', { ascending: false }).limit(parseInt(limit));
    if (user_id) q = q.eq('user_id', user_id);
    const { data } = await q;
    res.json((data || []).map(a => ({ ...a, user_name: a.users?.name, users: undefined })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
