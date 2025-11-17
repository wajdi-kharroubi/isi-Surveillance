import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

export default function ConfigExportModal({ isOpen, onClose, onConfirm, defaultSession, defaultSemestre, format }) {
  const [session, setSession] = useState(defaultSession || 'Partiel');
  const [semestre, setSemestre] = useState(defaultSemestre || 'S1');

  useEffect(() => {
    if (isOpen) {
      setSession(defaultSession || 'Partiel');
      setSemestre(defaultSemestre || 'S1');
    }
  }, [isOpen, defaultSession, defaultSemestre]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(session, semestre);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`text-white p-6 rounded-t-2xl flex items-center justify-between ${
          format === 'pdf' 
            ? 'bg-gradient-to-r from-red-600 to-red-700' 
            : 'bg-gradient-to-r from-blue-600 to-blue-700'
        }`}>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Configuration de l'export</h2>
              <p className={`text-sm ${format === 'pdf' ? 'text-red-100' : 'text-blue-100'}`}>
                Personnalisez le nom des fichiers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="session-modal" className="block text-sm font-medium text-gray-700 mb-2">
              Session
            </label>
            <input
              type="text"
              id="session-modal"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                format === 'pdf'
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Ex: Partiel, Rattrapage"
            />
          </div>
          
          <div>
            <label htmlFor="semestre-modal" className="block text-sm font-medium text-gray-700 mb-2">
              Semestre
            </label>
            <select
              id="semestre-modal"
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                format === 'pdf'
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="S1">S1</option>
              <option value="S2">S2</option>
            </select>
          </div>

          <div className={`p-3 rounded-lg ${format === 'pdf' ? 'bg-red-50' : 'bg-blue-50'}`}>
            <p className="text-sm text-gray-700">
              <strong className={format === 'pdf' ? 'text-red-900' : 'text-blue-900'}>Format du fichier :</strong>
            </p>
            <p className={`text-sm font-mono mt-1 ${format === 'pdf' ? 'text-red-600' : 'text-blue-600'}`}>
              Convocation-Surveillance-Session-<span className="font-bold">{session}</span>-<span className="font-bold">{semestre}</span>-Prenom-Nom.{format}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 text-white rounded-lg transition-colors font-semibold ${
              format === 'pdf'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
