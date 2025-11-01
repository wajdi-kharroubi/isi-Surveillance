import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import GmailOAuthModal from '../components/GmailOAuthModal';
import {
  FileDown,
  FileText,
  File,
  Download,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileType,
  Mail,
} from 'lucide-react';

export default function Export() {
  const [isExporting, setIsExporting] = useState(false);
  const [convocationsFormat, setConvocationsFormat] = useState('docx');
  const [listesFormat, setListesFormat] = useState('docx');
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);

  const handleExport = async (type, format) => {
    setIsExporting(true);
    try {
      let response;
      let filename;
      let contentType;

      switch (type) {
        case 'pdf':
          response = await exportAPI.planningPDF();
          filename = `planning_${new Date().toISOString().split('T')[0]}.pdf`;
          contentType = 'application/pdf';
          break;
        case 'excel':
          response = await exportAPI.planningExcel();
          filename = `planning_${new Date().toISOString().split('T')[0]}.xlsx`;
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'convocations':
          if (format === 'pdf') {
            response = await exportAPI.convocationsPDF();
            filename = `convocations_PDF_${new Date().toISOString().split('T')[0]}.zip`;
          } else {
            response = await exportAPI.convocations();
            filename = `convocations_${new Date().toISOString().split('T')[0]}.zip`;
          }
          contentType = 'application/zip';
          break;
        case 'listes':
          if (format === 'pdf') {
            response = await exportAPI.listesCreneauxPDF();
            filename = `listes_creneaux_PDF_${new Date().toISOString().split('T')[0]}.zip`;
          } else {
            response = await exportAPI.listesCreneaux();
            filename = `listes_creneaux_${new Date().toISOString().split('T')[0]}.zip`;
          }
          contentType = 'application/zip';
          break;
        case 'convocations-csv':
          response = await exportAPI.convocationsCSV();
          filename = `convocations_${new Date().toISOString().split('T')[0]}.csv`;
          contentType = 'text/csv';
          break;
        case 'convocations-xlsx':
          response = await exportAPI.convocationsXLSX();
          filename = `convocations_${new Date().toISOString().split('T')[0]}.xlsx`;
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          return;
      }

      // Download file
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Export réussi !');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      id: 'convocations',
      title: 'Convocations individuelles',
      description: 'Exporter toutes les convocations individuelles',
      icon: FileText,
      gradient: 'from-blue-600 to-blue-700',
      bgGradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-300 hover:border-blue-500',
      iconBg: 'bg-blue-600',
      formatState: convocationsFormat,
      setFormatState: setConvocationsFormat,
      action: (format) => handleExport('convocations', format),
    },
    {
      id: 'listes',
      title: 'Liste des enseignants par créneaux',
      description: 'Exporter la liste des enseignants par créneau horaire',
      icon: FileType,
      gradient: 'from-red-600 to-red-700',
      bgGradient: 'from-red-50 to-red-100',
      borderColor: 'border-red-300 hover:border-red-500',
      iconBg: 'bg-red-600',
      formatState: listesFormat,
      setFormatState: setListesFormat,
      action: (format) => handleExport('listes', format),
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
        <div className="space-y-8 max-w-6xl w-full">
          {/* Section principale - Convocations et Listes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {exportOptions.map((option) => (
              <div
                key={option.id}
                className={`relative overflow-hidden rounded-2xl border-2 ${option.borderColor} bg-white shadow-lg hover:shadow-2xl transition-all duration-300 group`}
              >
                {/* Background gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.bgGradient} opacity-40`}></div>
                
                {/* Content */}
                <div className="relative p-6 space-y-4">
                  {/* Icon and Format Selector */}
                  <div className="flex items-start justify-between">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${
                      option.formatState === 'docx' 
                        ? 'bg-blue-600' 
                        : 'bg-red-600'
                    }`}>
                      <option.icon className="w-12 h-12 text-white" strokeWidth={1.5} />
                    </div>
                    
                    {/* Format Toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => option.setFormatState('docx')}
                        className={`px-4 py-2 font-bold text-sm rounded-full shadow-md transition-all duration-300 ${
                          option.formatState === 'docx'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white scale-105'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        DOCX
                      </button>
                      <button
                        onClick={() => option.setFormatState('pdf')}
                        className={`px-4 py-2 font-bold text-sm rounded-full shadow-md transition-all duration-300 ${
                          option.formatState === 'pdf'
                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white scale-105'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        PDF
                      </button>
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
                    onClick={() => option.action(option.formatState)}
                    disabled={isExporting}
                    className={`w-full hover:opacity-90 text-white font-semibold text-lg py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group-hover:scale-[1.02] ${
                      option.formatState === 'docx'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                        : 'bg-gradient-to-r from-red-600 to-red-700'
                    }`}
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Export en cours...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-6 h-6" />
                        <span>Exporter en {option.formatState.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Nouvelle section - Export CSV/XLSX */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <File className="w-6 h-6" />
              Exports de données (CSV/Excel)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bouton CSV */}
              <button
                onClick={() => handleExport('convocations-csv')}
                disabled={isExporting}
                className="relative overflow-hidden rounded-xl border-2 border-green-300 hover:border-green-500 bg-white shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-40"></div>
                <div className="relative p-6 flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <FileText className="w-10 h-10 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-gray-900">Export CSV</h3>
                    <p className="text-gray-600 text-sm">Format CSV compatible Excel</p>
                  </div>
                  <Download className="w-6 h-6 text-green-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Bouton XLSX */}
              <button
                onClick={() => handleExport('convocations-xlsx')}
                disabled={isExporting}
                className="relative overflow-hidden rounded-xl border-2 border-emerald-300 hover:border-emerald-500 bg-white shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 opacity-40"></div>
                <div className="relative p-6 flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <File className="w-10 h-10 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-gray-900">Export Excel</h3>
                    <p className="text-gray-600 text-sm">Format XLSX avec mise en forme</p>
                  </div>
                  <Download className="w-6 h-6 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          {/* Nouvelle section - Envoi par Email */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Envoi automatisé par Email
            </h2>
            <button
              onClick={() => setIsGmailModalOpen(true)}
              disabled={isExporting}
              className="w-full relative overflow-hidden rounded-xl border-2 border-purple-300 hover:border-purple-500 bg-white shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-40"></div>
              <div className="relative p-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Mail className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-bold text-gray-900">Envoyer les Convocations par Email</h3>
                  <p className="text-gray-600 text-sm">Connexion Google OAuth2 - Choisissez votre compte Gmail</p>
                </div>
                <ChevronRight className="w-6 h-6 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal d'envoi d'emails Gmail OAuth2 */}
      <GmailOAuthModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
      />

    </div>
  );
}
