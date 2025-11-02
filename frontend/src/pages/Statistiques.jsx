import React, { useState, useEffect } from 'react';
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

export default function Statistiques() {
  const [stats, setStats] = useState(null);
  const [chargeEnseignants, setChargeEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, souhaits, responsables, contraintes, grades

  useEffect(() => {
    chargerStatistiques();
  }, []);

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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord - Résultats de génération</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <p className="text-sm text-red-600 mt-2">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord - Résultats de génération</h1>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Dernière génération</p>
            <p className="text-lg font-semibold text-gray-900">{stats.date_generation}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Temps de génération</p>
            <p className="text-lg font-semibold text-gray-900">{stats.temps_generation} ms</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Affectations créées</p>
            <p className="text-lg font-semibold text-blue-600">{stats.nb_affectations}</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <ChartBarIcon className="h-5 w-5" />
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('souhaits')}
            className={`${
              activeTab === 'souhaits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <DocumentCheckIcon className="h-5 w-5" />
            Souhaits ({stats.nb_souhaits_violes} violations)
          </button>
          <button
            onClick={() => setActiveTab('responsables')}
            className={`${
              activeTab === 'responsables'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <UserGroupIcon className="h-5 w-5" />
            Responsables ({stats.nb_responsables_absents} absents)
          </button>
          <button
            onClick={() => setActiveTab('contraintes')}
            className={`${
              activeTab === 'contraintes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <CalendarDaysIcon className="h-5 w-5" />
            Contraintes jour ({stats.nb_contraintes_seances_violees} dépassements)
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`${
              activeTab === 'grades'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Quotas par grade
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'overview' && <VueEnsemble stats={stats} />}
      {activeTab === 'souhaits' && <VueSouhaits stats={stats} />}
      {activeTab === 'responsables' && <VueResponsables stats={stats} />}
      {activeTab === 'contraintes' && <VueContraintes stats={stats} />}
      {activeTab === 'grades' && <VueGrades statsParGrade={statsParGrade} />}
    </div>
  );
}

// Composant Vue d'ensemble
function VueEnsemble({ stats }) {
  // Utiliser les nouvelles propriétés séparées du backend
  const responsablesAbsentsNonSurveillants = stats.responsables_absents_non_surveillants || [];
  const responsablesAbsentsAutres = stats.responsables_absents_participants || [];

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Carte Souhaits */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Respect des souhaits</h3>
            <DocumentCheckIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total souhaits</span>
              <span className="font-semibold text-gray-900">{stats.nb_souhaits_total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">Respectés</span>
              <span className="font-semibold text-green-600">{stats.nb_souhaits_respectes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">Violés</span>
              <span className="font-semibold text-red-600">{stats.nb_souhaits_violes}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <CircularProgress 
                percentage={stats.taux_souhaits_respectes} 
                label="Taux de respect"
                color="blue"
              />
            </div>
          </div>
        </div>

        {/* Carte Responsables */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Responsables présents</h3>
            <UserGroupIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Examens</span>
              <span className="font-semibold text-gray-900">{stats.nb_responsables_total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">Responsables présents</span>
              <span className="font-semibold text-green-600">{stats.nb_responsables_presents}</span>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Responsables absents</span>
                <span className="font-semibold text-red-600">{stats.nb_responsables_absents || 0}</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                • Dispensés {stats.nb_responsables_non_participants || 0} (Enseignants ne surveillant pas)
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <CircularProgress 
                percentage={stats.taux_responsables_presents} 
                label="Taux de présence"
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Carte Contraintes séances/jour */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Contraintes séances/jour</h3>
            <CalendarDaysIcon className="h-8 w-8 text-purple-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total contraintes</span>
              <span className="font-semibold text-gray-900">{stats.nb_contraintes_seances_total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">Respectées</span>
              <span className="font-semibold text-green-600">{stats.nb_contraintes_seances_respectees}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">Dépassements</span>
              <span className="font-semibold text-red-600">{stats.nb_contraintes_seances_violees}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <CircularProgress 
                percentage={stats.taux_contraintes_seances_respectees} 
                label="Taux de respect"
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Résumé global */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de la qualité de génération</h3>
        <div className="space-y-4">
          <BarreProgression
            label="Respect des souhaits"
            valeur={stats.nb_souhaits_respectes}
            total={stats.nb_souhaits_total}
            pourcentage={stats.taux_souhaits_respectes}
            couleur="blue"
          />
          <BarreProgression
            label="Présence des responsables"
            valeur={stats.nb_responsables_presents}
            total={stats.nb_responsables_total}
            pourcentage={stats.taux_responsables_presents}
            couleur="green"
          />
          <BarreProgression
            label="Respect contraintes séances/jour"
            valeur={stats.nb_contraintes_seances_respectees}
            total={stats.nb_contraintes_seances_total}
            pourcentage={stats.taux_contraintes_seances_respectees}
            couleur="purple"
          />
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
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Statistiques des souhaits</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Taux de respect</p>
              <p className="text-2xl font-bold text-blue-600">{stats.taux_souhaits_respectes}%</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.nb_souhaits_total}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Respectés</p>
            <p className="text-2xl font-bold text-green-600">{stats.nb_souhaits_respectes}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Violés</p>
            <p className="text-2xl font-bold text-red-600">{stats.nb_souhaits_violes}</p>
          </div>
        </div>
      </div>

      {/* Liste des souhaits violés */}
      {sortedSouhaits.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
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
                  <tr key={souhait.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
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
                      <div className="text-sm text-gray-900">{souhait.seance}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedSouhaits.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">Excellent ! Tous les souhaits ont été respectés.</p>
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
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Statistiques des responsables de salle</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Taux de présence</p>
              <p className="text-2xl font-bold text-green-600">{stats.taux_responsables_presents}%</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Examens </p>
            <p className="text-2xl font-bold text-gray-900">{stats.nb_responsables_total}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Responsables présents</p>
            <p className="text-2xl font-bold text-green-600">{stats.nb_responsables_presents}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Responsables absents</p>
            <p className="text-2xl font-bold text-red-600">{stats.nb_responsables_absents}</p>
            <div className="mt-2 pt-2 border-t border-red-200">
              <p className="text-xs text-orange-600">Dispensés: {stats.nb_responsables_non_participants || 0}</p>
              <p className="text-xs text-gray-600">(Enseignants ne surveillant pas)</p>
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Taux de présence</p>
            <p className="text-2xl font-bold text-blue-600">{stats.taux_responsables_presents}%</p>
          </div>
        </div>
      </div>

      {/* Liste des responsables absents - Autres raisons (PRIORITÉ 1) */}
      {sortedAutres.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              Examens sans responsable assigné - Problèmes de satisfaction de contraintes ({sortedAutres.length} séances)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Ces responsables de cours n'ont pas pu être affectés malgré leur participation aux surveillances.
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
                  <tr key={resp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
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
                      <div className="text-sm text-gray-900">{resp.seance}</div>
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              Responsables absents - Ne participent pas aux surveillances ({sortedNonSurv.length} séances)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
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
                  <tr key={resp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
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
                      <div className="text-sm text-gray-900">{resp.seance}</div>
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">Parfait ! Tous les responsables de salle sont présents.</p>
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
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contraintes de séances par jour</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Taux de respect</p>
              <p className="text-2xl font-bold text-purple-600">{stats.taux_contraintes_seances_respectees}%</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total vérifications</p>
            <p className="text-2xl font-bold text-gray-900">{stats.nb_contraintes_seances_total}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Respectées</p>
            <p className="text-2xl font-bold text-green-600">{stats.nb_contraintes_seances_respectees}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Dépassements</p>
            <p className="text-2xl font-bold text-red-600">{stats.nb_contraintes_seances_violees}</p>
          </div>
        </div>
      </div>

      {/* Liste des dépassements */}
      {sortedDepassements.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Séances
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDepassements.map((dep) => (
                  <tr key={dep.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {dep.enseignant_nom} {dep.enseignant_prenom}
                      </div>
                      <div className="text-sm text-gray-500">{dep.code_smartex}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dep.date_exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">{dep.nb_seances}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dep.max_autorise}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">Excellent ! Toutes les contraintes de séances par jour sont respectées.</p>
        </div>
      )}
    </div>
  );
}

// Composant Vue Grades
function VueGrades({ statsParGrade }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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
          aVal = statsA.max;
          bVal = statsB.max;
          break;
        case 'taux':
          aVal = statsA.quotaInitial > 0 ? (statsA.max / statsA.quotaInitial) * 100 : 0;
          bVal = statsB.quotaInitial > 0 ? (statsB.max / statsB.quotaInitial) * 100 : 0;
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
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Répartition des surveillances par grade</h3>
          <p className="text-sm text-gray-600 mt-1">
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
                  ? ((stats.max / stats.quotaInitial) * 100).toFixed(1)
                  : 0;
                const estDansLimites = stats.max <= stats.quotaInitial;
                
                return (
                  <tr key={grade} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{grade || 'Non défini'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stats.quotaInitial}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-indigo-600">{stats.max}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">
                          {stats.max} / {stats.quotaInitial}
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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

  charges.forEach((charge) => {
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
