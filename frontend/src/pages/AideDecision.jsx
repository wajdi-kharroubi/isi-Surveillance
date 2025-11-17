import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calculator, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Save, 
  RefreshCw,
  Users,
  Calendar,
  Building2,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Settings,
  Download,
  Upload,
  Trash2,
  X
} from 'lucide-react';
import { decisionAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function AideDecision() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingQuotas, setPendingQuotas] = useState(null);

  // Paramètres configurables
  const [parametres, setParametres] = useState({
    min_surveillants_par_salle: 2,
    majoration_absences: 1.20,
    quota_min_groupe1: 4,         // Quota minimal pour PR/MC/V
    difference_min_pr_ma: 2,      // Différence PR/MC/V → MA
    difference_min_ma_as: 1,      // Différence MA → AS
    difference_min_as_ac: 1,      // Différence AS → AC/PES/PTC
    expert_quota: 3,
  });

  // Pourcentage de majoration (pour l'affichage)
  const [pourcentageMajoration, setPourcentageMajoration] = useState(20); // 20% par défaut

  // Modal des exceptions
  const [showExceptionsModal, setShowExceptionsModal] = useState(false);

  // Quotas modifiés manuellement
  const [quotasModifies, setQuotasModifies] = useState({});

  // Calcul des recommandations
  const { data: recommandations, isLoading, refetch } = useQuery({
    queryKey: ['recommandations-decision', parametres],
    queryFn: () => decisionAPI.calculerRecommandations(parametres).then(res => res.data),
    enabled: false, // Ne pas exécuter automatiquement
  });

  // Charger les enseignants avec exceptions
  const { data: enseignantsExceptions, refetch: refetchExceptions } = useQuery({
    queryKey: ['enseignants-exceptions'],
    queryFn: () => decisionAPI.getEnseignantsExceptions().then(res => res.data),
  });

  // Mutation pour appliquer les quotas
  const appliquerQuotasMutation = useMutation({
    mutationFn: decisionAPI.appliquerQuotas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades-config'] });
      queryClient.invalidateQueries({ queryKey: ['quotas-actuels'] });
      alert('✅ Quotas appliqués avec succès !');
    },
    onError: (error) => {
      alert(`❌ Erreur: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Mutation pour exporter les voeux autorisés
  const exporterVoeuxMutation = useMutation({
    mutationFn: decisionAPI.exporterVoeuxAutorises,
    onSuccess: (response) => {
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'creneaux_non_souhaits_autorises.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      alert(`❌ Erreur lors de l'exportation: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Mutation pour importer les exceptions
  const importerExceptionsMutation = useMutation({
    mutationFn: decisionAPI.importerExceptions,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
      queryClient.invalidateQueries({ queryKey: ['enseignants-exceptions'] });
      alert(`✅ ${response.data.message}`);
      if (response.data.erreurs && response.data.erreurs.length > 0) {
        alert('⚠️ Erreurs:\n' + response.data.erreurs.join('\n'));
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      alert(`❌ Erreur: ${error.response?.data?.detail || error.message}`);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  // Mutation pour supprimer les exceptions
  const supprimerExceptionsMutation = useMutation({
    mutationFn: decisionAPI.supprimerExceptions,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
      queryClient.invalidateQueries({ queryKey: ['enseignants-exceptions'] });
      alert(`✅ ${response.data.message}`);
    },
    onError: (error) => {
      alert(`❌ Erreur: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Fonction pour calculer les recommandations
  const handleCalculer = () => {
    refetch();
  };

  // Fonction pour exporter les voeux autorisés
  const handleExporterVoeux = () => {
    if (!recommandations) {
      alert('⚠️ Veuillez d\'abord calculer les recommandations');
      return;
    }
    exporterVoeuxMutation.mutate(parametres);
  };

  // Fonction pour importer les exceptions
  const handleImporterExceptions = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le format
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('❌ Le fichier doit être au format Excel (.xlsx ou .xls)');
      return;
    }

    setPendingFile(file);
    setShowImportConfirm(true);
  };

  const confirmImportExceptions = () => {
    if (pendingFile) {
      importerExceptionsMutation.mutate(pendingFile);
    }
    setPendingFile(null);
    setShowImportConfirm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fonction pour supprimer toutes les exceptions
  const handleSupprimerExceptions = () => {
    if (!enseignantsExceptions || enseignantsExceptions.nb_exceptions === 0) {
      alert('ℹ️ Aucune exception à supprimer');
      return;
    }

    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteExceptions = () => {
    supprimerExceptionsMutation.mutate();
    setShowDeleteAllConfirm(false);
  };

  // Fonction pour modifier un quota
  const handleModifierQuota = (gradeCode, nouveauQuota) => {
    setQuotasModifies({
      ...quotasModifies,
      [gradeCode]: parseInt(nouveauQuota),
    });
  };

  // Calculer le total disponible avec les quotas ajustés
  const calculerTotalDisponible = () => {
    if (!recommandations?.quotas_recommandes) return 0;
    
    return Object.entries(recommandations.quotas_recommandes).reduce((total, [grade, info]) => {
      const quota = quotasModifies[grade] !== undefined ? quotasModifies[grade] : info.quota;
      return total + (quota * info.nb_enseignants);
    }, 0);
  };

  // Calculer la marge avec les quotas ajustés
  const calculerMarge = () => {
    if (!recommandations?.faisabilite) return 0;
    
    const totalDisponible = calculerTotalDisponible();
    const totalNecessaire = recommandations.statistiques_globales.total_surveillances_necessaires;
    return totalDisponible - totalNecessaire;
  };

  // Calculer les créneaux de non-souhaits autorisés avec les quotas ajustés
  const calculerVoeuxAutorises = (gradeCode, infoOriginal) => {
    if (!recommandations?.quotas_recommandes) return infoOriginal;
    
    const quotaActuel = quotasModifies[gradeCode] !== undefined 
      ? quotasModifies[gradeCode] 
      : infoOriginal.quota_actuel || recommandations.quotas_recommandes[gradeCode]?.quota || 0;
    
    const nbTotalSeances = infoOriginal.nb_total_seances;
    
    // Recalculer le nombre de voeux autorisés avec une formule plus stricte
    // Formule stricte : max(0, floor((nb_total_seances - quota_actuel) * 0.6))
    // On autorise seulement 60% de la différence pour être plus restrictif
    const difference = nbTotalSeances - quotaActuel;
    const nbVoeuxMaxRecommande = Math.max(0, Math.floor(difference * 0.6));
    
    // Recalculer le pourcentage
    const pourcentageVoeuxAutorises = nbTotalSeances > 0 
      ? ((nbVoeuxMaxRecommande / nbTotalSeances) * 100).toFixed(1)
      : 0;
    
    return {
      ...infoOriginal,
      nb_voeux_max_recommande: nbVoeuxMaxRecommande,
      pourcentage_voeux_autorises: pourcentageVoeuxAutorises,
      quota_actuel: quotaActuel
    };
  };

  // Fonction pour appliquer les quotas
  const handleAppliquerQuotas = () => {
    const quotasAAppliquer = recommandations?.quotas_recommandes
      ? Object.keys(recommandations.quotas_recommandes).reduce((acc, grade) => {
          acc[grade] = quotasModifies[grade] !== undefined 
            ? quotasModifies[grade] 
            : recommandations.quotas_recommandes[grade].quota;
          return acc;
        }, {})
      : {};

    if (Object.keys(quotasAAppliquer).length === 0) {
      alert('❌ Aucun quota à appliquer. Calculez d\'abord les recommandations.');
      return;
    }

    setPendingQuotas(quotasAAppliquer);
    setShowApplyConfirm(true);
  };

  const confirmApplyQuotas = () => {
    if (pendingQuotas) {
      appliquerQuotasMutation.mutate(pendingQuotas);
    }
    setPendingQuotas(null);
    setShowApplyConfirm(false);
  };

  // Fonction pour obtenir la couleur selon le niveau de risque
  const getRisqueColor = (niveau) => {
    switch (niveau) {
      case 'Faible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Moyen':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Élevé':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // CRITIQUE en jaune
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Fonction pour obtenir l'icône selon le type d'alerte
  const getAlerteIcon = (type) => {
    switch (type) {
      case 'CRITIQUE':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'ATTENTION':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'INFO':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'SUCCES':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <Calculator className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Aide à la Décision</h1>
              <p className="text-purple-100 text-lg mt-1">
                Calculez les quotas optimaux et analysez la faisabilité du planning avant la génération
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Paramètres de Configuration */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Paramètres de Configuration</h2>
        </div>

        {/* Paramètres de Calcul */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Min surveillants par salle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre minimum de surveillants par salle
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={parametres.min_surveillants_par_salle}
              onChange={(e) => setParametres({ ...parametres, min_surveillants_par_salle: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Majoration absences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Majoration pour absences (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={pourcentageMajoration}
                onChange={(e) => {
                  const pct = parseInt(e.target.value) || 0;
                  setPourcentageMajoration(pct);
                  setParametres({ ...parametres, majoration_absences: 1 + (pct / 100) });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <span className="absolute right-3 top-2.5 text-gray-500 font-medium">%</span>
            </div>
          </div>

          {/* Quota min groupe 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quota minimum Groupe 1 (PR/MC/V)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={parametres.quota_min_groupe1}
              onChange={(e) => setParametres({ ...parametres, quota_min_groupe1: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {/* Différence PR → MA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Différence minimale PR → MA
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={parametres.difference_min_pr_ma}
              onChange={(e) => setParametres({ ...parametres, difference_min_pr_ma: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Différence MA → AS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Différence minimale MA → AS
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={parametres.difference_min_ma_as}
              onChange={(e) => setParametres({ ...parametres, difference_min_ma_as: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Différence AS → AC/PES/PTC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Différence minimale AS → AC/PES/PTC
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={parametres.difference_min_as_ac}
              onChange={(e) => setParametres({ ...parametres, difference_min_as_ac: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>


        </div>

        {/* Section Import des Exceptions - Version Compacte
        <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Gestion des Exceptions (Optionnel)</h3>
                <p className="text-xs text-gray-600">Importez les ajustements de quotas</p>
              </div>
            </div>
            {enseignantsExceptions && enseignantsExceptions.nb_exceptions > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExceptionsModal(true)}
                  className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-200 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {enseignantsExceptions.nb_exceptions} exception{enseignantsExceptions.nb_exceptions > 1 ? 's' : ''}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSupprimerExceptions();
                  }}
                  disabled={supprimerExceptionsMutation.isPending}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {supprimerExceptionsMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Vider
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div
            className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer bg-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImporterExceptions}
              className="hidden"
              disabled={importerExceptionsMutation.isPending}
            />
            
            {importerExceptionsMutation.isPending ? (
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-sm font-semibold text-orange-700">Import en cours...</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="w-10 h-10 text-gray-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700">
                      Glissez-déposez votre fichier Excel ou cliquez ici
                    </p>
                    <p className="text-xs text-gray-500">
                      Colonnes: Nom, Prénom, Code, Absences • Formats: .xlsx, .xls
                    </p>
                  </div>
                </div>
                <button className="btn bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 flex items-center shadow-lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir
                </button>
              </div>
            )}
          </div>

        </div>
        */}
        {/* Bouton Calculer */}
        <div className="mt-6">
          <button
            onClick={handleCalculer}
            disabled={isLoading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Calcul en cours...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                Calculer les Recommandations
              </>
            )}
          </button>
        </div>
      </div>

      {/* Résultats */}
      {recommandations && (
        <div className="space-y-6">
          {/* Statistiques Globales */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Statistiques Globales</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Users className="w-5 h-5" />
                  <span className="font-bold text-sm">Enseignants</span>
                </div>
                <p className="text-2xl font-black text-blue-900">{recommandations.statistiques_globales.nb_total_enseignants}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Calendar className="w-5 h-5" />
                  <span className="font-bold text-sm">Séances</span>
                </div>
                <p className="text-2xl font-black text-green-900">{recommandations.statistiques_globales.nb_total_seances}</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Building2 className="w-5 h-5" />
                  <span className="font-bold text-sm">Salles</span>
                </div>
                <p className="text-2xl font-black text-purple-900">{recommandations.statistiques_globales.nb_total_salles}</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-bold text-sm">Besoins (surveillances)</span>
                </div>
                <p className="text-2xl font-black text-orange-900">{recommandations.statistiques_globales.total_surveillances_necessaires}</p>
              </div>
            </div>
          </div>

          {/* Analyse de Faisabilité */}
          <div className={`rounded-xl shadow-md p-6 border-2 ${
            recommandations.faisabilite.statut === 'OPTIMAL' ? 'bg-green-50 border-green-200' :
            recommandations.faisabilite.statut === 'ACCEPTABLE' ? 'bg-yellow-50 border-yellow-200' :
            'bg-yellow-50 border-yellow-200'  // CRITIQUE en jaune
          }`}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎯 Analyse de Faisabilité
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Statut:</span>
                <span className={`px-4 py-2 rounded-lg font-bold text-lg ${getRisqueColor(recommandations.faisabilite.niveau_risque)}`}>
                  {recommandations.faisabilite.statut}
                </span>
              </div>

              <p className="text-lg font-medium">{recommandations.faisabilite.message}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Disponible</p>
                  <p className="text-2xl font-bold text-green-600">
                    {calculerTotalDisponible()} 
                    <span className="text-sm text-gray-400 font-normal ml-1">surveillances</span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Nécessaire</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {recommandations.statistiques_globales.total_surveillances_necessaires} 
                    <span className="text-sm text-gray-400 font-normal ml-1">surveillances</span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Marge</p>
                  <p className={`text-2xl font-bold ${calculerMarge() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculerMarge() >= 0 ? '+' : ''}{calculerMarge()} 
                    <span className="text-sm text-gray-400 font-normal ml-1">surveillances</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Majoration: {pourcentageMajoration}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quotas Recommandés */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📋 Quotas Recommandés par Grade</h2>
              <button
                onClick={handleAppliquerQuotas}
                disabled={appliquerQuotasMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Appliquer les Quotas
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Enseignants</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quota Recommandé</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Surveillances</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ajuster</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(recommandations.quotas_recommandes).map(([gradeCode, info]) => (
                    <tr key={gradeCode} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{gradeCode}</div>
                          <div className="text-sm text-gray-500">{info.grade_nom}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-900">{info.nb_enseignants}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          {quotasModifies[gradeCode] !== undefined ? quotasModifies[gradeCode] : info.quota}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-900">
                          {(quotasModifies[gradeCode] !== undefined ? quotasModifies[gradeCode] : info.quota) * info.nb_enseignants}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={quotasModifies[gradeCode] !== undefined ? quotasModifies[gradeCode] : info.quota}
                          onChange={(e) => handleModifierQuota(gradeCode, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Créneaux de Non-Souhaits Autorisés */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Créneaux de Non-Souhaits Autorisés</h2>
                  <p className="text-sm text-gray-500">Nombre maximum de créneaux de non-surveillance par grade</p>
                </div>
              </div>
              <button
                onClick={handleExporterVoeux}
                disabled={exporterVoeuxMutation.isPending || !recommandations}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporterVoeuxMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Exportation...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exporter Excel
                  </>
                )}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-purple-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Grade</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Autorisés</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pourcentage</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Recommandation</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(recommandations.voeux_autorises).map(([gradeCode, info], index) => {
                    const infoAjustee = calculerVoeuxAutorises(gradeCode, info);
                    
                    return (
                      <tr 
                        key={gradeCode} 
                        className={`border-b border-gray-100 hover:bg-purple-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-bold text-purple-900">{gradeCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-700">{infoAjustee.grade_nom}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-2xl font-black text-purple-600">
                            {infoAjustee.nb_voeux_max_recommande}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-lg font-semibold text-gray-500">
                            {infoAjustee.nb_total_seances}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-lg font-semibold text-purple-600">
                            {infoAjustee.pourcentage_voeux_autorises}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-600">{infoAjustee.message}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alertes et Recommandations */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ Alertes et Recommandations</h2>
            
            <div className="space-y-3">
              {recommandations.alertes.map((alerte, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    alerte.type === 'CRITIQUE' ? 'bg-red-50 border-red-500' :
                    alerte.type === 'ATTENTION' ? 'bg-yellow-50 border-yellow-500' :
                    alerte.type === 'SUCCES' ? 'bg-green-50 border-green-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getAlerteIcon(alerte.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{alerte.type}</span>
                        <span className="text-xs text-gray-500">• {alerte.categorie}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1 whitespace-pre-line">{alerte.message}</p>
                      <p className="text-xs text-gray-600 italic whitespace-pre-line">{alerte.recommandation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message si pas encore de recommandations */}
      {!recommandations && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Info className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <p className="text-lg font-medium text-blue-900 mb-2">
            Configurez les paramètres et cliquez sur "Calculer les Recommandations"
          </p>
          <p className="text-sm text-blue-700">
          Le système analysera votre situation et vous proposera les quotas optimaux
        </p>
      </div>
    )}

      {/* Modal Exceptions */}
      {showExceptionsModal && enseignantsExceptions && enseignantsExceptions.nb_exceptions > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Enseignants avec Exceptions</h2>
                  <p className="text-orange-100 text-sm">{enseignantsExceptions.nb_exceptions} exception{enseignantsExceptions.nb_exceptions > 1 ? 's' : ''} active{enseignantsExceptions.nb_exceptions > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExceptionsModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Enseignant</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Grade</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quota Grade</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quota Exception</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Différence</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {enseignantsExceptions.exceptions.map((exception) => (
                      <tr key={exception.id} className="border-b border-gray-200 hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{exception.prenom} {exception.nom}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-600">{exception.code_smartex}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-gray-700">{exception.grade_code}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-gray-500">{exception.quota_grade}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-orange-600">{exception.quota_exception}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                            exception.type_exception === 'augmentation' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : exception.type_exception === 'diminution'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {exception.difference > 0 ? '+' : ''}{exception.difference}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 flex justify-end border-t border-gray-200">
              <button
                onClick={() => setShowExceptionsModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation - Import des exceptions */}
      <ConfirmModal
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingFile(null);
        }}
        onConfirm={() => {
          confirmImportExceptions();
          setShowImportConfirm(false);
        }}
        title="Importer les exceptions"
        message="Voulez-vous vraiment importer ce fichier d'exceptions ? Cette action remplacera les exceptions existantes."
        confirmText="Importer"
        cancelText="Annuler"
        type="warning"
      />

      {/* Modal de confirmation - Suppression des exceptions */}
      <ConfirmModal
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={() => {
          confirmDeleteExceptions();
          setShowDeleteAllConfirm(false);
        }}
        title="Supprimer toutes les exceptions"
        message="Êtes-vous sûr de vouloir supprimer toutes les exceptions ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />

      {/* Modal de confirmation - Application des quotas */}
      <ConfirmModal
        isOpen={showApplyConfirm}
        onClose={() => {
          setShowApplyConfirm(false);
          setPendingQuotas(null);
        }}
        onConfirm={() => {
          confirmApplyQuotas();
          setShowApplyConfirm(false);
        }}
        title="Appliquer les quotas"
        message="Voulez-vous vraiment appliquer ces quotas ? Cela mettra à jour les quotas de tous les enseignants."
        confirmText="Appliquer"
        cancelText="Annuler"
        type="info"
      />
    </div>
  );
}