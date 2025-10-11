import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examensAPI, importAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function Examens() {
  const [showImport, setShowImport] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const queryClient = useQueryClient();

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens'],
    queryFn: () => examensAPI.getAll().then(res => res.data),
  });

  const importMutation = useMutation({
    mutationFn: (file) => importAPI.importExamens(file),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries(['examens']);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const formatTime = (timeString) => {
    // timeString format: "HH:MM:SS" or "HH:MM"
    return timeString.substring(0, 5);
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedExamens = useMemo(() => {
    if (!examens) return [];
    
    let sorted = [...examens];
    
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
  }, [examens, sortConfig]);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Examens</h1>
          <p className="mt-2 text-sm text-gray-600">
            {sortedExamens?.length || 0} examen(s) programmé(s)
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
            Nouvel examen
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Importer des examens</h3>
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
                  onClick={() => handleSort('dateExam')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Date
                  {sortConfig.key === 'dateExam' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('h_debut')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Horaire
                  {sortConfig.key === 'h_debut' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('semestre')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Semestre
                  {sortConfig.key === 'semestre' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('session')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Session
                  {sortConfig.key === 'session' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('type_ex')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Type
                  {sortConfig.key === 'type_ex' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('enseignant')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Enseignant
                  {sortConfig.key === 'enseignant' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('cod_salle')}
                  className="flex items-center gap-1 hover:text-primary-600 font-semibold"
                >
                  Salle
                  {sortConfig.key === 'cod_salle' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedExamens?.map((exam) => (
              <tr key={exam.id}>
                <td className="font-medium">{formatDate(exam.dateExam)}</td>
                <td>
                  <div className="text-sm">
                    {formatTime(exam.h_debut)} - {formatTime(exam.h_fin)}
                  </div>
                </td>
                <td>
                  <span className="badge badge-info">{exam.semestre}</span>
                </td>
                <td>
                  <span className={`badge ${exam.session === 'P' || exam.session === 'Principale' ? 'badge-success' : 'badge-warning'}`}>
                    {exam.session}
                  </span>
                </td>
                <td>{exam.type_ex}</td>
                <td className="text-gray-600">{exam.enseignant}</td>
                <td>
                  <span className="badge badge-secondary">{exam.cod_salle}</span>
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
