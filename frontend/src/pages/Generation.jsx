import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generationAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  SparklesIcon, 
  ClockIcon, 
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function Generation() {
  const [config, setConfig] = useState({
    min_surveillants_par_salle: 2,
    allow_single_surveillant: true,
    max_time_seconds: 600, // 10 minutes par défaut
    tolerance: 0.05, // 5% de tolérance par défaut
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
    mutationFn: (data) => {
      return generationAPI.genererV3(data);
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
    generationMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Génération du Planning
                </h1>
                <p className="text-blue-100">
                  Algorithme d'optimisation V3 avec respect des contraintes et quotas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-white">V3 Actif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Configuration de l'Algorithme</h2>
        </div>
        
        <div className="p-6 space-y-8">
          {/* All Configurations in One Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Temps Maximum</h3>
                  <p className="text-sm text-gray-500">Durée limite de génération</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200 min-h-[280px]">
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="number"
                    min="60"
                    max="36000"
                    step="60"
                    value={config.max_time_seconds}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_time_seconds: parseInt(e.target.value),
                      })
                    }
                    className="w-28 text-3xl font-bold text-blue-600 border-2 border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <div>
                    <span className="text-lg text-gray-600">secondes</span>
                    <p className="text-sm text-blue-700 font-medium">
                      {config.max_time_seconds >= 3600 
                        ? `≈ ${(config.max_time_seconds / 3600).toFixed(1)} heures` 
                        : `≈ ${(config.max_time_seconds / 60).toFixed(0)} minutes`}
                    </p>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2">
                  {[
                    { label: '5 min', value: 300 },
                    { label: '10 min', value: 600 },
                    { label: '30 min', value: 1800 },
                    { label: '1 heure', value: 3600 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setConfig({ ...config, max_time_seconds: preset.value })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                        config.max_time_seconds === preset.value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-blue-50 border border-blue-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Min Surveillants Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <AdjustmentsHorizontalIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Surveillants Minimum</h3>
                  <p className="text-sm text-gray-500">Par salle d'examen</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 border border-green-200 min-h-[280px]">
                <div className="flex items-center gap-4 mb-4">
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
                    className="w-28 text-3xl font-bold text-green-600 border-2 border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  />
                  <div>
                    <span className="text-lg text-gray-600">surveillants</span>
                    <p className="text-sm text-green-700 font-medium">
                      {config.min_surveillants_par_salle === 1 && '⚠️ Risque de non-conformité'}
                      {config.min_surveillants_par_salle === 2 && '✅ Configuration standard'}
                      {config.min_surveillants_par_salle > 2 && '🛡️ Sécurité renforcée'}
                    </p>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2">
                  {[
                    { label: '1', value: 1 },
                    { label: '2', value: 2 },
                    { label: '3', value: 3 },
                    { label: '4', value: 4 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setConfig({ ...config, min_surveillants_par_salle: preset.value })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                        config.min_surveillants_par_salle === preset.value
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-green-50 border border-green-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Autoriser 1 seul surveillant - only show when min_surveillants_par_salle is 2 */}
                {config.min_surveillants_par_salle === 2 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-green-50/50 transition-all group">
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
                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-2 focus:ring-green-500 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700">
                          Autoriser 1 seul surveillant
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          En cas de manque d'enseignants disponibles
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Tolerance Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <AdjustmentsHorizontalIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Tolérance</h3>
                  <p className="text-sm text-gray-500">Précision de l'optimisation</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200 min-h-[280px]">
                <div className="text-center mb-4">
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-purple-600">
                      {(config.tolerance * 100).toFixed(0)}
                    </span>
                    <span className="text-2xl font-semibold text-purple-400">%</span>
                  </div>
                  <p className="text-sm text-purple-700 font-medium mt-2">
                    {config.tolerance <= 0.02 && '🎯 Précision maximale'}
                    {config.tolerance > 0.02 && config.tolerance <= 0.05 && '✅ Équilibre optimal'}
                    {config.tolerance > 0.05 && config.tolerance <= 0.1 && '⚡ Rapide'}
                    {config.tolerance > 0.1 && '🚀 Très rapide'}
                  </p>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={config.tolerance}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tolerance: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-purple-200 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #9333ea 0%, #9333ea ${config.tolerance * 500}%, #e9d5ff ${config.tolerance * 500}%, #e9d5ff 100%)`
                  }}
                />
                
                <div className="flex justify-between text-xs text-purple-600 mt-2">
                  <span>0%</span>
                  <span>20%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Generate Button */}
      {!isGenerating && !result && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => {
              handleGenerate();
              // Scroll down to show the loading/results section
              setTimeout(() => {
                window.scrollTo({
                  top: window.scrollY + 300,
                  behavior: 'smooth'
                });
              }, 100);
            }}
            className="group relative overflow-hidden flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="absolute inset-0 bg-white/10 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <PlayIcon className="w-6 h-6 relative z-10" />
            <span className="relative z-10 text-lg">Lancer la Génération</span>
          </button>
        </div>
      )}

      {/* Loading Animation */}
      {isGenerating && (
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                <span className="text-lg font-semibold text-white">Génération en cours...</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-xl font-mono font-bold text-white">
                  {elapsedTime.toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {[
              { text: 'Analyse des contraintes et création des variables...', icon: '🔍' },
              { text: 'Application des règles de priorité et quotas...', icon: '📋' },
              { text: 'Optimisation multi-critères en cours...', icon: '⚙️' },
              { text: 'Recherche de la solution optimale...', icon: '🎯' }
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${idx * 150}ms` }}>
                <span className="text-xl">{step.icon}</span>
                <p className="text-sm text-gray-700">{step.text}</p>
              </div>
            ))}
            
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
              <div className="flex justify-between text-sm text-gray-700 mb-3 font-medium">
                <span>⏱️ Max: {config.max_time_seconds >= 3600 ? `${(config.max_time_seconds / 3600).toFixed(1)}h` : `${(config.max_time_seconds / 60).toFixed(0)}min`}</span>
                <span>🎯 Tolérance: {(config.tolerance * 100).toFixed(0)}%</span>
              </div>
              <div className="relative w-full h-3 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min((elapsedTime / config.max_time_seconds) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-blue-600 mt-2 font-semibold">
                <span>0%</span>
                <span>{Math.min((elapsedTime / config.max_time_seconds) * 100, 100).toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isGenerating && (
        <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden ${
          result.success ? 'border-green-300' : 'border-red-300'
        }`}>
          <div className={`px-6 py-4 ${
            result.success 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircleIcon className="w-8 h-8 text-white" />
              ) : (
                <ExclamationTriangleIcon className="w-8 h-8 text-white" />
              )}
              <h3 className="text-xl font-bold text-white">
                {result.success ? 'Génération Réussie !' : 'Échec de la Génération'}
              </h3>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <p className="text-gray-700 text-lg">{result.message}</p>
            
            {result.success && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <ChartBarIcon className="w-6 h-6 text-blue-600" />
                    <p className="text-sm font-medium text-gray-600">Affectations créées</p>
                  </div>
                  <p className="text-4xl font-bold text-blue-600">{result.nb_affectations}</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-5 rounded-xl border-2 border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <ClockIcon className="w-6 h-6 text-green-600" />
                    <p className="text-sm font-medium text-gray-600">Temps d'exécution</p>
                  </div>
                  <p className="text-4xl font-bold text-green-600">{result.temps_generation.toFixed(2)}s</p>
                </div>
              </div>
            )}
            
            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBarIcon className="w-5 h-5 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-900">
                    Statistiques d'Optimisation
                  </p>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.warnings.map((warning, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                        {warning}
                      </p>
                    </div>
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
