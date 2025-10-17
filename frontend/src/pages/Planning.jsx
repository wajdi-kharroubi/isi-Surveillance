import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planningAPI, enseignantsAPI } from '../services/api';
import { Calendar, Users, Clock, MapPin, BookOpen, AlertCircle } from 'lucide-react';

export default function Planning() {
  const [activeTab, setActiveTab] = useState('seances'); // 'seances' ou 'enseignant'
  const [selectedEnseignant, setSelectedEnseignant] = useState(null);

  // Charger la liste des enseignants
  const { data: enseignants = [] } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  // Charger l'emploi des séances
  const { data: emploiSeances = [], isLoading: loadingSeances } = useQuery({
    queryKey: ['emploi-seances'],
    queryFn: () => planningAPI.getEmploiSeances().then(res => res.data),
    enabled: activeTab === 'seances',
  });

  // Charger l'emploi d'un enseignant
  const { data: emploiEnseignant, isLoading: loadingEnseignant } = useQuery({
    queryKey: ['emploi-enseignant', selectedEnseignant],
    queryFn: () => planningAPI.getEmploiEnseignant(selectedEnseignant).then(res => res.data),
    enabled: activeTab === 'enseignant' && selectedEnseignant !== null,
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
    return timeStr.substring(0, 5); // HH:MM
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Planning de Surveillance</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('seances')}
            className={`${
              activeTab === 'seances'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Calendar className="w-5 h-5" />
            Emploi des Séances
          </button>
          <button
            onClick={() => setActiveTab('enseignant')}
            className={`${
              activeTab === 'enseignant'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Users className="w-5 h-5" />
            Emploi par Enseignant
          </button>
        </nav>
      </div>

      {/* Contenu - Emploi des Séances */}
      {activeTab === 'seances' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Emploi des Séances d'Examens
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Visualisation de toutes les séances d'examens avec le nombre d'enseignants affectés.
          </p>

          {loadingSeances ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des séances...</p>
            </div>
          ) : emploiSeances.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucune séance d'examen trouvée.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emploiSeances
                .sort((a, b) => {
                  const dateA = new Date(a.date + 'T' + a.h_debut);
                  const dateB = new Date(b.date + 'T' + b.h_debut);
                  return dateA - dateB;
                })
                .map((seance, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center gap-1 text-lg font-semibold text-gray-900">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            {formatDate(seance.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(seance.h_debut)} - {formatTime(seance.h_fin)}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {seance.session}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {seance.semestre}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Users className="w-5 h-5" />
                          <span className="text-2xl font-bold">{seance.nb_enseignants}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">enseignants affectés</p>
                      </div>
                    </div>

                    {seance.examens && seance.examens.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Examens de cette séance ({seance.examens.length}) :
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {seance.examens.map((examen) => (
                            <div key={examen.id} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded">
                              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="font-medium text-gray-900">{examen.salle}</span>
                              <span className="text-gray-500">({examen.type})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Contenu - Emploi par Enseignant */}
      {activeTab === 'enseignant' && (
        <div className="space-y-6">
          {/* Sélecteur d'enseignant */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un enseignant :
            </label>
            <select
              value={selectedEnseignant || ''}
              onChange={(e) => setSelectedEnseignant(Number(e.target.value) || null)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Choisir un enseignant --</option>
              {enseignants
                .filter(e => e.participe_surveillance)
                .map((ens) => (
                  <option key={ens.id} value={ens.id}>
                    {ens.nom} {ens.prenom} ({ens.grade_code})
                  </option>
                ))}
            </select>
          </div>

          {/* Affichage de l'emploi */}
          {selectedEnseignant && (
            <div className="card">
              {loadingEnseignant ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Chargement de l'emploi...</p>
                </div>
              ) : emploiEnseignant ? (
                <>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {emploiEnseignant.enseignant.nom} {emploiEnseignant.enseignant.prenom}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Grade: {emploiEnseignant.enseignant.grade} • 
                        Total surveillances: {emploiEnseignant.enseignant.nb_surveillances_affectees} / {emploiEnseignant.enseignant.quota_max}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        emploiEnseignant.enseignant.pourcentage_quota >= 100 
                          ? 'text-green-600' 
                          : emploiEnseignant.enseignant.pourcentage_quota >= 75 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                      }`}>
                        {emploiEnseignant.enseignant.pourcentage_quota}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Couverture quota</p>
                      <div className="mt-2 w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            emploiEnseignant.enseignant.pourcentage_quota >= 100 
                              ? 'bg-green-600' 
                              : emploiEnseignant.enseignant.pourcentage_quota >= 75 
                              ? 'bg-yellow-600' 
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(emploiEnseignant.enseignant.pourcentage_quota, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {emploiEnseignant.emplois.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Aucune surveillance affectée à cet enseignant.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {emploiEnseignant.emplois
                        .sort((a, b) => {
                          const dateA = new Date(a.date + 'T' + a.h_debut);
                          const dateB = new Date(b.date + 'T' + b.h_debut);
                          return dateA - dateB;
                        })
                        .map((emploi, index) => (
                          <div
                            key={index}
                            className={`border-l-4 ${
                              emploi.est_responsable ? 'border-orange-500 bg-orange-50' : 'border-blue-500 bg-blue-50'
                            } p-4 rounded-r-lg hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-semibold text-gray-900">
                                    {formatDate(emploi.date)}
                                  </span>
                                  {emploi.est_responsable && (
                                    <span className="px-2 py-1 bg-orange-600 text-white rounded-full text-xs font-medium">
                                      Responsable
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700">
                                      {formatTime(emploi.h_debut)} - {formatTime(emploi.h_fin)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700">{emploi.type}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                      {emploi.session}
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                      {emploi.semestre}
                                    </span>
                                  </div>
                                </div>
                                {emploi.salles && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    Salles: {emploi.salles}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

