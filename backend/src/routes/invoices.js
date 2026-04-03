import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /api/invoices - List all invoices with pagination & filtering
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 20,
    vendor,
    currency,
    status,
    from_date,
    to_date,
    is_duplicate,
    sort = 'created_at',
    order = 'desc',
  } = req.query;

  let query = supabaseAdmin
    .from('invoices')
    .select('*, invoice_files(original_name, public_url, mime_type)', { count: 'exact' });

  if (vendor) query = query.ilike('vendor_name', `%${vendor}%`);
  if (currency) query = query.eq('currency', currency.toUpperCase());
  if (from_date) query = query.gte('invoice_date', from_date);
  if (to_date) query = query.lte('invoice_date', to_date);
  if (is_duplicate !== undefined) query = query.eq('is_duplicate', is_duplicate === 'true');

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query = query
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    data,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / parseInt(limit)),
    },
  });
});

// GET /api/invoices/:id - Get single invoice with line items
router.get('/:id', async (req, res) => {
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, invoice_files(original_name, public_url, mime_type, file_size)')
    .eq('id', req.params.id)
    .single();

  if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', req.params.id)
    .order('id');

  res.json({ ...invoice, line_items: lineItems || [] });
});

// PUT /api/invoices/:id - Update invoice fields
router.put('/:id', async (req, res) => {
  const allowedFields = [
    'invoice_number', 'invoice_date', 'due_date', 'vendor_name', 'vendor_address',
    'vendor_email', 'client_name', 'client_address', 'subtotal', 'tax_amount',
    'tax_rate', 'discount_amount', 'total_amount', 'currency', 'payment_terms',
    'payment_method', 'notes',
  ];

  const updates = {};
  allowedFields.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('invoices').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/invoices/vendor/:vendorName - Get invoices by vendor
router.get('/vendor/:vendorName', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .ilike('vendor_name', `%${req.params.vendorName}%`)
    .order('invoice_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
