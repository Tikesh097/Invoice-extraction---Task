import { supabaseAdmin } from '../config/supabase.js';
import logger from '../utils/logger.js';

// Calculate similarity between two vendor names
function vendorSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (n1 === n2) return 1.0;
  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;
  // Levenshtein-based similarity for short names
  const longer = Math.max(n1.length, n2.length);
  if (longer === 0) return 1.0;
  const distance = levenshteinDistance(n1, n2);
  return (longer - distance) / longer;
}

function levenshteinDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i-1] === s2[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

export async function findSimilarFormat(vendorName, currency) {
  if (!vendorName) return null;

  try {
    const { data: formats, error } = await supabaseAdmin
      .from('invoice_formats')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error || !formats?.length) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const format of formats) {
      const vendorScore = vendorSimilarity(vendorName, format.vendor_name);
      const currencyBonus = currency && format.typical_currency === currency ? 0.1 : 0;
      const totalScore = vendorScore + currencyBonus;

      if (totalScore > bestScore && vendorScore > 0.75) {
        bestScore = totalScore;
        bestMatch = { ...format, similarity: totalScore };
      }
    }

    if (bestMatch) {
      logger.info(`Found similar format: ${bestMatch.vendor_name} (similarity: ${bestMatch.similarity.toFixed(2)})`);
    }

    return bestMatch;
  } catch (err) {
    logger.error('Format detection error:', err);
    return null;
  }
}

export async function saveOrUpdateFormat(invoiceData) {
  if (!invoiceData.vendor_name) return;

  try {
    const vendorKey = invoiceData.vendor_name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    
    const { data: existing } = await supabaseAdmin
      .from('invoice_formats')
      .select('*')
      .eq('vendor_key', vendorKey)
      .single();

    const formatTemplate = {
      typical_fields: Object.keys(invoiceData).filter(k => invoiceData[k] !== null && k !== 'line_items'),
      has_line_items: invoiceData.line_items?.length > 0,
      typical_currency: invoiceData.currency,
      sample_structure: {
        has_tax: invoiceData.tax_amount !== null,
        has_discount: invoiceData.discount_amount !== null,
        has_due_date: invoiceData.due_date !== null,
        line_items_count: invoiceData.line_items?.length || 0,
      },
    };

    if (existing) {
      await supabaseAdmin
        .from('invoice_formats')
        .update({
          usage_count: existing.usage_count + 1,
          format_template: formatTemplate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from('invoice_formats').insert({
        vendor_name: invoiceData.vendor_name,
        vendor_key: vendorKey,
        format_template: formatTemplate,
        typical_currency: invoiceData.currency,
        usage_count: 1,
      });
    }
  } catch (err) {
    logger.error('Format save error:', err);
  }
}

export function generateFormatHint(format) {
  if (!format?.format_template) return null;
  const t = format.format_template;
  return `This appears to be an invoice from "${format.vendor_name}". 
Typical currency: ${format.typical_currency || 'Unknown'}.
Expected fields: ${t.typical_fields?.join(', ')}.
Has line items: ${t.has_line_items}.
Has tax: ${t.sample_structure?.has_tax}.
Has discount: ${t.sample_structure?.has_discount}.`;
}
