import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  FolderOpenIcon,
  FolderIcon,
  HeartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { 
    name: 'Tableau de bord', 
    href: '/', 
    icon: HomeIcon, 
    description: 'Vue d\'ensemble' 
  },
  { 
    name: 'Gestion des Données', 
    icon: FolderOpenIcon, 
    description: 'Importer et gérer',
    highlight: true,
    subItems: [
      { name: 'Gestionnaire de Fichiers', href: '/data-manager', description: 'Import centralisé', icon: FolderIcon },
      { name: 'Enseignants', href: '/enseignants', description: 'Liste des enseignants', icon: UserGroupIcon },
      { name: 'Examens', href: '/examens', description: 'Calendrier d\'examens', icon: AcademicCapIcon },
      { name: 'Souhaits', href: '/voeux', description: 'Préférences', icon: HeartIcon },
    ]
  },
  { 
    name: 'Planning', 
    icon: SparklesIcon, 
    description: 'Génération & Consultation',
    highlight: true,
    subItems: [
      { name: 'Génération', href: '/generation', description: 'Créer le planning', icon: SparklesIcon },
      { name: 'Consulter Planning', href: '/planning', description: 'Voir le planning', icon: DocumentTextIcon },
      { name: 'Export', href: '/export', description: 'Télécharger', icon: ArrowDownTrayIcon },
    ]
  },
  // { 
  //   name: 'Statistiques', 
  //   href: '/statistiques', 
  //   icon: ChartBarIcon, 
  //   description: 'Analyses' 
  // },
  { 
    name: 'Configuration', 
    href: '/config-grades', 
    icon: Cog6ToothIcon, 
    description: 'Paramètres' 
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isSubItemActive = (subItems) => {
    return subItems?.some(item => location.pathname === item.href);
  };

  return (
    <div className="min-h-screen">
      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl shadow-lg hover:shadow-xl hover:border-blue-400 hover:text-blue-600 transition-all duration-300 hover:scale-105"
      >
        {isSidebarOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-white shadow-2xl z-40 border-r border-gray-100 transition-all duration-300 ${
          isSidebarOpen ? 'w-96 translate-x-0' : 'w-0 -translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="relative h-52 px-6 bg-white border-b-2 border-gray-100 flex flex-col items-start justify-center mt-4">
            {/* Logo Image - Replace src with your actual logo path */}
            <div className="w-80 h-40 flex items-center justify-center">
              <img 
                src="./logo.png" 
                alt="Logo" 
                className="w-80 h-40 object-contain"
                onError={(e) => {
                  // Fallback to emoji if image not found
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span className="text-4xl" style={{ display: 'none' }}>📋</span>
            </div>
            {/* Title */}
            <div className="text-left">
              <h1 className="text-xl font-bold text-gray-900">
                Surveillance ISI
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Gestion des Examens</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isMenuOpen = openMenus[item.name];
              const isAnySubItemActive = hasSubItems && isSubItemActive(item.subItems);

              return (
                <div key={item.name}>
                  {/* Main Menu Item */}
                  {hasSubItems ? (
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`
                        w-full group relative flex items-center px-6 py-4 text-sm font-semibold rounded-lg transition-all duration-300 overflow-hidden
                        ${
                          isAnySubItemActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40 border border-blue-500/30'
                            : item.highlight
                            ? 'text-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md border border-blue-200/50 hover:border-blue-300'
                            : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-transparent hover:border-gray-200'
                        }
                      `}
                    >
                      <div className={`p-2 rounded-md mr-4 transition-all duration-300 ${
                        isAnySubItemActive 
                          ? 'bg-white/20' 
                          : item.highlight 
                          ? 'bg-blue-100 group-hover:bg-blue-200' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <item.icon
                          className={`h-5 w-5 transition-all duration-300 ${
                            isAnySubItemActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-semibold ${isAnySubItemActive ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </div>
                        {!isAnySubItemActive && (
                          <div className="text-xs text-gray-500 mt-0.5 font-normal">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className={`ml-3 p-1 rounded-full transition-all duration-300 ${
                        isAnySubItemActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        {isMenuOpen ? (
                          <ChevronDownIcon className={`w-4 h-4 ${isAnySubItemActive ? 'text-white' : 'text-gray-600'}`} />
                        ) : (
                          <ChevronRightIcon className={`w-4 h-4 ${isAnySubItemActive ? 'text-white' : 'text-gray-600'}`} />
                        )}
                      </div>
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      className={`
                        group relative flex items-center px-6 py-4 text-sm font-semibold rounded-lg transition-all duration-300 overflow-hidden
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40 border border-blue-500/30'
                            : item.highlight
                            ? 'text-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md border border-blue-200/50 hover:border-blue-300'
                            : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-transparent hover:border-gray-200'
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full shadow-sm"></div>
                      )}
                      <div className={`p-2 rounded-md mr-4 transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/20' 
                          : item.highlight 
                          ? 'bg-blue-100 group-hover:bg-blue-200' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <item.icon
                          className={`h-5 w-5 transition-all duration-300 ${
                            isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </div>
                        {!isActive && (
                          <div className="text-xs text-gray-500 mt-0.5 font-normal">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  )}

                  {/* SubMenu Items */}
                  {hasSubItems && isMenuOpen && (
                    <div className="mt-2 ml-6 space-y-1 animate-fadeIn">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location.pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={`
                              group flex items-center px-4 py-3 text-sm rounded-md transition-all duration-300 border-l-2
                              ${
                                isSubActive
                                  ? 'bg-blue-50 text-blue-800 font-semibold border-blue-400 shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className={`p-1.5 rounded-md mr-3 transition-all duration-300 ${
                              isSubActive 
                                ? 'bg-blue-100' 
                                : 'bg-gray-100 group-hover:bg-gray-200'
                            }`}>
                              <subItem.icon
                                className={`w-4 h-4 transition-all duration-300 ${
                                  isSubActive ? 'text-blue-600' : 'text-gray-500'
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <div className={isSubActive ? 'text-blue-900' : 'text-gray-800'}>
                                {subItem.name}
                              </div>
                              {!isSubActive && (
                                <div className="text-xs text-gray-500 mt-0.5 font-normal">
                                  {subItem.description}
                                </div>
                              )}
                            </div>
                            {isSubActive && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-sm"></div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
            {/* <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                U
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">Gestionnaire</p>
              </div>
            </div> */}
            <div className="text-center">
              <p className="text-xs text-gray-400">Version 1.0.0</p>
              <p className="text-xxs text-gray-300">&#169; Marwen Benammou - Wajdi Kharroubi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
        ></div>
      )}

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'ml-96' : 'ml-0'
        }`}
      >
        <main className="p-8 max-w-[1800px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
