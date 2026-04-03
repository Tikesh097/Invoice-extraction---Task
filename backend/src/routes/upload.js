import express from 'express';
import { multiUpload } from '../middleware/upload.js';
import { uploadFileToStorage } from '../services/storageService.js';
import { extractFromImage, extractFromPDF, generateInvoiceHash } from '../services/extractionService.js';
import { findSimilarFormat, saveOrUpdateFormat, generateFormatHint } from '../services/formatDetectionService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/upload - Single or batch upload
router.post('/', multiUpload, async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const userId = req.headers['x-user-id'] || 'anonymous';
  const results = [];
  const errors = [];

  for (const file of req.files) {
    try {
      logger.info(`Processing file: ${file.originalname} (${file.mimetype})`);

      // 1. Upload to Supabase Storage
      const { storagePath, publicUrl } = await uploadFileToStorage(
        file.buffer, file.originalname, file.mimetype, userId
      );

      // 2. Save file metadata to DB
      const { data: fileRecord, error: fileError } = await supabaseAdmin
        .from('invoice_files')
        .insert({
          user_id: userId,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          storage_path: storagePath,
          public_url: publicUrl,
          status: 'processing',
        })
        .select()
        .single();

      if (fileError) throw new Error(`DB error: ${fileError.message}`);

      // 3. Extract data
      let extractionResult;
      let formatUsed = null;
      
      // Pre-extraction: try a quick format detection with filename hints
      const similarFormat = await findSimilarFormat(file.originalname, null);
      const formatHint = similarFormat ? generateFormatHint(similarFormat) : null;
      if (similarFormat) formatUsed = similarFormat.id;

      if (file.mimetype === 'application/pdf') {
        extractionResult = await extractFromPDF(file.buffer, formatHint);
      } else {
        extractionResult = await extractFromImage(file.buffer, file.mimetype, formatHint);
      }

      const { data: invoiceData, confidence, validationErrors, isValid } = extractionResult;

      // 4. Check for duplicates
      const invoiceHash = generateInvoiceHash(invoiceData);
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number')
        .eq('invoice_hash', invoiceHash)
        .maybeSingle();

      const isDuplicate = !!existingInvoice;

      // 5. Find similar format post-extraction
      const postFormat = await findSimilarFormat(invoiceData.vendor_name, invoiceData.currency);

      // 6. Save invoice to DB
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
          file_id: fileRecord.id,
          user_id: userId,
          invoice_number: invoiceData.invoice_number,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          vendor_name: invoiceData.vendor_name,
          vendor_address: invoiceData.vendor_address,
          vendor_email: invoiceData.vendor_email,
          vendor_phone: invoiceData.vendor_phone,
          vendor_tax_id: invoiceData.vendor_tax_id,
          client_name: invoiceData.client_name,
          client_address: invoiceData.client_address,
          client_email: invoiceData.client_email,
          subtotal: invoiceData.subtotal,
          tax_amount: invoiceData.tax_amount,
          tax_rate: invoiceData.tax_rate,
          discount_amount: invoiceData.discount_amount,
          total_amount: invoiceData.total_amount,
          currency: invoiceData.currency || 'USD',
          payment_terms: invoiceData.payment_terms,
          payment_method: invoiceData.payment_method,
          bank_details: invoiceData.bank_details,
          notes: invoiceData.notes,
          confidence_score: confidence,
          validation_errors: validationErrors,
          is_valid: isValid,
          is_duplicate: isDuplicate,
          duplicate_of: existingInvoice?.id || null,
          invoice_hash: invoiceHash,
          format_id: postFormat?.id || formatUsed,
          raw_extracted_data: invoiceData,
        })
        .select()
        .single();

      if (invoiceError) throw new Error(`Invoice DB error: ${invoiceError.message}`);

      // 7. Save line items
      if (invoiceData.line_items?.length > 0) {
        const lineItems = invoiceData.line_items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          unit: item.unit,
          tax_rate: item.tax_rate,
        }));

        await supabaseAdmin.from('invoice_line_items').insert(lineItems);
      }

      // 8. Update file status
      await supabaseAdmin
        .from('invoice_files')
        .update({ status: 'completed', invoice_id: invoice.id })
        .eq('id', fileRecord.id);

      // 9. Save/update format template
      await saveOrUpdateFormat(invoiceData);

      results.push({
        fileId: fileRecord.id,
        invoiceId: invoice.id,
        fileName: file.originalname,
        confidence,
        isDuplicate,
        duplicateOf: existingInvoice?.id,
        vendorName: invoiceData.vendor_name,
        totalAmount: invoiceData.total_amount,
        currency: invoiceData.currency,
        validationErrors,
        formatReused: !!postFormat,
      });

      logger.info(`Successfully processed: ${file.originalname}, confidence: ${confidence}%`);
    } catch (err) {
      logger.error(`Failed to process ${file.originalname}:`, err);
      errors.push({ fileName: file.originalname, error: err.message });

      // Update file status to failed if we have a record
      try {
        await supabaseAdmin
          .from('invoice_files')
          .update({ status: 'failed', error_message: err.message })
          .eq('original_name', file.originalname)
          .eq('status', 'processing');
      } catch {}
    }
  }

  res.json({
    success: results.length > 0,
    processed: results.length,
    failed: errors.length,
    results,
    errors,
  });
});

// POST /api/upload/retry/:invoiceId - Retry failed extraction
router.post('/retry/:invoiceId', async (req, res) => {
  const { invoiceId } = req.params;

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, invoice_files(*)')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Re-download from storage and re-extract
  const { data: fileData, error: storageError } = await supabaseAdmin.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'invoices')
    .download(invoice.invoice_files.storage_path);

  if (storageError) {
    return res.status(500).json({ error: 'Could not retrieve file for retry' });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const mimeType = invoice.invoice_files.mime_type;

  let extractionResult;
  if (mimeType === 'application/pdf') {
    extractionResult = await extractFromPDF(buffer);
  } else {
    extractionResult = await extractFromImage(buffer, mimeType);
  }

  const { data: invoiceData, confidence, validationErrors } = extractionResult;

  await supabaseAdmin
    .from('invoices')
    .update({
      ...invoiceData,
      confidence_score: confidence,
      validation_errors: validationErrors,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  res.json({ success: true, confidence, message: 'Invoice re-extracted successfully' });
});

export default router;
