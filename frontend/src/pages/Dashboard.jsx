import { useQuery } from '@tanstack/react-query';
import { statistiquesAPI, gradesAPI } from '../services/api';
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
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['statistiques'],
    queryFn: () => statistiquesAPI.getGlobal().then(res => res.data),
  });

  const { data: grades } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesAPI.getAll().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-red-500 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-sm">Impossible de charger les statistiques. Vérifiez que le backend est démarré.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
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
      subtitle: `${stats?.nb_voeux || 0} souhaits`,
      icon: ClipboardDocumentCheckIcon,
      gradient: 'from-pink-600 to-pink-600',
      bgGradient: 'from-pink-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-pink-600 to-pink-600',
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
      description: 'Téléchargez vos fichiers Excel (Enseignants, Examens, Souhaits)',
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
      color: 'from-pink-600 to-pink-600',
      bgColor: 'from-pink-50 to-pink-50',
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

  // Vérifier si la configuration des grades est faite
  const isGradesConfigured = grades && grades.length > 0 && grades.some(grade => 
    grade.nb_surveillances > 0 || grade.nb_obligatoire > 0
  );

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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <RocketLaunchIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Bonjour !
                  </h1>
                  <p className="text-blue-100 text-sm">
                    Prêt à optimiser vos surveillances d'examens
                  </p>
                </div>
              </div>
              <p className="text-white/90 text-sm max-w-lg leading-relaxed">
                {(stats?.nb_examens || 0) === 0 
                  ? "Commencez par importer vos données d'examens pour voir les statistiques et générer votre planning."
                  : "Gérez intelligemment la planification des surveillances avec nos algorithmes d'optimisation avancés."
                }
              </p>
            </div>
            
            {/* Quick Stats in Hero */}
            <div className="hidden lg:flex items-center gap-6 ml-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {stats?.nb_enseignants || 0}
                </div>
                <div className="text-xs text-blue-100 uppercase tracking-wide">
                  Enseignants
                </div>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {(stats?.nb_examens || 0) === 0 ? "-" : (stats?.nb_examens || 0)}
                </div>
                <div className="text-xs text-blue-100 uppercase tracking-wide">
                  Examens
                </div>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {(stats?.nb_affectations || 0) === 0 ? "-" : (stats?.nb_affectations || 0)}
                </div>
                <div className="text-xs text-blue-100 uppercase tracking-wide">
                  Affectations
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button 
              onClick={() => navigate('/data-manager')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg backdrop-blur-sm transition-all duration-200 flex items-center gap-2"
            >
              <FolderOpenIcon className="w-4 h-4" />
              {(stats?.nb_examens || 0) === 0 ? "Importer des données" : "Gérer les données"}
            </button>
            {(stats?.nb_examens || 0) > 0 && (
              <button 
                onClick={() => navigate('/generation')}
                className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-all duration-200 flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                Générer le planning
              </button>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
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
              className={`card-interactive bg-gradient-to-br ${action.bgColor} border-2 ${action.priority ? 'border-blue-300 shadow-lg' : 'border-gray-200'} flex flex-col h-full`}
            >
              <div className="flex-1">
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
              </div>
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
          <div className="text-4xl">{(stats?.nb_examens || 0) === 0 ? "💡" : "💡"}</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {(stats?.nb_examens || 0) === 0 ? "Prêt à commencer ?" : "Besoin d'aide pour démarrer ?"}
            </h3>
            {(stats?.nb_examens || 0) === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Pour voir des statistiques et générer votre planning, vous devez d'abord importer vos données.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium mb-2">📋 Fichiers requis :</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Fichier Excel des enseignants</li>
                    <li>• Fichier Excel des examens</li>
                    <li>• Fichier Excel des souhaits (optionnel)</li>
                  </ul>
                </div>
                <button 
                  onClick={() => navigate('/data-manager')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aller à l'import de données →
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

