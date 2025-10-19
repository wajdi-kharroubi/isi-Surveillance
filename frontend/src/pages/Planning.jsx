import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI, exportAPI, statistiquesAPI, gradesAPI } from '../services/api';
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
  Trash2,
} from 'lucide-react';
import GestionEnseignantsSeanceInline from '../components/GestionEnseignantsSeanceInline';

export default function Planning() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('seances');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedEnseignant, setSelectedEnseignant] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [semestreFilter, setSemestreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [heureFilter, setHeureFilter] = useState('all');
  const [expandedSeance, setExpandedSeance] = useState(null); // Pour gérer l'expansion des séances en mode liste
  const [showAddSeanceForm, setShowAddSeanceForm] = useState(false); // Pour afficher le formulaire d'ajout
  const [selectedSeanceKey, setSelectedSeanceKey] = useState(''); // Clé de la séance sélectionnée (date|h_debut|h_fin)

  const { data: enseignants = [] } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  // Récupérer les configurations de grades avec leurs quotas
  const { data: gradesConfig = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesAPI.getAll().then(res => res.data),
  });

  // Récupérer les statistiques de charge des enseignants
  const { data: chargeEnseignantsData } = useQuery({
    queryKey: ['charge-enseignants'],
    queryFn: () => statistiquesAPI.getChargeEnseignants().then(res => res.data),
  });

  // S'assurer que chargeEnseignants est un tableau (l'API retourne {charges: [...]})
  const chargeEnseignants = Array.isArray(chargeEnseignantsData?.charges) 
    ? chargeEnseignantsData.charges 
    : [];

  // Fusionner les données des enseignants avec leurs statistiques de charge
  const enseignantsAvecCharge = useMemo(() => {
    return enseignants.map(ens => {
      const charge = chargeEnseignants.find(c => c.enseignant_id === ens.id);
      const gradeInfo = gradesConfig.find(g => g.grade_code === ens.grade_code);
      const quota_max = gradeInfo?.nb_surveillances || 0;
      const nb_surveillances_affectees = charge?.nb_surveillances || 0;
      const pourcentage_quota = quota_max > 0 
        ? Math.round((nb_surveillances_affectees / quota_max) * 100)
        : 0;
      
      return {
        ...ens,
        nb_surveillances_affectees,
        quota_max,
        pourcentage_quota,
      };
    });
  }, [enseignants, chargeEnseignants, gradesConfig]);

  const { data: emploiSeances = [], isLoading: loadingSeances } = useQuery({
    queryKey: ['emploi-seances'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
    enabled: activeTab === 'seances',
  });

  // Récupérer la liste des séances disponibles pour le formulaire d'ajout
  const { data: seancesDisponibles = [] } = useQuery({
    queryKey: ['seances-disponibles'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
    enabled: activeTab === 'enseignant' && showAddSeanceForm,
    staleTime: 0, // Force le rechargement des données
    cacheTime: 0, // Ne pas garder en cache
  });

  const { data: emploiEnseignant, isLoading: loadingEnseignant } = useQuery({
    queryKey: ['emploi-enseignant', selectedEnseignant],
    queryFn: () => planningAPI.getEmploiEnseignant(selectedEnseignant).then(res => res.data),
    enabled: activeTab === 'enseignant' && selectedEnseignant !== null,
  });

  // Mutation pour supprimer un enseignant d'une séance
  const supprimerSeanceMutation = useMutation({
    mutationFn: planningAPI.supprimerEnseignantSeance,
    onSuccess: () => {
      // Recharger les données de l'enseignant
      queryClient.invalidateQueries(['emploi-enseignant', selectedEnseignant]);
      queryClient.invalidateQueries(['emploi-seances']);
      queryClient.invalidateQueries(['statistiques']);
    },
  });

  // Mutation pour ajouter un enseignant à une séance par date et heure
  const ajouterSeanceMutation = useMutation({
    mutationFn: planningAPI.ajouterEnseignantParDateHeure,
    onSuccess: (response) => {
      // Recharger les données
      queryClient.invalidateQueries(['emploi-enseignant', selectedEnseignant]);
      queryClient.invalidateQueries(['emploi-seances']);
      queryClient.invalidateQueries(['statistiques']);
      
      // Réinitialiser le formulaire
      setShowAddSeanceForm(false);
      setSelectedSeanceKey('');
      
      // Afficher un message de succès (optionnel, vous pouvez utiliser toast)
      alert(response.data.message);
    },
    onError: (error) => {
      alert(error.response?.data?.detail || 'Erreur lors de l\'ajout de la séance');
    },
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
      return enseignantsAvecCharge.filter(e => e.participe_surveillance);
    }
    
    const filterLower = searchFilter.toLowerCase().trim();
    return enseignantsAvecCharge
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
  }, [enseignantsAvecCharge, searchFilter]);

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

  // Fonction pour supprimer un enseignant d'une séance
  const handleSupprimerSeance = (emploi) => {
    if (!confirm(`Voulez-vous vraiment retirer cet enseignant de cette séance du ${formatDate(emploi.date)} ?`)) {
      return;
    }

    supprimerSeanceMutation.mutate({
      enseignant_id: selectedEnseignant,
      date_examen: emploi.date,
      h_debut: emploi.h_debut,
      h_fin: emploi.h_fin,
      session: emploi.session,
      semestre: emploi.semestre,
    });
  };

  // Fonction pour ajouter une séance à l'enseignant
  const handleAjouterSeance = (e) => {
    e.preventDefault();
    
    if (!selectedSeanceKey) {
      alert('Veuillez sélectionner une séance');
      return;
    }

    // Extraire date et heure de la clé sélectionnée
    const [date, h_debut, h_fin] = selectedSeanceKey.split('|');

    ajouterSeanceMutation.mutate({
      enseignant_id: selectedEnseignant,
      date_examen: date,
      h_debut: h_debut
    });
  };

  // Fonction pour déterminer le numéro de séance en fonction de l'heure
  const determinerSeance = (hDebut) => {
    const [heures, minutes] = hDebut.split(':').map(Number);
    const heureMinutes = heures * 60 + minutes;

    if (heureMinutes >= 510 && heureMinutes < 630) return 'S1'; // 8:30 - 10:29
    if (heureMinutes >= 630 && heureMinutes < 750) return 'S2'; // 10:30 - 12:29
    if (heureMinutes >= 750 && heureMinutes < 870) return 'S3'; // 12:30 - 14:29
    if (heureMinutes >= 870) return 'S4'; // 14:30+
    return 'S1'; // Par défaut
  };

  // Fonction pour télécharger un fichier blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Fonction pour exporter la liste d'une séance
  const handleExportSeance = async (seance) => {
    try {
      const numeroSeance = determinerSeance(seance.h_debut);
      const response = await exportAPI.listeCreneau({
        date_exam: seance.date,
        seance: numeroSeance
      });
      
      const filename = `liste_seance_${seance.date}_${numeroSeance}.docx`;
      downloadBlob(response.data, filename);
      
      // Notification succès (optionnel - vous pouvez ajouter un toast)
      console.log('✅ Liste exportée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de la séance:', error);
      alert('Erreur lors de l\'export de la liste de séance. Veuillez réessayer.');
    }
  };

  // Fonction pour exporter la convocation d'un enseignant
  const handleExportConvocationEnseignant = async (enseignantId) => {
    try {
      const response = await exportAPI.convocationEnseignant(enseignantId);
      
      const enseignant = enseignants.find(e => e.id === enseignantId);
      const filename = enseignant 
        ? `convocation_${enseignant.nom}_${enseignant.prenom}.docx`
        : `convocation_enseignant_${enseignantId}.docx`;
      
      downloadBlob(response.data, filename);
      
      // Notification succès (optionnel)
      console.log('✅ Convocation exportée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de la convocation:', error);
      alert('Erreur lors de l\'export de la convocation. Veuillez réessayer.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header - Compact */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md">
                  Planning de Surveillance
                </h1>
                <p className="text-blue-100 text-sm font-medium">
                  Visualisez et gérez les affectations en temps réel
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = '/export'}
              className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-lg flex items-center gap-2 font-semibold text-sm transition-all duration-200 hover:scale-105"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('seances')}
            className={`${
              activeTab === 'seances'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <Calendar className="w-5 h-5" />
            <span>Vue par Séances</span>
            {activeTab === 'seances' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('enseignant')}
            className={`${
              activeTab === 'enseignant'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } flex-1 py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative`}
          >
            <Users className="w-5 h-5" />
            <span>Vue par Enseignant</span>
            {activeTab === 'enseignant' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
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
                    <Filter className="w-5 h-5 text-blue-600" />
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
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600"></div>
                        
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
                                {seance.enseignants && seance.enseignants.length > 0 && (
                                  <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-lg font-bold text-xs border-2 border-blue-200">
                                    {seance.enseignants.length} enseignant{seance.enseignants.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                              {/* Badge nombre de salles */}
                              <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border-2 border-blue-200 shadow-lg">
                                <div className="flex items-center gap-2 justify-center text-blue-600 mb-1">
                                  <MapPin className="w-7 h-7" />
                                  <span className="text-4xl font-black">{seance.examens?.length || 0}</span>
                                </div>
                                <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">Salles</p>
                              </div>
                              
                              {/* Bouton Export */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportSeance(seance);
                                }}
                                className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-bold shadow-lg px-3 py-2"
                                title="Exporter cette séance"
                              >
                                <Download className="w-4 h-4" />
                                Export
                              </button>
                            </div>
                          </div>

                          {/* Gestion des enseignants de la séance */}
                          <div className="mt-6 pt-6 border-t-2 border-gray-100">
                            <GestionEnseignantsSeanceInline 
                              seance={seance}
                              onEnseignantClick={handleEnseignantClick}
                            />
                          </div>
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
                              <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 shadow-md">
                                <div className="flex items-center gap-2 text-blue-600">
                                  <MapPin className="w-6 h-6" />
                                  <span className="text-3xl font-black">{seance.examens?.length || 0}</span>
                                </div>
                                <p className="text-xs text-gray-600 font-bold mt-1">Salles</p>
                              </div>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportSeance(seance);
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
                        {expandedSeance === index && (
                          <div className="px-6 pb-6 pt-2 border-t-2 border-gray-100 bg-gradient-to-br from-gray-50 to-blue-50 animate-slideDown">
                            <GestionEnseignantsSeanceInline 
                              seance={seance}
                              onEnseignantClick={handleEnseignantClick}
                            />
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
              {/* Tableau récapitulatif des enseignants */}
              {!selectedEnseignant && (
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
                  {/* Barre de recherche dans le tableau */}
                  <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-100 px-6 py-4 border-b-2 border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Vue d'ensemble des enseignants</h3>
                          <p className="text-xs text-gray-600 font-medium">Quota de surveillances par enseignant</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative max-w-md ml-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-green-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Rechercher par enseignant, grade ou code..."
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
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-green-50 border-b-2 border-gray-200">
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Enseignant
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Grade
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Surveillances
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Pourcentage
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {enseignantsFiltres
                          .sort((a, b) => {
                            // Trier par pourcentage décroissant
                            const pctA = a.quota_max > 0 ? (a.nb_surveillances_affectees / a.quota_max) * 100 : 0;
                            const pctB = b.quota_max > 0 ? (b.nb_surveillances_affectees / b.quota_max) * 100 : 0;
                            return pctB - pctA;
                          })
                          .map((ens) => {
                            const pourcentage = ens.quota_max > 0 
                              ? Math.round((ens.nb_surveillances_affectees / ens.quota_max) * 100)
                              : 0;
                            
                            return (
                              <tr 
                                key={ens.id}
                                className="hover:bg-green-50 transition-colors cursor-pointer group"
                                onClick={() => setSelectedEnseignant(ens.id)}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Users className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 text-sm">
                                        {ens.nom.charAt(0).toUpperCase() + ens.nom.slice(1).toLowerCase()} {ens.prenom}
                                      </p>
                                      <p className="text-xs text-gray-500 font-medium">
                                        {ens.code_smartex || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                    {ens.grade_code}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-2xl font-black text-gray-900">
                                      {ens.nb_surveillances_affectees}
                                    </span>
                                    <span className="text-sm text-gray-500 font-medium">
                                      / {ens.quota_max}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
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
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEnseignant(ens.id);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg font-semibold text-sm group-hover:scale-105"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Voir
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Display de l'emploi */}
              {selectedEnseignant && (
                <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-2xl shadow-2xl border-2 border-green-200 overflow-hidden">
                  {loadingEnseignant ? (
                    <div className="text-center py-16">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-ping opacity-20"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <Users className="w-10 h-10 text-white animate-pulse" />
                        </div>
                      </div>
                      <p className="text-xl text-gray-700 font-bold">Chargement du planning...</p>
                    </div>
                  ) : emploiEnseignant ? (
                    <>
                      {/* En-tête profil enseignant */}
                      <div className="bg-white px-6 py-4 border-b-2 border-gray-200 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-blue-50 opacity-50"></div>
                        
                        <div className="relative flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">
                              {emploiEnseignant.enseignant.nom.charAt(0).toUpperCase() + emploiEnseignant.enseignant.nom.slice(1).toLowerCase()} {emploiEnseignant.enseignant.prenom}
                            </h2>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="px-2 py-1 bg-green-100 rounded-md font-semibold text-xs text-green-700 border border-green-200">
                                {emploiEnseignant.enseignant.grade}
                              </span>
                              <span className="font-medium">
                                {emploiEnseignant.enseignant.nb_surveillances_affectees} / {emploiEnseignant.enseignant.quota_max} surveillances
                              </span>
                              <span className={`font-bold ${
                                emploiEnseignant.enseignant.pourcentage_quota >= 100 
                                  ? 'text-green-600' 
                                  : emploiEnseignant.enseignant.pourcentage_quota >= 75 
                                  ? 'text-yellow-600' 
                                  : 'text-red-600'
                              }`}>
                                ({emploiEnseignant.enseignant.pourcentage_quota}%)
                              </span>
                            </div>
                          </div>
                          
                          {/* Boutons d'action */}
                          <div className="flex items-center gap-2">
                            {/* Bouton Ajouter une séance */}
                            {!showAddSeanceForm && (
                              <button
                                onClick={() => setShowAddSeanceForm(true)}
                                className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 text-sm font-semibold shadow-md px-3 py-2"
                                title="Ajouter une séance de surveillance"
                              >
                                <Calendar className="w-4 h-4" />
                                Ajouter
                              </button>
                            )}
                            
                            {/* Bouton Export */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportConvocationEnseignant(emploiEnseignant.enseignant.id);
                              }}
                              className="btn bg-white text-green-600 hover:bg-green-50 flex items-center gap-2 text-sm font-bold shadow-md px-3 py-2 border-2 border-green-300"
                              title="Exporter le planning de cet enseignant"
                            >
                              <Download className="w-4 h-4" />
                              Exporter
                            </button>
                            
                            {/* Séparateur visuel */}
                            <div className="w-px h-8 bg-gray-300 mx-2"></div>
                            
                            {/* Bouton Retour (Fermer) */}
                            <button
                              onClick={() => {
                                setSelectedEnseignant(null);
                                setShowAddSeanceForm(false);
                                setSelectedSeanceKey('');
                              }}
                              className="w-10 h-10 bg-white hover:bg-gray-100 rounded-xl flex items-center justify-center shadow-md border-2 border-gray-200 transition-all hover:scale-105 flex-shrink-0"
                              title="Retour à la liste des enseignants"
                            >
                              <span className="text-2xl font-bold text-gray-600 leading-none">×</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Formulaire pour ajouter une séance */}
                      {showAddSeanceForm && (
                        <div className="px-8 pt-6">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                  <Calendar className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                  Ajouter une séance
                                </h3>
                              </div>
                              <button
                                onClick={() => {
                                  setShowAddSeanceForm(false);
                                  setSelectedSeanceKey('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Fermer"
                              >
                                <span className="text-2xl leading-none">×</span>
                              </button>
                            </div>

                            <form onSubmit={handleAjouterSeance} className="space-y-4">
                              {/* Sélecteur de séance */}
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  <Calendar className="w-4 h-4 inline mr-2" />
                                  Sélectionner une séance disponible
                                </label>
                                <select
                                  value={selectedSeanceKey}
                                  onChange={(e) => setSelectedSeanceKey(e.target.value)}
                                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
                                  required
                                >
                                  <option value="">-- Choisir une séance --</option>
                                  {seancesDisponibles
                                    .sort((a, b) => {
                                      // Trier par date puis par heure
                                      if (a.date !== b.date) return a.date.localeCompare(b.date);
                                      return a.h_debut.localeCompare(b.h_debut);
                                    })
                                    .map((seance) => {
                                      const key = `${seance.date}|${seance.h_debut}|${seance.h_fin}`;
                                      const dateFormatee = new Date(seance.date).toLocaleDateString('fr-FR', {
                                        weekday: 'short',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      });
                                      const nbExamens = seance.nb_examens || seance.examens?.length || 0;
                                      return (
                                        <option key={key} value={key}>
                                          {dateFormatee} • {formatTime(seance.h_debut)} - {formatTime(seance.h_fin)} • {seance.session} {seance.semestre} • {nbExamens} examen{nbExamens > 1 ? 's' : ''} • {seance.nb_enseignants} surveillant{seance.nb_enseignants > 1 ? 's' : ''}
                                        </option>
                                      );
                                    })
                                  }
                                </select>
                              </div>

                              {/* Info */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                  <strong>💡 Astuce :</strong> Sélectionnez une séance dans la liste des séances disponibles.
                                  {emploiEnseignant.enseignant.nb_surveillances_affectees >= emploiEnseignant.enseignant.quota_max && (
                                    <span className="block mt-1 text-amber-700 font-bold">
                                      ⚠️ Attention : Le quota de cet enseignant est déjà atteint ({emploiEnseignant.enseignant.pourcentage_quota}%)
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* Boutons */}
                              <div className="flex gap-3 pt-2">
                                <button
                                  type="submit"
                                  disabled={ajouterSeanceMutation.isPending}
                                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold"
                                >
                                  {ajouterSeanceMutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Ajout en cours...
                                    </span>
                                  ) : (
                                    'Ajouter la séance'
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddSeanceForm(false);
                                    setSelectedSeanceKey('');
                                  }}
                                  className="px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border-2 border-gray-300 font-semibold"
                                >
                                  Annuler
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Liste des surveillances */}
                      <div className="p-6">
                        {emploiEnseignant.emplois.length === 0 ? (
                          <div className="text-center py-12 bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 rounded-xl border-2 border-dashed border-gray-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <AlertCircle className="w-10 h-10 text-gray-500" />
                            </div>
                            <p className="text-gray-700 text-lg font-bold mb-1">Aucune surveillance affectée</p>
                            <p className="text-gray-500 text-sm">Cet enseignant n'a pas encore de surveillance planifiée</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-green-600" />
                                <h3 className="text-lg font-bold text-gray-900">
                                  {emploiEnseignant.emplois.length} surveillance{emploiEnseignant.emplois.length > 1 ? 's' : ''}
                                </h3>
                              </div>
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
                                  className={`group relative bg-white border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-200 ${
                                    emploi.est_responsable 
                                      ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' 
                                      : 'border-gray-200 hover:border-green-300'
                                  }`}
                                >
                                  {/* Badge responsable */}
                                  {emploi.est_responsable && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-lg text-xs font-black shadow-md">
                                      RESPONSABLE
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-3">
                                    {/* Numéro de séance */}
                                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0">
                                      <span className="text-lg font-black text-gray-700">#{index + 1}</span>
                                    </div>

                                    {/* Date et heure */}
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-10 h-10 ${
                                        emploi.est_responsable 
                                          ? 'bg-gradient-to-br from-orange-500 to-red-600' 
                                          : 'bg-gradient-to-br from-green-500 to-emerald-600'
                                      } rounded-lg flex items-center justify-center shadow-md flex-shrink-0`}>
                                        <Calendar className="w-5 h-5 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{formatDate(emploi.date)}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <Clock className="w-3 h-3 text-gray-500" />
                                          <span className="text-xs text-gray-600 font-semibold">{formatTime(emploi.h_debut)} - {formatTime(emploi.h_fin)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Badges compacts */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded-md font-bold text-xs border border-cyan-200">
                                        {emploi.session === 'P' ? 'P' : 'R'}
                                      </span>
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-bold text-xs border border-green-200">
                                        {emploi.semestre.replace('SEMESTRE ', 'S')}
                                      </span>
                                      {emploi.salles && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                                          <MapPin className="w-3 h-3" />
                                          <span className="text-xs font-bold">{emploi.salles}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Bouton supprimer */}
                                    <button
                                      onClick={() => handleSupprimerSeance(emploi)}
                                      disabled={supprimerSeanceMutation.isPending}
                                      className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400 transition-all border border-red-200 hover:border-red-300 group flex-shrink-0"
                                      title="Retirer de cette séance"
                                    >
                                      <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
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