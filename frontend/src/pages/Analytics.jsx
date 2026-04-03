import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsSummary, getVendorSpend, getMonthlyTrends,
  getCurrencyTotals, getConfidenceDistribution
} from '../services/api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { DollarSign, FileText, Users, TrendingUp, Calendar } from 'lucide-react';
import { useState } from 'react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function StatCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' && p.name.toLowerCase().includes('spend')
              ? `$${p.value.toFixed(2)}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [months, setMonths] = useState(12);
  const [vendorLimit, setVendorLimit] = useState(10);

  const { data: summary } = useQuery({ queryKey: ['analytics-summary'], queryFn: () => getAnalyticsSummary() });
  const { data: vendors } = useQuery({ queryKey: ['vendor-spend', vendorLimit], queryFn: () => getVendorSpend({ limit: vendorLimit }) });
  const { data: trends } = useQuery({ queryKey: ['monthly-trends', months], queryFn: () => getMonthlyTrends({ months }) });
  const { data: currencies } = useQuery({ queryKey: ['currency-totals'], queryFn: getCurrencyTotals });
  const { data: confidence } = useQuery({ queryKey: ['confidence-distribution'], queryFn: getConfidenceDistribution });

  const confidenceData = confidence
    ? Object.entries(confidence).map(([range, count]) => ({ range, count }))
    : [];

  const currencyData = currencies || [];

  const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Insights from your invoice data</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Period:</label>
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className="input text-sm">
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Invoices" value={summary?.total_invoices || 0} icon={FileText}
          color="bg-blue-100 text-blue-600" sub={`${summary?.duplicate_invoices || 0} duplicates`} />
        <StatCard title="Total Spend" value={formatCurrency(summary?.total_spend)} icon={DollarSign}
          color="bg-green-100 text-green-600" sub="All time" />
        <StatCard title="Unique Vendors" value={summary?.unique_vendors || 0} icon={Users}
          color="bg-purple-100 text-purple-600" />
        <StatCard title="Avg Confidence" value={`${summary?.avg_confidence_score || 0}%`} icon={TrendingUp}
          color="bg-orange-100 text-orange-600" sub="AI extraction quality" />
      </div>

      {/* Monthly Trends */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" /> Monthly Spend Trends
          </h2>
        </div>
        {trends?.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total_spend" name="Total Spend" stroke="#3b82f6" strokeWidth={2} fill="url(#spendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No monthly data yet" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Vendor Spend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Spend by Vendor</h2>
            <select value={vendorLimit} onChange={e => setVendorLimit(Number(e.target.value))} className="input text-sm">
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>
          {vendors?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="vendor_name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_spend" name="Total Spend" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {vendors.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No vendor data yet" />
          )}
        </div>

        {/* Currency Breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Currency Distribution</h2>
          {currencyData.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={260}>
                <PieChart>
                  <Pie data={currencyData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    dataKey="total" nameKey="currency" paddingAngle={2}>
                    {currencyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {currencyData.map((c, i) => (
                  <div key={c.currency} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{c.currency}</span>
                        <span className="text-xs text-gray-500">{c.count} inv</span>
                      </div>
                      <p className="text-xs text-gray-400">${c.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No currency data yet" />
          )}
        </div>
      </div>

      {/* Confidence Distribution */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">AI Confidence Score Distribution</h2>
        {confidenceData.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} label={{ value: 'Confidence Range (%)', position: 'insideBottom', offset: -5, fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'Invoices', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Invoices" radius={[4, 4, 0, 0]}>
                {confidenceData.map((d, i) => {
                  const range = parseInt(d.range.split('-')[0]);
                  const color = range >= 76 ? '#10b981' : range >= 51 ? '#f59e0b' : '#ef4444';
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No confidence data yet" />
        )}
        <div className="flex items-center gap-6 mt-4 justify-center">
          {[['#10b981', '76–100% High'], ['#f59e0b', '51–75% Medium'], ['#ef4444', '0–50% Low']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Invoice Count Table */}
      {vendors?.length > 0 && (
        <div className="card p-6 mt-8">
          <h2 className="font-semibold text-gray-900 mb-4">Vendor Summary Table</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Rank', 'Vendor', 'Invoices', 'Total Spend', 'Top Currency'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-2 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((v, i) => (
                <tr key={v.vendor_name} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-sm text-gray-900">{v.vendor_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.invoice_count}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">${v.total_spend.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {v.currencies && Object.entries(v.currencies).sort((a, b) => b[1] - a[1])[0]?.[0] ? (
                      <span className="badge bg-blue-100 text-blue-700">
                        {Object.entries(v.currencies).sort((a, b) => b[1] - a[1])[0][0]}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="h-60 flex items-center justify-center">
      <div className="text-center">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-200" />
        <p className="text-gray-400 text-sm">{message}</p>
        <p className="text-gray-300 text-xs mt-1">Upload invoices to see analytics</p>
      </div>
    </div>
  );
}
