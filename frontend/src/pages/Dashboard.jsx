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
  DocumentCheckIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['statistiques'],
    queryFn: () => statistiquesAPI.getGlobal().then(res => res.data),
  });

  // Fetch dernière génération stats
  const { data: generationStats } = useQuery({
    queryKey: ['generation-stats'],
    queryFn: () => statistiquesAPI.getDerniereGeneration(false).then(res => res.data),
    enabled: (stats?.nb_affectations || 0) > 0,
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
      completed: true,
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
                  {generationStats?.nb_affectations || stats?.nb_affectations || 0}
                </div>
                <div className="text-xs text-blue-100 uppercase tracking-wide">
                  Surveillances
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
      {/* <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      </div> */}

      {/* Statistics Preview - Only show if generation exists */}
      {generationStats && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200">
          <div className="px-8 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Résultats de génération</h2>
                  <p className="text-gray-600 text-sm font-medium">
                    Dernière génération : {generationStats.date_generation}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/statistiques')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                Voir tout
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Souhaits Card */}
              <div 
                onClick={() => navigate('/statistiques', { state: { activeTab: 'souhaits' } })}
                className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DocumentCheckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                    generationStats.taux_souhaits_respectes >= 90 
                      ? 'bg-green-100 text-green-700' 
                      : generationStats.taux_souhaits_respectes >= 70
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {generationStats.taux_souhaits_respectes}%
                  </div>
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">Souhaits respectés</h3>
                <p className="text-gray-600 text-sm">
                  {generationStats.nb_souhaits_respectes} / {generationStats.nb_souhaits_total}
                </p>
                {generationStats.nb_souhaits_violes > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-red-600 text-xs font-medium">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {generationStats.nb_souhaits_violes} violation{generationStats.nb_souhaits_violes > 1 ? 's' : ''}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-end text-blue-600 text-xs font-medium">
                  Voir détails <ArrowRightIcon className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Responsables Card */}
              <div 
                onClick={() => navigate('/statistiques', { state: { activeTab: 'responsables' } })}
                className="bg-green-50 rounded-xl p-4 border-2 border-green-100 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                    generationStats.taux_responsables_presents >= 90 
                      ? 'bg-green-100 text-green-700' 
                      : generationStats.taux_responsables_presents >= 70
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {generationStats.taux_responsables_presents}%
                  </div>
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">Responsables présents</h3>
                <p className="text-gray-600 text-sm">
                  {generationStats.nb_responsables_presents} / {generationStats.nb_responsables_total}
                </p>
                {generationStats.nb_responsables_absents > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-orange-600 text-xs font-medium">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {generationStats.nb_responsables_absents} absent{generationStats.nb_responsables_absents > 1 ? 's' : ''}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-end text-green-600 text-xs font-medium">
                  Voir détails <ArrowRightIcon className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Contraintes Card */}
              <div 
                onClick={() => navigate('/statistiques', { state: { activeTab: 'contraintes' } })}
                className="bg-purple-50 rounded-xl p-4 border-2 border-purple-100 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarDaysIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                    generationStats.taux_contraintes_seances_respectees >= 90 
                      ? 'bg-green-100 text-green-700' 
                      : generationStats.taux_contraintes_seances_respectees >= 70
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {generationStats.taux_contraintes_seances_respectees}%
                  </div>
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">Contraintes respectées</h3>
                <p className="text-gray-600 text-sm">
                  {generationStats.nb_contraintes_seances_respectees} / {generationStats.nb_contraintes_seances_total}
                </p>
                {generationStats.nb_contraintes_seances_violees > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-red-600 text-xs font-medium">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {generationStats.nb_contraintes_seances_violees} dépassement{generationStats.nb_contraintes_seances_violees > 1 ? 's' : ''}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-purple-200 flex items-center justify-end text-purple-600 text-xs font-medium">
                  Voir détails <ArrowRightIcon className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{generationStats.nb_affectations}</span> affectations créées
                {' • '}
                <span className="font-semibold text-gray-900">{generationStats.temps_generation}ms</span> de génération
              </div>
              <button 
                onClick={() => navigate('/statistiques')}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors group"
              >
                <span>Cliquez pour voir tous les détails</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

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

