import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generationAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function Generation() {
  const [config, setConfig] = useState({
    min_surveillants_par_salle: 2,
    allow_single_surveillant: true,
    priorite_grade: true,
  });
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const generationMutation = useMutation({
    mutationFn: (data) => generationAPI.generer(data),
    onSuccess: (response) => {
      setResult(response.data);
      if (response.data.success) {
        toast.success(response.data.message);
        queryClient.invalidateQueries(['statistiques']);
      } else {
        toast.error(response.data.message);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération');
    },
  });

  const handleGenerate = () => {
    generationMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Génération du Planning
          <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">V2.0</span>
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Algorithme d'optimisation avancé avec système de contraintes hiérarchisées et scoring multi-critères
        </p>
      </div>

      {/* Configuration */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre minimum de surveillants par salle
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={config.min_surveillants_par_salle}
              onChange={(e) =>
                setConfig({
                  ...config,
                  min_surveillants_par_salle: parseInt(e.target.value),
                })
              }
              className="input max-w-xs"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allow_single"
              checked={config.allow_single_surveillant}
              onChange={(e) =>
                setConfig({
                  ...config,
                  allow_single_surveillant: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary-600 rounded"
            />
            <label htmlFor="allow_single" className="ml-2 text-sm text-gray-700">
              Autoriser 1 seul surveillant en cas de manque
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="priorite_grade"
              checked={config.priorite_grade}
              onChange={(e) =>
                setConfig({
                  ...config,
                  priorite_grade: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary-600 rounded"
            />
            <label htmlFor="priorite_grade" className="ml-2 text-sm text-gray-700">
              Respecter les priorités selon le grade
            </label>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerate}
        disabled={generationMutation.isPending}
        className="btn btn-primary flex items-center gap-2 text-lg px-8 py-4"
      >
        <SparklesIcon className="h-6 w-6" />
        {generationMutation.isPending ? 'Génération en cours...' : 'Générer le planning'}
      </button>

      {/* Results */}
      {result && (
        <div className={`card ${result.success ? 'border-green-300' : 'border-red-300'}`}>
          <h3 className="text-lg font-semibold mb-4">
            {result.success ? '✅ Résultat' : '❌ Échec'}
          </h3>
          <div className="space-y-2">
            <p className="text-gray-700">{result.message}</p>
            {result.success && (
              <>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Affectations créées</p>
                    <p className="text-2xl font-bold text-blue-600">{result.nb_affectations}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Temps d'exécution</p>
                    <p className="text-2xl font-bold text-green-600">{result.temps_generation.toFixed(2)}s</p>
                  </div>
                </div>
              </>
            )}
            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  📊 Statistiques et Scores d'Optimisation
                </p>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
