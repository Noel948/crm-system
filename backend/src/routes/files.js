const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { auth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.png','.jpg','.jpeg','.gif','.zip','.txt','.csv'];
    path.extname(file.originalname).toLowerCase() in Object.fromEntries(allowed.map(e => [e, 1]))
      ? cb(null, true) : cb(new Error('Nem támogatott fájlformátum'));
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { lead_id, search } = req.query;
    let q = supabase.from('files').select('*, leads(name)').eq('user_id', req.user.id);
    if (lead_id) q = q.eq('lead_id', lead_id);
    if (search) q = q.ilike('original_name', `%${search}%`);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data.map(f => ({ ...f, lead_name: f.leads?.name || null, leads: undefined })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/upload', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Nincs feltöltött fájl' });
    const { lead_id } = req.body;
    const saved = [];
    for (const file of req.files) {
      const id = uuidv4();
      const { data, error } = await supabase.from('files').insert({
        id, user_id: req.user.id, lead_id: lead_id || null,
        original_name: file.originalname, stored_name: file.filename,
        mime_type: file.mimetype, size: file.size
      }).select().single();
      if (!error) saved.push(data);
    }
    res.status(201).json(saved);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { lead_id } = req.body;
    await supabase.from('files').update({ lead_id: lead_id || null }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: file } = await supabase.from('files').select('stored_name').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!file) return res.status(404).json({ error: 'Fájl nem található' });
    const filePath = path.join(__dirname, '../../uploads', file.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await supabase.from('files').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/download/:id', auth, async (req, res) => {
  try {
    const { data: file } = await supabase.from('files').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!file) return res.status(404).json({ error: 'Fájl nem található' });
    res.download(path.join(__dirname, '../../uploads', file.stored_name), file.original_name);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
