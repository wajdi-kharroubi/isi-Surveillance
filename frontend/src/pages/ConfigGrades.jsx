import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ConfigGrades() {
  const [editingGrade, setEditingGrade] = useState(null);
  const [editValue, setEditValue] = useState('');
  const queryClient = useQueryClient();

  const { data: grades, isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesAPI.getAll().then(res => res.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }) => gradesAPI.update(code, data),
    onSuccess: () => {
      toast.success('Configuration mise à jour');
      queryClient.invalidateQueries(['grades']);
      setEditingGrade(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => gradesAPI.reset(),
    onSuccess: () => {
      toast.success('Configurations réinitialisées');
      queryClient.invalidateQueries(['grades']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    },
  });

  const handleEdit = (grade) => {
    setEditingGrade(grade.grade_code);
    setEditValue(grade.nb_surveillances.toString());
  };

  const handleSave = (code) => {
    const nb = parseInt(editValue);
    if (isNaN(nb) || nb < 0 || nb > 20) {
      toast.error('Nombre invalide (doit être entre 0 et 20)');
      return;
    }
    updateMutation.mutate({ code, data: { nb_surveillances: nb } });
  };

  const handleCancel = () => {
    setEditingGrade(null);
    setEditValue('');
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les configurations aux valeurs par défaut ?')) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration des Grades</h1>
          <p className="mt-2 text-sm text-gray-600">
            Personnalisez le nombre maximum de surveillances par grade
          </p>
        </div>
        <button
          onClick={handleReset}
          className="btn btn-secondary flex items-center gap-2"
          disabled={resetMutation.isPending}
        >
          <ArrowPathIcon className="h-5 w-5" />
          Réinitialiser
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              À propos du nombre de surveillances
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Ces valeurs définissent le nombre maximum de surveillances que chaque grade peut assurer.
                L'algorithme d'optimisation utilise ces limites pour répartir équitablement les surveillances.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Grade</th>
              <th>Nombre de Surveillances</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grades?.map((grade) => (
              <tr key={grade.grade_code}>
                <td>
                  <span className="badge badge-primary">{grade.grade_code}</span>
                </td>
                <td className="font-medium">{grade.grade_nom}</td>
                <td>
                  {editingGrade === grade.grade_code ? (
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input w-24"
                      autoFocus
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary-600">
                      {grade.nb_surveillances}
                    </span>
                  )}
                </td>
                <td>
                  {editingGrade === grade.grade_code ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(grade.grade_code)}
                        className="text-green-600 hover:text-green-700 p-1"
                        disabled={updateMutation.isPending}
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(grade)}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Modifier
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Grades</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {grades?.length || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Moyenne Surveillances</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {grades && grades.length > 0
              ? Math.round(grades.reduce((sum, g) => sum + g.nb_surveillances, 0) / grades.length)
              : 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Maximum</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {grades && grades.length > 0
              ? Math.max(...grades.map(g => g.nb_surveillances))
              : 0}
          </div>
        </div>
      </div>
    </div>
  );
}
