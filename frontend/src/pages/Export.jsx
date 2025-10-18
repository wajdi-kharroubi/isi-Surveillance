import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  FileDown,
  FileText,
  File,
  Download,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileType,
} from 'lucide-react';

export default function Export() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type) => {
    setIsExporting(true);
    try {
      let response;

      switch (type) {
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
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      title: 'Convocations individuelles',
      description: 'Exporter toutes les convocations individuelles en format Word',
      icon: FileText,
      format: 'DOCX',
      gradient: 'from-blue-600 to-blue-700',
      bgGradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-300 hover:border-blue-500',
      iconBg: 'bg-blue-600',
      action: () => handleExport('convocations'),
    },
    {
      title: 'Liste des enseignants par créneaux',
      description: 'Exporter la liste des enseignants par créneau horaire en PDF',
      icon: FileType,
      format: 'PDF',
      gradient: 'from-red-600 to-red-700',
      bgGradient: 'from-red-50 to-red-100',
      borderColor: 'border-red-300 hover:border-red-500',
      iconBg: 'bg-red-600',
      action: () => handleExport('listes'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
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
              Générez vos convocations et listes d'enseignants
            </p>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="flex justify-center items-center flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
          {exportOptions.map((option) => (
            <div
              key={option.title}
              className={`relative overflow-hidden rounded-2xl border-2 ${option.borderColor} bg-white shadow-lg hover:shadow-2xl transition-all duration-300 group`}
            >
              {/* Background gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${option.bgGradient} opacity-40`}></div>
              
              {/* Content */}
              <div className="relative p-6 space-y-4">
                {/* Icon and Format Badge */}
                <div className="flex items-start justify-between">
                  <div className={`w-20 h-20 ${option.iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <option.icon className="w-12 h-12 text-white" strokeWidth={1.5} />
                  </div>
                  <div className={`px-4 py-2 bg-gradient-to-r ${option.gradient} text-white font-bold text-sm rounded-full shadow-md`}>
                    {option.format}
                  </div>
                </div>

                {/* Title and Description */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {option.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {option.description}
                  </p>
                </div>

                {/* Export Button */}
                <button
                  onClick={option.action}
                  disabled={isExporting}
                  className={`w-full bg-gradient-to-r ${option.gradient} hover:opacity-90 text-white font-semibold text-lg py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group-hover:scale-[1.02]`}
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
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
