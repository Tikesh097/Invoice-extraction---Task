import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import { validateInvoiceData, calculateConfidenceScore } from '../utils/validation.js';
import logger from '../utils/logger.js';

// ================= PROMPTS =================
const EXTRACTION_PROMPT = `You are an expert invoice data extraction AI. Extract ALL structured data from this invoice.

Return ONLY a valid JSON object with these exact fields (use null for missing fields):
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD format or null",
  "due_date": "YYYY-MM-DD format or null",
  "vendor_name": "string or null",
  "vendor_address": "string or null",
  "vendor_email": "string or null",
  "vendor_phone": "string or null",
  "vendor_tax_id": "string or null",
  "client_name": "string or null",
  "client_address": "string or null",
  "client_email": "string or null",
  "subtotal": number or null,
  "tax_amount": number or null,
  "tax_rate": number or null,
  "discount_amount": number or null,
  "total_amount": number or null,
  "currency": "3-letter currency code like USD, EUR, INR or null",
  "payment_terms": "string or null",
  "payment_method": "string or null",
  "bank_details": "string or null",
  "notes": "string or null",
  "line_items": [
    {
      "description": "string",
      "quantity": number or null,
      "unit_price": number or null,
      "amount": number or null,
      "unit": "string or null",
      "tax_rate": number or null
    }
  ]
}

Rules:
- Return ONLY JSON (no explanation, no markdown)
- All amounts must be numbers
- Dates must be YYYY-MM-DD
- If missing → null
`;

const FORMAT_HINT_PROMPT = (hint) => `
Use this previously learned template:
${hint}
`;

// ================= GEMINI CALL =================
async function callGemini(promptText) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ]
    }
  );

  const output = res.data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!output) throw new Error('Empty Gemini response');

  // Clean JSON
  const clean = output.replace(/```json|```/g, '').trim();

  return clean;
}

// ================= IMAGE EXTRACTION =================
export async function extractFromImage(fileBuffer, mimeType, formatHint = null) {
  try {
    logger.info('Running OCR on image...');

    const { data } = await Tesseract.recognize(fileBuffer, 'eng');

    const rawText = data.text;

    logger.info('OCR completed, sending to Gemini...');

    return await extractFromText(rawText, formatHint);

  } catch (err) {
    logger.error('Image extraction error:', err);
    throw new Error(`Extraction failed: ${err.message}`);
  }
}

// ================= PDF EXTRACTION =================
export async function extractFromPDF(fileBuffer, formatHint = null) {
  try {
    let rawText = '';

    try {
      const pdfData = await pdfParse(fileBuffer);
      rawText = pdfData.text;
    } catch (err) {
      logger.warn('PDF parse failed, fallback to OCR:', err.message);
    }

    if (rawText && rawText.trim().length > 50) {
      return await extractFromText(rawText, formatHint);
    }

    // Fallback OCR for PDF
    logger.info('Using OCR fallback for PDF');

    const { data } = await Tesseract.recognize(fileBuffer, 'eng');
    return await extractFromText(data.text, formatHint);

  } catch (err) {
    logger.error('PDF extraction error:', err);
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

// ================= TEXT → GEMINI =================
async function extractFromText(rawText, formatHint = null) {
  try {
    const prompt = `
${EXTRACTION_PROMPT}
${formatHint ? FORMAT_HINT_PROMPT(formatHint) : ''}

Invoice Text:
${rawText.slice(0, 8000)}
`;

    const rawResponse = await callGemini(prompt);

    return parseAndValidate(rawResponse);

  } catch (err) {
    logger.error('Gemini extraction error:', err.message);

    // ✅ FALLBACK (important for demo)
    return fallbackResponse();
  }
}

// ================= PARSE + VALIDATE =================
function parseAndValidate(rawContent) {
  let parsed;

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid JSON response');
    parsed = JSON.parse(match[0]);
  }

  const { success, data, errors } = validateInvoiceData(parsed);
  const confidence = calculateConfidenceScore(data);

  logger.info(`Extraction complete | Confidence: ${confidence}% | Errors: ${errors.length}`);

  return {
    data,
    confidence,
    validationErrors: errors,
    isValid: success,
  };
}

// ================= FALLBACK =================
function fallbackResponse() {
  return {
    data: {
      invoice_number: null,
      invoice_date: null,
      vendor_name: 'Fallback Vendor',
      total_amount: 0,
      currency: 'INR',
      line_items: []
    },
    confidence: 10,
    validationErrors: ['Fallback used'],
    isValid: false,
  };
}

// ================= HELPERS =================
export function generateVendorKey(vendorName) {
  if (!vendorName) return null;

  return vendorName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
}

export function generateInvoiceHash(invoiceData) {
  const key = `${invoiceData.vendor_name || ''}-${invoiceData.invoice_number || ''}-${invoiceData.total_amount || ''}`;

  return Buffer.from(key.toLowerCase().trim())
    .toString('base64')
    .substring(0, 32);
}