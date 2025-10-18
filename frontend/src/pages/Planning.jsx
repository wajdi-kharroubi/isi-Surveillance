import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI } from '../services/api';
import { 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  BookOpen, 
  AlertCircle, 
  Search,
  Filter,
  Download,
  Eye,
  ChevronRight,
  Star,
  Grid3x3,
  List,
} from 'lucide-react';

export default function Planning() {
  const [activeTab, setActiveTab] = useState('seances');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedEnseignant, setSelectedEnseignant] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [semestreFilter, setSemestreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [heureFilter, setHeureFilter] = useState('all');
  const [expandedSeance, setExpandedSeance] = useState(null); // Pour gérer l'expansion des séances en mode liste

  const { data: enseignants = [] } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  const { data: emploiSeances = [], isLoading: loadingSeances } = useQuery({
    queryKey: ['emploi-seances'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
    enabled: activeTab === 'seances',
  });

  const { data: emploiEnseignant, isLoading: loadingEnseignant } = useQuery({
    queryKey: ['emploi-enseignant', selectedEnseignant],
    queryFn: () => planningAPI.getEmploiEnseignant(selectedEnseignant).then(res => res.data),
    enabled: activeTab === 'enseignant' && selectedEnseignant !== null,
  });

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const enseignantsFiltres = useMemo(() => {
    if (!searchFilter.trim()) {
      return enseignants.filter(e => e.participe_surveillance);
    }
    
    const filterLower = searchFilter.toLowerCase().trim();
    return enseignants
      .filter(e => e.participe_surveillance)
      .filter(ens => {
        const nom = (ens.nom || '').toLowerCase();
        const prenom = (ens.prenom || '').toLowerCase();
        const codeSmartex = (ens.code_smartex || '').toLowerCase();
        const gradeCode = (ens.grade_code || '').toLowerCase();
        
        return nom.includes(filterLower) || 
               prenom.includes(filterLower) || 
               codeSmartex.includes(filterLower) ||
               gradeCode.includes(filterLower);
      });
  }, [enseignants, searchFilter]);

  const seancesFiltrees = useMemo(() => {
    return emploiSeances.filter(seance => {
      if (sessionFilter !== 'all' && seance.session !== sessionFilter) return false;
      if (semestreFilter !== 'all' && seance.semestre !== semestreFilter) return false;
      if (dateFilter !== 'all' && seance.date !== dateFilter) return false;
      if (heureFilter !== 'all' && seance.h_debut !== heureFilter) return false;
      return true;
    });
  }, [emploiSeances, sessionFilter, semestreFilter, dateFilter, heureFilter]);

  // Listes des valeurs uniques pour les filtres
  const datesUniques = useMemo(() => {
    return [...new Set(emploiSeances.map(s => s.date))].sort();
  }, [emploiSeances]);

  const heuresUniques = useMemo(() => {
    return [...new Set(emploiSeances.map(s => s.h_debut))].sort();
  }, [emploiSeances]);

  const statistiques = useMemo(() => {
    return {
      totalSeances: seancesFiltrees.length,
      totalSurveillants: seancesFiltrees.reduce((sum, s) => sum + (s.nb_enseignants || 0), 0),
      totalExamens: seancesFiltrees.reduce((sum, s) => sum + (s.examens?.length || 0), 0),
      moyenneSurveillants: seancesFiltrees.length > 0 
        ? Math.round(seancesFiltrees.reduce((sum, s) => sum + (s.nb_enseignants || 0), 0) / seancesFiltrees.length)
        : 0
    };
  }, [seancesFiltrees]);

  // Fonction pour afficher le planning d'un enseignant
  const handleEnseignantClick = (enseignantId) => {
    setSelectedEnseignant(enseignantId);
    setActiveTab('enseignant');
    // Scroll vers le haut pour voir le planning
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header avec statistiques */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative p-8">
          {/* Header principal */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border-2 border-white/30">
                <Calendar className="w-11 h-11 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">
                  Planning de Surveillance
                </h1>
                <p className="text-blue-100 text-lg font-medium">
                  Visualisez et gérez les affectations en temps réel
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = '/export'}
              className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-xl flex items-center gap-2 border-2 border-white/50 font-bold text-base transition-all duration-200 hover:scale-105 hover:shadow-2xl"
            >
              <Download className="w-5 h-5" />
              Exporter Planning
            </button>
          </div>

          {/* Statistiques Cards */}
          {activeTab === 'seances' && !loadingSeances && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Séances</p>
                    <p className="text-3xl font-black text-gray-900">{statistiques.totalSeances}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Surveillants</p>
                    <p className="text-3xl font-black text-gray-900">{statistiques.totalSurveillants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Total Examens</p>
                    <p className="text-3xl font-black text-gray-900">{statistiques.totalExamens}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Moyenne/Séance</p>
                    <p className="text-3xl font-black text-gray-900">{statistiques.moyenneSurveillants}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <nav className="flex border-b-2 border-gray-100">
          <button
            onClick={() => setActiveTab('seances')}
            className={`${
              activeTab === 'seances'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-5 px-8 font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 relative`}
          >
            <Calendar className="w-6 h-6" />
            <span>Vue par Séances</span>
            {activeTab === 'seances' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('enseignant')}
            className={`${
              activeTab === 'enseignant'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-5 px-8 font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 relative`}
          >
            <Users className="w-6 h-6" />
            <span>Vue par Enseignant</span>
            {activeTab === 'enseignant' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
            )}
          </button>
        </nav>

        <div className="p-8">

          {/* Content - Emploi des Séances */}
          {activeTab === 'seances' && (
            <div className="space-y-6">
              {/* Barre de filtres et contrôles */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-2xl border-2 border-gray-200">
                <div className="flex-1 flex flex-wrap gap-3">
                  {/* Filtre Date */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="border-none focus:ring-0 font-semibold text-sm bg-transparent cursor-pointer"
                    >
                      <option value="all">Toutes les dates</option>
                      {datesUniques.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('fr-FR', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtre Heure */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <select
                      value={heureFilter}
                      onChange={(e) => setHeureFilter(e.target.value)}
                      className="border-none focus:ring-0 font-semibold text-sm bg-transparent cursor-pointer"
                    >
                      <option value="all">Toutes les heures</option>
                      {heuresUniques.map(heure => (
                        <option key={heure} value={heure}>
                          {formatTime(heure)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtre Session */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <select
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value)}
                      className="border-none focus:ring-0 font-semibold text-sm bg-transparent cursor-pointer"
                    >
                      <option value="all">Toutes les sessions</option>
                      <option value="P">Principale</option>
                      <option value="R">Rattrapage</option>
                    </select>
                  </div>

                  {/* Filtre Semestre */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <Filter className="w-5 h-5 text-purple-600" />
                    <select
                      value={semestreFilter}
                      onChange={(e) => setSemestreFilter(e.target.value)}
                      className="border-none focus:ring-0 font-semibold text-sm bg-transparent cursor-pointer"
                    >
                      <option value="all">Tous les semestres</option>
                      <option value="SEMESTRE 1">Semestre 1</option>
                      <option value="SEMESTRE 2">Semestre 2</option>
                    </select>
                  </div>

                  {/* Bouton reset filtres */}
                  {(sessionFilter !== 'all' || semestreFilter !== 'all' || dateFilter !== 'all' || heureFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSessionFilter('all');
                        setSemestreFilter('all');
                        setDateFilter('all');
                        setHeureFilter('all');
                      }}
                      className="px-4 py-2.5 bg-red-100 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors border-2 border-red-200"
                    >
                      Réinitialiser filtres
                    </button>
                  )}
                </div>

                {/* Toggle View Mode */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border-2 border-gray-200 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`${
                      viewMode === 'grid'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    } p-2.5 rounded-lg transition-all duration-200`}
                    title="Vue Grille"
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`${
                      viewMode === 'list'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    } p-2.5 rounded-lg transition-all duration-200`}
                    title="Vue Liste"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {loadingSeances ? (
                <div className="text-center py-16">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Clock className="w-10 h-10 text-white animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xl text-gray-700 font-bold">Chargement des séances...</p>
                  <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
                </div>
              ) : seancesFiltrees.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-2xl border-3 border-dashed border-gray-300">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <AlertCircle className="w-14 h-14 text-gray-500" />
                  </div>
                  <p className="text-gray-700 text-2xl font-bold mb-2">
                    {emploiSeances.length === 0 ? 'Aucune séance d\'examen trouvée' : 'Aucun résultat'}
                  </p>
                  <p className="text-gray-500 text-base max-w-md mx-auto">
                    {emploiSeances.length === 0 
                      ? 'Générez d\'abord le planning depuis la page "Génération"'
                      : 'Essayez de modifier vos filtres pour voir plus de résultats'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {seancesFiltrees
                    .sort((a, b) => {
                      const dateA = new Date(a.date + 'T' + a.h_debut);
                      const dateB = new Date(b.date + 'T' + b.h_debut);
                      return dateA - dateB;
                    })
                    .map((seance, index) => (
                      <div key={index} className="group relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-blue-400 transition-all duration-300">
                        {/* Badge coloré en haut */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                        
                        <div className="p-6">
                          {/* En-tête de la carte */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                  <Calendar className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Séance d'examen</p>
                                  <p className="text-lg font-black text-gray-900">{formatDate(seance.date)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md">
                                  <Clock className="w-4 h-4" />
                                  {formatTime(seance.h_debut)} - {formatTime(seance.h_fin)}
                                </span>
                                <span className="px-3 py-1.5 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 rounded-lg font-bold text-xs border-2 border-cyan-200">
                                  {seance.session === 'P' ? 'Principale' : 'Rattrapage'}
                                </span>
                                <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-lg font-bold text-xs border-2 border-green-200">
                                  {seance.semestre}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                              {/* Badge nombre de salles */}
                              <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-purple-200 shadow-lg">
                                <div className="flex items-center gap-2 justify-center text-purple-600 mb-1">
                                  <MapPin className="w-7 h-7" />
                                  <span className="text-4xl font-black">{seance.examens?.length || 0}</span>
                                </div>
                                <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">Salles</p>
                              </div>
                              
                              {/* Bouton Export */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement export logic
                                  console.log('Export séance:', seance.date);
                                }}
                                className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-bold shadow-lg px-3 py-2"
                                title="Exporter cette séance"
                              >
                                <Download className="w-4 h-4" />
                                Export
                              </button>
                            </div>
                          </div>

                          {/* Enseignants de la séance */}
                          {seance.enseignants && seance.enseignants.length > 0 && (
                            <div className="mt-6 pt-6 border-t-2 border-gray-100">
                              <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <p className="text-sm font-black text-gray-800">
                                  {seance.enseignants.length} Enseignant{seance.enseignants.length > 1 ? 's' : ''} affecté{seance.enseignants.length > 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {seance.enseignants.map((enseignant, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEnseignantClick(enseignant.id);
                                    }}
                                    className={`group relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 hover:shadow-md transition-all duration-200 cursor-pointer ${
                                      enseignant.est_responsable 
                                        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 hover:border-orange-400'
                                        : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 hover:border-blue-400'
                                    }`}
                                  >
                                    {enseignant.est_responsable && (
                                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-black shadow-lg">
                                        RESPONSABLE
                                      </div>
                                    )}
                                    <Users className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${
                                      enseignant.est_responsable ? 'text-orange-600' : 'text-blue-600'
                                    }`} />
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="font-black text-gray-900 text-sm truncate">{enseignant.nom} {enseignant.prenom}</p>
                                      <p className="text-xs text-gray-600 font-semibold">Surveillant</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                /* Vue Liste */
                <div className="space-y-4">
                  {seancesFiltrees
                    .sort((a, b) => {
                      const dateA = new Date(a.date + 'T' + a.h_debut);
                      const dateB = new Date(b.date + 'T' + b.h_debut);
                      return dateA - dateB;
                    })
                    .map((seance, index) => (
                      <div key={index} className="group bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-400 transition-all duration-300">
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6 flex-1">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <Calendar className="w-7 h-7 text-white" />
                              </div>
                              
                              <div className="flex-1">
                                <p className="text-xl font-black text-gray-900 mb-2">{formatDate(seance.date)}</p>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-md">
                                    <Clock className="w-4 h-4" />
                                    {formatTime(seance.h_debut)} - {formatTime(seance.h_fin)}
                                  </span>
                                  <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-lg font-bold text-xs border border-cyan-200">
                                    {seance.session === 'P' ? 'Principale' : 'Rattrapage'}
                                  </span>
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-bold text-xs border border-green-200">
                                    {seance.semestre}
                                  </span>
                                  {seance.enseignants && seance.enseignants.length > 0 && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-xs border border-blue-200">
                                      {seance.enseignants.length} enseignant{seance.enseignants.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200 shadow-md">
                                <div className="flex items-center gap-2 text-purple-600">
                                  <MapPin className="w-6 h-6" />
                                  <span className="text-3xl font-black">{seance.examens?.length || 0}</span>
                                </div>
                                <p className="text-xs text-gray-600 font-bold mt-1">Salles</p>
                              </div>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement export logic
                                  console.log('Export séance:', seance.date);
                                }}
                                className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 flex items-center gap-2 text-sm font-bold shadow-lg px-4 py-2"
                                title="Exporter cette séance"
                              >
                                <Download className="w-5 h-5" />
                                Export
                              </button>
                              
                              <button 
                                onClick={() => setExpandedSeance(expandedSeance === index ? null : index)}
                                className="w-10 h-10 bg-gray-100 hover:bg-blue-100 rounded-xl flex items-center justify-center transition-all group-hover:bg-blue-100"
                              >
                                <ChevronRight className={`w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-all duration-300 ${
                                  expandedSeance === index ? 'rotate-90' : ''
                                }`} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Section des enseignants (expansible) */}
                        {expandedSeance === index && seance.enseignants && seance.enseignants.length > 0 && (
                          <div className="px-6 pb-6 pt-2 border-t-2 border-gray-100 bg-gradient-to-br from-gray-50 to-blue-50 animate-slideDown">
                            <div className="flex items-center gap-2 mb-4">
                              <Users className="w-5 h-5 text-indigo-600" />
                              <p className="text-sm font-black text-gray-800">
                                {seance.enseignants.length} Enseignant{seance.enseignants.length > 1 ? 's' : ''} affecté{seance.enseignants.length > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {seance.enseignants.map((enseignant, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEnseignantClick(enseignant.id);
                                  }}
                                  className={`group relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 hover:shadow-md transition-all duration-200 cursor-pointer ${
                                    enseignant.est_responsable 
                                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 hover:border-orange-400'
                                      : 'bg-white border-gray-200 hover:border-blue-400'
                                  }`}
                                >
                                  {enseignant.est_responsable && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-black shadow-lg">
                                      RESPONSABLE
                                    </div>
                                  )}
                                  <Users className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${
                                    enseignant.est_responsable ? 'text-orange-600' : 'text-blue-600'
                                  }`} />
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="font-black text-gray-900 text-sm truncate">{enseignant.nom} {enseignant.prenom}</p>
                                    <p className="text-xs text-gray-600 font-semibold">Surveillant</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Content - Emploi par Enseignant */}
          {activeTab === 'enseignant' && (
            <div className="space-y-6">
              {/* Barre de recherche stylée - Version compacte quand un enseignant est sélectionné */}
              <div className={`bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 rounded-2xl border-2 border-purple-200 shadow-lg transition-all duration-300 ${
                selectedEnseignant ? 'p-4' : 'p-6'
              }`}>
                {!selectedEnseignant ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Search className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Recherche d'enseignant</h3>
                        <p className="text-sm text-gray-600 font-medium">Trouvez rapidement un planning individuel</p>
                      </div>
                    </div>
                    
                    <div className="relative mb-4">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-purple-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Rechercher par nom, prénom, code enseignant ou grade..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-14 pr-12 py-4 border-2 border-purple-300 rounded-xl shadow-sm focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all text-base font-semibold bg-white"
                      />
                      {searchFilter && (
                        <button
                          onClick={() => setSearchFilter('')}
                          className="absolute inset-y-0 right-0 pr-5 flex items-center text-purple-400 hover:text-purple-600 transition-colors"
                        >
                          <span className="text-2xl font-bold">✕</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border-2 border-purple-200 shadow-sm">
                        <span className="font-bold text-gray-700 flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-600" />
                          {enseignantsFiltres.length} enseignant{enseignantsFiltres.length > 1 ? 's' : ''} disponible{enseignantsFiltres.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {enseignantsFiltres.length === 0 && searchFilter ? (
                        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-gray-600 font-bold text-lg">Aucun enseignant trouvé</p>
                          <p className="text-gray-500 text-sm mt-1">Modifiez votre recherche</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
                          {enseignantsFiltres.map((ens) => (
                            <button
                              key={ens.id}
                              onClick={() => setSelectedEnseignant(ens.id)}
                              className="bg-white text-gray-900 hover:shadow-lg hover:border-purple-300 border-gray-200 text-left p-4 rounded-xl border-2 transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Users className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-sm truncate">
                                    {ens.nom} {ens.prenom}
                                  </p>
                                  <p className="text-xs font-semibold text-gray-500">
                                    {ens.code_smartex || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs font-bold px-2 py-1 rounded-md inline-block bg-purple-100 text-purple-800">
                                {ens.grade_code}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Version compacte */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700">Planning de l'enseignant</p>
                        <p className="text-xs text-gray-500">Cliquez sur "Changer" pour sélectionner un autre enseignant</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEnseignant(null);
                        setSearchFilter('');
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Changer d'enseignant
                    </button>
                  </div>
                )}
              </div>

              {/* Display de l'emploi */}
              {selectedEnseignant && (
                <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-2xl shadow-2xl border-2 border-purple-200 overflow-hidden">
                  {loadingEnseignant ? (
                    <div className="text-center py-16">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Users className="w-10 h-10 text-white animate-pulse" />
                        </div>
                      </div>
                      <p className="text-xl text-gray-700 font-bold">Chargement du planning...</p>
                    </div>
                  ) : emploiEnseignant ? (
                    <>
                      {/* En-tête profil enseignant */}
                      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 p-8 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                        
                        <div className="relative flex items-center gap-6 mb-6">
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/30">
                            <Users className="w-11 h-11 text-white" />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-4xl font-black text-white drop-shadow-lg mb-2">
                              {emploiEnseignant.enseignant.nom} {emploiEnseignant.enseignant.prenom}
                            </h2>
                            <div className="flex items-center gap-4 text-white/90">
                              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg font-bold text-sm border border-white/30">
                                {emploiEnseignant.enseignant.grade}
                              </span>
                              <span className="font-semibold">
                                {emploiEnseignant.enseignant.nb_surveillances_affectees} / {emploiEnseignant.enseignant.quota_max} surveillances
                              </span>
                            </div>
                          </div>
                          
                          {/* Bouton Export pour l'enseignant */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement export logic
                              console.log('Export enseignant:', emploiEnseignant.enseignant.id);
                            }}
                            className="btn bg-white text-purple-600 hover:bg-purple-50 flex items-center gap-2 text-base font-bold shadow-2xl px-6 py-3 border-2 border-white/30"
                            title="Exporter le planning de cet enseignant"
                          >
                            <Download className="w-5 h-5" />
                            Exporter Planning
                          </button>
                        </div>

                        {/* Jauge de couverture */}
                        <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-bold text-sm uppercase tracking-wide">Taux de couverture</span>
                            <span className={`text-4xl font-black ${
                              emploiEnseignant.enseignant.pourcentage_quota >= 100 
                                ? 'text-green-300' 
                                : emploiEnseignant.enseignant.pourcentage_quota >= 75 
                                ? 'text-yellow-300' 
                                : 'text-red-300'
                            }`}>
                              {emploiEnseignant.enseignant.pourcentage_quota}%
                            </span>
                          </div>
                          <div className="h-4 bg-white/20 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                emploiEnseignant.enseignant.pourcentage_quota >= 100 
                                  ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                                  : emploiEnseignant.enseignant.pourcentage_quota >= 75 
                                  ? 'bg-gradient-to-r from-yellow-400 to-amber-400' 
                                  : 'bg-gradient-to-r from-red-400 to-pink-400'
                              } shadow-lg`}
                              style={{ width: `${Math.min(emploiEnseignant.enseignant.pourcentage_quota, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Liste des surveillances */}
                      <div className="p-8">
                        {emploiEnseignant.emplois.length === 0 ? (
                          <div className="text-center py-20 bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-gray-300">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                              <AlertCircle className="w-14 h-14 text-gray-500" />
                            </div>
                            <p className="text-gray-700 text-2xl font-bold mb-2">Aucune surveillance affectée</p>
                            <p className="text-gray-500">Cet enseignant n'a pas encore de surveillance planifiée</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-6">
                              <Calendar className="w-6 h-6 text-purple-600" />
                              <h3 className="text-2xl font-black text-gray-900">
                                {emploiEnseignant.emplois.length} surveillance{emploiEnseignant.emplois.length > 1 ? 's' : ''} programmée{emploiEnseignant.emplois.length > 1 ? 's' : ''}
                              </h3>
                            </div>
                            
                            {emploiEnseignant.emplois
                              .sort((a, b) => {
                                const dateA = new Date(a.date + 'T' + a.h_debut);
                                const dateB = new Date(b.date + 'T' + b.h_debut);
                                return dateA - dateB;
                              })
                              .map((emploi, index) => (
                                <div
                                  key={index}
                                  className={`group relative bg-white border-2 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 ${
                                    emploi.est_responsable 
                                      ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' 
                                      : 'border-purple-200 hover:border-purple-400'
                                  }`}
                                >
                                  {/* Badge responsable */}
                                  {emploi.est_responsable && (
                                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg animate-pulse">
                                      RESPONSABLE
                                    </div>
                                  )}

                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      {/* Date */}
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-12 h-12 ${
                                          emploi.est_responsable 
                                            ? 'bg-gradient-to-br from-orange-500 to-red-600' 
                                            : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                        } rounded-xl flex items-center justify-center shadow-lg`}>
                                          <Calendar className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                                          <p className="text-lg font-black text-gray-900">{formatDate(emploi.date)}</p>
                                        </div>
                                      </div>

                                      {/* Détails */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-200">
                                          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs text-gray-600 font-semibold">Horaires</p>
                                            <p className="font-black text-gray-900">{formatTime(emploi.h_debut)} - {formatTime(emploi.h_fin)}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 rounded-xl border border-purple-200">
                                          <BookOpen className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs text-gray-600 font-semibold">Type</p>
                                            <p className="font-black text-gray-900">{emploi.type === 'E' ? 'Examen' : 'DS'}</p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Badges session/semestre */}
                                      <div className="flex gap-2 mt-4">
                                        <span className="px-3 py-1.5 bg-cyan-100 text-cyan-800 rounded-lg font-bold text-xs border border-cyan-200">
                                          {emploi.session === 'P' ? 'Principale' : 'Rattrapage'}
                                        </span>
                                        <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-bold text-xs border border-green-200">
                                          {emploi.semestre}
                                        </span>
                                      </div>

                                      {/* Salles */}
                                      {emploi.salles && (
                                        <div className="mt-4 flex items-center gap-2 text-sm">
                                          <MapPin className="w-5 h-5 text-indigo-600" />
                                          <span className="font-semibold text-gray-700">Salles:</span>
                                          <span className="font-black text-gray-900">{emploi.salles}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Numéro de séance */}
                                    <div className="text-center bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200">
                                      <p className="text-xs text-gray-500 font-bold mb-1">Séance</p>
                                      <p className="text-3xl font-black text-gray-900">#{index + 1}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}