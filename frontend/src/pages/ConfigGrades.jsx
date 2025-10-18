import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  RefreshCw, 
  Check, 
  X, 
  Edit2, 
  Settings,
  TrendingUp,
  BarChart3,
  Award,
  AlertCircle,
} from 'lucide-react';

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
    if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les configurations aux valeurs par défaut ?')) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement des configurations...</p>
        </div>
      </div>
    );
  }

  const totalGrades = grades?.length || 0;
  const avgSurveillances = grades && grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + g.nb_surveillances, 0) / grades.length)
    : 0;
  const maxSurveillances = grades && grades.length > 0
    ? Math.max(...grades.map(g => g.nb_surveillances))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <Settings className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Configuration des Grades</h1>
              <p className="text-purple-100 text-lg mt-1">
                Personnalisez le nombre maximum de surveillances par grade
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="btn bg-white/20 hover:bg-white/30 backdrop-blur-lg border-2 border-white/40 text-white shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">
              À propos du nombre de surveillances
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              Ces valeurs définissent le <strong>nombre maximum de surveillances</strong> que chaque grade peut assurer.
              L'algorithme d'optimisation utilise ces limites pour répartir <strong>équitablement</strong> les surveillances
              en tenant compte de la hiérarchie des grades et des préférences des enseignants.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-purple-700">Total Grades</div>
              <div className="text-4xl font-bold text-purple-900">{totalGrades}</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-700">Moyenne Surveillances</div>
              <div className="text-4xl font-bold text-blue-900">{avgSurveillances}</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-green-700">Maximum</div>
              <div className="text-4xl font-bold text-green-900">{maxSurveillances}</div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <span className="text-indigo-900 font-bold">Code Grade</span>
                </th>
                <th className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <span className="text-indigo-900 font-bold">Nom du Grade</span>
                </th>
                <th className="bg-gradient-to-r from-indigo-50 to-purple-50 text-center">
                  <span className="text-indigo-900 font-bold">Nombre de Surveillances</span>
                </th>
                <th className="bg-gradient-to-r from-indigo-50 to-purple-50 text-center">
                  <span className="text-indigo-900 font-bold">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grades?.map((grade, index) => (
                <tr 
                  key={grade.grade_code}
                  className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td>
                    <span className="badge badge-primary text-sm font-bold">
                      {grade.grade_code}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold text-gray-900">{grade.grade_nom}</span>
                  </td>
                  <td className="text-center">
                    {editingGrade === grade.grade_code ? (
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="input w-24 text-center font-bold text-lg"
                        autoFocus
                      />
                    ) : (
                      <div className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-100 to-purple-100 px-4 py-2 rounded-xl border-2 border-indigo-300">
                        <span className="text-3xl font-bold text-indigo-900">
                          {grade.nb_surveillances}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    {editingGrade === grade.grade_code ? (
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleSave(grade.grade_code)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md"
                          disabled={updateMutation.isPending}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-md"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleEdit(grade)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-semibold shadow-md"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>Modifier</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
