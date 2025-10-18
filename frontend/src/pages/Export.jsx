import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

export default function Export() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type) => {
    setIsExporting(true);
    try {
      let response;
      let filename;

      switch (type) {
        case 'pdf':
          response = await exportAPI.planningPDF();
          filename = 'planning.pdf';
          break;
        case 'excel':
          response = await exportAPI.planningExcel();
          filename = 'planning.xlsx';
          break;
        case 'convocations':
          response = await exportAPI.convocations();
          toast.success(response.data.message);
          setIsExporting(false);
          return;
        case 'listes':
          response = await exportAPI.listesCreneaux();
          toast.success(response.data.message);
          setIsExporting(false);
          return;
        default:
          return;
      }

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export réussi !');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      title: 'Planning PDF',
      description: 'Exporter le planning complet en format PDF imprimable',
      icon: FileText,
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-50 to-pink-50',
      borderColor: 'border-red-200 hover:border-red-400',
      action: () => handleExport('pdf'),
    },
    {
      title: 'Planning Excel',
      description: 'Exporter toutes les données au format Excel pour analyse',
      icon: FileSpreadsheet,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200 hover:border-green-400',
      action: () => handleExport('excel'),
    },
    {
      title: 'Convocations',
      description: 'Générer les convocations individuelles (Documents Word)',
      icon: Download,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200 hover:border-blue-400',
      action: () => handleExport('convocations'),
    },
    {
      title: 'Listes par créneau',
      description: 'Générer les listes de surveillants organisées par créneau horaire',
      icon: Download,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200 hover:border-purple-400',
      action: () => handleExport('listes'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
            <FileDown className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold drop-shadow-lg">Export des Documents</h1>
            <p className="text-cyan-100 text-lg mt-1">
              Téléchargez vos plannings et documents dans différents formats
            </p>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div
            key={option.title}
            className={`card group hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 border-2 ${option.borderColor}`}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-16 h-16 bg-gradient-to-br ${option.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <option.icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {option.title}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </div>

            <button
              onClick={option.action}
              disabled={isExporting}
              className="w-full btn btn-primary text-lg py-4 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Export en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  <span>Exporter maintenant</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Info sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Location Info */}
        <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-900 mb-2">📂 Emplacement des fichiers</h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span><strong>PDF & Excel :</strong> Téléchargés dans votre dossier de téléchargements par défaut</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Convocations & Listes :</strong> Générés dans le dossier <code className="bg-yellow-200 px-1 rounded">exports/</code> du backend</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Export Tips */}
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">💡 Conseils d'utilisation</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>PDF :</strong> Idéal pour l'impression et l'archivage officiel</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Excel :</strong> Parfait pour l'analyse et les modifications manuelles</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Convocations :</strong> Documents personnalisés pour chaque enseignant</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
