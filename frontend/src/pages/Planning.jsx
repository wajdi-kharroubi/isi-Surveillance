import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI, exportAPI, statistiquesAPI, gradesAPI } from '../services/api';
import { toast } from 'react-hot-toast';
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
  ArrowLeftRight,
  Archive,
} from 'lucide-react';
import GestionEnseignantsSeanceInline from '../components/GestionEnseignantsSeanceInline';
import ArchiveSessionModal from '../components/ArchiveSessionModal';

export default function Planning() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('seances');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fonction pour formater la session
  const formatSession = (session) => {
    if (!session) return '';
    const sessionMap = {
      'Pa': 'Partiel',
      'P': 'Principale',
      'C': 'Contrôle',
      'R': 'Rattrapage'
    };
    return sessionMap[session] || session;
  };

  const [selectedEnseignant, setSelectedEnseignant] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [semestreFilter, setSemestreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [heureFilter, setHeureFilter] = useState('all');
  const [expandedSeance, setExpandedSeance] = useState(null); // Pour gérer l'expansion des séances en mode liste
  const [showAddSeanceForm, setShowAddSeanceForm] = useState(false); // Pour afficher le formulaire d'ajout
  const [selectedSeanceKey, setSelectedSeanceKey] = useState(''); // Clé de la séance sélectionnée (date|h_debut|h_fin)
  const [sortBy, setSortBy] = useState('pourcentage'); // 'pourcentage', 'grade', 'nom'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [expandedSalles, setExpandedSalles] = useState({}); // Pour gérer l'affichage des salles
  const [showConfirmationModal, setShowConfirmationModal] = useState(false); // Modal de confirmation
  const [validationData, setValidationData] = useState(null); // Données de validation
  
  // États pour l'échange d'enseignants
  const [exchangeMode, setExchangeMode] = useState(false);
  const [selectedForExchange, setSelectedForExchange] = useState(null); // { enseignant, seance }
  const [showExchangeConfirmationModal, setShowExchangeConfirmationModal] = useState(false); // Modal de confirmation d'échange
  const [exchangeValidationData, setExchangeValidationData] = useState(null); // Données de validation pour l'échange
  const [pendingExchangeData, setPendingExchangeData] = useState(null); // Données de l'échange en attente

  // États pour la suppression
  const [showSuppressionModal, setShowSuppressionModal] = useState(false); // Modal de confirmation de suppression
  const [pendingSuppressionData, setPendingSuppressionData] = useState(null); // Données de suppression en attente

  // État pour le modal d'archivage
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const { data: enseignants = [] } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
    staleTime: 10 * 60 * 1000, // 10 minutes - les enseignants changent rarement
    gcTime: 30 * 60 * 1000, // 30 minutes en cache
    refetchOnMount: 'always', // Force le rechargement pour voir les exceptions à jour
  });

  // Récupérer les configurations de grades avec leurs quotas
  const { data: gradesConfig = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesAPI.getAll().then(res => res.data),
    staleTime: 0, // Pas de cache - toujours à jour
    gcTime: 0, // Pas de conservation en mémoire
    refetchOnMount: true, // Toujours recharger
  });

  // Récupérer les statistiques de charge des enseignants
  const { data: chargeEnseignantsData } = useQuery({
    queryKey: ['charge-enseignants'],
    queryFn: () => statistiquesAPI.getChargeEnseignants().then(res => res.data),
    staleTime: 0, // Toujours recharger - données dynamiques du planning
    gcTime: 0, // Ne pas garder en cache
    refetchOnMount: true, // Recharger à chaque montage
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
      
      // Utiliser quota_Exception si is_Exception est true, sinon utiliser le quota du grade
      const quota_max = ens.is_Exception && ens.quota_Exception != null
        ? ens.quota_Exception
        : (gradeInfo?.nb_surveillances || 0);
      
      const nb_surveillances_affectees = charge?.nb_surveillances || 0;
      const nb_jours = charge?.nb_jours || 0;
      const pourcentage_quota = quota_max > 0 
        ? Math.round((nb_surveillances_affectees / quota_max) * 100)
        : 0;
      
      return {
        ...ens,
        nb_surveillances_affectees,
        nb_jours,
        quota_max,
        pourcentage_quota,
      };
    });
  }, [enseignants, chargeEnseignants, gradesConfig]);

  const { data: emploiSeances = [], isLoading: loadingSeances } = useQuery({
    queryKey: ['emploi-seances'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
    enabled: activeTab === 'seances',
    staleTime: 0, // Toujours recharger pour le planning (données dynamiques)
    gcTime: 0, // Ne pas garder en cache (données changeantes)
    refetchOnMount: true, // Toujours recharger au montage
  });

  // Récupérer la liste des séances disponibles pour le formulaire d'ajout
  const { data: toutesSeances = [] } = useQuery({
    queryKey: ['seances-disponibles'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
    enabled: activeTab === 'enseignant' && showAddSeanceForm,
    staleTime: 0, // Force le rechargement des données
    gcTime: 0, // Ne pas garder en cache
    refetchOnMount: true, // Toujours recharger
  });

  const { data: emploiEnseignant, isLoading: loadingEnseignant } = useQuery({
    queryKey: ['emploi-enseignant', selectedEnseignant],
    queryFn: () => planningAPI.getEmploiEnseignant(selectedEnseignant).then(res => res.data),
    enabled: activeTab === 'enseignant' && selectedEnseignant !== null,
    staleTime: 0, // Toujours recharger pour le planning
    gcTime: 0, // Ne pas garder en cache
    refetchOnMount: true, // Toujours recharger
  });

  // Filtrer les séances pour n'afficher que celles non affectées à l'enseignant
  const seancesDisponibles = useMemo(() => {
    if (!emploiEnseignant || !toutesSeances.length) {
      return toutesSeances;
    }

    // Créer un Set des clés des séances déjà affectées à l'enseignant
    const seancesAffectees = new Set(
      emploiEnseignant.emplois.map(emploi => 
        `${emploi.date}|${emploi.h_debut}|${emploi.h_fin}`
      )
    );

    // Filtrer les séances disponibles en excluant celles déjà affectées
    return toutesSeances.filter(seance => {
      const key = `${seance.date}|${seance.h_debut}|${seance.h_fin}`;
      return !seancesAffectees.has(key);
    });
  }, [toutesSeances, emploiEnseignant]);

  // Mutation pour supprimer un enseignant d'une séance
  const supprimerSeanceMutation = useMutation({
    mutationFn: planningAPI.supprimerEnseignantSeance,
    onSuccess: () => {
      // Recharger les données de l'enseignant
      queryClient.invalidateQueries({ queryKey: ['emploi-enseignant', selectedEnseignant] });
      queryClient.invalidateQueries({ queryKey: ['emploi-seances'] });
      queryClient.invalidateQueries({ queryKey: ['statistiques'] });
      queryClient.invalidateQueries({ queryKey: ['charge-enseignants'] });
    },
  });

  // Mutation pour ajouter un enseignant à une séance par date et heure
  const ajouterSeanceMutation = useMutation({
    mutationFn: planningAPI.ajouterEnseignantParDateHeure,
    onSuccess: (response) => {
      // Recharger les données
      queryClient.invalidateQueries({ queryKey: ['emploi-enseignant', selectedEnseignant] });
      queryClient.invalidateQueries({ queryKey: ['emploi-seances'] });
      queryClient.invalidateQueries({ queryKey: ['statistiques'] });
      queryClient.invalidateQueries({ queryKey: ['charge-enseignants'] });
      
      // Réinitialiser le formulaire
      setShowAddSeanceForm(false);
      setSelectedSeanceKey('');
      
      // Afficher un message de succès avec toast
      toast.success(response.data.message);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout de la séance');
    },
  });

  // Mutation pour échanger deux enseignants entre séances
  const exchangeEnseignantsMutation = useMutation({
    mutationFn: planningAPI.exchangeEnseignants,
    onSuccess: (response) => {
      // Recharger les données
      queryClient.invalidateQueries({ queryKey: ['emploi-enseignant'] });
      queryClient.invalidateQueries({ queryKey: ['emploi-seances'] });
      queryClient.invalidateQueries({ queryKey: ['statistiques'] });
      queryClient.invalidateQueries({ queryKey: ['charge-enseignants'] });
      
      // Réinitialiser le mode échange
      setExchangeMode(false);
      setSelectedForExchange(null);
      
      // Afficher un message de succès
      toast.success(response.data?.message || 'Enseignants échangés avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'échange des enseignants');
      // Ne pas réinitialiser le mode échange en cas d'erreur
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
        const hasException = ens.is_Exception ? 'exception' : '';
        
        return nom.includes(filterLower) || 
               prenom.includes(filterLower) || 
               codeSmartex.includes(filterLower) ||
               gradeCode.includes(filterLower) ||
               hasException.includes(filterLower);
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
  const handleSupprimerSeance = async (emploi) => {
    if (!emploiEnseignant) return;

    try {
      // Vérifier les contraintes avant de supprimer
      const response = await planningAPI.verifierContraintesSuppression({
        enseignant_id: selectedEnseignant,
        date_examen: emploi.date,
        h_debut: emploi.h_debut,
        h_fin: emploi.h_fin,
        session: emploi.session,
        semestre: emploi.semestre,
      });

      const validation = response.data;

      // Préparer les données de suppression avec validation
      setPendingSuppressionData({
        emploi,
        enseignant: emploiEnseignant.enseignant,
        validation,
        mutation: {
          enseignant_id: selectedEnseignant,
          date_examen: emploi.date,
          h_debut: emploi.h_debut,
          h_fin: emploi.h_fin,
          session: emploi.session,
          semestre: emploi.semestre,
        }
      });

      // Afficher la modale de confirmation
      setShowSuppressionModal(true);
    } catch (error) {
      console.error('Erreur lors de la vérification des contraintes:', error);
      toast.error('Erreur lors de la vérification des contraintes');
    }
  };

  // Fonction pour confirmer la suppression
  const confirmerSuppression = () => {
    if (pendingSuppressionData) {
      supprimerSeanceMutation.mutate(pendingSuppressionData.mutation);
      setShowSuppressionModal(false);
      setPendingSuppressionData(null);
    }
  };

  // Fonction pour annuler la suppression
  const annulerSuppression = () => {
    setShowSuppressionModal(false);
    setPendingSuppressionData(null);
    toast.info('Suppression annulée');
  };

  // Fonction pour ajouter une séance à l'enseignant
  const handleAjouterSeance = async (e) => {
    e.preventDefault();
    
    if (!selectedSeanceKey) {
      toast.error('Veuillez sélectionner une séance');
      return;
    }

    // Extraire date et heure de la clé sélectionnée
    const [date, h_debut, h_fin] = selectedSeanceKey.split('|');

    try {
      // Vérifier les contraintes avant d'ajouter
      const response = await planningAPI.verifierContraintesAjout({
        enseignant_id: selectedEnseignant,
        date_examen: date,
        h_debut: h_debut
      });

      const validation = response.data;
      
      // Si il y a des erreurs bloquantes, ne pas permettre l'ajout
      if (!validation.peut_ajouter) {
        toast.error('Impossible d\'ajouter cet enseignant à cette séance');
        // Afficher les erreurs détaillées
        const errorMsg = validation.errors.join('\n');
        toast.error(errorMsg, { duration: 6000 });
        return;
      }

      // Toujours afficher la modal de confirmation
      setValidationData({
        enseignant_id: selectedEnseignant,
        date_examen: date,
        h_debut: h_debut,
        validation: validation
      });
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Erreur lors de la vérification des contraintes:', error);
      toast.error('Erreur lors de la vérification des contraintes');
    }
  };

  // Fonction pour confirmer l'ajout après validation
  const confirmerAjout = () => {
    if (validationData) {
      ajouterSeanceMutation.mutate({
        enseignant_id: validationData.enseignant_id,
        date_examen: validationData.date_examen,
        h_debut: validationData.h_debut
      });
      setShowConfirmationModal(false);
      setValidationData(null);
    }
  };

  // Fonction pour annuler l'ajout
  const annulerAjout = () => {
    setShowConfirmationModal(false);
    setValidationData(null);
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
      
      // Notification succès
      toast.success('Liste de séance exportée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de la séance:', error);
      toast.error('Erreur lors de l\'export de la liste de séance. Veuillez réessayer.');
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
      
      // Notification succès
      toast.success('Convocation exportée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de la convocation:', error);
      toast.error('Erreur lors de l\'export de la convocation. Veuillez réessayer.');
    }
  };

  // Fonction pour activer/désactiver le mode échange
  const handleToggleExchangeMode = () => {
    setExchangeMode(!exchangeMode);
    setSelectedForExchange(null);
  };

  // Fonction pour sélectionner un enseignant pour l'échange
  const handleSelectForExchange = async (enseignant, seance) => {
    if (!selectedForExchange) {
      // Premier enseignant sélectionné
      setSelectedForExchange({ enseignant, seance });
      toast.success(`${enseignant.nom} ${enseignant.prenom} sélectionné - Choisissez maintenant le second enseignant à échanger`);
    } else {
      // Deuxième enseignant sélectionné - vérifier qu'ils sont différents
      if (selectedForExchange.enseignant.id === enseignant.id && 
          selectedForExchange.seance.date === seance.date &&
          selectedForExchange.seance.h_debut === seance.h_debut) {
        // Même enseignant dans la même séance - désélectionner
        setSelectedForExchange(null);
        toast.info('Sélection annulée');
        return;
      }

      // Vérifier que le premier enseignant n'est pas déjà dans la séance 2
      const ens1DejaSeance2 = seance.enseignants?.some(e => e.id === selectedForExchange.enseignant.id);
      if (ens1DejaSeance2) {
        toast.error(`${selectedForExchange.enseignant.nom} ${selectedForExchange.enseignant.prenom} est déjà dans la séance du ${formatDate(seance.date)} ${seance.h_debut}. Échange impossible.`);
        return;
      }

      // Vérifier que le deuxième enseignant n'est pas déjà dans la séance 1
      const ens2DejaSeance1 = selectedForExchange.seance.enseignants?.some(e => e.id === enseignant.id);
      if (ens2DejaSeance1) {
        toast.error(`${enseignant.nom} ${enseignant.prenom} est déjà dans la séance du ${formatDate(selectedForExchange.seance.date)} ${selectedForExchange.seance.h_debut}. Échange impossible.`);
        return;
      }

      // Préparer les données de l'échange
      const exchangeData = {
        enseignant1_id: selectedForExchange.enseignant.id,
        date1: selectedForExchange.seance.date,
        h_debut1: selectedForExchange.seance.h_debut,
        h_fin1: selectedForExchange.seance.h_fin,
        session1: selectedForExchange.seance.session,
        semestre1: selectedForExchange.seance.semestre,
        enseignant2_id: enseignant.id,
        date2: seance.date,
        h_debut2: seance.h_debut,
        h_fin2: seance.h_fin,
        session2: seance.session,
        semestre2: seance.semestre,
      };

      // Vérifier les contraintes pour les deux enseignants
      try {
        const validation = await planningAPI.verifierContraintesEchange(exchangeData);
        
        // Vérifier s'il y a des erreurs bloquantes
        if (validation.data.errors.length > 0) {
          // Afficher les erreurs
          toast.error(validation.data.errors.join('\n'), { duration: 6000 });
          return;
        }

        // Toujours afficher la modale de confirmation
        setExchangeValidationData(validation.data);
        setPendingExchangeData(exchangeData);
        setShowExchangeConfirmationModal(true);
      } catch (error) {
        console.error('Erreur lors de la vérification des contraintes:', error);
        toast.error('Erreur lors de la vérification des contraintes');
      }
    }
  };

  // Fonction pour confirmer l'échange après validation
  const confirmerEchange = () => {
    if (pendingExchangeData) {
      exchangeEnseignantsMutation.mutate(pendingExchangeData);
      setShowExchangeConfirmationModal(false);
      setExchangeValidationData(null);
      setPendingExchangeData(null);
    }
  };

  // Fonction pour annuler l'échange
  const annulerEchange = () => {
    setShowExchangeConfirmationModal(false);
    setExchangeValidationData(null);
    setPendingExchangeData(null);
    toast.info('Échange annulé');
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
          
          <div className="flex gap-3">
            <button 
              onClick={() => setShowArchiveModal(true)}
              className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 rounded-lg shadow-lg flex items-center gap-2 font-semibold text-sm transition-all duration-200 hover:scale-105 border border-white/30"
            >
              <Archive className="w-4 h-4" />
              Archiver
            </button>
            
            <button 
              onClick={() => navigate('/export')}
              className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-lg flex items-center gap-2 font-semibold text-sm transition-all duration-200 hover:scale-105"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
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
              <div className="flex flex-row flex-wrap gap-3 items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-2xl border-2 border-gray-200">
                {/* Filtre Date */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-gray-200 shadow-sm">
                  <Calendar className="w-4 h-4 text-green-600" />
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
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-gray-200 shadow-sm">
                  <Clock className="w-4 h-4 text-orange-600" />
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
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-gray-200 shadow-sm">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="border-none focus:ring-0 font-semibold text-sm bg-transparent cursor-pointer"
                  >
                    <option value="all">Toutes les sessions</option>
                    <option value="Pa">Partiel</option>
                    <option value="P">Principale</option>
                    <option value="C">Contrôle</option>
                    <option value="R">Rattrapage</option>
                  </select>
                </div>

                {/* Filtre Semestre */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-gray-200 shadow-sm">
                  <Filter className="w-4 h-4 text-blue-600" />
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
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors border-2 border-red-200"
                  >
                    Réinitialiser
                  </button>
                )}

                {/* Spacer pour pousser les contrôles à droite */}
                <div className="flex-grow"></div>

                {/* Toggle View Mode */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-2 border-gray-200 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`${
                      viewMode === 'grid'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    } p-2 rounded-lg transition-all duration-200`}
                    title="Vue Grille"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`${
                      viewMode === 'list'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    } p-2 rounded-lg transition-all duration-200`}
                    title="Vue Liste"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Toggle Exchange Mode */}
                <button
                  onClick={handleToggleExchangeMode}
                  className={`${
                    exchangeMode
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg border-orange-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                  } px-3 py-2 rounded-xl border-2 transition-all duration-200 flex items-center gap-2 font-semibold text-sm shadow-sm`}
                  title={exchangeMode ? "Désactiver le mode échange" : "Activer le mode échange"}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {exchangeMode ? 'Annuler échange' : 'Échanger'}
                  {selectedForExchange && (
                    <span className="ml-1 px-2 py-0.5 bg-white text-orange-600 rounded-full text-xs font-bold">
                      1/2
                    </span>
                  )}
                </button>
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
                                  {formatSession(seance.session)}
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
                              exchangeMode={exchangeMode}
                              selectedForExchange={selectedForExchange}
                              onSelectForExchange={handleSelectForExchange}
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
                                    {formatSession(seance.session)}
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
                              exchangeMode={exchangeMode}
                              selectedForExchange={selectedForExchange}
                              onSelectForExchange={handleSelectForExchange}
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
                          <p className="text-xs text-gray-600 font-medium">Quota de surveillances par enseignant - Cliquez sur les colonnes pour trier</p>
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
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => {
                                if (sortBy === 'nom') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortBy('nom');
                                  setSortOrder('asc');
                                }
                              }}
                              className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-green-600 transition-colors"
                            >
                              Enseignant
                              {sortBy === 'nom' && (
                                <span className="text-green-600">
                                  {sortOrder === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => {
                                if (sortBy === 'grade') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortBy('grade');
                                  setSortOrder('asc');
                                }
                              }}
                              className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-green-600 transition-colors"
                            >
                              Grade
                              {sortBy === 'grade' && (
                                <span className="text-green-600">
                                  {sortOrder === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Surveillances
                          </th>
                          <th className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                if (sortBy === 'jours') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortBy('jours');
                                  setSortOrder('desc');
                                }
                              }}
                              className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-blue-600 transition-colors"
                            >
                              Nb Jours
                              {sortBy === 'jours' && (
                                <span className="text-blue-600">
                                  {sortOrder === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                if (sortBy === 'pourcentage') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortBy('pourcentage');
                                  setSortOrder('desc');
                                }
                              }}
                              className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-green-600 transition-colors"
                            >
                              Pourcentage
                              {sortBy === 'pourcentage' && (
                                <span className="text-green-600">
                                  {sortOrder === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {enseignantsFiltres
                          .sort((a, b) => {
                            let compareValue = 0;
                            
                            if (sortBy === 'pourcentage') {
                              // Trier par pourcentage
                              const pctA = a.quota_max > 0 ? (a.nb_surveillances_affectees / a.quota_max) * 100 : 0;
                              const pctB = b.quota_max > 0 ? (b.nb_surveillances_affectees / b.quota_max) * 100 : 0;
                              compareValue = pctB - pctA;
                            } else if (sortBy === 'jours') {
                              // Trier par nombre de jours
                              compareValue = (b.nb_jours || 0) - (a.nb_jours || 0);
                            } else if (sortBy === 'grade') {
                              // Trier par grade (alphabétique)
                              compareValue = (a.grade_code || '').localeCompare(b.grade_code || '');
                            } else if (sortBy === 'nom') {
                              // Trier par nom
                              compareValue = (a.nom || '').localeCompare(b.nom || '');
                            }
                            
                            // Appliquer l'ordre (croissant ou décroissant)
                            return sortOrder === 'asc' ? compareValue : -compareValue;
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
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 text-sm">
                                          {ens.nom.charAt(0).toUpperCase() + ens.nom.slice(1).toLowerCase()} {ens.prenom}
                                        </p>
                                        {ens.is_Exception && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm">
                                            EXCEPTION
                                          </span>
                                        )}
                                      </div>
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
                                <td className="px-6 py-4 text-center">
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                                    <span className="text-lg font-bold text-blue-700">
                                      {ens.nb_jours}
                                    </span>
                                    <span className="text-xs text-blue-600 font-semibold">
                                      {ens.nb_jours <= 1 ? 'jour' : 'jours'}
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
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-xl font-bold text-gray-900">
                                {emploiEnseignant.enseignant.nom.charAt(0).toUpperCase() + emploiEnseignant.enseignant.nom.slice(1).toLowerCase()} {emploiEnseignant.enseignant.prenom}
                              </h2>
                              {emploiEnseignant.enseignant.is_Exception && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md">
                                  EXCEPTION
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="px-2 py-1 bg-green-100 rounded-md font-semibold text-xs text-green-700 border border-green-200">
                                {emploiEnseignant.enseignant.grade_code}
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
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">
                                    Ajouter une séance de surveillance
                                  </h3>
                                  <p className="text-xs text-gray-600 font-medium mt-0.5">
                                    {seancesDisponibles.length} séance{seancesDisponibles.length > 1 ? 's' : ''} disponible{seancesDisponibles.length > 1 ? 's' : ''}
                                  </p>
                                </div>
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
                              {/* Sélecteur de séance avec détails */}
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                  <Calendar className="w-4 h-4 inline mr-2" />
                                  Sélectionner une séance
                                </label>
                                
                                {seancesDisponibles.length === 0 ? (
                                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 font-medium">Aucune séance disponible</p>
                                    <p className="text-xs text-gray-500 mt-1">Toutes les séances ont déjà été attribuées</p>
                                  </div>
                                ) : (
                                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[500px] overflow-y-auto">
                                    <table className="w-full">
                                      <thead className="bg-gradient-to-r from-green-50 to-emerald-50 sticky top-0 z-10">
                                        <tr className="border-b-2 border-green-200">
                                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                                            <span className="sr-only">Sélection</span>
                                          </th>
                                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Date
                                          </th>
                                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Horaire
                                          </th>
                                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Session
                                          </th>
                                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Semestre
                                          </th>
                                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Salles
                                          </th>
                                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Surveillants
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {seancesDisponibles
                                          .sort((a, b) => {
                                            if (a.date !== b.date) return a.date.localeCompare(b.date);
                                            return a.h_debut.localeCompare(b.h_debut);
                                          })
                                          .map((seance) => {
                                            const key = `${seance.date}|${seance.h_debut}|${seance.h_fin}`;
                                            const dateFormatee = new Date(seance.date).toLocaleDateString('fr-FR', {
                                              weekday: 'short',
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric'
                                            });
                                            const nbExamens = seance.nb_examens || seance.examens?.length || 0;
                                            const isSelected = selectedSeanceKey === key;
                                            
                                            return (
                                              <tr
                                                key={key}
                                                onClick={() => setSelectedSeanceKey(key)}
                                                className={`cursor-pointer transition-all duration-200 ${
                                                  isSelected
                                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                              >
                                                {/* Colonne sélection */}
                                                <td className="px-4 py-3">
                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                      ? 'bg-green-500 border-green-500' 
                                                      : 'border-gray-300 bg-white'
                                                  }`}>
                                                    {isSelected && (
                                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                      </svg>
                                                    )}
                                                  </div>
                                                </td>
                                                
                                                {/* Date */}
                                                <td className="px-4 py-3">
                                                  <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                    <span className="font-bold text-gray-900 text-sm capitalize">{dateFormatee}</span>
                                                  </div>
                                                </td>
                                                
                                                {/* Horaire */}
                                                <td className="px-4 py-3">
                                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTime(seance.h_debut)} - {formatTime(seance.h_fin)}
                                                  </span>
                                                </td>
                                                
                                                {/* Session */}
                                                <td className="px-4 py-3 text-center">
                                                  <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-lg text-xs font-bold border border-cyan-200">
                                                    {seance.session === 'Pa' ? '📋 Partiel' : seance.session === 'P' ? '📝 Principale' : seance.session === 'C' ? '🎯 Contrôle' : '🔄 Rattrapage'}
                                                  </span>
                                                </td>
                                                
                                                {/* Semestre */}
                                                <td className="px-4 py-3 text-center">
                                                  <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold border border-green-200">
                                                    {seance.semestre}
                                                  </span>
                                                </td>
                                                
                                                {/* Salles */}
                                                <td className="px-4 py-3 text-center">
                                                  <div className="flex items-center justify-center gap-1.5">
                                                    <MapPin className="w-4 h-4 text-purple-600" />
                                                    <span className="font-bold text-purple-700 text-sm">{nbExamens}</span>
                                                  </div>
                                                </td>
                                                
                                                {/* Surveillants */}
                                                <td className="px-4 py-3 text-center">
                                                  <div className="flex items-center justify-center gap-1.5">
                                                    <Users className="w-4 h-4 text-orange-600" />
                                                    <span className="font-bold text-orange-700 text-sm">{seance.nb_enseignants}</span>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        }
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Info et avertissement */}
                              {selectedSeanceKey && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-white font-bold text-lg">💡</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-blue-900 font-semibold mb-1">Séance sélectionnée</p>
                                      <p className="text-xs text-blue-800">
                                        L'enseignant sera ajouté à cette séance de surveillance.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {emploiEnseignant.enseignant.nb_surveillances_affectees >= emploiEnseignant.enseignant.quota_max && (
                                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-white font-bold text-lg">⚠️</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-amber-900 font-bold mb-1">Quota atteint</p>
                                      <p className="text-xs text-amber-800">
                                        Cet enseignant a déjà atteint son quota ({emploiEnseignant.enseignant.nb_surveillances_affectees}/{emploiEnseignant.enseignant.quota_max} = {emploiEnseignant.enseignant.pourcentage_quota}%).
                                        L'ajout d'une nouvelle séance dépassera le quota recommandé.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Boutons */}
                              <div className="flex gap-3 pt-2">
                                <button
                                  type="submit"
                                  disabled={ajouterSeanceMutation.isPending || !selectedSeanceKey}
                                  className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-bold text-sm"
                                >
                                  {ajouterSeanceMutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Ajout en cours...
                                    </span>
                                  ) : !selectedSeanceKey ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      Sélectionnez d'abord une séance
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      Confirmer l'ajout
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddSeanceForm(false);
                                    setSelectedSeanceKey('');
                                  }}
                                  className="px-5 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border-2 border-gray-300 font-bold text-sm"
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
                                  className={`group relative bg-white border-2 rounded-xl p-5 hover:shadow-xl transition-all duration-200 ${
                                    emploi.est_responsable 
                                      ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' 
                                      : 'border-gray-200 hover:border-green-400'
                                  }`}
                                >
                                  {/* Badge responsable */}
                                  {emploi.est_responsable && (
                                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-lg">
                                      ⭐ RESPONSABLE
                                    </div>
                                  )}

                                  <div className="space-y-4">
                                    {/* En-tête avec toutes les infos sur une ligne */}
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                      {/* Numéro et Date */}
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-300 shadow-sm">
                                          <span className="text-xl font-black text-gray-700">#{index + 1}</span>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 font-semibold">Surveillance</p>
                                          <p className="text-sm font-bold text-gray-900">{formatDate(emploi.date)}</p>
                                        </div>
                                      </div>

                                      {/* Horaire, Salles, Session et Semestre */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Horaire */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                          <Clock className="w-4 h-4 text-blue-600" />
                                          <span className="text-sm font-bold text-blue-900">{formatTime(emploi.h_debut)} - {formatTime(emploi.h_fin)}</span>
                                        </div>

                                        {/* Session */}
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 rounded-lg font-bold text-xs border-2 border-cyan-200 shadow-sm">
                                          <span className="w-2 h-2 bg-cyan-600 rounded-full"></span>
                                          {emploi.session === 'Pa' ? 'Session Partiel' : emploi.session === 'P' ? 'Session Principale' : emploi.session === 'C' ? 'Session Contrôle' : 'Session Rattrapage'}
                                        </span>

                                        {/* Semestre */}
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-lg font-bold text-xs border-2 border-green-200 shadow-sm">
                                          <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                          {emploi.semestre.replace('SEMESTRE ', 'Semestre ')}
                                        </span>

                                        {/* Bouton Salles - en dernier avec indication cliquable */}
                                        {emploi.salles && (
                                          <button
                                            onClick={() => setExpandedSalles(prev => ({ ...prev, [index]: !prev[index] }))}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-indigo-200 transition-all border border-purple-300 shadow-sm hover:shadow-md cursor-pointer"
                                            title={expandedSalles[index] ? "Masquer les salles" : "Afficher les salles"}
                                          >
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-xs font-semibold">
                                              {expandedSalles[index] ? 'Masquer' : 'Voir Salles'}
                                            </span>
                                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSalles[index] ? 'rotate-90' : ''}`} />
                                          </button>
                                        )}
                                      </div>
                                      
                                      {/* Bouton supprimer */}
                                      <button
                                        onClick={() => handleSupprimerSeance(emploi)}
                                        disabled={supprimerSeanceMutation.isPending}
                                        className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400 transition-all border-2 border-red-200 hover:border-red-300"
                                        title="Retirer de cette séance"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-xs font-semibold">Retirer</span>
                                      </button>
                                    </div>

                                    {/* Affichage des salles (conditionnel) */}
                                    {expandedSalles[index] && emploi.salles && (
                                      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                        <MapPin className="w-5 h-5 text-purple-600" />
                                        <div>
                                          <p className="text-xs text-purple-600 font-semibold">Salle(s)</p>
                                          <p className="text-sm font-bold text-purple-900">{emploi.salles}</p>
                                        </div>
                                      </div>
                                    )}
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

      {/* Modal de confirmation d'ajout avec validation des contraintes */}
      {showConfirmationModal && validationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Confirmation requise</h2>
                    <p className="text-sm opacity-90">Vérification des contraintes avant l'ajout</p>
                  </div>
                </div>
                <button
                  onClick={annulerAjout}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {/* Informations enseignant */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                <h3 className="text-sm font-bold text-blue-900 mb-2">Enseignant</h3>
                <p className="text-lg font-bold text-blue-700">
                  {validationData.validation.enseignant.nom} {validationData.validation.enseignant.prenom}
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  Grade: {validationData.validation.enseignant.grade_code}
                </p>
              </div>

              {/* Information si l'enseignant est responsable d'un examen dans cette séance */}
              {validationData.validation.responsable_examen?.est_responsable && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-300">
                  <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-600" />
                    Responsable d'examen dans cette séance
                  </h3>
                  <p className="text-sm text-amber-800 font-semibold">
                    Cet enseignant est <span className="font-bold uppercase">RESPONSABLE</span> d'un examen pendant cette séance.
                  </p>
                </div>
              )}

              {/* Erreurs bloquantes */}
              {validationData.validation.errors.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Erreurs bloquantes
                  </h3>
                  <ul className="space-y-2">
                    {validationData.validation.errors.map((error, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span className="font-semibold">{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Avertissements */}
              {validationData.validation.warnings.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Avertissements - Confirmation nécessaire
                  </h3>
                  <ul className="space-y-2">
                    {validationData.validation.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                        <span className="text-orange-600 font-bold mt-0.5">•</span>
                        <span className="font-semibold">{warning}</span>
                      </li>
                    ))}
                  </ul>
                  {validationData.validation.souhait.existe && validationData.validation.souhait.motif && (
                    <div className="mt-3 p-3 bg-orange-100 rounded-lg border border-orange-200">
                      <p className="text-xs font-semibold text-orange-900">
                        <span className="font-bold">💬 Motif du souhait:</span> {validationData.validation.souhait.motif}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Détails quota */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <h3 className="text-xs font-bold text-green-900 mb-2 uppercase">Quota de surveillances</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-green-700">
                      <span className="font-semibold">Actuel:</span> {validationData.validation.quota.actuel}/{validationData.validation.quota.max}
                    </p>
                    <p className="text-sm text-green-700">
                      <span className="font-semibold">Après ajout:</span> {validationData.validation.quota.apres_ajout}/{validationData.validation.quota.max}
                    </p>
                    <p className={`text-lg font-bold ${
                      validationData.validation.quota.depasse ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {validationData.validation.quota.pourcentage_apres_ajout}%
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                  <h3 className="text-xs font-bold text-purple-900 mb-2 uppercase">Séances ce jour</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">Actuel:</span> {validationData.validation.seances_jour.actuel}/{validationData.validation.seances_jour.max}
                    </p>
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">Après ajout:</span> {validationData.validation.seances_jour.apres_ajout}/{validationData.validation.seances_jour.max}
                    </p>
                    <p className={`text-lg font-bold ${
                      validationData.validation.seances_jour.depasse ? 'text-red-600' : 'text-purple-600'
                    }`}>
                      {validationData.validation.seances_jour.depasse ? 'MAX DÉPASSÉ' : 'OK'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t-2 border-gray-200">
              <button
                onClick={annulerAjout}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border-2 border-gray-300 font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={confirmerAjout}
                disabled={ajouterSeanceMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {ajouterSeanceMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Ajout en cours...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Confirmer l'ajout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation d'échange avec validation des contraintes */}
      {showExchangeConfirmationModal && exchangeValidationData && selectedForExchange && pendingExchangeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Confirmation d'échange</h2>
                    <p className="text-sm opacity-90">Vérification des contraintes pour les deux enseignants</p>
                  </div>
                </div>
                <button
                  onClick={annulerEchange}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {/* Résumé de l'échange */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
                <h3 className="text-sm font-bold text-indigo-900 mb-3">Échange proposé</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <p className="text-lg font-bold text-indigo-700">
                      {exchangeValidationData.enseignant1.enseignant.nom} {exchangeValidationData.enseignant1.enseignant.prenom}
                    </p>
                    <p className="text-sm text-indigo-600">
                      {formatDate(pendingExchangeData.date1)} {pendingExchangeData.h_debut1}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowLeftRight className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-indigo-700">
                      {exchangeValidationData.enseignant2.enseignant.nom} {exchangeValidationData.enseignant2.enseignant.prenom}
                    </p>
                    <p className="text-sm text-indigo-600">
                      {formatDate(pendingExchangeData.date2)} {pendingExchangeData.h_debut2}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages positifs globaux */}
              {(exchangeValidationData.enseignant1.infos?.length > 0 || exchangeValidationData.enseignant2.infos?.length > 0) && (
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Améliorations détectées
                  </h3>
                  <ul className="space-y-2">
                    {exchangeValidationData.enseignant1.infos?.map((info, index) => (
                      <li key={`ens1-${index}`} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="font-semibold">{info}</span>
                      </li>
                    ))}
                    {exchangeValidationData.enseignant2.infos?.map((info, index) => (
                      <li key={`ens2-${index}`} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="font-semibold">{info}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Avertissements globaux */}
              {exchangeValidationData.warnings.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Avertissements - Confirmation nécessaire
                  </h3>
                  <ul className="space-y-2">
                    {exchangeValidationData.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                        <span className="text-orange-600 font-bold mt-0.5">•</span>
                        <span className="font-semibold">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alerte ROUGE : Responsables qui vont quitter leur séance (MAUVAIS) */}
              {(exchangeValidationData.enseignant1.responsable_seance_actuelle.est_responsable || 
                exchangeValidationData.enseignant2.responsable_seance_actuelle.est_responsable) && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                     ALERTE : Responsables vont quitter leur séance
                  </h3>
                  <p className="text-xs text-red-800 mb-3 font-semibold">
                    Les enseignants suivants sont responsables d'examens dans les séances qu'ils vont quitter. Ceci peut poser problème !
                  </p>
                  <ul className="space-y-2">
                    {exchangeValidationData.enseignant1.responsable_seance_actuelle.est_responsable && (
                      <li className="flex items-start gap-2 text-sm text-red-800 bg-red-100 p-3 rounded-lg">
                        <span className="text-red-600 font-bold mt-0.5">❌</span>
                        <span className="font-semibold">
                          <span className="font-bold uppercase">{exchangeValidationData.enseignant1.enseignant.nom} {exchangeValidationData.enseignant1.enseignant.prenom}</span> est RESPONSABLE 
                          de <span className="font-bold">{exchangeValidationData.enseignant1.responsable_seance_actuelle.nb_examens} examen(s)</span> dans la séance qu'il/elle va quitter
                          <br />
                          <span className="text-xs"> Séance : {formatDate(pendingExchangeData.date1)} à {pendingExchangeData.h_debut1}</span>
                        </span>
                      </li>
                    )}
                    {exchangeValidationData.enseignant2.responsable_seance_actuelle.est_responsable && (
                      <li className="flex items-start gap-2 text-sm text-red-800 bg-red-100 p-3 rounded-lg">
                        <span className="text-red-600 font-bold mt-0.5">❌</span>
                        <span className="font-semibold">
                          <span className="font-bold uppercase">{exchangeValidationData.enseignant2.enseignant.nom} {exchangeValidationData.enseignant2.enseignant.prenom}</span> est RESPONSABLE 
                          de <span className="font-bold">{exchangeValidationData.enseignant2.responsable_seance_actuelle.nb_examens} examen(s)</span> dans la séance qu'il/elle va quitter
                          <br />
                          <span className="text-xs"> Séance : {formatDate(pendingExchangeData.date2)} à {pendingExchangeData.h_debut2}</span>
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Alerte VERTE : Responsables qui vont arriver dans leur séance (BON) */}
              {(exchangeValidationData.enseignant1.responsable_nouvelle_seance.est_responsable || 
                exchangeValidationData.enseignant2.responsable_nouvelle_seance.est_responsable) && (
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                     INFO : Responsables vont rejoindre leur séance
                  </h3>
                  <p className="text-xs text-green-800 mb-3 font-semibold">
                    Les enseignants suivants sont responsables d'examens dans les séances où ils vont être ajoutés. C'est une bonne chose !
                  </p>
                  <ul className="space-y-2">
                    {exchangeValidationData.enseignant1.responsable_nouvelle_seance.est_responsable && (
                      <li className="flex items-start gap-2 text-sm text-green-800 bg-green-100 p-3 rounded-lg">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="font-semibold">
                          <span className="font-bold uppercase">{exchangeValidationData.enseignant1.enseignant.nom} {exchangeValidationData.enseignant1.enseignant.prenom}</span> est RESPONSABLE 
                          de <span className="font-bold">{exchangeValidationData.enseignant1.responsable_nouvelle_seance.nb_examens} examen(s)</span> dans la séance où il/elle va être ajouté(e)
                          <br />
                          <span className="text-xs"> Séance : {formatDate(pendingExchangeData.date2)} à {pendingExchangeData.h_debut2}</span>
                        </span>
                      </li>
                    )}
                    {exchangeValidationData.enseignant2.responsable_nouvelle_seance.est_responsable && (
                      <li className="flex items-start gap-2 text-sm text-green-800 bg-green-100 p-3 rounded-lg">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="font-semibold">
                          <span className="font-bold uppercase">{exchangeValidationData.enseignant2.enseignant.nom} {exchangeValidationData.enseignant2.enseignant.prenom}</span> est RESPONSABLE 
                          de <span className="font-bold">{exchangeValidationData.enseignant2.responsable_nouvelle_seance.nb_examens} examen(s)</span> dans la séance où il/elle va être ajouté(e)
                          <br />
                          <span className="text-xs"> Séance : {formatDate(pendingExchangeData.date1)} à {pendingExchangeData.h_debut1}</span>
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Détails par enseignant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Enseignant 1 */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">
                      {exchangeValidationData.enseignant1.enseignant.nom} {exchangeValidationData.enseignant1.enseignant.prenom}
                    </h3>
                    <p className="text-xs text-blue-600 font-medium">
                      Vers: {formatDate(pendingExchangeData.date2)} {pendingExchangeData.h_debut2}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                    <h4 className="text-xs font-bold text-green-900 mb-2 uppercase">Quota</h4>
                    <p className="text-sm text-green-700">
                      {exchangeValidationData.enseignant1.quota.actuel}/{exchangeValidationData.enseignant1.quota.max} ({exchangeValidationData.enseignant1.quota.pourcentage}%)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200">
                    <h4 className="text-xs font-bold text-purple-900 mb-2 uppercase">Séances ce jour</h4>
                    <p className="text-sm text-purple-700">
                      {exchangeValidationData.enseignant1.seances_jour.actuel}/{exchangeValidationData.enseignant1.seances_jour.max}
                    </p>
                  </div>

                  {exchangeValidationData.enseignant1.souhait.existe && exchangeValidationData.enseignant1.souhait.motif && (
                    <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                      <p className="text-xs font-semibold text-orange-900">
                        <span className="font-bold">💬 Motif:</span> {exchangeValidationData.enseignant1.souhait.motif}
                      </p>
                    </div>
                  )}
                </div>

                {/* Enseignant 2 */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">
                      {exchangeValidationData.enseignant2.enseignant.nom} {exchangeValidationData.enseignant2.enseignant.prenom}
                    </h3>
                    <p className="text-xs text-blue-600 font-medium">
                      Vers: {formatDate(pendingExchangeData.date1)} {pendingExchangeData.h_debut1}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                    <h4 className="text-xs font-bold text-green-900 mb-2 uppercase">Quota</h4>
                    <p className="text-sm text-green-700">
                      {exchangeValidationData.enseignant2.quota.actuel}/{exchangeValidationData.enseignant2.quota.max} ({exchangeValidationData.enseignant2.quota.pourcentage}%)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200">
                    <h4 className="text-xs font-bold text-purple-900 mb-2 uppercase">Séances ce jour</h4>
                    <p className="text-sm text-purple-700">
                      {exchangeValidationData.enseignant2.seances_jour.actuel}/{exchangeValidationData.enseignant2.seances_jour.max}
                    </p>
                  </div>

                  {exchangeValidationData.enseignant2.souhait.existe && exchangeValidationData.enseignant2.souhait.motif && (
                    <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                      <p className="text-xs font-semibold text-orange-900">
                        <span className="font-bold">💬 Motif:</span> {exchangeValidationData.enseignant2.souhait.motif}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t-2 border-gray-200">
              <button
                onClick={annulerEchange}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border-2 border-gray-300 font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={confirmerEchange}
                disabled={exchangeEnseignantsMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exchangeEnseignantsMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Échange en cours...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4" />
                    Confirmer l'échange
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showSuppressionModal && pendingSuppressionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* En-tête */}
            <div className={`${
              pendingSuppressionData.emploi.est_responsable 
                ? 'bg-gradient-to-r from-red-600 to-rose-600' 
                : 'bg-gradient-to-r from-orange-500 to-amber-500'
            } px-6 py-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">
                      {pendingSuppressionData.emploi.est_responsable 
                        ? 'Suppression d\'un RESPONSABLE' 
                        : 'Confirmation de suppression'}
                    </h2>
                    <p className="text-sm opacity-90">
                      {pendingSuppressionData.emploi.est_responsable 
                        ? 'Cette action nécessite une attention particulière' 
                        : 'Veuillez confirmer cette opération'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={annulerSuppression}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {/* Informations enseignant */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                <h3 className="text-sm font-bold text-blue-900 mb-2">Enseignant à retirer</h3>
                <p className="text-lg font-bold text-blue-700">
                  {pendingSuppressionData.enseignant.nom} {pendingSuppressionData.enseignant.prenom}
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  Grade: {pendingSuppressionData.enseignant.grade_code}
                </p>
              </div>

              {/* Informations de la séance */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                <h3 className="text-sm font-bold text-purple-900 mb-3">Détails de la séance</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-700">
                      <span className="font-semibold">Date:</span> {formatDate(pendingSuppressionData.emploi.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-700">
                      <span className="font-semibold">Horaire:</span> {pendingSuppressionData.emploi.h_debut} - {pendingSuppressionData.emploi.h_fin}
                    </span>
                  </div>
                  <div className="text-sm text-purple-700">
                    <span className="font-semibold">Session:</span> {formatSession(pendingSuppressionData.emploi.session)}
                  </div>
                  <div className="text-sm text-purple-700">
                    <span className="font-semibold">Semestre:</span> {pendingSuppressionData.emploi.semestre}
                  </div>
                </div>
              </div>

              {/* Avertissement spécial si responsable */}
              {pendingSuppressionData.emploi.est_responsable && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    ATTENTION : Suppression d'un responsable
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-red-800 font-semibold">
                      Cet enseignant est <span className="font-bold uppercase">RESPONSABLE</span> d'un examen.
                    </p>
                  </div>
                </div>
              )}

              {/* Avertissements sur les heures creuses */}
              {pendingSuppressionData.validation?.warnings?.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Avertissements
                  </h3>
                  <ul className="space-y-2">
                    {pendingSuppressionData.validation.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                        <span className="text-orange-600 font-bold mt-0.5">•</span>
                        <span className="font-semibold">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Informations positives sur les heures creuses */}
              {pendingSuppressionData.validation?.infos?.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Informations
                  </h3>
                  <ul className="space-y-2">
                    {pendingSuppressionData.validation.infos.map((info, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span className="font-semibold">{info}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Information générale */}
              {!pendingSuppressionData.emploi.est_responsable && 
               !pendingSuppressionData.validation?.warnings?.length &&
               !pendingSuppressionData.validation?.infos?.length && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <p className="text-sm text-orange-800">
                    <span className="font-bold">ℹ️ Information:</span> Cette action retirera l'enseignant de la séance de surveillance.
                  </p>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t-2 border-gray-200">
              <button
                onClick={annulerSuppression}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border-2 border-gray-300 font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                disabled={supprimerSeanceMutation.isPending}
                className={`px-6 py-3 ${
                  pendingSuppressionData.emploi.est_responsable
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                } text-white rounded-lg transition-all font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {supprimerSeanceMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Suppression en cours...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    {pendingSuppressionData.emploi.est_responsable 
                      ? 'Confirmer la suppression du responsable' 
                      : 'Confirmer la suppression'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'archivage */}
      <ArchiveSessionModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onSuccess={() => {
          toast.success('Session archivée avec succès!');
          // Optionnel: rediriger vers la page des archives
          // navigate('/archives');
        }}
      />
    </div>
  );
}