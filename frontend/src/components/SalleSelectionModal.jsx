import React, { useState, useEffect } from 'react';
import { X, MapPin, Users, Building2, Grid3x3 } from 'lucide-react';

export default function SalleSelectionModal({ isOpen, onClose, seance, onSelectSalle }) {
  const [salles, setSalles] = useState([]);
  const [selectedBloc, setSelectedBloc] = useState('all');

  useEffect(() => {
    if (isOpen && seance) {
      // Extraire les salles des examens de la séance
      const sallesData = seance.examens?.map(examen => {
        // Compter le nombre d'enseignants affectés à cette salle spécifique
        const nbEnseignantsAffectes = (seance.enseignants || []).filter(
          ens => ens.salle_affectee === examen.salle
        ).length;
        
        return {
          code_salle: examen.salle,
          bloc: extractBloc(examen.salle),
          nb_enseignants: nbEnseignantsAffectes,
          type_examen: examen.type,
        };
      }) || [];
      
      setSalles(sallesData);
    }
  }, [isOpen, seance]);

  const extractBloc = (codeSalle) => {
    if (!codeSalle) return 'Autre';
    const match = codeSalle.match(/^([A-Z])/);
    return match ? `Bloc ${match[1]}` : 'Autre';
  };

  // Grouper les salles par bloc
  const sallesParBloc = salles.reduce((acc, salle) => {
    const bloc = salle.bloc;
    if (!acc[bloc]) {
      acc[bloc] = [];
    }
    acc[bloc].push(salle);
    return acc;
  }, {});

  // Trier les salles dans chaque bloc par nombre d'enseignants (ordre croissant: 0 d'abord)
  Object.keys(sallesParBloc).forEach(bloc => {
    sallesParBloc[bloc].sort((a, b) => a.nb_enseignants - b.nb_enseignants);
  });

  const blocs = Object.keys(sallesParBloc).sort();

  const filteredBlocs = selectedBloc === 'all' 
    ? blocs 
    : blocs.filter(b => b === selectedBloc);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sélection de Salle</h2>
              <p className="text-blue-100 text-sm">
                {seance?.date && new Date(seance.date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
                {' • '}
                {seance?.h_debut?.substring(0, 5)} - {seance?.h_fin?.substring(0, 5)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setSelectedBloc('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                selectedBloc === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Tous les blocs ({salles.length})
            </button>
            {blocs.map(bloc => (
              <button
                key={bloc}
                onClick={() => setSelectedBloc(bloc)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedBloc === bloc
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {bloc} ({sallesParBloc[bloc]?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {filteredBlocs.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucune salle disponible</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBlocs.map(bloc => (
                <div key={bloc} className="space-y-3">
                  {/* Bloc Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Grid3x3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{bloc}</h3>
                      <p className="text-sm text-gray-500">
                        {sallesParBloc[bloc]?.length || 0} salle{(sallesParBloc[bloc]?.length || 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Salles Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sallesParBloc[bloc]?.map((salle, idx) => {
                      // Déterminer les couleurs selon le nombre de surveillants (inversé)
                      let bgColor, borderColor, iconBg, iconColor, textColor, badgeBg, badgeText;
                      
                      if (salle.nb_enseignants === 0) {
                        // Rouge - Aucun surveillant
                        bgColor = 'bg-red-50';
                        borderColor = 'border-red-300';
                        iconBg = 'bg-red-100';
                        iconColor = 'text-red-600';
                        textColor = 'text-red-700';
                        badgeBg = 'bg-red-200';
                        badgeText = 'text-red-800';
                      } else if (salle.nb_enseignants === 1) {
                        // Orange
                        bgColor = 'bg-orange-50';
                        borderColor = 'border-orange-300';
                        iconBg = 'bg-orange-100';
                        iconColor = 'text-orange-600';
                        textColor = 'text-orange-700';
                        badgeBg = 'bg-orange-200';
                        badgeText = 'text-orange-800';
                      } else if (salle.nb_enseignants === 2) {
                        // Bleu clair
                        bgColor = 'bg-blue-50';
                        borderColor = 'border-blue-300';
                        iconBg = 'bg-blue-100';
                        iconColor = 'text-blue-600';
                        textColor = 'text-blue-700';
                        badgeBg = 'bg-blue-200';
                        badgeText = 'text-blue-800';
                      } else if (salle.nb_enseignants === 3) {
                        // Cyan
                        bgColor = 'bg-cyan-50';
                        borderColor = 'border-cyan-300';
                        iconBg = 'bg-cyan-100';
                        iconColor = 'text-cyan-600';
                        textColor = 'text-cyan-700';
                        badgeBg = 'bg-cyan-200';
                        badgeText = 'text-cyan-800';
                      } else {
                        // Vert - 5 ou plus (Bien surveillé)
                        bgColor = 'bg-green-50';
                        borderColor = 'border-green-300';
                        iconBg = 'bg-green-100';
                        iconColor = 'text-green-600';
                        textColor = 'text-green-700';
                        badgeBg = 'bg-green-200';
                        badgeText = 'text-green-800';
                      }
                      
                      return (
                        <button
                          key={`${salle.code_salle}-${idx}`}
                          onClick={() => {
                            onSelectSalle(salle);
                            onClose();
                          }}
                          className={`text-left p-5 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-105 ${bgColor} ${borderColor} hover:border-opacity-80`}
                        >
                          {/* Salle Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
                                <MapPin className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-lg">
                                  {salle.code_salle}
                                </div>
                              </div>
                            </div>
                            {salle.type_examen && (
                              <div className={`px-2 py-1 ${badgeBg} ${badgeText} rounded-full text-xs font-bold`}>
                                {salle.type_examen}
                              </div>
                            )}
                          </div>

                          {/* Salle Stats */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 font-medium">Surveillants</span>
                              <div className="flex items-center gap-1">
                                <Users className={`w-4 h-4 ${iconColor}`} />
                                <span className={`text-sm font-bold ${textColor}`}>
                                  {salle.nb_enseignants}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Total:</span> {salles.length} salle{salles.length > 1 ? 's' : ''} disponible{salles.length > 1 ? 's' : ''}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-semibold text-sm transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
