import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI, statistiquesAPI, gradesAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PlusIcon, StarIcon, MagnifyingGlassIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/solid';

/**
 * Composant compact pour gérer les enseignants d'une séance
 * Version inline pour intégration directe dans les cartes de séances
 */
export default function GestionEnseignantsSeanceInline({ 
  seance, 
  onUpdate, 
  exchangeMode = false, 
  selectedForExchange = null,
  onSelectForExchange = null 
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEnseignantId, setSelectedEnseignantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Récupérer la liste des enseignants
  const { data: enseignants } = useQuery({
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

  // S'assurer que chargeEnseignants est un tableau
  const chargeEnseignants = Array.isArray(chargeEnseignantsData?.charges) 
    ? chargeEnseignantsData.charges 
    : [];

  // Fusionner les données des enseignants avec leurs statistiques
  const enseignantsAvecStats = useMemo(() => {
    return enseignants?.map(ens => {
      const charge = chargeEnseignants.find(c => c.enseignant_id === ens.id);
      const gradeInfo = gradesConfig.find(g => g.grade_code === ens.grade_code);
      
      // Utiliser quota_Exception si is_Exception est true, sinon utiliser le quota du grade
      const quota_max = ens.is_Exception && ens.quota_Exception != null
        ? ens.quota_Exception
        : (gradeInfo?.nb_surveillances || 0);
      
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
    }) || [];
  }, [enseignants, chargeEnseignants, gradesConfig]);

  // Mutation pour supprimer un enseignant
  const supprimerMutation = useMutation({
    mutationFn: planningAPI.supprimerEnseignantSeance,
    onSuccess: () => {
      queryClient.invalidateQueries(['emploi-seances']);
      queryClient.invalidateQueries(['statistiques']);
      toast.success('Enseignant retiré de la séance avec succès');
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
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
      toast.success('Enseignant ajouté à la séance avec succès');
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
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

  // Filtrer les enseignants disponibles avec leurs stats
  const enseignantsDisponibles = enseignantsAvecStats?.filter(
    ens => !seance.enseignants?.some(e => e.id === ens.id) && ens.participe_surveillance
  ) || [];

  return (
    <div className="space-y-2">
      {/* Liste des enseignants */}
      <div className="flex flex-wrap gap-2">
        {seance.enseignants?.map((ens) => {
          const isSelected = selectedForExchange && 
            selectedForExchange.enseignant.id === ens.id &&
            selectedForExchange.seance.date === seance.date &&
            selectedForExchange.seance.h_debut === seance.h_debut;
          
          // Vérifier si cet enseignant peut être échangé
          let canBeExchanged = true;
          let disabledReason = '';
          
          if (selectedForExchange && !isSelected) {
            // Un enseignant a déjà été sélectionné
            // Vérifier que cet enseignant n'est pas déjà dans la séance du premier sélectionné
            if (selectedForExchange.seance.enseignants?.some(e => e.id === ens.id)) {
              canBeExchanged = false;
              disabledReason = "Cet enseignant est déjà dans l'autre séance";
            }
            // Vérifier aussi que le premier enseignant sélectionné n'est pas déjà dans cette séance
            else if (seance.enseignants?.some(e => e.id === selectedForExchange.enseignant.id)) {
              canBeExchanged = false;
              disabledReason = `${selectedForExchange.enseignant.nom} ${selectedForExchange.enseignant.prenom} est déjà dans cette séance`;
            }
          }
          
          return (
            <div
              key={ens.id}
              className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                isSelected 
                  ? 'bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-400 shadow-lg' 
                  : !canBeExchanged && exchangeMode
                  ? 'bg-gray-100 border-2 border-gray-300 opacity-50 cursor-not-allowed'
                  : 'bg-white border-2 border-blue-200 hover:border-blue-400'
              }`}
            >
              {ens.est_responsable && (
                <span className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-md opacity-90">
                  <StarIcon className="w-3 h-3" />
                </span>
              )}
              <span className={`text-sm font-medium ${isSelected ? 'text-orange-900 font-bold' : !canBeExchanged && exchangeMode ? 'text-gray-500' : 'text-gray-700'}`}>
                {ens.nom.charAt(0).toUpperCase() + ens.nom.slice(1).toLowerCase()} {ens.prenom}
              </span>
              
              {/* Actions - visibles au hover ou si sélectionné pour échange */}
              <div className={`absolute -top-1 -right-1 flex gap-1 transition-opacity ${
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {/* Bouton échange - uniquement en mode échange */}
                {exchangeMode && onSelectForExchange && (
                  <button
                    onClick={() => canBeExchanged && onSelectForExchange(ens, seance)}
                    disabled={!canBeExchanged}
                    className={`w-5 h-5 flex items-center justify-center rounded-full transition-all shadow-md ${
                      isSelected
                        ? 'bg-orange-500 text-white'
                        : !canBeExchanged
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white'
                    }`}
                    title={
                      !canBeExchanged 
                        ? disabledReason
                        : isSelected 
                        ? "Enseignant sélectionné" 
                        : "Sélectionner pour échange"
                    }
                  >
                    <ArrowsRightLeftIcon className="w-3 h-3 stroke-[3]" />
                  </button>
                )}
                
                {/* Bouton retirer - masqué en mode échange */}
                {!exchangeMode && (
                  <button
                    onClick={() => handleSupprimer(ens.id)}
                    disabled={supprimerMutation.isPending}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md"
                    title="Retirer"
                  >
                    <XMarkIcon className="w-3 h-3 stroke-[3]" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Bouton ajouter - masqué en mode échange */}
        {!isAdding && !exchangeMode && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-all border-2 border-blue-300 hover:border-blue-400"
          >
            <PlusIcon className="w-4 h-4 stroke-[3]" />
            <span className="text-sm font-medium">Ajouter</span>
          </button>
        )}
      </div>

      {/* Formulaire d'ajout amélioré */}
      {isAdding && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <PlusIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Ajouter un enseignant</h4>
                <p className="text-xs text-gray-600 font-medium">
                  {enseignantsDisponibles.length} enseignant{enseignantsDisponibles.length > 1 ? 's' : ''} disponible{enseignantsDisponibles.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAdding(false);
                setSelectedEnseignantId('');
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Fermer"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>

          {enseignantsDisponibles.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-600 font-medium">Aucun enseignant disponible</p>
              <p className="text-xs text-gray-500 mt-1">Tous les enseignants participent déjà à cette séance</p>
            </div>
          ) : (
            <>
              {/* Barre de recherche */}
              <div className="mb-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-blue-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border-2 border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs font-semibold bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-lg font-bold">✕</span>
                  </button>
                )}
              </div>

              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-64 overflow-y-auto mb-3">
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-blue-200">
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-8">
                        <span className="sr-only">Sélection</span>
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Enseignant
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Surveillances
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enseignantsDisponibles
                      .filter(ens => {
                        const searchLower = searchQuery.toLowerCase();
                        return (
                          ens.nom.toLowerCase().includes(searchLower) ||
                          ens.prenom.toLowerCase().includes(searchLower) ||
                          ens.grade_code.toLowerCase().includes(searchLower)
                        );
                      })
                      .sort((a, b) => a.pourcentage_quota - b.pourcentage_quota)
                      .map(ens => {
                        const isSelected = selectedEnseignantId === String(ens.id);
                        return (
                          <tr
                            key={ens.id}
                            onClick={() => setSelectedEnseignantId(String(ens.id))}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {/* Sélection */}
                            <td className="px-3 py-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-blue-500 border-blue-500' 
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </td>
                            
                            {/* Nom */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900">
                                  {ens.nom.charAt(0).toUpperCase() + ens.nom.slice(1).toLowerCase()} {ens.prenom}
                                </span>
                                {ens.is_Exception && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold border border-emerald-300">
                                    EXC
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            {/* Grade */}
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold border border-gray-300">
                                {ens.grade_code}
                              </span>
                            </td>
                            
                            {/* Surveillances */}
                            <td className="px-3 py-2 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-bold text-gray-900 text-xs">
                                  {ens.nb_surveillances_affectees} / {ens.quota_max}
                                </span>
                                <span className={`font-bold text-[10px] ${
                                  ens.pourcentage_quota >= 100 ? 'text-green-600' : 
                                  ens.pourcentage_quota >= 75 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  {ens.pourcentage_quota}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>

              {/* Info si sélectionné */}
              {selectedEnseignantId && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-800 font-semibold">
                    ✓ Enseignant sélectionné - Cliquez sur "Confirmer" pour l'ajouter à cette séance
                  </p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-2">
                <button
                  onClick={handleAjouter}
                  disabled={!selectedEnseignantId || ajouterMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-sm font-bold shadow-md transition-all"
                >
                  {ajouterMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Ajout en cours...
                    </span>
                  ) : !selectedEnseignantId ? (
                    'Sélectionnez un enseignant'
                  ) : (
                    'Confirmer l\'ajout'
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setSelectedEnseignantId('');
                  }}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-bold border-2 border-gray-300 transition-all"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {seance.enseignants?.length === 0 && !isAdding && (
        <p className="text-xs text-gray-500 italic">Aucun enseignant affecté</p>
      )}
    </div>
  );
}
