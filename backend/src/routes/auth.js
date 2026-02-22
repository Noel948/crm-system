const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'nexacrm-secret';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'noelsivak@gmail.com').toLowerCase();

function makeToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, company, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Név, email és jelszó kötelező' });
    if (password.length < 6) return res.status(400).json({ error: 'A jelszó legalább 6 karakter legyen' });
    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Ez az email már foglalt' });
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const isOwner = email.toLowerCase() === OWNER_EMAIL;
    const role = (count === 0 || isOwner) ? 'admin' : 'user';
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const { data: user, error } = await supabase.from('users')
      .insert({ id, name, email: email.toLowerCase(), password: hashed, role, company: company || null, phone: phone || null, is_owner: isOwner })
      .select('id, name, email, role, company, phone, is_owner').single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ token: makeToken(user), user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email és jelszó kötelező' });
    const { data: user } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (!user) return res.status(400).json({ error: 'Helytelen email vagy jelszó' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Helytelen email vagy jelszó' });
    if (user.email === OWNER_EMAIL && user.role !== 'admin') {
      await supabase.from('users').update({ role: 'admin', is_owner: true }).eq('id', user.id);
      user.role = 'admin'; user.is_owner = true;
    }
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
    res.json({ token: makeToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company, phone: user.phone, is_owner: user.is_owner } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', auth, async (req, res) => {
  const { data } = await supabase.from('users').select('id,name,email,role,company,phone,is_owner,created_at,last_login').eq('id', req.user.id).single();
  if (!data) return res.status(404).json({ error: 'Nem található' });
  res.json(data);
});

router.put('/me', auth, async (req, res) => {
  const { name, company, phone } = req.body;
  await supabase.from('users').update({ name, company, phone }).eq('id', req.user.id);
  res.json({ success: true });
});

router.put('/me/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  const { data: u } = await supabase.from('users').select('password').eq('id', req.user.id).single();
  if (!await bcrypt.compare(current_password, u.password)) return res.status(400).json({ error: 'Jelenlegi jelszó helytelen' });
  await supabase.from('users').update({ password: await bcrypt.hash(new_password, 10) }).eq('id', req.user.id);
  res.json({ success: true });
});

module.exports = router;
