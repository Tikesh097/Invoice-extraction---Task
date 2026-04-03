import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoices, deleteInvoice } from '../services/api.js';
import { toast } from '../store/toastStore.js';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Trash2, Eye, ChevronLeft, ChevronRight,
  FileText, AlertTriangle, Copy, RefreshCw, Download, SlidersHorizontal
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

function ConfidenceBadge({ score }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700'
    : score >= 50 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';
  return <span className={`badge ${color}`}>{score}%</span>;
}

function StatusBadge({ isDuplicate }) {
  if (isDuplicate) return <span className="badge bg-orange-100 text-orange-700">Duplicate</span>;
  return <span className="badge bg-green-100 text-green-700">Unique</span>;
}

export default function Invoices() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showDuplicates, setShowDuplicates] = useState('');

  const queryClient = useQueryClient();
  const LIMIT = 15;

  const params = {
    page,
    limit: LIMIT,
    ...(search && { vendor: search }),
    ...(currency && { currency }),
    ...(fromDate && { from_date: fromDate }),
    ...(toDate && { to_date: toDate }),
    ...(showDuplicates !== '' && { is_duplicate: showDuplicates }),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (id, e) => {
    e.preventDefault();
    if (window.confirm('Delete this invoice?')) deleteMutation.mutate(id);
  };

  const invoices = data?.data || [];
  const pagination = data?.pagination || {};

  const formatDate = (d) => {
    try { return d ? format(parseISO(d), 'MMM d, yyyy') : '—'; } catch { return d || '—'; }
  };

  const formatAmount = (amount, currency) => {
    if (!amount) return '—';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
    } catch {
      return `${currency || ''} ${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination.total || 0} total invoices
          </p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" /> Upload New
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by vendor name..."
              className="input w-full pl-9"
            />
          </div>
          <select
            value={currency}
            onChange={e => { setCurrency(e.target.value); setPage(1); }}
            className="input"
          >
            <option value="">All Currencies</option>
            {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select
                value={showDuplicates}
                onChange={e => setShowDuplicates(e.target.value)}
                className="input text-sm"
              >
                <option value="">All</option>
                <option value="false">Unique only</option>
                <option value="true">Duplicates only</option>
              </select>
            </div>
            <button
              onClick={() => { setFromDate(''); setToDate(''); setShowDuplicates(''); setSearch(''); setCurrency(''); }}
              className="text-sm text-red-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No invoices found</p>
            <p className="text-gray-400 text-sm mt-1">Upload your first invoice to get started</p>
            <Link to="/upload" className="btn-primary inline-flex mt-4">Upload Invoice</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Invoice #', 'Vendor', 'Date', 'Due Date', 'Amount', 'Currency', 'Confidence', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isFetching ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-700">{inv.invoice_number || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[160px]">
                          <p className="font-medium text-sm text-gray-900 truncate">{inv.vendor_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 truncate">{inv.invoice_files?.original_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatAmount(inv.total_amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-gray-100 text-gray-600">{inv.currency || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge score={inv.confidence_score || 0} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isDuplicate={inv.is_duplicate} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {inv.invoice_files?.public_url && (
                            <a
                              href={inv.invoice_files.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download original"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={(e) => handleDelete(inv.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-100'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= pagination.pages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
