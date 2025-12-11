import { useState, useEffect } from 'react';
import {
  ArchiveBoxIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  EyeIcon,
  TrashIcon,
  DocumentTextIcon,
  UserGroupIcon,
  AcademicCapIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import ArchiveSessionModal from '../components/ArchiveSessionModal';

export default function Archives() {
  const [archives, setArchives] = useState([]);
  const [filteredArchives, setFilteredArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [anneesUniversitaires, setAnneesUniversitaires] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false);
  const [archiveToDelete, setArchiveToDelete] = useState(null);
  const [archiveToRecover, setArchiveToRecover] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  
  // Filtres
  const [filtreAnnee, setFiltreAnnee] = useState('');
  const [filtreSemestre, setFiltreSemestre] = useState('');
  const [filtreSession, setFiltreSession] = useState('');
  
  // Modal de détails
  const [archiveSelectionnee, setArchiveSelectionnee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsArchive, setDetailsArchive] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    appliquerFiltres();
  }, [archives, filtreAnnee, filtreSemestre, filtreSession]);

  const chargerDonnees = async () => {
    setLoading(true);
    setError(null);
    try {
      const [archivesData, statsData, anneesData] = await Promise.all([
        api.get('/archives/sessions'),
        api.get('/archives/statistiques'),
        api.get('/archives/annees-universitaires'),
      ]);
      
      setArchives(archivesData.data);
      setFilteredArchives(archivesData.data);
      setStatistiques(statsData.data);
      setAnneesUniversitaires(anneesData.data.annees || []);
    } catch (err) {
      console.error('Erreur lors du chargement des archives:', err);
      setError('Impossible de charger les archives');
    } finally {
      setLoading(false);
    }
  };

  const appliquerFiltres = () => {
    let resultats = [...archives];
    
    if (filtreAnnee) {
      resultats = resultats.filter(a => a.annee_universitaire === filtreAnnee);
    }
    if (filtreSemestre) {
      resultats = resultats.filter(a => a.semestre === filtreSemestre);
    }
    if (filtreSession) {
      resultats = resultats.filter(a => a.session === filtreSession);
    }
    
    setFilteredArchives(resultats);
  };

  const reinitialiserFiltres = () => {
    setFiltreAnnee('');
    setFiltreSemestre('');
    setFiltreSession('');
  };

  const afficherDetails = async (archive) => {
    setArchiveSelectionnee(archive);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    
    try {
      const response = await api.get(`/archives/sessions/${archive.id}`);
      setDetailsArchive(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des détails:', err);
      setError('Impossible de charger les détails de l\'archive');
    } finally {
      setLoadingDetails(false);
    }
  };

  const supprimerArchive = (archiveId) => {
    setArchiveToDelete(archiveId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteArchive = async () => {
    if (!archiveToDelete) return;
    
    try {
      await api.delete(`/archives/sessions/${archiveToDelete}`);
      setArchives(archives.filter(a => a.id !== archiveToDelete));
      chargerDonnees();
      toast.success('Archive supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Erreur lors de la suppression de l\'archive');
    } finally {
      setArchiveToDelete(null);
    }
  };

  const recupererArchive = (archiveId) => {
    setArchiveToRecover(archiveId);
    setShowRecoverConfirm(true);
  };

  const confirmRecoverArchive = async () => {
    if (!archiveToRecover) return;
    
    setLoading(true);
    
    try {
      await api.post(`/archives/sessions/${archiveToRecover}/restaurer`);
      await chargerDonnees();
      toast.success('Archive récupérée avec succès');
    } catch (err) {
      console.error('Erreur lors de la récupération:', err);
      const errorMsg = err.response?.data?.detail || 'Erreur lors de la récupération de l\'archive';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setArchiveToRecover(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSessionLabel = (session) => {
    const labels = {
      'Pa': 'Partiel',
      'P': 'Principale',
      'C': 'Contrôle',
      'R': 'Rattrapage',
    };
    return labels[session] || session;
  };

  const handleArchiveSuccess = () => {
    setShowArchiveModal(false);
    chargerDonnees();
    toast.success('Archive créée avec succès');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ArchiveBoxIcon className="w-9 h-9 text-blue-600" />
            Archives des Sessions
          </h1>
          <p className="text-gray-600 mt-2">
            Historique complet des sessions de surveillances validées et archivées
          </p>
        </div>
        <button
          onClick={() => setShowArchiveModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Nouvelle Archive
        </button>
      </div>

      {/* Statistiques globales */}
      {statistiques && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Total Archives</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{statistiques.total_archives}</p>
              </div>
              <ArchiveBoxIcon className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-900">Dernière Archive</p>
                <p className="text-sm font-semibold text-amber-600 mt-2">
                  {statistiques.archive_la_plus_recente?.date ? 
                    formatDate(statistiques.archive_la_plus_recente.date) : 
                    'Aucune'
                  }
                </p>
              </div>
              <CalendarDaysIcon className="w-12 h-12 text-amber-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-blue-600" />
            Filtres
          </h2>
          {(filtreAnnee || filtreSemestre || filtreSession) && (
            <button
              onClick={reinitialiserFiltres}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <XMarkIcon className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Année universitaire
            </label>
            <select
              value={filtreAnnee}
              onChange={(e) => setFiltreAnnee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les années</option>
              {anneesUniversitaires.map((annee) => (
                <option key={annee} value={annee}>{annee}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semestre
            </label>
            <select
              value={filtreSemestre}
              onChange={(e) => setFiltreSemestre(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les semestres</option>
              <option value="SEMESTRE 1">Semestre 1</option>
              <option value="SEMESTRE 2">Semestre 2</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session
            </label>
            <select
              value={filtreSession}
              onChange={(e) => setFiltreSession(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les sessions</option>
              <option value="Pa">Partiel</option>
              <option value="P">Principale</option>
              <option value="C">Contrôle</option>
              <option value="R">Rattrapage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des archives */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800">{error}</p>
        </div>
      ) : filteredArchives.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <ArchiveBoxIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune archive trouvée</h3>
          <p className="text-gray-500">
            {archives.length === 0 
              ? 'Aucune session n\'a encore été archivée.' 
              : 'Aucune archive ne correspond aux filtres sélectionnés.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArchives.map((archive) => (
            <div
              key={archive.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* En-tête */}
                    <div className="flex items-center gap-3 mb-3">
                      <ArchiveBoxIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      <h3 className="text-xl font-bold text-gray-900">
                        {archive.nom_session}
                      </h3>
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-full shadow-sm">
                        {archive.annee_universitaire}
                      </span>
                    </div>
                    
                    {/* Informations de période et type */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200">
                        <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                        {formatDate(archive.date_debut)} → {formatDate(archive.date_fin)}
                      </span>
                      <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg border border-purple-200">
                        {archive.semestre}
                      </span>
                      <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200">
                        {getSessionLabel(archive.session)}
                      </span>
                    </div>
                    
                    {/* Statistiques */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{archive.nb_affectations}</div>
                        <div className="text-xs text-blue-600 font-medium">Affectations</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">{archive.nb_examens}</div>
                        <div className="text-xs text-green-600 font-medium">Examens</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                        <div className="text-2xl font-bold text-purple-700">{archive.nb_enseignants}</div>
                        <div className="text-xs text-purple-600 font-medium">Enseignants</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                        <div className="text-2xl font-bold text-orange-700">{archive.nb_voeux}</div>
                        <div className="text-xs text-orange-600 font-medium">Souhaits</div>
                      </div>
                    </div>
                    
                    {/* Commentaire */}
                    {archive.commentaire && (
                      <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                        <p className="text-sm text-amber-900 flex items-start gap-2">
                          <DocumentTextIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="italic">{archive.commentaire}</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Métadonnées d'archivage */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <ArchiveBoxIcon className="w-3.5 h-3.5" />
                      <span>
                        Archivé le {formatDate(archive.date_archivage)}
                        {archive.archive_par && <span className="font-medium text-gray-600"> par {archive.archive_par}</span>}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => recupererArchive(archive.id)}
                      className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300"
                      title="Récupérer l'archive"
                    >
                      <ArrowUturnLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => supprimerArchive(archive.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                      title="Supprimer"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setArchiveToDelete(null);
        }}
        onConfirm={confirmDeleteArchive}
        title="Supprimer cette archive ?"
        message="Cette action est irréversible. L'archive sera supprimée définitivement."
        confirmText="Supprimer"
        type="danger"
      />

      <ConfirmModal
        isOpen={showRecoverConfirm}
        onClose={() => {
          setShowRecoverConfirm(false);
          setArchiveToRecover(null);
        }}
        onConfirm={confirmRecoverArchive}
        title="Récupérer cette archive ?"
        message="Cela va restaurer les données dans le système actuel."
        confirmText="Récupérer"
        type="info"
      />

      <ArchiveSessionModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onSuccess={handleArchiveSuccess}
      />
    </div>
  );
}
