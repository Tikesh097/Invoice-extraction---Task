import { supabaseAdmin } from '../config/supabase.js';
import { ensureBucketExists } from '../services/storageService.js';
import logger from '../utils/logger.js';

const SQL_SETUP = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Invoice Formats (learned templates)
CREATE TABLE IF NOT EXISTS invoice_formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  vendor_key TEXT UNIQUE NOT NULL,
  format_template JSONB DEFAULT '{}',
  typical_currency TEXT,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Files (uploaded files metadata)
CREATE TABLE IF NOT EXISTS invoice_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT DEFAULT 'anonymous',
  original_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (extracted data)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES invoice_files(id) ON DELETE CASCADE,
  user_id TEXT DEFAULT 'anonymous',
  format_id UUID REFERENCES invoice_formats(id),
  
  -- Invoice fields
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  
  -- Vendor info
  vendor_name TEXT,
  vendor_address TEXT,
  vendor_email TEXT,
  vendor_phone TEXT,
  vendor_tax_id TEXT,
  
  -- Client info
  client_name TEXT,
  client_address TEXT,
  client_email TEXT,
  
  -- Financial
  subtotal NUMERIC(15,2),
  tax_amount NUMERIC(15,2),
  tax_rate NUMERIC(8,4),
  discount_amount NUMERIC(15,2),
  total_amount NUMERIC(15,2),
  currency TEXT DEFAULT 'USD',
  
  -- Payment
  payment_terms TEXT,
  payment_method TEXT,
  bank_details TEXT,
  notes TEXT,
  
  -- Metadata
  confidence_score INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]',
  is_valid BOOLEAN DEFAULT true,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES invoices(id),
  invoice_hash TEXT,
  raw_extracted_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(15,4),
  unit_price NUMERIC(15,2),
  amount NUMERIC(15,2),
  unit TEXT,
  tax_rate NUMERIC(8,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_name);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON invoices(currency);
CREATE INDEX IF NOT EXISTS idx_invoices_hash ON invoices(invoice_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_files_user ON invoice_files(user_id);
CREATE INDEX IF NOT EXISTS idx_formats_vendor_key ON invoice_formats(vendor_key);
`;

async function setup() {
  logger.info('Setting up database...');
  
  try {
    // Run SQL (note: Supabase doesn't expose direct SQL via JS client for DDL)
    // You need to run this in Supabase SQL editor or via psql
    logger.info('Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log(SQL_SETUP);
    console.log('='.repeat(60) + '\n');

    // Ensure storage bucket exists
    await ensureBucketExists();
    logger.info('Storage bucket ready.');
    
    logger.info('Setup complete! Run the SQL above in Supabase SQL Editor.');
  } catch (err) {
    logger.error('Setup failed:', err);
    process.exit(1);
  }
}

setup();
