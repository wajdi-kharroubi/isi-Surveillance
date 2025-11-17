import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportAPI, examensAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import GmailOAuthModal from '../components/GmailOAuthModal';
import ConfigExportModal from '../components/ConfigExportModal';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

export default function Export() {
  const [isExporting, setIsExporting] = useState(false);
  const [convocationsFormat, setConvocationsFormat] = useState('docx');
  const [listesFormat, setListesFormat] = useState('docx');
  const [dataFormat, setDataFormat] = useState('csv');
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [session, setSession] = useState('Partiel');
  const [semestre, setSemestre] = useState('S1');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState(null);

  // Récupérer les valeurs par défaut du premier examen
  useEffect(() => {
    fetchDefaultValues();
  }, []);

  const fetchDefaultValues = async () => {
    try {
      const response = await examensAPI.getAll({ limit: 1 });
      if (response.data && response.data.length > 0) {
        const firstExam = response.data[0];
        
        // Déterminer la session
        const sessionMap = {
          'Pa': 'Partiel',
          'P': 'Principale',
          'R': 'Rattrapage',
          'C': 'Controle'
        };
        const sessionValue = sessionMap[firstExam.session] || 'Partiel';
        setSession(sessionValue);
        
        // Déterminer le semestre
        const semestreValue = firstExam.semestre?.includes('2') ? 'S2' : 'S1';
        setSemestre(semestreValue);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des valeurs par défaut:', error);
    }
  };

  const handleExportWithConfig = (type, format) => {
    // Ouvrir le modal de configuration pour les convocations
    if (type === 'convocations') {
      setPendingExport({ type, format });
      setIsConfigModalOpen(true);
    } else {
      handleExport(type, format);
    }
  };

  const handleConfigConfirm = (sessionValue, semestreValue) => {
    setSession(sessionValue);
    setSemestre(semestreValue);
    if (pendingExport) {
      handleExport(pendingExport.type, pendingExport.format, sessionValue, semestreValue);
      setPendingExport(null);
    }
  };

  const handleExport = async (type, format, sessionParam = session, semestreParam = semestre) => {
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
            response = await exportAPI.convocationsPDF({ session: sessionParam, semestre: semestreParam });
            filename = `convocations_PDF_${new Date().toISOString().split('T')[0]}.zip`;
          } else {
            response = await exportAPI.convocations({ session: sessionParam, semestre: semestreParam });
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
      description: 'Générer les convocations personnalisées pour chaque enseignant',
      icon: DocumentTextIcon,
      color: 'blue',
      formatState: convocationsFormat,
      setFormatState: setConvocationsFormat,
      action: (format) => handleExportWithConfig('convocations', format),
    },
    {
      id: 'listes',
      title: 'Listes par créneaux',
      description: 'Exporter la liste des enseignants organisée par créneau horaire',
      icon: TableCellsIcon,
      color: 'blue',
      formatState: listesFormat,
      setFormatState: setListesFormat,
      action: (format) => handleExport('listes', format),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative px-8 py-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
              <ArrowDownTrayIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Export des Documents</h1>
              <p className="text-green-100 text-sm font-medium mt-1">
                Téléchargez vos convocations, listes et envoyez par email
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Export Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
          >
            <div className={`h-2 transition-colors duration-200 ${
              option.formatState === 'docx'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                : option.formatState === 'pdf'
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : option.color === 'blue'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                : 'bg-gradient-to-r from-green-500 to-emerald-600'
            }`}></div>
            
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-colors duration-200 ${
                  option.formatState === 'docx'
                    ? 'bg-blue-100'
                    : option.formatState === 'pdf'
                    ? 'bg-red-100'
                    : option.color === 'blue'
                    ? 'bg-blue-100'
                    : 'bg-green-100'
                }`}>
                  <option.icon className={`w-7 h-7 transition-colors duration-200 ${
                    option.formatState === 'docx'
                      ? 'text-blue-600'
                      : option.formatState === 'pdf'
                      ? 'text-red-600'
                      : option.color === 'blue'
                      ? 'text-blue-600'
                      : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{option.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>

              {/* Format Selector */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Format d'export
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => option.setFormatState('docx')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors duration-200 ${
                      option.formatState === 'docx'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <DocumentTextIcon className="w-5 h-5" />
                      DOCX
                    </div>
                  </button>
                  <button
                    onClick={() => option.setFormatState('pdf')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors duration-200 ${
                      option.formatState === 'pdf'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <DocumentArrowDownIcon className="w-5 h-5" />
                      PDF
                    </div>
                  </button>
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={() => option.action(option.formatState)}
                disabled={isExporting}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                  option.formatState === 'docx'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : option.formatState === 'pdf'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                    : option.color === 'blue'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Export en cours...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>Télécharger en {option.formatState.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Data Exports Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600 transition-colors duration-200"></div>

          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md bg-green-100">
                <TableCellsIcon className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">Export des convocations (données)</h2>
                <p className="text-sm text-gray-600 mt-1">Téléchargez les données des convocations au format CSV ou XLSX</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Format d'export</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDataFormat('csv')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                    dataFormat === 'csv'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <DocumentTextIcon className="w-5 h-5" />
                    CSV
                  </div>
                </button>
                <button
                  onClick={() => setDataFormat('xlsx')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                    dataFormat === 'xlsx'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <TableCellsIcon className="w-5 h-5" />
                    XLSX
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleExport(dataFormat === 'csv' ? 'convocations-csv' : 'convocations-xlsx')}
              disabled={isExporting}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700`}
              style={{ marginTop: 'auto' }}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Export en cours...</span>
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>Télécharger ({dataFormat.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Email Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full">
          <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-600 transition-colors duration-200"></div>

          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md bg-purple-100">
                <EnvelopeIcon className="w-7 h-7 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">Envoi automatisé par Email</h2>
                <p className="text-sm text-gray-600 mt-1">Envoyez les convocations directement aux enseignants via Gmail</p>
              </div>
            </div>

            <button
              onClick={() => setIsGmailModalOpen(true)}
              disabled={isExporting}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700`}
              style={{ marginTop: 'auto' }}
            >
              <EnvelopeIcon className="w-5 h-5" />
              <span>Configurer et envoyer par Gmail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Box */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg border-2 border-amber-200 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Conseils d'utilisation</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>Format DOCX :</strong> Idéal pour modifier les documents avant impression</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>Format PDF :</strong> Prêt pour l'impression et l'envoi direct</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>CSV/Excel :</strong> Pour traiter les données dans des logiciels tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>Envoi Email :</strong> Connexion sécurisée via Google OAuth2</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal d'envoi d'emails Gmail OAuth2 */}
      <GmailOAuthModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
      />

      {/* Modal de configuration d'export */}
      <ConfigExportModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setPendingExport(null);
        }}
        onConfirm={handleConfigConfirm}
        defaultSession={session}
        defaultSemestre={semestre}
        format={pendingExport?.format || 'docx'}
      />
    </div>
  );
}
