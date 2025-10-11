import { useQuery } from '@tanstack/react-query';
import { statistiquesAPI } from '../services/api';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ClipboardDocumentCheckIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistiques'],
    queryFn: () => statistiquesAPI.getGlobal().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Enseignants',
      value: stats?.nb_enseignants || 0,
      subtitle: `${stats?.nb_enseignants_actifs || 0} actifs`,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Examens',
      value: stats?.nb_examens || 0,
      subtitle: `${stats?.nb_salles || 0} salles`,
      icon: AcademicCapIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Affectations',
      value: stats?.nb_affectations || 0,
      subtitle: `${stats?.nb_voeux || 0} vœux`,
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Couverture',
      value: `${stats?.taux_couverture || 0}%`,
      subtitle: 'Taux de couverture',
      icon: CheckCircleIcon,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Vue d'ensemble de la gestion des surveillances
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="card">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {card.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/enseignants"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Gérer les enseignants</h3>
            <p className="text-sm text-gray-500 mt-1">
              Ajouter, modifier ou supprimer des enseignants
            </p>
          </a>
          
          <a
            href="/generation"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Générer le planning</h3>
            <p className="text-sm text-gray-500 mt-1">
              Lancer la génération automatique
            </p>
          </a>
          
          <a
            href="/export"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Exporter les documents</h3>
            <p className="text-sm text-gray-500 mt-1">
              PDF, Excel, convocations
            </p>
          </a>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🎯 Bienvenue !
        </h3>
        <p className="text-sm text-blue-800">
          Cette application vous permet de gérer automatiquement les plannings de surveillance des examens.
          Commencez par importer vos données (enseignants, vœux, examens) puis générez le planning optimal.
        </p>
      </div>
    </div>
  );
}
