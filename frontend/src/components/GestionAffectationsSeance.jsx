import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI } from '../services/api';
import { 
  UserPlusIcon, 
  UserMinusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/**
 * Composant pour gérer manuellement les affectations d'enseignants dans les séances
 * 
 * Fonctionnalités :
 * - Ajouter un enseignant à une séance
 * - Supprimer un enseignant d'une séance
 * - Marquer un enseignant comme responsable
 */
export default function GestionAffectationsSeance({ seance, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedEnseignantId, setSelectedEnseignantId] = useState('');
  const [estResponsable, setEstResponsable] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState(null);

  // Récupérer la liste des enseignants
  const { data: enseignants } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  // Mutation pour ajouter un enseignant
  const ajouterMutation = useMutation({
    mutationFn: planningAPI.ajouterEnseignantSeance,
    onSuccess: (response) => {
      setMessage({ type: 'success', text: response.data.message });
      setSelectedEnseignantId('');
      setEstResponsable(false);
      setShowAddForm(false);
      queryClient.invalidateQueries(['planning']);
      queryClient.invalidateQueries(['statistiques']);
      if (onSuccess) onSuccess();
      
      // Effacer le message après 5 secondes
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error) => {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Erreur lors de l\'ajout de l\'enseignant' 
      });
      setTimeout(() => setMessage(null), 5000);
    }
  });

  // Mutation pour supprimer un enseignant
  const supprimerMutation = useMutation({
    mutationFn: planningAPI.supprimerEnseignantSeance,
    onSuccess: (response) => {
      setMessage({ type: 'success', text: response.data.message });
      queryClient.invalidateQueries(['planning']);
      queryClient.invalidateQueries(['statistiques']);
      if (onSuccess) onSuccess();
      
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error) => {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Erreur lors de la suppression de l\'enseignant' 
      });
      setTimeout(() => setMessage(null), 5000);
    }
  });

  // Gérer l'ajout d'un enseignant
  const handleAjouter = () => {
    if (!selectedEnseignantId) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un enseignant' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Le backend détermine automatiquement le statut responsable
    // Pas besoin d'envoyer est_responsable
    ajouterMutation.mutate({
      enseignant_id: parseInt(selectedEnseignantId),
      date_examen: seance.date,
      h_debut: seance.h_debut,
      h_fin: seance.h_fin,
      session: seance.session,
      semestre: seance.semestre,
    });
  };

  // Gérer la suppression d'un enseignant
  const handleSupprimer = (enseignantId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enseignant de la séance ?')) {
      return;
    }

    supprimerMutation.mutate({
      enseignant_id: enseignantId,
      date_examen: seance.date,
      h_debut: seance.h_debut,
      h_fin: seance.h_fin,
      session: seance.session,
      semestre: seance.semestre,
    });
  };

  // Filtrer les enseignants déjà affectés
  const enseignantsDisponibles = enseignants?.filter(
    ens => !seance.enseignants?.some(e => e.id === ens.id) && ens.participe_surveillance
  ) || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Enseignants affectés ({seance.enseignants?.length || 0})
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
          >
            <UserPlusIcon className="w-5 h-5" />
            <span className="font-medium">Ajouter un enseignant</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 shadow-md animate-in slide-in-from-top duration-300 ${
          message.type === 'success' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-200' 
            : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-2 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-6 h-6 flex-shrink-0 text-green-600" />
          ) : (
            <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-red-600" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{message.text}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5 text-blue-600" />
              Ajouter un enseignant à la séance
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSelectedEnseignantId('');
                setEstResponsable(false);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Fermer"
            >
              <span className="text-2xl leading-none">×</span>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sélectionner un enseignant
              </label>
              <select
                value={selectedEnseignantId}
                onChange={(e) => setSelectedEnseignantId(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all"
              >
                <option value="">-- Choisir un enseignant --</option>
                {enseignantsDisponibles.map(ens => (
                  <option key={ens.id} value={ens.id}>
                    {ens.nom} {ens.prenom} ({ens.grade_code})
                  </option>
                ))}
              </select>
              {enseignantsDisponibles.length === 0 && (
                <p className="text-sm text-amber-700 mt-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  ⚠️ Tous les enseignants actifs sont déjà affectés à cette séance
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border-2 border-gray-200">
              <input
                type="checkbox"
                id="est_responsable"
                checked={estResponsable}
                onChange={(e) => setEstResponsable(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="est_responsable" className="text-sm font-medium text-gray-700 cursor-pointer">
                Marquer comme responsable de la séance
              </label>
              <span className="text-xs text-gray-500 ml-auto">
                (Détection automatique si déjà responsable)
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAjouter}
                disabled={ajouterMutation.isPending || !selectedEnseignantId}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold"
              >
                {ajouterMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Ajout en cours...
                  </span>
                ) : (
                  'Ajouter à la séance'
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedEnseignantId('');
                  setEstResponsable(false);
                }}
                className="px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border-2 border-gray-300 font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des enseignants affectés */}
      {seance.enseignants && seance.enseignants.length > 0 ? (
        <div className="space-y-2">
          {seance.enseignants.map((ens) => (
            <div
              key={ens.id}
              className="group flex items-center justify-between p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">
                    {ens.nom?.charAt(0)}{ens.prenom?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {ens.nom} {ens.prenom}
                  </p>
                  {ens.est_responsable && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                      <span>⭐</span> Responsable
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton X pour supprimer */}
              <button
                onClick={() => handleSupprimer(ens.id)}
                disabled={supprimerMutation.isPending}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm hover:shadow-md group-hover:scale-110"
                title="Retirer cet enseignant"
              >
                <span className="text-lg font-bold leading-none">×</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 font-medium">Aucun enseignant affecté à cette séance</p>
          <p className="text-xs text-gray-400 mt-1">Cliquez sur "Ajouter un enseignant" pour commencer</p>
        </div>
      )}

      {/* Informations de la séance */}
      <div className="mt-6 pt-4 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">📅 Date :</span>
            <span className="text-gray-600">{seance.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">⏰ Horaire :</span>
            <span className="text-gray-600">{seance.h_debut} - {seance.h_fin}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">📋 Session :</span>
            <span className="text-gray-600">{seance.session}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">🎓 Semestre :</span>
            <span className="text-gray-600">{seance.semestre}</span>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <span className="font-bold text-gray-700">🏫 Examens :</span>
            <span className="text-gray-600">
              {seance.examens?.length || 0} examen(s)
              {seance.examens && seance.examens.length > 0 && (
                <span className="ml-2">
                  • Salles : {seance.examens.map(ex => ex.salle).join(', ')}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
