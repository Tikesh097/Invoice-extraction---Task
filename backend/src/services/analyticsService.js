import { supabaseAdmin } from '../config/supabase.js';
import logger from '../utils/logger.js';

/**
 * Get aggregated vendor spend data
 */
export async function getVendorSpend(fromDate, toDate, limit = 10) {
  let query = supabaseAdmin
    .from('invoices')
    .select('vendor_name, total_amount, currency')
    .eq('is_duplicate', false)
    .not('vendor_name', 'is', null);

  if (fromDate) query = query.gte('invoice_date', fromDate);
  if (toDate) query = query.lte('invoice_date', toDate);

  const { data, error } = await query;
  if (error) throw error;

  const map = {};
  data.forEach(inv => {
    const k = inv.vendor_name?.trim();
    if (!k) return;
    if (!map[k]) map[k] = { vendor_name: k, total_spend: 0, invoice_count: 0 };
    map[k].total_spend += inv.total_amount || 0;
    map[k].invoice_count += 1;
  });

  return Object.values(map)
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, limit);
}

/**
 * Normalize vendor names (merge similar names)
 */
export function normalizeVendorName(name) {
  if (!name) return name;
  return name
    .replace(/\b(inc|llc|ltd|corp|co|company|limited|incorporated|pvt|private)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
