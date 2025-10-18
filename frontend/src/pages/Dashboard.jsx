import { useQuery } from '@tanstack/react-query';
import { statistiquesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  FolderOpenIcon,
  ArrowDownTrayIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistiques'],
    queryFn: () => statistiquesAPI.getGlobal().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Chargement des données...</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Enseignants',
      value: stats?.nb_enseignants || 0,
      subtitle: `${stats?.nb_enseignants_actifs || 0} actifs`,
      icon: UserGroupIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    },
    {
      title: 'Examens',
      value: stats?.nb_examens || 0,
      subtitle: `${stats?.nb_salles || 0} salles`,
      icon: AcademicCapIcon,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    },
    {
      title: 'Affectations',
      value: stats?.nb_affectations || 0,
      subtitle: `${stats?.nb_voeux || 0} vœux`,
      icon: ClipboardDocumentCheckIcon,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
    {
      title: 'Couverture',
      value: `${stats?.taux_couverture || 0}%`,
      subtitle: 'Taux de couverture',
      icon: CheckCircleIcon,
      gradient: 'from-orange-500 to-amber-500',
      bgGradient: 'from-orange-50 to-amber-50',
      iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500',
    },
  ];

  const quickActions = [
    {
      title: 'Importer vos données',
      description: 'Téléchargez vos fichiers Excel (Enseignants, Examens, Vœux)',
      icon: FolderOpenIcon,
      href: '/data-manager',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      emoji: '📁',
      priority: true,
    },
    {
      title: 'Générer le planning',
      description: 'Lancez l\'algorithme d\'optimisation automatique',
      icon: SparklesIcon,
      href: '/generation',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      emoji: '✨',
      priority: true,
    },
    {
      title: 'Exporter les documents',
      description: 'Téléchargez le planning en PDF ou Excel',
      icon: ArrowDownTrayIcon,
      href: '/export',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
      emoji: '📥',
      priority: false,
    },
  ];

  const workflowSteps = [
    {
      number: 1,
      title: 'Importer les données',
      description: 'Chargez vos fichiers Excel',
      completed: (stats?.nb_enseignants || 0) > 0 && (stats?.nb_examens || 0) > 0,
    },
    {
      number: 2,
      title: 'Configurer les paramètres',
      description: 'Vérifiez les grades et quotas',
      completed: false,
    },
    {
      number: 3,
      title: 'Générer le planning',
      description: 'Lancez l\'optimisation',
      completed: (stats?.nb_affectations || 0) > 0,
    },
    {
      number: 4,
      title: 'Exporter et partager',
      description: 'Téléchargez les documents',
      completed: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <RocketLaunchIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">
                Tableau de bord
              </h1>
              <p className="text-blue-100 text-lg mt-1">
                Gestion intelligente des surveillances d'examens
              </p>
            </div>
          </div>
          <p className="text-white/90 mt-4 max-w-2xl">
            Bienvenue ! Cette plateforme vous permet d'automatiser complètement la planification 
            des surveillances d'examens grâce à des algorithmes d'optimisation avancés.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className={`stat-card bg-gradient-to-br ${card.bgGradient} border-2 border-white shadow-xl`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`${card.iconBg} p-4 rounded-2xl shadow-lg`}>
                <card.icon className="h-8 w-8 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-600">
                  {card.title}
                </p>
                <p className="text-4xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <SparklesIcon className="w-7 h-7 text-blue-600" />
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <div
              key={action.title}
              onClick={() => navigate(action.href)}
              className={`card-interactive bg-gradient-to-br ${action.bgColor} border-2 ${action.priority ? 'border-blue-300 shadow-lg' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`text-5xl`}>
                  {action.emoji}
                </div>
                {action.priority && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    PRIORITAIRE
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {action.description}
              </p>
              <button className={`btn btn-sm bg-gradient-to-r ${action.color} text-white w-full justify-center flex items-center gap-2`}>
                Accéder
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="card bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          🎯 Processus de génération
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {workflowSteps.map((step, idx) => (
            <div
              key={step.number}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                step.completed
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    step.completed
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.completed ? '✓' : step.number}
                </div>
                {idx < workflowSteps.length - 1 && (
                  <ArrowRightIcon className="w-5 h-5 text-gray-300 hidden md:block" />
                )}
              </div>
              <h3 className={`font-bold text-sm mb-1 ${step.completed ? 'text-green-900' : 'text-gray-900'}`}>
                {step.title}
              </h3>
              <p className={`text-xs ${step.completed ? 'text-green-700' : 'text-gray-600'}`}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Help Box */}
      <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">💡</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Besoin d'aide pour démarrer ?
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Étape 1 :</strong> Rendez-vous sur "Gestionnaire de Données" pour importer vos fichiers Excel</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Étape 2 :</strong> Vérifiez la configuration des grades dans "Configuration"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Étape 3 :</strong> Lancez la génération automatique sur la page "Génération"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Étape 4 :</strong> Consultez et exportez votre planning optimisé</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

