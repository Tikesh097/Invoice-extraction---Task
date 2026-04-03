import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /api/analytics/summary - Overall summary
router.get('/summary', async (req, res) => {
  const { from_date, to_date } = req.query;

  let query = supabaseAdmin.from('invoices').select('total_amount, currency, vendor_name, invoice_date, is_duplicate, confidence_score');
  if (from_date) query = query.gte('invoice_date', from_date);
  if (to_date) query = query.lte('invoice_date', to_date);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const validInvoices = data.filter(i => !i.is_duplicate);
  const totalSpend = validInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const uniqueVendors = new Set(validInvoices.map(i => i.vendor_name).filter(Boolean)).size;
  const avgConfidence = validInvoices.reduce((sum, i) => sum + (i.confidence_score || 0), 0) / (validInvoices.length || 1);

  res.json({
    total_invoices: data.length,
    valid_invoices: validInvoices.length,
    duplicate_invoices: data.filter(i => i.is_duplicate).length,
    total_spend: parseFloat(totalSpend.toFixed(2)),
    unique_vendors: uniqueVendors,
    avg_confidence_score: parseFloat(avgConfidence.toFixed(1)),
  });
});

// GET /api/analytics/vendor-spend - Spend by vendor
router.get('/vendor-spend', async (req, res) => {
  const { from_date, to_date, limit = 10 } = req.query;

  let query = supabaseAdmin
    .from('invoices')
    .select('vendor_name, total_amount, currency')
    .eq('is_duplicate', false)
    .not('vendor_name', 'is', null);

  if (from_date) query = query.gte('invoice_date', from_date);
  if (to_date) query = query.lte('invoice_date', to_date);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Group by vendor
  const vendorMap = {};
  data.forEach(inv => {
    const key = inv.vendor_name?.trim();
    if (!key) return;
    if (!vendorMap[key]) vendorMap[key] = { vendor_name: key, total_spend: 0, invoice_count: 0, currencies: {} };
    vendorMap[key].total_spend += inv.total_amount || 0;
    vendorMap[key].invoice_count += 1;
    const curr = inv.currency || 'USD';
    vendorMap[key].currencies[curr] = (vendorMap[key].currencies[curr] || 0) + (inv.total_amount || 0);
  });

  const result = Object.values(vendorMap)
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, parseInt(limit))
    .map(v => ({ ...v, total_spend: parseFloat(v.total_spend.toFixed(2)) }));

  res.json(result);
});

// GET /api/analytics/monthly-trends - Monthly spend trends
router.get('/monthly-trends', async (req, res) => {
  const { months = 12 } = req.query;
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - parseInt(months));

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('invoice_date, total_amount, currency')
    .eq('is_duplicate', false)
    .gte('invoice_date', fromDate.toISOString().split('T')[0])
    .not('total_amount', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  const monthMap = {};
  data.forEach(inv => {
    if (!inv.invoice_date) return;
    const month = inv.invoice_date.substring(0, 7); // YYYY-MM
    if (!monthMap[month]) monthMap[month] = { month, total_spend: 0, invoice_count: 0 };
    monthMap[month].total_spend += inv.total_amount || 0;
    monthMap[month].invoice_count += 1;
  });

  const result = Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({ ...m, total_spend: parseFloat(m.total_spend.toFixed(2)) }));

  res.json(result);
});

// GET /api/analytics/currency-totals - Currency-wise totals
router.get('/currency-totals', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('currency, total_amount')
    .eq('is_duplicate', false)
    .not('total_amount', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  const currMap = {};
  data.forEach(inv => {
    const curr = inv.currency || 'Unknown';
    if (!currMap[curr]) currMap[curr] = { currency: curr, total: 0, count: 0 };
    currMap[curr].total += inv.total_amount || 0;
    currMap[curr].count += 1;
  });

  const result = Object.values(currMap)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ ...c, total: parseFloat(c.total.toFixed(2)) }));

  res.json(result);
});

// GET /api/analytics/status - Processing status breakdown
router.get('/status', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invoice_files')
    .select('status');

  if (error) return res.status(500).json({ error: error.message });

  const statusMap = {};
  data.forEach(f => {
    statusMap[f.status] = (statusMap[f.status] || 0) + 1;
  });

  res.json(statusMap);
});

// GET /api/analytics/confidence-distribution
router.get('/confidence', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('confidence_score');

  if (error) return res.status(500).json({ error: error.message });

  const buckets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-90': 0, '91-100': 0 };
  data.forEach(inv => {
    const s = inv.confidence_score || 0;
    if (s <= 25) buckets['0-25']++;
    else if (s <= 50) buckets['26-50']++;
    else if (s <= 75) buckets['51-75']++;
    else if (s <= 90) buckets['76-90']++;
    else buckets['91-100']++;
  });

  res.json(buckets);
});

export default router;
