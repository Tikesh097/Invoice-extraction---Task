import { z } from 'zod';

export const invoiceSchema = z.object({
  invoice_number: z.string().optional().nullable(),
  invoice_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  vendor_address: z.string().optional().nullable(),
  vendor_email: z.string().email().optional().nullable(),
  vendor_phone: z.string().optional().nullable(),
  vendor_tax_id: z.string().optional().nullable(),
  client_name: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  client_email: z.string().email().optional().nullable(),
  subtotal: z.number().optional().nullable(),
  tax_amount: z.number().optional().nullable(),
  tax_rate: z.number().optional().nullable(),
  discount_amount: z.number().optional().nullable(),
  total_amount: z.number().optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  bank_details: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  line_items: z.array(z.object({
    description: z.string().optional().nullable(),
    quantity: z.number().optional().nullable(),
    unit_price: z.number().optional().nullable(),
    amount: z.number().optional().nullable(),
    unit: z.string().optional().nullable(),
    tax_rate: z.number().optional().nullable(),
  })).optional().default([]),
});

export function validateInvoiceData(data) {
  try {
    const parsed = invoiceSchema.parse(data);
    return { success: true, data: parsed, errors: [] };
  } catch (err) {
    return {
      success: false,
      data: sanitizePartialData(data),
      errors: err.errors?.map(e => `${e.path.join('.')}: ${e.message}`) || [err.message],
    };
  }
}

function sanitizePartialData(data) {
  const sanitized = { ...data };
  const numericFields = ['subtotal', 'tax_amount', 'tax_rate', 'discount_amount', 'total_amount'];
  numericFields.forEach(field => {
    if (sanitized[field] !== null && sanitized[field] !== undefined) {
      const num = parseFloat(String(sanitized[field]).replace(/[,$]/g, ''));
      sanitized[field] = isNaN(num) ? null : num;
    }
  });
  if (!Array.isArray(sanitized.line_items)) sanitized.line_items = [];
  return sanitized;
}

export function calculateConfidenceScore(invoiceData) {
  const criticalFields = ['invoice_number', 'vendor_name', 'total_amount', 'invoice_date'];
  const importantFields = ['due_date', 'currency', 'subtotal', 'client_name'];
  const optionalFields = ['vendor_address', 'vendor_email', 'payment_terms', 'tax_amount'];

  let score = 0;
  let maxScore = 0;

  criticalFields.forEach(f => {
    maxScore += 40;
    if (invoiceData[f] !== null && invoiceData[f] !== undefined && invoiceData[f] !== '') score += 40;
  });

  importantFields.forEach(f => {
    maxScore += 20;
    if (invoiceData[f] !== null && invoiceData[f] !== undefined && invoiceData[f] !== '') score += 20;
  });

  optionalFields.forEach(f => {
    maxScore += 10;
    if (invoiceData[f] !== null && invoiceData[f] !== undefined && invoiceData[f] !== '') score += 10;
  });

  // Bonus for line items
  if (invoiceData.line_items && invoiceData.line_items.length > 0) score += 20;
  maxScore += 20;

  return Math.round((score / maxScore) * 100);
}
