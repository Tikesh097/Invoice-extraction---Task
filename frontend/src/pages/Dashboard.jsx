import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary, getVendorSpend, getMonthlyTrends } from '../services/api.js';
import { FileText, DollarSign, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => getAnalyticsSummary(),
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendor-spend', { limit: 5 }],
    queryFn: () => getVendorSpend({ limit: 5 }),
  });

  const { data: trends } = useQuery({
    queryKey: ['monthly-trends', { months: 6 }],
    queryFn: () => getMonthlyTrends({ months: 6 }),
  });

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v || 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Invoice extraction overview</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Upload Invoices
        </Link>
      </div>

      {/* Stats Grid */}
      {sumLoading ? (
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Invoices"
            value={summary?.total_invoices || 0}
            icon={FileText}
            color="bg-blue-100 text-blue-600"
            subtitle={`${summary?.duplicate_invoices || 0} duplicates detected`}
          />
          <StatCard
            title="Total Spend"
            value={formatCurrency(summary?.total_spend)}
            icon={DollarSign}
            color="bg-green-100 text-green-600"
            subtitle="Across all invoices"
          />
          <StatCard
            title="Unique Vendors"
            value={summary?.unique_vendors || 0}
            icon={Users}
            color="bg-purple-100 text-purple-600"
          />
          <StatCard
            title="Avg Confidence"
            value={`${summary?.avg_confidence_score || 0}%`}
            icon={TrendingUp}
            color="bg-orange-100 text-orange-600"
            subtitle="Extraction accuracy"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Monthly Trends */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Spend Trends</h2>
          {trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Spend']} />
                <Bar dataKey="total_spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No data yet. Upload invoices to see trends.</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Vendors by Spend</h2>
            <Link to="/analytics" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {vendors?.length > 0 ? (
            <div className="space-y-3">
              {vendors.map((v, i) => (
                <div key={v.vendor_name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{v.vendor_name}</span>
                      <span className="text-sm font-bold text-gray-900 ml-2">${v.total_spend.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (v.total_spend / (vendors[0]?.total_spend || 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{v.invoice_count} invoices</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No vendor data yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Status */}
      <div className="mt-8 card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-sm text-green-700">AI Extraction</p>
              <p className="text-xs text-green-500">GPT-4o Vision Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium text-sm text-blue-700">Supabase DB</p>
              <p className="text-xs text-blue-500">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-purple-500" />
            <div>
              <p className="font-medium text-sm text-purple-700">Format Learning</p>
              <p className="text-xs text-purple-500">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
