import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadInvoices, retryExtraction } from '../services/api.js';
import { toast } from '../store/toastStore.js';
import {
  Upload as UploadIcon, FileText, Image, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Trash2, Loader2, X, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

function FileCard({ file, result, error, isProcessing }) {
  const isImage = file.type.startsWith('image/');
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
        {isImage ? <Image className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-400">{sizeMB} MB · {file.type}</p>
        {isProcessing && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-xs text-blue-600">Extracting with AI...</span>
          </div>
        )}
        {result && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              {result.confidence >= 70 ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-xs font-medium text-gray-700">
                {result.vendorName || 'Unknown Vendor'} · ${result.totalAmount?.toFixed(2) || '0.00'} {result.currency}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge text-xs ${result.confidence >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {result.confidence}% confidence
              </span>
              {result.isDuplicate && (
                <span className="badge bg-orange-100 text-orange-700">Duplicate</span>
              )}
              {result.formatReused && (
                <span className="badge bg-purple-100 text-purple-700">Template reused</span>
              )}
            </div>
          </div>
        )}
        {error && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
      {result?.invoiceId && (
        <Link
          to={`/invoices/${result.invoiceId}`}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0"
        >
          View <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (filesToUpload) => uploadInvoices(filesToUpload, setProgress),
    onSuccess: (data) => {
      setResults(data.results || []);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      if (data.processed > 0) {
        toast.success(`✅ Processed ${data.processed} invoice${data.processed > 1 ? 's' : ''} successfully!`);
      }
      if (data.failed > 0) {
        toast.error(`❌ ${data.failed} file${data.failed > 1 ? 's' : ''} failed to process.`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      rejected.forEach(r => toast.error(`${r.file.name}: ${r.errors[0]?.message}`));
    }
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = accepted.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (name) => setFiles(f => f.filter(x => x.name !== name));
  const clearAll = () => { setFiles([]); setResults([]); setProgress(0); };

  const handleUpload = () => {
    if (files.length === 0) return;
    setResults([]);
    setProgress(0);
    uploadMutation.mutate(files);
  };

  const getResultForFile = (fileName) =>
    results.find(r => r.fileName === fileName);

  const getErrorForFile = (fileName) => {
    // errors from the backend
    return null;
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Invoices</h1>
        <p className="text-gray-500 text-sm mt-1">Upload JPG, PNG, or PDF invoices for AI-powered extraction</p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDragActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <UploadIcon className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        {isDragActive ? (
          <p className="text-blue-600 font-semibold text-lg">Drop files here!</p>
        ) : (
          <>
            <p className="text-gray-700 font-semibold text-lg">Drag & drop invoices here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse files</p>
            <p className="text-gray-300 text-xs mt-3">Supports JPG, PNG, PDF · Max 20MB per file · Up to 10 files</p>
          </>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { icon: '🤖', label: 'GPT-4o Vision OCR' },
          { icon: '⚡', label: 'Batch Processing' },
          { icon: '🔁', label: 'Format Learning' },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
            <span className="text-lg">{f.icon}</span>
            <span className="text-xs font-medium text-gray-600">{f.label}</span>
          </div>
        ))}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{files.length} file{files.length > 1 ? 's' : ''} selected</h3>
            <button onClick={clearAll} className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
          <div className="space-y-3">
            {files.map(file => (
              <div key={file.name} className="relative">
                <FileCard
                  file={file}
                  result={getResultForFile(file.name)}
                  error={getErrorForFile(file.name)}
                  isProcessing={uploadMutation.isPending && !getResultForFile(file.name)}
                />
                {!uploadMutation.isPending && !getResultForFile(file.name) && (
                  <button
                    onClick={() => removeFile(file.name)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {uploadMutation.isPending && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 font-medium">Uploading & extracting...</span>
            <span className="text-sm text-blue-600 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !uploadMutation.isPending && results.length === 0 && (
        <button
          onClick={handleUpload}
          className="btn-primary w-full mt-6 py-3 text-base flex items-center justify-center gap-2"
        >
          <UploadIcon className="w-5 h-5" />
          Extract {files.length} Invoice{files.length > 1 ? 's' : ''} with AI
        </button>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
          <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5" /> Extraction Complete
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{results.length}</p>
              <p className="text-xs text-green-600">Processed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">
                {Math.round(results.reduce((s, r) => s + r.confidence, 0) / results.length)}%
              </p>
              <p className="text-xs text-green-600">Avg Confidence</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {results.filter(r => r.isDuplicate).length}
              </p>
              <p className="text-xs text-orange-600">Duplicates Found</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/invoices" className="btn-primary flex-1 text-center py-2 text-sm">
              View All Invoices
            </Link>
            <button onClick={clearAll} className="btn-secondary flex-1 py-2 text-sm">
              Upload More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
