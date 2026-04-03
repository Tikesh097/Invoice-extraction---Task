import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /api/formats - List all detected formats
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invoice_formats')
    .select('*')
    .order('usage_count', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/formats/:id - Remove a format template
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('invoice_formats').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
