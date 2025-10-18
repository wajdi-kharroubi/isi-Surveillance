/**
 * EXEMPLE D'INTÉGRATION DU COMPOSANT GestionAffectationsSeance
 * 
 * Ce fichier montre comment intégrer le composant de gestion des affectations
 * dans une page de planning existante.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planningAPI } from '../services/api';
import GestionAffectationsSeance from '../components/GestionAffectationsSeance';
import { CalendarIcon, ClockIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function ExemplePlanningAvecGestion() {
  const [seanceSelectionnee, setSeanceSelectionnee] = useState(null);

  // Récupérer toutes les séances
  const { data: seances, isLoading, refetch } = useQuery({
    queryKey: ['planning-seances'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Planning des Surveillances
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des séances */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Séances disponibles ({seances?.length || 0})
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {seances?.map((seance, index) => (
              <div
                key={index}
                onClick={() => setSeanceSelectionnee(seance)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  seanceSelectionnee === seance
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">
                      {new Date(seance.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    seance.session === 'Principale'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {seance.session}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{seance.h_debut} - {seance.h_fin}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AcademicCapIcon className="w-4 h-4" />
                    <span>{seance.semestre}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {seance.examens?.length || 0} examen(s)
                  </span>
                  <span className="font-medium text-blue-600">
                    {seance.nb_enseignants || 0} surveillant(s)
                  </span>
                </div>
              </div>
            ))}

            {(!seances || seances.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                <p>Aucune séance disponible</p>
                <p className="text-sm mt-2">Générez d'abord un planning</p>
              </div>
            )}
          </div>
        </div>

        {/* Panneau de gestion des affectations */}
        <div className="lg:sticky lg:top-4">
          {seanceSelectionnee ? (
            <GestionAffectationsSeance
              seance={seanceSelectionnee}
              onSuccess={() => {
                // Rafraîchir les données après une modification
                refetch();
              }}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">
                Sélectionnez une séance
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Cliquez sur une séance à gauche pour gérer ses affectations
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
