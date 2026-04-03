import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFormats, deleteFormat } from '../services/api.js';
import { toast } from '../store/toastStore.js';
import { BookTemplate, Trash2, RefreshCw, TrendingUp, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Formats() {
  const queryClient = useQueryClient();

  const { data: formats = [], isLoading } = useQuery({
    queryKey: ['formats'],
    queryFn: getFormats,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFormat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] });
      toast.success('Format template removed');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Remove template for "${name}"?`)) deleteMutation.mutate(id);
  };

  const formatDate = (d) => {
    try { return d ? format(parseISO(d), 'MMM d, yyyy') : '—'; } catch { return '—'; }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Format Templates</h1>
        <p className="text-gray-500 text-sm mt-1">
          Learned invoice formats — reused automatically for faster, more accurate extraction
        </p>
      </div>

      {/* Info Box */}
      <div className="card p-5 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-800 text-sm">How Format Learning Works</h3>
            <p className="text-sm text-blue-700 mt-1">
              When an invoice is uploaded, the AI detects its vendor and structure. On subsequent uploads from the same vendor,
              the system reuses the learned template to improve accuracy and speed. Templates are updated with each new invoice.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : formats.length === 0 ? (
        <div className="card p-16 text-center">
          <BookTemplate className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No format templates yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Templates are created automatically when you upload invoices
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {formats.map((fmt) => {
            const template = fmt.format_template || {};
            return (
              <div key={fmt.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-700">
                        {(fmt.vendor_name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-none">{fmt.vendor_name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{fmt.typical_currency || 'Mixed currencies'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(fmt.id, fmt.vendor_name)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">Times Used</p>
                    <p className="text-lg font-bold text-gray-900">{fmt.usage_count}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">Fields Known</p>
                    <p className="text-lg font-bold text-gray-900">{template.typical_fields?.length || 0}</p>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1.5">
                  {[
                    [template.has_line_items, 'Has Line Items'],
                    [template.sample_structure?.has_tax, 'Includes Tax'],
                    [template.sample_structure?.has_discount, 'Includes Discounts'],
                    [template.sample_structure?.has_due_date, 'Has Due Date'],
                  ].map(([val, label]) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${val ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {val ? <CheckCircle className="w-3 h-3 text-green-600" /> : <span className="text-gray-300 text-xs">✕</span>}
                      </div>
                      <span className={`text-xs ${val ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Updated {formatDate(fmt.updated_at)}</span>
                  <span className="badge bg-purple-100 text-purple-700 text-xs">Learned</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
