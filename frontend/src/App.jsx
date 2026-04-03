import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Upload from './pages/Upload.jsx';
import Analytics from './pages/Analytics.jsx';
import Formats from './pages/Formats.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="formats" element={<Formats />} />
      </Route>
    </Routes>
  );
}
