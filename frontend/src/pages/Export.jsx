import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  DocumentTextIcon,
  TableCellsIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

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
      description: 'Exporter le planning complet en PDF',
      icon: DocumentTextIcon,
      color: 'bg-red-500',
      action: () => handleExport('pdf'),
    },
    {
      title: 'Planning Excel',
      description: 'Exporter toutes les données en Excel',
      icon: TableCellsIcon,
      color: 'bg-green-500',
      action: () => handleExport('excel'),
    },
    {
      title: 'Convocations',
      description: 'Générer les convocations individuelles (Word)',
      icon: DocumentArrowDownIcon,
      color: 'bg-blue-500',
      action: () => handleExport('convocations'),
    },
    {
      title: 'Listes par créneau',
      description: 'Générer les listes de surveillants par créneau',
      icon: DocumentArrowDownIcon,
      color: 'bg-purple-500',
      action: () => handleExport('listes'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Export</h1>
        <p className="mt-2 text-sm text-gray-600">
          Exportez vos documents en différents formats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div key={option.title} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start">
              <div className={`${option.color} p-3 rounded-lg`}>
                <option.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {option.description}
                </p>
                <button
                  onClick={option.action}
                  disabled={isExporting}
                  className="btn btn-primary mt-4"
                >
                  {isExporting ? 'Export en cours...' : 'Exporter'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">
          ℹ️ Information
        </h3>
        <p className="text-sm text-yellow-800">
          Les fichiers exportés seront téléchargés dans votre dossier de téléchargements.
          Les convocations et listes génèrent plusieurs fichiers dans le dossier exports du backend.
        </p>
      </div>
    </div>
  );
}
