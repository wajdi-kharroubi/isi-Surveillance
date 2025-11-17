import { AlertCircle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning' // 'warning', 'danger', 'info'
}) {
  if (!isOpen) return null;

  const iconColors = {
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    info: 'text-blue-500'
  };

  const confirmButtonColors = {
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    danger: 'bg-red-600 hover:bg-red-700',
    info: 'bg-indigo-600 hover:bg-indigo-700'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className={`w-6 h-6 ${iconColors[type]}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 text-sm">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${confirmButtonColors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
