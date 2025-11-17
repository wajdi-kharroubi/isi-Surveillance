import { 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  ArchiveBoxIcon,
  PlayIcon 
} from '@heroicons/react/24/outline';

export default function ConfirmGenerationModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  onArchive,
  hasData 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-[scale-in_0.2s_ease-out]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-7 h-7 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Données existantes détectées
            </h2>
          </div>
          
          <p className="text-gray-600 text-sm leading-relaxed">
            La nouvelle génération va <span className="font-semibold text-gray-900">remplacer toutes les affectations actuelles</span>.
          </p>
          <p className="text-gray-900 font-medium mt-4">
            Souhaitez-vous archiver la génération précédente avant de continuer ?
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onArchive}
            className="w-full px-4 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 group"
          >
            <ArchiveBoxIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Oui, archiver puis générer</span>
          </button>
          
          <button
            onClick={onContinue}
            className="w-full px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 group"
          >
            <PlayIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Non, générer directement</span>
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
