import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { statistiquesAPI, enseignantsAPI } from '../services/api';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  Clock as ClockLucide
} from 'lucide-react';

export default function Statistiques() {
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [chargeEnseignants, setChargeEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview'); // overview, souhaits, responsables, contraintes, grades

  useEffect(() => {
    chargerStatistiques();
  }, []);

  // Update activeTab when location state changes
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state?.activeTab]);

  const chargerStatistiques = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, chargeRes] = await Promise.all([
        statistiquesAPI.getDerniereGeneration(true),
        statistiquesAPI.getChargeEnseignants()
      ]);
      
      setStats(statsRes.data);
      setChargeEnseignants(chargeRes.data.charges || []);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          
          <div className="relative px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md">
                  Statistiques & Résultats
                </h1>
                <p className="text-purple-100 text-sm font-medium">
                  Chargement des données...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <ClockLucide className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-xl text-gray-700 font-bold">Chargement des statistiques...</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          
          <div className="relative px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md">
                  Statistiques & Résultats
                </h1>
                <p className="text-purple-100 text-sm font-medium">
                  Analyse détaillée de la génération
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-20 bg-gradient-to-br from-red-50 via-orange-50 to-red-50 rounded-2xl border-3 border-dashed border-red-300">
          <div className="w-24 h-24 bg-gradient-to-br from-red-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircle className="w-14 h-14 text-red-600" />
          </div>
          <p className="text-red-700 text-2xl font-bold mb-2">{error}</p>
          <p className="text-red-600 text-base max-w-md mx-auto">
            Veuillez d'abord générer un planning pour voir les statistiques.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Calcul des statistiques par grade
  const statsParGrade = calculerStatsParGrade(chargeEnseignants);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md">
                  Statistiques & Résultats
                </h1>
                <p className="text-purple-100 text-sm font-medium">
                  Analyse détaillée de la génération du planning
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations générales - Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Dernière génération</p>
              <p className="text-base font-bold text-gray-900">{stats.date_generation}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Temps de génération</p>
              <p className="text-base font-bold text-gray-900">{stats.temps_generation} ms</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Affectations créées</p>
              <p className="text-base font-bold text-purple-600">{stats.nb_affectations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Modern Style */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <ChartBarIcon className="h-5 w-5" />
            <span>Vue d'ensemble</span>
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('souhaits')}
            className={`${
              activeTab === 'souhaits'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <DocumentCheckIcon className="h-5 w-5" />
            <span>Souhaits</span>
            {stats.nb_souhaits_violes > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                {stats.nb_souhaits_violes}
              </span>
            )}
            {activeTab === 'souhaits' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('responsables')}
            className={`${
              activeTab === 'responsables'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <UserGroupIcon className="h-5 w-5" />
            <span>Responsables</span>
            {stats.nb_responsables_absents > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                {stats.nb_responsables_absents}
              </span>
            )}
            {activeTab === 'responsables' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('contraintes')}
            className={`${
              activeTab === 'contraintes'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <CalendarDaysIcon className="h-5 w-5" />
            <span>Séances par jour</span>
            {stats.nb_contraintes_seances_violees > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                {stats.nb_contraintes_seances_violees}
              </span>
            )}
            {activeTab === 'contraintes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('heures_creuses')}
            className={`${
              activeTab === 'heures_creuses'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <ClockIcon className="h-5 w-5" />
            <span>Heures creuses</span>
            {(stats.heures_creuses?.length || 0) > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                {stats.heures_creuses?.length || 0}
              </span>
            )}
            {activeTab === 'heures_creuses' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`${
              activeTab === 'grades'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <TrendingUp className="h-5 w-5" />
            <span>Quotas par grade</span>
            {activeTab === 'grades' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
        </nav>

        <div className="p-8">
          {/* Contenu des onglets */}
          {activeTab === 'overview' && <VueEnsemble stats={stats} setActiveTab={setActiveTab} />}
          {activeTab === 'souhaits' && <VueSouhaits stats={stats} />}
          {activeTab === 'responsables' && <VueResponsables stats={stats} />}
          {activeTab === 'contraintes' && <VueContraintes stats={stats} />}
          {activeTab === 'heures_creuses' && <VueHeuresCreuses stats={stats} />}
          {activeTab === 'grades' && <VueGrades statsParGrade={statsParGrade} chargeEnseignants={chargeEnseignants} />}
        </div>
      </div>
    </div>
  );
}

// Composant Vue d'ensemble
function VueEnsemble({ stats, setActiveTab }) {
  // Utiliser les nouvelles propriétés séparées du backend
  const responsablesAbsentsNonSurveillants = stats.responsables_absents_non_surveillants || [];
  const responsablesAbsentsAutres = stats.responsables_absents_participants || [];

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Carte Souhaits */}
        <div 
          className="group relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-blue-400 transition-all duration-300 cursor-pointer"
          onClick={() => setActiveTab('souhaits')}
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Respect des souhaits</h3>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <DocumentCheckIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Total souhaits</span>
                <span className="font-bold text-gray-900">{stats.nb_souhaits_total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600 font-medium">Respectés</span>
                <span className="font-bold text-green-600">{stats.nb_souhaits_respectes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600 font-medium">Violés</span>
                <span className="font-bold text-red-600">{stats.nb_souhaits_violes}</span>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <CircularProgress 
                  percentage={stats.taux_souhaits_respectes} 
                  label="Taux de respect"
                  color="blue"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Carte Responsables */}
        <div 
          className="group relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-green-400 transition-all duration-300 cursor-pointer"
          onClick={() => setActiveTab('responsables')}
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Responsables présents</h3>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Examens</span>
                <span className="font-bold text-gray-900">{stats.nb_responsables_total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600 font-medium">Responsables présents</span>
                <span className="font-bold text-green-600">{stats.nb_responsables_presents}</span>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600 font-medium">Responsables absents</span>
                  <span className="font-bold text-red-600">{stats.nb_responsables_absents || 0}</span>
                </div>
                <div className="text-xs text-orange-600 mt-1 font-medium">
                  • Dispensés {stats.nb_responsables_non_participants || 0} (Ne surveillent pas)
                </div>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <CircularProgress 
                  percentage={stats.taux_responsables_presents} 
                  label="Taux de présence"
                  color="green"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Carte Contraintes séances/jour */}
        <div 
          className="group relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-purple-400 transition-all duration-300 cursor-pointer"
          onClick={() => setActiveTab('contraintes')}
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Contraintes séances/jour</h3>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Total contraintes</span>
                <span className="font-bold text-gray-900">{stats.nb_contraintes_seances_total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600 font-medium">Respectées</span>
                <span className="font-bold text-green-600">{stats.nb_contraintes_seances_respectees}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600 font-medium">Dépassements</span>
                <span className="font-bold text-red-600">{stats.nb_contraintes_seances_violees}</span>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <CircularProgress 
                  percentage={stats.taux_contraintes_seances_respectees} 
                  label="Taux de respect"
                  color="purple"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Heures creuses */}
      <div 
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-md border-2 border-amber-200 p-6 cursor-pointer hover:shadow-xl hover:border-amber-300 transition-all duration-300"
        onClick={() => setActiveTab('heures_creuses')}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
            Heures creuses (séances non consécutives)
          </h3>

        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Gaps détectés</p>
            <p className="text-3xl font-bold text-amber-600">{stats.heures_creuses?.length || 0}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-orange-200">
            <p className="text-sm text-orange-600 font-medium">Enseignants concernés</p>
            <p className="text-3xl font-bold text-orange-600">{stats.nb_enseignants_heures_creuses || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant Vue Souhaits
function VueSouhaits({ stats }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const sortedSouhaits = React.useMemo(() => {
    if (!stats.souhaits_violes || stats.souhaits_violes.length === 0) return [];
    
    let sortableItems = [...stats.souhaits_violes];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Pour les noms d'enseignants
        if (sortConfig.key === 'enseignant_nom') {
          aVal = `${a.enseignant_nom} ${a.enseignant_prenom}`;
          bVal = `${b.enseignant_nom} ${b.enseignant_prenom}`;
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stats.souhaits_violes, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' 
            ? <ChevronUpIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Statistiques résumées */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-md border-2 border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <DocumentCheckIcon className="h-5 w-5 text-white" />
            </div>
            Statistiques des souhaits
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-600 font-medium">Taux de respect</p>
            <p className="text-3xl font-bold text-blue-600">{stats.taux_souhaits_respectes}%</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats.nb_souhaits_total}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-green-200">
            <p className="text-sm text-green-600 font-medium">Respectés</p>
            <p className="text-3xl font-bold text-green-600">{stats.nb_souhaits_respectes}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-red-200">
            <p className="text-sm text-red-600 font-medium">Violés</p>
            <p className="text-3xl font-bold text-red-600">{stats.nb_souhaits_violes}</p>
          </div>
        </div>
      </div>

      {/* Liste des souhaits violés */}
      {sortedSouhaits.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
          <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              Liste des souhaits non respectés ({sortedSouhaits.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Enseignant" sortKey="enseignant_nom" />
                  <SortableHeader label="Date" sortKey="date_exam" />
                  <SortableHeader label="Jour" sortKey="jour" />
                  <SortableHeader label="Séance" sortKey="seance" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSouhaits.map((souhait) => (
                  <tr key={souhait.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {souhait.enseignant_nom} {souhait.enseignant_prenom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{souhait.date_exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{souhait.jour}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-600">{souhait.seance}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedSouhaits.length === 0 && (
        <div className="text-center py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl border-3 border-dashed border-green-300">
          <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircleIcon className="w-14 h-14 text-green-600" />
          </div>
          <p className="text-green-700 text-2xl font-bold mb-2">Excellent !</p>
          <p className="text-green-600 text-base">Tous les souhaits ont été respectés.</p>
        </div>
      )}
    </div>
  );
}

// Composant Vue Responsables
function VueResponsables({ stats }) {
  const [sortConfigAutres, setSortConfigAutres] = useState({ key: null, direction: 'asc' });
  const [sortConfigNonSurv, setSortConfigNonSurv] = useState({ key: null, direction: 'asc' });
  
  // Utiliser les nouvelles propriétés séparées du backend
  const responsablesAbsentsNonSurveillants = stats.responsables_absents_non_surveillants || [];
  const responsablesAbsentsAutres = stats.responsables_absents_participants || [];

  const sortData = (data, sortConfig) => {
    if (!sortConfig.key || data.length === 0) return data;
    
    let sortableItems = [...data];
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Pour les noms d'enseignants
      if (sortConfig.key === 'enseignant_nom') {
        aVal = `${a.enseignant_nom} ${a.enseignant_prenom}`;
        bVal = `${b.enseignant_nom} ${b.enseignant_prenom}`;
      }
      
      // Pour les nombres
      if (sortConfig.key === 'nb_examens') {
        aVal = a.nb_examens || 1;
        bVal = b.nb_examens || 1;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  };

  const sortedAutres = React.useMemo(() => 
    sortData(responsablesAbsentsAutres, sortConfigAutres),
    [responsablesAbsentsAutres, sortConfigAutres]
  );

  const sortedNonSurv = React.useMemo(() => 
    sortData(responsablesAbsentsNonSurveillants, sortConfigNonSurv),
    [responsablesAbsentsNonSurveillants, sortConfigNonSurv]
  );

  const requestSort = (key, setConfig, currentConfig) => {
    let direction = 'asc';
    if (currentConfig.key === key && currentConfig.direction === 'asc') {
      direction = 'desc';
    }
    setConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey, sortConfig, setSortConfig }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => requestSort(sortKey, setSortConfig, sortConfig)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' 
            ? <ChevronUpIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Statistiques résumées */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-md border-2 border-green-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-white" />
            </div>
            Statistiques des responsables d'examen
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-600 font-medium">Taux de présence</p>
            <p className="text-3xl font-bold text-green-600">{stats.taux_responsables_presents}%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Examens</p>
            <p className="text-3xl font-bold text-gray-900">{stats.nb_responsables_total}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-green-200">
            <p className="text-sm text-green-600 font-medium">Responsables présents</p>
            <p className="text-3xl font-bold text-green-600">{stats.nb_responsables_presents}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-red-200">
            <p className="text-sm text-red-600 font-medium">Responsables absents</p>
            <p className="text-3xl font-bold text-red-600">{stats.nb_responsables_absents}</p>
            <div className="mt-2 pt-2 border-t-2 border-red-200">
              <p className="text-xs text-orange-600 font-semibold">Dispensés: {stats.nb_responsables_non_participants || 0}</p>
              <p className="text-xs text-gray-600">(Ne surveillant pas)</p>
            </div>
          </div>

        </div>
      </div>

      {/* Liste des responsables absents - Autres raisons (PRIORITÉ 1) */}
      {sortedAutres.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
          <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              Examens sans responsable assigné ({sortedAutres.length} séances)
            </h3>
            <p className="text-sm text-gray-600 mt-2 font-medium">
              Problèmes de satisfaction de contraintes - Ces responsables de cours n'ont pas pu être affectés malgré leur participation aux surveillances.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Responsable attendu" sortKey="enseignant_nom" sortConfig={sortConfigAutres} setSortConfig={setSortConfigAutres} />
                  <SortableHeader label="Code Smartex" sortKey="code_smartex" sortConfig={sortConfigAutres} setSortConfig={setSortConfigAutres} />
                  <SortableHeader label="Date" sortKey="date_exam" sortConfig={sortConfigAutres} setSortConfig={setSortConfigAutres} />
                  <SortableHeader label="Séance" sortKey="seance" sortConfig={sortConfigAutres} setSortConfig={setSortConfigAutres} />
                  <SortableHeader label="Nb examens" sortKey="nb_examens" sortConfig={sortConfigAutres} setSortConfig={setSortConfigAutres} />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAutres.map((resp) => (
                  <tr key={resp.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {resp.enseignant_nom} {resp.enseignant_prenom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resp.code_smartex}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resp.date_exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">{resp.seance}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {resp.nb_examens || 1}
                        {resp.nb_examens > 1 && <span className="text-xs text-gray-500 ml-1">examens</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liste des responsables absents - Non surveillants (PRIORITÉ 2) */}
      {sortedNonSurv.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
          <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              Responsables absents - Ne participent pas ({sortedNonSurv.length} séances)
            </h3>
            <p className="text-sm text-gray-600 mt-2 font-medium">
              Ces enseignants sont les responsables de cours mais n'ont pas été affectés car ils ne participent pas aux surveillances.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Responsable de cours" sortKey="enseignant_nom" sortConfig={sortConfigNonSurv} setSortConfig={setSortConfigNonSurv} />
                  <SortableHeader label="Code Smartex" sortKey="code_smartex" sortConfig={sortConfigNonSurv} setSortConfig={setSortConfigNonSurv} />
                  <SortableHeader label="Date" sortKey="date_exam" sortConfig={sortConfigNonSurv} setSortConfig={setSortConfigNonSurv} />
                  <SortableHeader label="Séance" sortKey="seance" sortConfig={sortConfigNonSurv} setSortConfig={setSortConfigNonSurv} />
                  <SortableHeader label="Nb examens" sortKey="nb_examens" sortConfig={sortConfigNonSurv} setSortConfig={setSortConfigNonSurv} />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedNonSurv.map((resp) => (
                  <tr key={resp.id} className="hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {resp.enseignant_nom} {resp.enseignant_prenom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resp.code_smartex}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resp.date_exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-orange-600">{resp.seance}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {resp.nb_examens || 1}
                        {resp.nb_examens > 1 && <span className="text-xs text-gray-500 ml-1">examens</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vérifier si tous les responsables sont présents */}
      {sortedNonSurv.length === 0 && sortedAutres.length === 0 && (
        <div className="text-center py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl border-3 border-dashed border-green-300">
          <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircleIcon className="w-14 h-14 text-green-600" />
          </div>
          <p className="text-green-700 text-2xl font-bold mb-2">Parfait !</p>
          <p className="text-green-600 text-base">Tous les responsables de salle sont présents.</p>
        </div>
      )}
    </div>
  );
}

// Composant Vue Contraintes
function VueContraintes({ stats }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const sortedDepassements = React.useMemo(() => {
    if (!stats.depassements_max_jour || stats.depassements_max_jour.length === 0) return [];
    
    let sortableItems = [...stats.depassements_max_jour];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Pour les noms d'enseignants
        if (sortConfig.key === 'enseignant_nom') {
          aVal = `${a.enseignant_nom} ${a.enseignant_prenom}`;
          bVal = `${b.enseignant_nom} ${b.enseignant_prenom}`;
        }
        
        // Pour les nombres
        if (['nb_seances', 'max_autorise', 'depassement'].includes(sortConfig.key)) {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stats.depassements_max_jour, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' 
            ? <ChevronUpIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Statistiques résumées */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-md border-2 border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-5 w-5 text-white" />
            </div>
            Contraintes de séances par jour
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-600 font-medium">Taux de respect</p>
            <p className="text-3xl font-bold text-purple-600">{stats.taux_contraintes_seances_respectees}%</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Total vérifications</p>
            <p className="text-3xl font-bold text-gray-900">{stats.nb_contraintes_seances_total}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-green-200">
            <p className="text-sm text-green-600 font-medium">Respectées</p>
            <p className="text-3xl font-bold text-green-600">{stats.nb_contraintes_seances_respectees}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-red-200">
            <p className="text-sm text-red-600 font-medium">Dépassements</p>
            <p className="text-3xl font-bold text-red-600">{stats.nb_contraintes_seances_violees}</p>
          </div>
        </div>
      </div>

      {/* Liste des dépassements */}
      {sortedDepassements.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
          <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              Dépassements du nombre maximum de séances par jour ({sortedDepassements.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Enseignant" sortKey="enseignant_nom" />
                  <SortableHeader label="Date" sortKey="date_exam" />
                  <SortableHeader label="Nb séances" sortKey="nb_seances" />
                  <SortableHeader label="Maximum autorisé" sortKey="max_autorise" />
                  <SortableHeader label="Dépassement" sortKey="depassement" />
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Séances
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDepassements.map((dep) => (
                  <tr key={dep.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {dep.enseignant_nom} {dep.enseignant_prenom}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">{dep.code_smartex}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dep.date_exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">{dep.nb_seances}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold">{dep.max_autorise}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800">
                        +{dep.depassement}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{dep.seances}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!stats.depassements_max_jour || stats.depassements_max_jour.length === 0) && (
        <div className="text-center py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl border-3 border-dashed border-green-300">
          <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircleIcon className="w-14 h-14 text-green-600" />
          </div>
          <p className="text-green-700 text-2xl font-bold mb-2">Excellent !</p>
          <p className="text-green-600 text-base">Toutes les contraintes de séances par jour sont respectées.</p>
        </div>
      )}
    </div>
  );
}

// Composant Vue Heures Creuses
function VueHeuresCreuses({ stats }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const sortedHeuresCreuses = React.useMemo(() => {
    if (!stats.heures_creuses || stats.heures_creuses.length === 0) return [];
    
    let sortableItems = [...stats.heures_creuses];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Pour les noms d'enseignants
        if (sortConfig.key === 'enseignant_nom') {
          aVal = `${a.enseignant_nom} ${a.enseignant_prenom}`;
          bVal = `${b.enseignant_nom} ${b.enseignant_prenom}`;
        }
        
        // Pour les nombres
        if (sortConfig.key === 'nb_trous') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stats.heures_creuses, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' 
            ? <ChevronUpIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Statistiques résumées */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-md border-2 border-amber-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
            Heures creuses (séances non consécutives)
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Gaps détectés</p>
            <p className="text-3xl font-bold text-amber-600">{stats.heures_creuses?.length || 0}</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-orange-200">
            <p className="text-sm text-orange-600 font-medium">Enseignants concernés</p>
            <p className="text-3xl font-bold text-orange-600">{stats.nb_enseignants_heures_creuses || 0}</p>
          </div>
        </div>
      </div>

      {/* Liste des heures creuses */}
      {sortedHeuresCreuses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
          <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              Liste détaillée des heures creuses ({sortedHeuresCreuses.length})
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Enseignants avec des séances non consécutives dans la même journée (ex: S1 puis S3 sans S2)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Enseignant" sortKey="enseignant_nom" />
                  <SortableHeader label="Date" sortKey="date_exam" />
                  <SortableHeader label="Jour" sortKey="jour_nom" />
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Séances affectées
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Séances manquantes
                  </th>
                  <SortableHeader label="Nb trous" sortKey="nb_trous" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedHeuresCreuses.map((hc) => (
                  <tr key={hc.id} className="hover:bg-amber-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {hc.enseignant_nom} {hc.enseignant_prenom}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">{hc.code_smartex}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hc.date_exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{hc.jour_nom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-600">{hc.seances_affectees}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-amber-100 text-amber-800">
                        {hc.seances_manquantes}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-amber-600">{hc.nb_trous}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!stats.heures_creuses || stats.heures_creuses.length === 0) && (
        <div className="text-center py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl border-3 border-dashed border-green-300">
          <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircleIcon className="w-14 h-14 text-green-600" />
          </div>
          <p className="text-green-700 text-2xl font-bold mb-2">Excellent !</p>
          <p className="text-green-600 text-base">Aucune heure creuse détectée. Toutes les séances sont consécutives.</p>
        </div>
      )}
    </div>
  );
}

// Composant Vue Grades
function VueGrades({ statsParGrade, chargeEnseignants }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [sortConfigEnseignants, setSortConfigEnseignants] = useState({ key: 'grade', direction: 'asc' });
  const [searchFilter, setSearchFilter] = useState('');

  const sortedGrades = React.useMemo(() => {
    const gradesArray = Object.entries(statsParGrade);
    
    if (!sortConfig.key) return gradesArray;
    
    return [...gradesArray].sort((a, b) => {
      const [gradeA, statsA] = a;
      const [gradeB, statsB] = b;
      
      let aVal, bVal;
      
      switch (sortConfig.key) {
        case 'grade':
          aVal = gradeA;
          bVal = gradeB;
          break;
        case 'quotaInitial':
          aVal = statsA.quotaInitial;
          bVal = statsB.quotaInitial;
          break;
        case 'quotaUtilise':
          aVal = statsA.moyenne;
          bVal = statsB.moyenne;
          break;
        case 'taux':
          aVal = statsA.quotaInitial > 0 ? (statsA.moyenne / statsA.quotaInitial) * 100 : 0;
          bVal = statsB.quotaInitial > 0 ? (statsB.moyenne / statsB.quotaInitial) * 100 : 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [statsParGrade, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' 
            ? <ChevronUpIcon className="h-4 w-4" />
            : <ChevronDownIcon className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            Répartition des surveillances par grade
          </h3>
          <p className="text-sm text-gray-600 mt-2 font-medium">
            Analyse de la charge de travail et respect des quotas par grade
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Grade" sortKey="grade" />
                <SortableHeader label="Quota Défini" sortKey="quotaInitial" />
                <SortableHeader label="Quota Utilisé" sortKey="quotaUtilise" />
                <SortableHeader label="Taux d'utilisation" sortKey="taux" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedGrades.map(([grade, stats]) => {
                const quotaUtilisePourcentage = stats.quotaInitial > 0 
                  ? ((stats.moyenne / stats.quotaInitial) * 100).toFixed(1)
                  : 0;
                const estDansLimites = stats.moyenne <= stats.quotaInitial;
                
                return (
                  <tr key={grade} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{grade || 'Non défini'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{stats.quotaInitial}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-indigo-600">{stats.moyenne.toFixed(1)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold">
                          {stats.moyenne.toFixed(1)} / {stats.quotaInitial}
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          estDansLimites 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {quotaUtilisePourcentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nouveau tableau : Détail des quotas par enseignant */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden mt-6">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
                Détail des quotas par enseignant
              </h3>
              <p className="text-sm text-gray-600 mt-2 font-medium">
                Vue détaillée des surveillances affectées pour chaque enseignant
              </p>
            </div>
            
            {/* Barre de recherche */}
            <div className="relative w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom ou grade..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border-2 border-green-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm font-semibold bg-white"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-400 hover:text-green-600 transition-colors"
                >
                  <span className="text-xl font-bold">✕</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const newDirection = sortConfigEnseignants.key === 'nom' && sortConfigEnseignants.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfigEnseignants({ key: 'nom', direction: newDirection });
                  }}
                >
                  <div className="flex items-center gap-1">
                    Enseignant
                    {sortConfigEnseignants.key === 'nom' && (
                      sortConfigEnseignants.direction === 'asc' 
                        ? <ChevronUpIcon className="h-4 w-4" />
                        : <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const newDirection = sortConfigEnseignants.key === 'grade' && sortConfigEnseignants.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfigEnseignants({ key: 'grade', direction: newDirection });
                  }}
                >
                  <div className="flex items-center gap-1">
                    Grade
                    {sortConfigEnseignants.key === 'grade' && (
                      sortConfigEnseignants.direction === 'asc' 
                        ? <ChevronUpIcon className="h-4 w-4" />
                        : <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const newDirection = sortConfigEnseignants.key === 'surveillances' && sortConfigEnseignants.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfigEnseignants({ key: 'surveillances', direction: newDirection });
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Surveillances
                    {sortConfigEnseignants.key === 'surveillances' && (
                      sortConfigEnseignants.direction === 'asc' 
                        ? <ChevronUpIcon className="h-4 w-4" />
                        : <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const newDirection = sortConfigEnseignants.key === 'pourcentage' && sortConfigEnseignants.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfigEnseignants({ key: 'pourcentage', direction: newDirection });
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Pourcentage
                    {sortConfigEnseignants.key === 'pourcentage' && (
                      sortConfigEnseignants.direction === 'asc' 
                        ? <ChevronUpIcon className="h-4 w-4" />
                        : <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chargeEnseignants
                .filter(charge => {
                  if (!searchFilter) return true;
                  const searchLower = searchFilter.toLowerCase();
                  
                  const nomComplet = `${charge.nom || ''} ${charge.prenom || ''}`.toLowerCase();
                  const grade = (charge.grade || '').toLowerCase();
                  const hasException = charge.is_exception ? 'exception' : '';
                  
                  return nomComplet.includes(searchLower) || 
                         grade.includes(searchLower) || 
                         hasException.includes(searchLower);
                })
                .sort((a, b) => {
                  let compareValue = 0;
                  
                  switch (sortConfigEnseignants.key) {
                    case 'nom':
                      compareValue = (a.nom || '').localeCompare(b.nom || '');
                      break;
                    case 'grade':
                      compareValue = (a.grade || '').localeCompare(b.grade || '');
                      if (compareValue === 0) {
                        compareValue = (a.nom || '').localeCompare(b.nom || '');
                      }
                      break;
                    case 'surveillances':
                      compareValue = a.nb_surveillances - b.nb_surveillances;
                      break;
                    case 'pourcentage':
                      const pctA = a.quota_initial > 0 ? (a.nb_surveillances / a.quota_initial) * 100 : 0;
                      const pctB = b.quota_initial > 0 ? (b.nb_surveillances / b.quota_initial) * 100 : 0;
                      compareValue = pctA - pctB;
                      break;
                    default:
                      compareValue = (a.grade || '').localeCompare(b.grade || '');
                      if (compareValue === 0) {
                        compareValue = (a.nom || '').localeCompare(b.nom || '');
                      }
                  }
                  
                  return sortConfigEnseignants.direction === 'asc' ? compareValue : -compareValue;
                })
                .map((charge) => {
                  const pourcentage = charge.quota_initial > 0 
                    ? Math.round((charge.nb_surveillances / charge.quota_initial) * 100)
                    : 0;
                  
                  return (
                    <tr key={charge.enseignant_id} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <UserGroupIcon className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-gray-900">
                                {charge.nom} {charge.prenom}
                              </div>
                              {charge.is_exception && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm">
                                  EXCEPTION
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                          {charge.grade || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl font-black text-gray-900">
                            {charge.nb_surveillances}
                          </span>
                          <span className="text-sm text-gray-500 font-medium">
                            / {charge.quota_initial}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                pourcentage >= 100 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : pourcentage >= 75 
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                                  : 'bg-gradient-to-r from-red-400 to-pink-400'
                              }`}
                              style={{ width: `${Math.min(pourcentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-bold ${
                            pourcentage >= 100 
                              ? 'text-green-600' 
                              : pourcentage >= 75 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                          }`}>
                            {pourcentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Composants utilitaires
function CircularProgress({ percentage, label, color = 'blue' }) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600'
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colorClasses[color]}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${colorClasses[color]}`}>{percentage}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2">{label}</p>
    </div>
  );
}

function BarreProgression({ label, valeur, total, pourcentage, couleur = 'blue' }) {
  const couleurClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    red: 'bg-red-600'
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-700">
          {valeur} / {total} ({pourcentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${couleurClasses[couleur]} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pourcentage}%` }}
        ></div>
      </div>
    </div>
  );
}

// Fonction utilitaire pour calculer les stats par grade
function calculerStatsParGrade(charges) {
  const statsParGrade = {};

  // Filtrer uniquement les enseignants avec is_exception=false
  const chargesNonException = charges.filter(charge => charge.is_exception === false);

  chargesNonException.forEach((charge) => {
    const grade = charge.grade || 'Non défini';
    if (!statsParGrade[grade]) {
      statsParGrade[grade] = {
        nbEnseignants: 0,
        totalSurveillances: 0,
        surveillances: [],
        quotaInitial: charge.quota_initial || 0, // Quota configuré pour ce grade
        totalQuotaInitial: 0, // Somme des quotas initiaux de tous les enseignants
      };
    }

    statsParGrade[grade].nbEnseignants++;
    statsParGrade[grade].totalSurveillances += charge.nb_surveillances;
    statsParGrade[grade].totalQuotaInitial += charge.quota_initial || 0;
    statsParGrade[grade].surveillances.push(charge.nb_surveillances);
  });

  // Calculer moyenne, min, max pour chaque grade
  Object.keys(statsParGrade).forEach((grade) => {
    const stats = statsParGrade[grade];
    const surveillances = stats.surveillances;
    stats.moyenne = stats.totalSurveillances / stats.nbEnseignants;
    stats.min = Math.min(...surveillances);
    stats.max = Math.max(...surveillances);
  });

  return statsParGrade;
}
