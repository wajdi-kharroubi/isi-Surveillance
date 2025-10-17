import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generationAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function Generation() {
  const [config, setConfig] = useState({
    min_surveillants_par_salle: 2,
    allow_single_surveillant: true,
    priorite_grade: true,
    algorithm_version: 'v2', // Version par défaut
  });
  const [result, setResult] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Chronomètre pendant la génération
  useEffect(() => {
    let interval;
    if (isGenerating) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 0.1);
      }, 100);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  const generationMutation = useMutation({
    mutationFn: ({ data, version }) => {
      // Sélectionner l'endpoint approprié selon la version
      switch (version) {
        case 'v1':
          return generationAPI.genererV1(data);
        case 'v2':
          return generationAPI.genererV2(data);
        case 'v3':
          return generationAPI.genererV3(data);
        default:
          return generationAPI.genererV2(data);
      }
    },
    onMutate: () => {
      setIsGenerating(true);
      setResult(null);
    },
    onSuccess: (response) => {
      setIsGenerating(false);
      setResult(response.data);
      if (response.data.success) {
        toast.success(response.data.message);
        queryClient.invalidateQueries(['statistiques']);
      } else {
        toast.error(response.data.message);
      }
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération');
    },
  });

  const handleGenerate = () => {
    generationMutation.mutate({ 
      data: config, 
      version: config.algorithm_version 
    });
  };

  const algorithmInfo = {
    v1: {
      title: 'V1 - Quota Fixe',
      description: 'Charge égale stricte par grade - Tous les enseignants d\'un même grade font le même nombre de séances',
      color: 'bg-gray-100 text-gray-800',
    },
    v2: {
      title: 'V2 - Optimisation Avancée',
      description: 'Système de contraintes hiérarchisées avec scoring multi-critères et équilibrage',
      color: 'bg-blue-100 text-blue-800',
    },
    v3: {
      title: 'V3 - Quota Maximum',
      description: 'Optimisation avancée avec quota maximum strict - Ne jamais dépasser les limites par grade',
      color: 'bg-purple-100 text-purple-800',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Génération du Planning
          <span className={`ml-3 text-sm px-2 py-1 rounded-full ${algorithmInfo[config.algorithm_version].color}`}>
            {algorithmInfo[config.algorithm_version].title}
          </span>
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {algorithmInfo[config.algorithm_version].description}
        </p>
      </div>

      {/* Configuration */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div className="space-y-4">
          {/* Sélection de l'algorithme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Algorithme de génération
            </label>
            <select
              value={config.algorithm_version}
              onChange={(e) =>
                setConfig({
                  ...config,
                  algorithm_version: e.target.value,
                })
              }
              className="input max-w-md"
            >
              <option value="v1">V1 - Quota Fixe par Grade (Charge égale stricte)</option>
              <option value="v2">V2 - Optimisation Avancée (Recommandé)</option>
              <option value="v3">V3 - Quota Maximum Strict (Ne pas dépasser les limites)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {config.algorithm_version === 'v1' && '📊 Tous les enseignants d\'un même grade font exactement le même nombre de séances'}
              {config.algorithm_version === 'v2' && '🎯 Équilibre optimal entre contraintes et préférences avec scoring'}
              {config.algorithm_version === 'v3' && '🔒 Respect strict des quotas maximum par grade avec optimisation'}
            </p>
          </div>

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
        disabled={isGenerating}
        className={`btn btn-primary flex items-center gap-2 text-lg px-8 py-4 ${
          isGenerating ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        <SparklesIcon className={`h-6 w-6 ${isGenerating ? 'animate-spin' : ''}`} />
        {isGenerating ? 'Génération en cours...' : 'Générer le planning'}
      </button>

      {/* Loading Animation with Timer */}
      {isGenerating && (
        <div className="card border-blue-300 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              ⚙️ Génération en cours...
            </h3>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-2xl font-mono font-bold text-blue-600">
                {elapsedTime.toFixed(1)}s
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-blue-800">Analyse des contraintes et création des variables...</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full animation-delay-200"></div>
              <p className="text-sm text-blue-800">Application des règles de priorité et quotas...</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full animation-delay-400"></div>
              <p className="text-sm text-blue-800">Optimisation multi-critères en cours...</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full animation-delay-600"></div>
              <p className="text-sm text-blue-800">Recherche de la solution optimale...</p>
            </div>
          </div>
          
          <div className="mt-4 bg-white rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>⏱️ Temps maximum: 10 heures</span>
              <span className="text-blue-600 font-semibold">
                {algorithmInfo[config.algorithm_version].title}
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((elapsedTime / 36000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isGenerating && (
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
