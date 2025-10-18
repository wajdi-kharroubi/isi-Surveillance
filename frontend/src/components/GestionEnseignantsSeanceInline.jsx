import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI } from '../services/api';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

/**
 * Composant compact pour gérer les enseignants d'une séance
 * Version inline pour intégration directe dans les cartes de séances
 */
export default function GestionEnseignantsSeanceInline({ seance, onUpdate }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEnseignantId, setSelectedEnseignantId] = useState('');

  // Récupérer la liste des enseignants
  const { data: enseignants } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  // Mutation pour supprimer un enseignant
  const supprimerMutation = useMutation({
    mutationFn: planningAPI.supprimerEnseignantSeance,
    onSuccess: () => {
      queryClient.invalidateQueries(['emploi-seances']);
      queryClient.invalidateQueries(['statistiques']);
      if (onUpdate) onUpdate();
    },
  });

  // Mutation pour ajouter un enseignant
  const ajouterMutation = useMutation({
    mutationFn: planningAPI.ajouterEnseignantSeance,
    onSuccess: () => {
      setIsAdding(false);
      setSelectedEnseignantId('');
      queryClient.invalidateQueries(['emploi-seances']);
      queryClient.invalidateQueries(['statistiques']);
      if (onUpdate) onUpdate();
    },
  });

  const handleSupprimer = (enseignantId) => {
    if (!confirm('Retirer cet enseignant de la séance ?')) return;

    supprimerMutation.mutate({
      enseignant_id: enseignantId,
      date_examen: seance.date,
      h_debut: seance.h_debut,
      h_fin: seance.h_fin,
      session: seance.session,
      semestre: seance.semestre,
    });
  };

  const handleAjouter = () => {
    if (!selectedEnseignantId) return;

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

  // Filtrer les enseignants disponibles
  const enseignantsDisponibles = enseignants?.filter(
    ens => !seance.enseignants?.some(e => e.id === ens.id) && ens.participe_surveillance
  ) || [];

  return (
    <div className="space-y-2">
      {/* Liste des enseignants */}
      <div className="flex flex-wrap gap-2">
        {seance.enseignants?.map((ens) => (
          <div
            key={ens.id}
            className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5 bg-white border-2 border-blue-200 rounded-full hover:border-blue-400 transition-all"
          >
            <span className="text-sm font-medium text-gray-700">
              {ens.nom} {ens.prenom}
            </span>
            {ens.est_responsable && (
              <span className="text-xs">⭐</span>
            )}
            <button
              onClick={() => handleSupprimer(ens.id)}
              disabled={supprimerMutation.isPending}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white disabled:bg-gray-200 disabled:text-gray-400 transition-all opacity-0 group-hover:opacity-100"
              title="Retirer"
            >
              <XMarkIcon className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        ))}

        {/* Bouton ajouter */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-all border-2 border-blue-300 hover:border-blue-400"
          >
            <PlusIcon className="w-4 h-4 stroke-[3]" />
            <span className="text-sm font-medium">Ajouter</span>
          </button>
        )}
      </div>

      {/* Formulaire d'ajout inline */}
      {isAdding && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
          <select
            value={selectedEnseignantId}
            onChange={(e) => setSelectedEnseignantId(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Choisir --</option>
            {enseignantsDisponibles.map(ens => (
              <option key={ens.id} value={ens.id}>
                {ens.nom} {ens.prenom} ({ens.grade_code})
              </option>
            ))}
          </select>
          <button
            onClick={handleAjouter}
            disabled={!selectedEnseignantId || ajouterMutation.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
          >
            OK
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setSelectedEnseignantId('');
            }}
            className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {seance.enseignants?.length === 0 && !isAdding && (
        <p className="text-xs text-gray-500 italic">Aucun enseignant affecté</p>
      )}
    </div>
  );
}
