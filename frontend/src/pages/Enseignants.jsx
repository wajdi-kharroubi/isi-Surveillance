import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enseignantsAPI, importAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function Enseignants() {
  const [showImport, setShowImport] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const queryClient = useQueryClient();

  const { data: enseignants, isLoading } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  // Tri uniquement
  const sortedEnseignants = useMemo(() => {
    if (!enseignants) return [];

    let sorted = [...enseignants];

    // Tri
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Gestion des valeurs nulles/undefined
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        // Conversion en string pour comparaison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [enseignants, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const importMutation = useMutation({
    mutationFn: (file) => importAPI.importEnseignants(file),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries(['enseignants']);
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

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enseignants</h1>
          <p className="mt-2 text-sm text-gray-600">
            {sortedEnseignants?.length || 0} enseignant(s) enregistré(s)
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
            Nouvel enseignant
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Importer des enseignants</h3>
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
                  onClick={() => handleSort('code_smartex')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Code Smartex
                  {sortConfig.key === 'code_smartex' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('nom')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Nom
                  {sortConfig.key === 'nom' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('prenom')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Prénom
                  {sortConfig.key === 'prenom' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Email
                  {sortConfig.key === 'email' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('grade_code')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Grade
                  {sortConfig.key === 'grade_code' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('participe_surveillance')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Surveillance
                  {sortConfig.key === 'participe_surveillance' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedEnseignants?.map((ens) => (
              <tr key={ens.id}>
                <td>
                  <span className="font-mono text-sm font-semibold text-primary-700">
                    {ens.code_smartex}
                  </span>
                </td>
                <td className="font-medium">{ens.nom}</td>
                <td>{ens.prenom}</td>
                <td className="text-gray-500 text-sm">{ens.email}</td>
                <td>
                  <span className="badge badge-info">{ens.grade_code}</span>
                </td>
                <td>
                  {ens.participe_surveillance ? (
                    <span className="badge badge-success">Oui</span>
                  ) : (
                    <span className="badge badge-danger">Non</span>
                  )}
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
