-- ================================================
-- Invoice AI - Supabase Database Schema
-- Run this in Supabase SQL Editor → New Query
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: invoice_formats (Learned Templates)
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_formats (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name       TEXT NOT NULL,
  vendor_key        TEXT UNIQUE NOT NULL,
  format_template   JSONB DEFAULT '{}',
  typical_currency  TEXT,
  usage_count       INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: invoice_files (Uploaded Files)
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       TEXT DEFAULT 'anonymous',
  original_name TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  invoice_id    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: invoices (Extracted Data)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id             UUID REFERENCES invoice_files(id) ON DELETE CASCADE,
  user_id             TEXT DEFAULT 'anonymous',
  format_id           UUID REFERENCES invoice_formats(id),

  -- Core Invoice Fields
  invoice_number      TEXT,
  invoice_date        DATE,
  due_date            DATE,

  -- Vendor Details
  vendor_name         TEXT,
  vendor_address      TEXT,
  vendor_email        TEXT,
  vendor_phone        TEXT,
  vendor_tax_id       TEXT,

  -- Client Details
  client_name         TEXT,
  client_address      TEXT,
  client_email        TEXT,

  -- Financial
  subtotal            NUMERIC(15,2),
  tax_amount          NUMERIC(15,2),
  tax_rate            NUMERIC(8,4),
  discount_amount     NUMERIC(15,2),
  total_amount        NUMERIC(15,2),
  currency            TEXT DEFAULT 'USD',

  -- Payment
  payment_terms       TEXT,
  payment_method      TEXT,
  bank_details        TEXT,
  notes               TEXT,

  -- AI Metadata
  confidence_score    INTEGER DEFAULT 0,
  validation_errors   JSONB DEFAULT '[]',
  is_valid            BOOLEAN DEFAULT true,
  is_duplicate        BOOLEAN DEFAULT false,
  duplicate_of        UUID REFERENCES invoices(id),
  invoice_hash        TEXT,
  raw_extracted_data  JSONB,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: invoice_line_items
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description  TEXT,
  quantity     NUMERIC(15,4),
  unit_price   NUMERIC(15,2),
  amount       NUMERIC(15,2),
  unit         TEXT,
  tax_rate     NUMERIC(8,4),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoices_vendor    ON invoices(vendor_name);
CREATE INDEX IF NOT EXISTS idx_invoices_date      ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_currency  ON invoices(currency);
CREATE INDEX IF NOT EXISTS idx_invoices_hash      ON invoices(invoice_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_user      ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_duplicate ON invoices(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_files_user         ON invoice_files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_status       ON invoice_files(status);
CREATE INDEX IF NOT EXISTS idx_formats_key        ON invoice_formats(vendor_key);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);

-- =============================================
-- ROW LEVEL SECURITY (Optional - enable for auth)
-- =============================================
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (user_id = current_user);

-- =============================================
-- STORAGE BUCKET (run separately or via API)
-- =============================================
-- The bucket "invoices" must be created as PUBLIC in Supabase Storage dashboard
-- or via: INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);
