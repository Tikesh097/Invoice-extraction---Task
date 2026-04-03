# 🧾 Invoice AI — AI-Powered Invoice Extraction

> Extract structured data from invoice images & PDFs using GPT-4o Vision, store results in Supabase, and visualize insights through a modern React dashboard.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   React + Vite + TailwindCSS + Recharts + React Query       │
│   Pages: Dashboard | Upload | Invoices | Analytics | Formats │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│                       API LAYER (Node.js + Express)          │
│   /api/upload   → multipart file ingestion + processing     │
│   /api/invoices → CRUD for extracted invoice data           │
│   /api/analytics→ aggregation endpoints for charts          │
│   /api/formats  → learned vendor template management        │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────────┐
│  OpenAI GPT  │ │  Supabase DB │ │ Supabase Storage│
│  4o Vision   │ │  (PostgreSQL)│ │  (S3-compatible)│
│  OCR + Parse │ │  4 tables    │ │  Invoice files  │
└──────────────┘ └──────────────┘ └─────────────────┘
```

## 📁 Project Structure

```
invoice-ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js          # Supabase client (admin + anon)
│   │   ├── middleware/
│   │   │   ├── upload.js            # Multer file upload config
│   │   │   └── errorHandler.js      # Global error handler
│   │   ├── routes/
│   │   │   ├── upload.js            # POST /api/upload (single + batch)
│   │   │   ├── invoices.js          # CRUD /api/invoices
│   │   │   ├── analytics.js         # GET /api/analytics/*
│   │   │   └── formats.js           # GET /api/formats
│   │   ├── services/
│   │   │   ├── extractionService.js # GPT-4o Vision OCR + parsing
│   │   │   ├── formatDetectionService.js # Vendor similarity + templates
│   │   │   └── storageService.js    # Supabase Storage upload/delete
│   │   ├── utils/
│   │   │   ├── validation.js        # Zod schema + confidence scoring
│   │   │   └── logger.js            # Winston logger
│   │   ├── scripts/
│   │   │   ├── schema.sql           # Full DB schema (run in Supabase)
│   │   │   └── setupDatabase.js     # Setup helper script
│   │   └── index.js                 # Express app entry point
│   ├── Dockerfile
│   ├── package.json
│   └── env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # KPIs + charts overview
│   │   │   ├── Upload.jsx           # Drag & drop upload UI
│   │   │   ├── Invoices.jsx         # Table with filters + pagination
│   │   │   ├── InvoiceDetail.jsx    # Full detail + edit + line items
│   │   │   ├── Analytics.jsx        # Full analytics dashboard
│   │   │   └── Formats.jsx          # Learned format templates
│   │   ├── components/
│   │   │   ├── Layout/Layout.jsx    # Sidebar navigation
│   │   │   └── Toast.jsx            # Notification toasts
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   ├── store/
│   │   │   └── toastStore.js        # Zustand toast state
│   │   ├── App.jsx                  # Route definitions
│   │   ├── main.jsx                 # React entry + QueryClient
│   │   └── index.css                # Tailwind + custom styles
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenAI](https://platform.openai.com) API key (GPT-4o access required)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd invoice-ai

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Setup Supabase Database

1. Go to your Supabase project → **SQL Editor** → **New Query**
2. Paste and run the contents of `backend/src/scripts/schema.sql`
3. Go to **Storage** → Create bucket named `invoices` → set to **Public**

### 3. Configure Environment Variables

```bash
# Backend
cd backend
cp env.example .env
# Edit .env with your values:
```

```env
PORT=5000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
SUPABASE_STORAGE_BUCKET=invoices
ALLOWED_ORIGINS=http://localhost:5173
```

```bash
# Frontend
cd ../frontend
cp env.example .env
```

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** 🎉

---

## 🐳 Docker Deployment

```bash
# Copy and fill env file
cp env.example .env

# Build & run both services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

---

## ☁️ Cloud Deployment

### Backend → Render
1. Connect your GitHub repo on [render.com](https://render.com)
2. Set **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `node src/index.js`
5. Add all env vars from `.env`

### Frontend → Vercel
1. Connect repo on [vercel.com](https://vercel.com)
2. Set **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Add env: `VITE_API_URL=https://your-render-backend.onrender.com/api`

---

## 🔑 Key Design Decisions

### 1. GPT-4o Vision as Unified OCR + Parser
Instead of running Tesseract → LLM (two-step), we use GPT-4o Vision directly on images and use pdf-parse for PDFs with fallback to vision. This:
- Eliminates Tesseract setup complexity
- Handles handwriting, tables, and noisy scans better
- Reduces latency (single API call)
- Achieves higher accuracy on diverse formats

### 2. Structured JSON Output with Response Format
We use `response_format: { type: "json_object" }` to force GPT-4o to return valid JSON every time, eliminating markdown wrapper issues.

### 3. Format Learning via Vendor Similarity
The system uses Levenshtein distance to detect when a new invoice comes from a known vendor (75%+ name similarity). It then injects a format hint into the prompt, teaching the AI what fields to expect. This improves accuracy on repeat vendors.

### 4. Duplicate Detection via Hashing
A deterministic hash of `vendor_name + invoice_number + total_amount` catches duplicate uploads without complex image comparison.

### 5. Confidence Scoring
A weighted field completeness score (critical fields × 40, important × 20, optional × 10) gives a 0–100 confidence indicator per invoice. This drives UI color coding and lets users prioritize manual review.

### 6. Supabase Service Role for Server
The backend uses the service role key (bypassing RLS) for all DB/storage operations. Frontend uses anon key only. This keeps sensitive operations server-side.

---

## 🔌 API Reference

### Upload
```
POST /api/upload
Content-Type: multipart/form-data
Body: files[] (multiple files supported)

Response:
{
  "processed": 2,
  "failed": 0,
  "results": [{ "invoiceId", "confidence", "isDuplicate", "vendorName", "totalAmount" }]
}
```

### Invoices
```
GET    /api/invoices              # List with filters: vendor, currency, from_date, to_date, page, limit
GET    /api/invoices/:id          # Single invoice with line items
PUT    /api/invoices/:id          # Update fields
DELETE /api/invoices/:id          # Delete invoice
POST   /api/upload/retry/:id      # Re-extract with AI
```

### Analytics
```
GET /api/analytics/summary        # KPIs: total, spend, vendors, avg confidence
GET /api/analytics/vendor-spend   # Spend grouped by vendor
GET /api/analytics/monthly-trends # Monthly spend over time
GET /api/analytics/currency-totals# Per-currency totals
GET /api/analytics/confidence     # Confidence score distribution
```

### Formats
```
GET    /api/formats               # List learned templates
DELETE /api/formats/:id           # Remove a template
```

---

## 🗃️ Database Schema

| Table | Purpose |
|-------|---------|
| `invoice_formats` | Learned vendor templates (reused for faster extraction) |
| `invoice_files` | Uploaded file metadata + Supabase Storage path |
| `invoices` | All extracted invoice fields + AI metadata |
| `invoice_line_items` | Individual line items per invoice |

---

## ⚠️ Assumptions & Limitations

1. **Language**: Optimized for English invoices. Non-English may work but accuracy drops.
2. **Scan Quality**: Very low-resolution or extremely skewed scans may reduce confidence.
3. **Multi-page PDFs**: Currently extracts text from all pages but vision fallback uses first page only.
4. **Cost**: GPT-4o Vision costs ~$0.005–$0.02 per invoice depending on image size. Image compression is applied to reduce tokens.
5. **Rate Limits**: OpenAI rate limits apply. Batch uploads are processed sequentially.
6. **Currency Conversion**: All analytics are in original currency — no FX conversion.
7. **Auth**: No user authentication in this version (uses `anonymous` user_id).

---

## 🚀 Potential Improvements

### Short-term
- [ ] Multi-page PDF support (process all pages, merge results)
- [ ] Email integration (auto-process invoices from inbox)
- [ ] Export to CSV/Excel
- [ ] Webhook notifications when extraction completes
- [ ] User authentication with Supabase Auth

### Medium-term
- [ ] Custom extraction templates (user-defined fields)
- [ ] Currency conversion for unified analytics
- [ ] Bulk re-extraction with improved prompts
- [ ] Approval workflow (mark as reviewed/approved)
- [ ] Integration with accounting software (QuickBooks, Xero)

### Long-term
- [ ] Fine-tuned model for invoice extraction (lower cost + higher accuracy)
- [ ] Real-time processing via WebSocket
- [ ] ERP integrations (SAP, Oracle)
- [ ] Anomaly detection (unusual amounts, suspicious vendors)

---

## 🧪 Test Data

Sample invoices for testing are available in the `test-invoices/` directory:
- `sample-invoice-1.pdf` — Standard US invoice with line items
- `sample-invoice-2.jpg` — Scanned Indian GST invoice
- `sample-invoice-3.png` — EU invoice with EUR currency

---

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 3, React Query, Recharts, Zustand |
| Backend | Node.js, Express 4, Multer, Winston |
| AI/OCR | OpenAI GPT-4o Vision |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Validation | Zod |
| Deployment | Docker, Render (backend), Vercel (frontend) |
