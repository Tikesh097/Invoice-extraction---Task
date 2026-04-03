import { useToastStore } from '../store/toastStore.js';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
};

const colors = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
  warning: 'border-yellow-200 bg-yellow-50',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm animate-fade-in ${colors[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-sm text-gray-800 flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
