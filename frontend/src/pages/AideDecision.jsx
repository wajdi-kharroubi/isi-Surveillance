import { useState } from 'react';
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
  Settings
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const decisionAPI = {
  calculerRecommandations: (params) => axios.post(`${API_URL}/decision/calculer-recommandations`, params),
  appliquerQuotas: (quotas) => axios.post(`${API_URL}/decision/appliquer-quotas`, quotas),
  getQuotasActuels: () => axios.get(`${API_URL}/decision/quotas-actuels`),
};

export default function AideDecision() {
  const queryClient = useQueryClient();

  // Paramètres configurables
  const [parametres, setParametres] = useState({
    min_surveillants_par_salle: 2,
    majoration_absences: 1.1,
    difference_min_grades: 1,
    expert_quota: 3,
  });

  // Pourcentage de majoration (pour l'affichage)
  const [pourcentageMajoration, setPourcentageMajoration] = useState(10); // 10%

  // Quotas modifiés manuellement
  const [quotasModifies, setQuotasModifies] = useState({});

  // Calcul des recommandations
  const { data: recommandations, isLoading, refetch } = useQuery({
    queryKey: ['recommandations-decision', parametres],
    queryFn: () => decisionAPI.calculerRecommandations(parametres).then(res => res.data),
    enabled: false, // Ne pas exécuter automatiquement
  });

  // Mutation pour appliquer les quotas
  const appliquerQuotasMutation = useMutation({
    mutationFn: decisionAPI.appliquerQuotas,
    onSuccess: () => {
      queryClient.invalidateQueries(['grades-config']);
      queryClient.invalidateQueries(['quotas-actuels']);
      alert('✅ Quotas appliqués avec succès !');
    },
    onError: (error) => {
      alert(`❌ Erreur: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Fonction pour calculer les recommandations
  const handleCalculer = () => {
    refetch();
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

    if (confirm('Voulez-vous vraiment appliquer ces quotas ? Cette action mettra à jour la configuration du système.')) {
      appliquerQuotasMutation.mutate(quotasAAppliquer);
    }
  };

  // Fonction pour obtenir la couleur selon le niveau de risque
  const getRisqueColor = (niveau) => {
    switch (niveau) {
      case 'Faible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Moyen':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Élevé':
        return 'bg-red-100 text-red-800 border-red-200';
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Aide à la Décision</h1>
        </div>
        <p className="text-gray-600">
          Calculez les quotas optimaux et analysez la faisabilité du planning avant la génération
        </p>
      </div>

      {/* Paramètres de Configuration */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Paramètres de Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                max="50"
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

          {/* Différence min grades */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Différence minimale entre PR/MC/V et MA
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={parametres.difference_min_grades}
              onChange={(e) => setParametres({ ...parametres, difference_min_grades: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

        </div>

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
                  <span className="font-bold text-sm">Besoins</span>
                </div>
                <p className="text-2xl font-black text-orange-900">{recommandations.statistiques_globales.total_surveillances_necessaires}</p>
              </div>
            </div>
          </div>

          {/* Analyse de Faisabilité */}
          <div className={`rounded-xl shadow-md p-6 border-2 ${
            recommandations.faisabilite.statut === 'OPTIMAL' ? 'bg-green-50 border-green-200' :
            recommandations.faisabilite.statut === 'ACCEPTABLE' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
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
                  <p className="text-2xl font-bold text-green-600">{recommandations.faisabilite.total_surveillances_disponibles}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Nécessaire</p>
                  <p className="text-2xl font-bold text-blue-600">{recommandations.statistiques_globales.total_surveillances_necessaires}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Marge</p>
                  <p className={`text-2xl font-bold ${calculerMarge() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculerMarge() >= 0 ? '+' : ''}{calculerMarge()}
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">🗓️ Créneaux de Non-Souhaits Autorisés</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(recommandations.voeux_autorises).map(([gradeCode, info]) => (
                <div key={gradeCode} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900">{gradeCode}</span>
                    <span className="text-xs text-gray-500">{info.grade_nom}</span>
                  </div>
                  <div className="text-2xl font-black text-purple-600 mb-1">
                    {info.nb_voeux_max_recommande} / {info.nb_total_seances}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {info.pourcentage_voeux_autorises}% autorisés
                  </div>
                  <div className="text-xs">
                    {info.message}
                  </div>
                </div>
              ))}
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
                      <p className="text-sm text-gray-700 mb-1">{alerte.message}</p>
                      <p className="text-xs text-gray-600 italic">{alerte.recommandation}</p>
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
    </div>
  );
}
