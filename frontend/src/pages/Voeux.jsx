import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voeuxAPI, importAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function Voeux() {
  const [showImport, setShowImport] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const queryClient = useQueryClient();

  const { data: voeux, isLoading } = useQuery({
    queryKey: ['voeux'],
    queryFn: () => voeuxAPI.getAll().then(res => res.data),
  });

  const importMutation = useMutation({
    mutationFn: (file) => importAPI.importVoeux(file),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries(['voeux']);
      setShowImport(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import');
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const getSeanceLabel = (seance) => {
    const seances = {
      'S1': '08:30-10:00',
      'S2': '10:30-12:00',
      'S3': '12:30-14:00',
      'S4': '14:30-16:00'
    };
    return seances[seance] || seance;
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedVoeux = useMemo(() => {
    if (!voeux) return [];
    
    let sorted = [...voeux];
    
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle null/undefined
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Convert to string for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return sorted;
  }, [voeux, sortConfig]);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vœux de surveillance</h1>
          <p className="mt-2 text-sm text-gray-600">
            {sortedVoeux?.length || 0} vœu(x) enregistré(s)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Importer Excel
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Nouveau vœu
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Importer des vœux</h3>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="input"
              disabled={importMutation.isPending}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowImport(false)}
                className="btn btn-secondary"
                disabled={importMutation.isPending}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>
                <button 
                  onClick={() => handleSort('enseignant_nom')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Enseignant
                  {sortConfig.key === 'enseignant_nom' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('code_smartex_ens')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Code Smartex
                  {sortConfig.key === 'code_smartex_ens' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('jour')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Jour
                  {sortConfig.key === 'jour' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('seance')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Séance
                  {sortConfig.key === 'seance' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Horaire</th>
              <th>
                <button 
                  onClick={() => handleSort('semestre_code_libelle')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Semestre
                  {sortConfig.key === 'semestre_code_libelle' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('session_libelle')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Session
                  {sortConfig.key === 'session_libelle' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedVoeux?.map((voeu) => (
              <tr key={voeu.id}>
                <td className="font-medium">
                  {voeu.enseignant_prenom} {voeu.enseignant_nom}
                </td>
                <td>
                  <span className="badge badge-success">{voeu.code_smartex_ens || 'N/A'}</span>
                </td>
                <td>
                  <span className="badge badge-info">Jour {voeu.jour}</span>
                </td>
                <td>
                  <span className="badge badge-secondary">{voeu.seance}</span>
                </td>
                <td className="text-sm text-gray-600">
                  {getSeanceLabel(voeu.seance)}
                </td>
                <td>{voeu.semestre_code_libelle}</td>
                <td>
                  <span className="badge badge-primary">{voeu.session_libelle}</span>
                </td>
                <td>
                  <button className="text-primary-600 hover:text-primary-700 text-sm">
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
