import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoice, updateInvoice, deleteInvoice, retryExtraction } from '../services/api.js';
import { toast } from '../store/toastStore.js';
import {
  ArrowLeft, Edit2, Save, X, Trash2, RefreshCw, Download,
  Building2, User, Calendar, DollarSign, FileText, Hash,
  CreditCard, AlertTriangle, CheckCircle, ExternalLink, Package
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

function Field({ label, value, edit, name, type = 'text', onChange }) {
  if (edit) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
          type={type}
          name={name}
          defaultValue={value || ''}
          onChange={onChange}
          className="input w-full text-sm"
        />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <p className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50', children }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setIsEditing(false);
      toast.success('Invoice updated successfully');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(id),
    onSuccess: () => { toast.success('Invoice deleted'); navigate('/invoices'); },
    onError: (err) => toast.error(err.message),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryExtraction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Re-extraction complete!');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFieldChange = (e) => {
    setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => updateMutation.mutate(editData);
  const handleDelete = () => {
    if (window.confirm('Delete this invoice permanently?')) deleteMutation.mutate();
  };

  const formatDate = (d) => {
    try { return d ? format(parseISO(d), 'MMMM d, yyyy') : null; } catch { return d; }
  };

  const formatAmount = (amount, currency = 'USD') => {
    if (!amount) return null;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Invoice not found.</p>
        <Link to="/invoices" className="btn-primary mt-4 inline-flex">Back to Invoices</Link>
      </div>
    );
  }

  const confidence = invoice.confidence_score || 0;
  const confidenceColor = confidence >= 80 ? 'text-green-600 bg-green-50' : confidence >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {invoice.invoice_number ? `Invoice #${invoice.invoice_number}` : 'Invoice Detail'}
              </h1>
              {invoice.is_duplicate && (
                <span className="badge bg-orange-100 text-orange-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Duplicate
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{invoice.invoice_files?.original_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.invoice_files?.public_url && (
            <a
              href={invoice.invoice_files.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" /> View File
            </a>
          )}
          <button
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
            Re-extract
          </button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="btn-secondary flex items-center gap-2 text-sm">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confidence & Status Bar */}
      <div className="card p-4 mb-6 flex items-center gap-6">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${confidenceColor}`}>
          {confidence >= 70 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="font-semibold text-sm">{confidence}% Confidence</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Extraction accuracy</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${confidence >= 70 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
        {invoice.validation_errors?.length > 0 && (
          <div className="text-xs text-orange-600">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {invoice.validation_errors.length} validation issue{invoice.validation_errors.length > 1 ? 's' : ''}
          </div>
        )}
        <div className="text-sm text-gray-500">
          Processed {invoice.created_at ? format(parseISO(invoice.created_at), 'MMM d, yyyy HH:mm') : ''}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Invoice Info */}
        <SectionCard title="Invoice Details" icon={Hash} iconColor="text-blue-600" iconBg="bg-blue-50">
          <Field label="Invoice Number" name="invoice_number" value={invoice.invoice_number} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Invoice Date" name="invoice_date" type="date" value={invoice.invoice_date} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Due Date" name="due_date" type="date" value={invoice.due_date} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Payment Terms" name="payment_terms" value={invoice.payment_terms} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Payment Method" name="payment_method" value={invoice.payment_method} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Currency" name="currency" value={invoice.currency} edit={isEditing} onChange={handleFieldChange} />
        </SectionCard>

        {/* Vendor Info */}
        <SectionCard title="Vendor Information" icon={Building2} iconColor="text-purple-600" iconBg="bg-purple-50">
          <div className="col-span-2">
            <Field label="Vendor Name" name="vendor_name" value={invoice.vendor_name} edit={isEditing} onChange={handleFieldChange} />
          </div>
          <div className="col-span-2">
            <Field label="Vendor Address" name="vendor_address" value={invoice.vendor_address} edit={isEditing} onChange={handleFieldChange} />
          </div>
          <Field label="Email" name="vendor_email" value={invoice.vendor_email} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Phone" name="vendor_phone" value={invoice.vendor_phone} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Tax ID" name="vendor_tax_id" value={invoice.vendor_tax_id} edit={isEditing} onChange={handleFieldChange} />
        </SectionCard>

        {/* Client Info */}
        <SectionCard title="Client Information" icon={User} iconColor="text-green-600" iconBg="bg-green-50">
          <div className="col-span-2">
            <Field label="Client Name" name="client_name" value={invoice.client_name} edit={isEditing} onChange={handleFieldChange} />
          </div>
          <div className="col-span-2">
            <Field label="Client Address" name="client_address" value={invoice.client_address} edit={isEditing} onChange={handleFieldChange} />
          </div>
          <Field label="Client Email" name="client_email" value={invoice.client_email} edit={isEditing} onChange={handleFieldChange} />
        </SectionCard>

        {/* Financial Summary */}
        <SectionCard title="Financial Summary" icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-50">
          <Field label="Subtotal" name="subtotal" type="number" value={invoice.subtotal} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Tax Rate (%)" name="tax_rate" type="number" value={invoice.tax_rate} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Tax Amount" name="tax_amount" type="number" value={invoice.tax_amount} edit={isEditing} onChange={handleFieldChange} />
          <Field label="Discount" name="discount_amount" type="number" value={invoice.discount_amount} edit={isEditing} onChange={handleFieldChange} />
          <div className="col-span-2 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-semibold text-gray-700">Total Amount</span>
              <span className="text-xl font-bold text-blue-700">
                {formatAmount(invoice.total_amount, invoice.currency) || '—'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Line Items */}
      {invoice.line_items?.length > 0 && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Line Items ({invoice.line_items.length})</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Description', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Amount'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.line_items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-sm text-gray-800">{item.description || '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{item.quantity ?? '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{item.unit || '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {item.unit_price != null ? formatAmount(item.unit_price, invoice.currency) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{item.tax_rate != null ? `${item.tax_rate}%` : '—'}</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-gray-900">
                    {item.amount != null ? formatAmount(item.amount, invoice.currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td colSpan={5} className="px-3 py-2.5 text-sm font-semibold text-gray-700 text-right">Total:</td>
                <td className="px-3 py-2.5 text-sm font-bold text-blue-700">
                  {formatAmount(invoice.total_amount, invoice.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Notes & Bank Details */}
      {(invoice.notes || invoice.bank_details) && (
        <div className="card p-6 mt-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" /> Additional Information
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {invoice.notes && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
              </div>
            )}
            {invoice.bank_details && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Bank Details</label>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg font-mono">{invoice.bank_details}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {invoice.validation_errors?.length > 0 && (
        <div className="card p-6 mt-6 border-orange-200 bg-orange-50">
          <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Validation Warnings
          </h2>
          <ul className="space-y-1">
            {invoice.validation_errors.map((err, i) => (
              <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span> {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
