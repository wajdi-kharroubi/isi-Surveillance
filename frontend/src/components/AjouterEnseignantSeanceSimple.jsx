import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planningAPI } from '../services/api';
import { Calendar, Clock, UserPlus } from 'lucide-react';

/**
 * Composant exemple pour ajouter un enseignant à une séance par date et heure
 * Utilise le nouvel endpoint simplifié
 */
export default function AjouterEnseignantSeanceSimple({ enseignantId, onSuccess }) {
  const queryClient = useQueryClient();
  const [dateExamen, setDateExamen] = useState('');
  const [hDebut, setHDebut] = useState('');
  const [message, setMessage] = useState(null);

  // Mutation pour ajouter un enseignant par date et heure
  const ajouterMutation = useMutation({
    mutationFn: planningAPI.ajouterEnseignantParDateHeure,
    onSuccess: (response) => {
      setMessage({ type: 'success', text: response.data.message });
      
      // Réinitialiser le formulaire
      setDateExamen('');
      setHDebut('');
      
      // Invalider les queries
      queryClient.invalidateQueries(['emploi-enseignant', enseignantId]);
      queryClient.invalidateQueries(['emploi-seances']);
      queryClient.invalidateQueries(['statistiques']);
      
      if (onSuccess) onSuccess(response.data);
      
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!dateExamen || !hDebut) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    ajouterMutation.mutate({
      enseignant_id: enseignantId,
      date_examen: dateExamen,
      h_debut: hDebut + ':00', // Ajouter les secondes
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-blue-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          Ajouter à une séance
        </h3>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border-2 border-green-200' 
            : 'bg-red-50 text-red-800 border-2 border-red-200'
        }`}>
          <p className="text-sm font-medium whitespace-pre-line">{message.text}</p>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Date de la séance
          </label>
          <input
            type="date"
            value={dateExamen}
            onChange={(e) => setDateExamen(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Heure de début */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            Heure de début
          </label>
          <input
            type="time"
            value={hDebut}
            onChange={(e) => setHDebut(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            ℹ️ La séance sera recherchée automatiquement (session et semestre détectés)
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={ajouterMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold"
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
        </div>
      </form>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 Astuce :</strong> Vous n'avez besoin que de la date et l'heure de début. 
          L'heure de fin, la session et le semestre seront détectés automatiquement.
        </p>
      </div>
    </div>
  );
}
