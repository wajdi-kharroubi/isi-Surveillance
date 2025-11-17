import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesAPI, enseignantsAPI, decisionAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
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
  Users,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function ConfigGrades() {
  const [activeTab, setActiveTab] = useState('grades'); // 'grades' ou 'exceptions'
  const [editingGrade, setEditingGrade] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingEnseignant, setEditingEnseignant] = useState(null);
  const [quotaExceptionValue, setQuotaExceptionValue] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterException, setFilterException] = useState('all'); // 'all', 'with', 'without'
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteOneConfirm, setShowDeleteOneConfirm] = useState(false);
  const [enseignantToDelete, setEnseignantToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: grades, isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesAPI.getAll().then(res => res.data),
    staleTime: 0, // Pas de cache - toujours refetch
    gcTime: 0, // Pas de conservation en mémoire
    refetchOnMount: true, // Toujours recharger au montage
  });

  const { data: enseignants, isLoading: isLoadingEnseignants } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes en cache
    refetchOnMount: 'always', // Force le rechargement dans cette page pour voir les exceptions à jour
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }) => gradesAPI.update(code, data),
    onSuccess: () => {
      toast.success('Configuration mise à jour');
      queryClient.invalidateQueries({ queryKey: ['grades'] });
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
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    },
  });

  const updateExceptionMutation = useMutation({
    mutationFn: ({ enseignantId, data }) => enseignantsAPI.updateException(enseignantId, data),
    onSuccess: () => {
      toast.success('Exception mise à jour');
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
      setEditingEnseignant(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    },
  });

  const resetExceptionMutation = useMutation({
    mutationFn: (enseignantId) => enseignantsAPI.resetException(enseignantId),
    onSuccess: () => {
      toast.success('Exception réinitialisée');
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    },
  });

  // Mutation pour importer les exceptions
  const importerExceptionsMutation = useMutation({
    mutationFn: decisionAPI.importerExceptions,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
      toast.success(`${response.data.message}`);
      if (response.data.erreurs && response.data.erreurs.length > 0) {
        toast.error('⚠️ Erreurs:\n' + response.data.erreurs.join('\n'), {
          duration: 6000,
        });
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(`❌ Erreur: ${error.response?.data?.detail || error.message}`);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  // Mutation pour supprimer toutes les exceptions
  const supprimerExceptionsMutation = useMutation({
    mutationFn: decisionAPI.supprimerExceptions,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
      toast.success(`${response.data.message}`);
    },
    onError: (error) => {
      toast.error(`❌ Erreur: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handleEdit = (grade) => {
    setEditingGrade(grade.grade_code);
    setEditValue(grade.nb_surveillances.toString());
  };

  const handleSave = (code) => {
    const nb = parseInt(editValue);
    if (isNaN(nb) || nb < 1 || nb > 20) {
      toast.error('Nombre invalide (doit être entre 1 et 20)');
      return;
    }
    updateMutation.mutate({ code, data: { nb_surveillances: nb } });
  };

  const handleCancel = () => {
    setEditingGrade(null);
    setEditValue('');
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    resetMutation.mutate();
  };

  const handleEditEnseignant = (enseignant) => {
    setEditingEnseignant(enseignant.id);
    setQuotaExceptionValue((enseignant.quota_Exception || 0).toString());
  };

  const handleSaveException = (enseignantId) => {
    const quota = parseInt(quotaExceptionValue);
    if (isNaN(quota) || quota < 0 || quota > 20) {
      toast.error('Quota invalide (doit être entre 0 et 20)');
      return;
    }
    
    updateExceptionMutation.mutate({ 
      enseignantId, 
      data: {
        is_Exception: true,
        quota_Exception: quota,
      }
    });
  };

  const handleCancelException = () => {
    setEditingEnseignant(null);
    setQuotaExceptionValue('');
  };

  // Fonction pour importer les exceptions
  const handleImporterExceptions = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le format
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('❌ Le fichier doit être au format Excel (.xlsx ou .xls)');
      return;
    }

    setPendingFile(file);
    setShowImportConfirm(true);
  };

  const confirmImport = () => {
    if (pendingFile) {
      importerExceptionsMutation.mutate(pendingFile);
    }
    setShowImportConfirm(false);
    setPendingFile(null);
  };

  const cancelImport = () => {
    setShowImportConfirm(false);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fonction pour supprimer toutes les exceptions
  const handleSupprimerExceptions = () => {
    const nbExceptionsActuelles = enseignants?.filter(e => e.is_Exception).length || 0;
    
    if (nbExceptionsActuelles === 0) {
      toast.info('ℹ️ Aucune exception à supprimer');
      return;
    }

    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    supprimerExceptionsMutation.mutate();
    setShowDeleteAllConfirm(false);
  };

  const cancelDeleteAll = () => {
    setShowDeleteAllConfirm(false);
  };

  const handleResetException = (enseignantId, nom, prenom) => {
    setEnseignantToDelete({ id: enseignantId, nom, prenom });
    setShowDeleteOneConfirm(true);
  };

  const confirmDeleteOne = () => {
    if (enseignantToDelete) {
      resetExceptionMutation.mutate(enseignantToDelete.id);
    }
    setShowDeleteOneConfirm(false);
    setEnseignantToDelete(null);
  };

  const cancelDeleteOne = () => {
    setShowDeleteOneConfirm(false);
    setEnseignantToDelete(null);
  };

  if (isLoading || isLoadingEnseignants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement des configurations...</p>
        </div>
      </div>
    );
  }

  // Filtrer les enseignants
  const enseignantsFiltres = enseignants?.filter(ens => {
    // Uniquement ceux qui participent aux surveillances
    if (!ens.participe_surveillance) return false;
    
    // Filtre par nom
    if (filterNom && !`${ens.nom} ${ens.prenom}`.toLowerCase().includes(filterNom.toLowerCase())) {
      return false;
    }
    
    // Filtre par grade
    if (filterGrade && ens.grade_code !== filterGrade) {
      return false;
    }
    
    // Filtre par statut d'exception
    if (filterException === 'with' && !ens.is_Exception) return false;
    if (filterException === 'without' && ens.is_Exception) return false;
    
    return true;
  });

  // Fonction pour obtenir le quota du grade
  const getGradeQuota = (gradeCode) => {
    const grade = grades?.find(g => g.grade_code === gradeCode);
    return grade?.nb_surveillances || 0;
  };

  // Compter les enseignants avec exception
  const nbExceptions = enseignants?.filter(e => e.participe_surveillance && e.is_Exception)?.length || 0;
  const nbEnseignantsActifs = enseignants?.filter(e => e.participe_surveillance)?.length || 0;

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
              <h1 className="text-4xl font-bold drop-shadow-lg">Configuration</h1>
              <p className="text-purple-100 text-lg mt-1">
                Personnalisez les quotas de surveillances
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex-1 px-6 py-4 font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              activeTab === 'grades'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-b-4 border-indigo-700'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Award className="w-6 h-6" />
            <span>Quotas par Grade</span>
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`flex-1 px-6 py-4 font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              activeTab === 'exceptions'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-b-4 border-orange-700'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
            <span>Exceptions Enseignants</span>
          </button>
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'grades' ? (
        <div className="space-y-6">
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

          {/* Table des Grades */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Configuration des Grades</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {grades?.length || 0} grade(s) configuré(s)
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl transition-all font-semibold shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Réinitialiser</span>
              </button>
            </div>
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
                            min="1"
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
      ) : (
        <div className="space-y-6">
          {/* Info Card Exceptions */}
          <div className="card bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-900 mb-2">
                  Quotas d'Exception pour les Enseignants
                </h3>
                <p className="text-sm text-orange-800 leading-relaxed">
                  Certains enseignants peuvent avoir des <strong>quotas exceptionnels</strong> de surveillances, 
                  différents des quotas standards de leur grade. Définissez un quota personnalisé 
                  pour gérer les cas particuliers (charge réduite, responsabilités spéciales, etc.).
                </p>
              </div>
            </div>
          </div>

          {/* Tableau des Enseignants */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Gestion des Exceptions</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {nbEnseignantsActifs} enseignant(s) actif(s) · {nbExceptions} exception(s) active(s)
                  </p>
                </div>
              </div>
              
              {/* Boutons Import et Suppression */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImporterExceptions}
                  className="hidden"
                  disabled={importerExceptionsMutation.isPending}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importerExceptionsMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl transition-all font-semibold shadow-lg disabled:opacity-50"
                >
                  {importerExceptionsMutation.isPending ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Import en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Importer Excel</span>
                    </>
                  )}
                </button>
                
                {nbExceptions > 0 && (
                  <button
                    onClick={handleSupprimerExceptions}
                    disabled={supprimerExceptionsMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white rounded-xl transition-all font-semibold shadow-lg disabled:opacity-50"
                  >
                    {supprimerExceptionsMutation.isPending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Suppression...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        <span>Réinitialiser</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Filtres */}
            <div className="bg-gradient-to-r from-gray-50 to-orange-50 p-6 rounded-2xl border-2 border-gray-200 shadow-lg mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex-1 flex flex-wrap gap-3">
                  {/* Search Filter */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <MagnifyingGlassIcon className="w-5 h-5 text-orange-600" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom..."
                      value={filterNom}
                      onChange={(e) => setFilterNom(e.target.value)}
                      className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
                    />
                  </div>

                  {/* Grade Filter */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <FunnelIcon className="w-5 h-5 text-green-600" />
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
                    >
                      <option value="">Tous les grades</option>
                      {grades?.map(grade => (
                        <option key={grade.grade_code} value={grade.grade_code}>
                          {grade.grade_code}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Exception Filter */}
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    <FunnelIcon className="w-5 h-5 text-red-600" />
                    <select
                      value={filterException}
                      onChange={(e) => setFilterException(e.target.value)}
                      className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
                    >
                      <option value="all">Tous les enseignants</option>
                      <option value="with">Avec exception</option>
                      <option value="without">Sans exception</option>
                    </select>
                  </div>
                  {/* Reset Filters Button - always visible if any filter is active */}
                  {(filterNom || filterGrade || filterException !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterNom('');
                        setFilterGrade('');
                        setFilterException('all');
                      }}
                      className="px-4 py-2.5 bg-red-100 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors border-2 border-red-200"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Résultat des filtres */}
            {/* {filterNom || filterGrade || filterException !== 'all' ? (
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-800">
                  <strong>{enseignantsFiltres?.length || 0}</strong> enseignant(s) trouvé(s) avec les filtres appliqués
                  {(filterNom || filterGrade || filterException !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterNom('');
                        setFilterGrade('');
                        setFilterException('all');
                      }}
                      className="ml-4 text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </p>
              </div>
            ) : null} */}

            {enseignantsFiltres && enseignantsFiltres.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="bg-gradient-to-r from-orange-50 to-red-50">
                        <span className="text-orange-900 font-bold">Nom</span>
                      </th>
                      <th className="bg-gradient-to-r from-orange-50 to-red-50">
                        <span className="text-orange-900 font-bold">Prénom</span>
                      </th>
                      <th className="bg-gradient-to-r from-orange-50 to-red-50">
                        <span className="text-orange-900 font-bold">Grade</span>
                      </th>
                      <th className="bg-gradient-to-r from-orange-50 to-red-50 text-center">
                        <span className="text-orange-900 font-bold">Quota Grade</span>
                      </th>
                      <th className="bg-gradient-to-r from-orange-50 to-red-50 text-center">
                        <span className="text-orange-900 font-bold">Quota Exception</span>
                      </th>
                      <th className="bg-gradient-to-r from-orange-50 to-red-50 text-center">
                        <span className="text-orange-900 font-bold">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enseignantsFiltres.map((enseignant, index) => {
                      const quotaGrade = getGradeQuota(enseignant.grade_code);
                      return (
                        <tr 
                          key={enseignant.id}
                          className={`hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } ${enseignant.is_Exception ? 'border-l-4 border-orange-500' : ''}`}
                        >
                          <td>
                            <span className="font-semibold text-gray-900">{enseignant.nom}</span>
                          </td>
                          <td>
                            <span className="font-semibold text-gray-900">{enseignant.prenom}</span>
                          </td>
                          <td>
                            <span className="badge badge-primary text-sm">
                              {enseignant.grade_code}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-100 to-purple-100 px-3 py-1 rounded-lg border-2 border-indigo-300">
                              <span className="text-xl font-bold text-indigo-900">
                                {quotaGrade}
                              </span>
                            </div>
                          </td>
                          <td className="text-center">
                            {editingEnseignant === enseignant.id ? (
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={quotaExceptionValue}
                                onChange={(e) => setQuotaExceptionValue(e.target.value)}
                                className="input w-24 text-center font-bold text-lg"
                                placeholder="0"
                                autoFocus
                              />
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                {enseignant.is_Exception && enseignant.quota_Exception >= 0 ? (
                                  <div className="bg-gradient-to-br from-orange-100 to-red-100 px-4 py-2 rounded-xl border-2 border-orange-300">
                                    <span className="text-2xl font-bold text-orange-900">
                                      {enseignant.quota_Exception}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 px-4 py-2 rounded-xl border-2 border-gray-300">
                                    <span className="text-xl font-bold text-gray-500">
                                      {quotaGrade}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            {editingEnseignant === enseignant.id ? (
                              <div className="flex gap-3 justify-center">
                                <button
                                  onClick={() => handleSaveException(enseignant.id)}
                                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md"
                                  disabled={updateExceptionMutation.isPending}
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={handleCancelException}
                                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-md"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleEditEnseignant(enseignant)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-semibold shadow-md"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  <span>Modifier</span>
                                </button>
                                {enseignant.is_Exception && (
                                  <button
                                    onClick={() => handleResetException(enseignant.id, enseignant.nom, enseignant.prenom)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold shadow-md"
                                    disabled={resetExceptionMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Réinitialiser</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                  {enseignants && enseignants.length > 0 
                    ? 'Aucun enseignant ne correspond aux filtres'
                    : 'Aucun enseignant trouvé'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {enseignants && enseignants.length > 0
                    ? 'Essayez de modifier ou réinitialiser les filtres'
                    : 'Importez d\'abord la liste des enseignants depuis la page "Importation"'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmation d'import */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Importer les exceptions depuis le fichier Excel ?
                </h3>
                <p className="text-gray-600 text-sm">
                  Cela remplacera les exceptions actuelles.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelImport}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression de toutes les exceptions */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Supprimer toutes les exceptions ?
                </h3>
                <p className="text-gray-600 text-sm">
                  {enseignants?.filter(e => e.is_Exception).length || 0} exception(s) seront supprimées. Les enseignants concernés retrouveront leurs quotas de grade normaux.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelDeleteAll}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression d'une exception */}
      {showDeleteOneConfirm && enseignantToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Réinitialiser l'exception ?
                </h3>
                <p className="text-gray-600 text-sm">
                  L'exception pour <span className="font-semibold">{enseignantToDelete.prenom} {enseignantToDelete.nom}</span> sera supprimée et le quota de grade normal sera appliqué.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelDeleteOne}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteOne}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de réinitialisation */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Réinitialiser toutes les configurations ?"
        message="Toutes les configurations seront réinitialisées aux valeurs par défaut."
        confirmText="Réinitialiser"
        type="warning"
      />
    </div>
  );
}
