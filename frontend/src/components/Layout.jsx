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
      { name: 'Gestionnaire de Fichiers', href: '/data-manager', description: 'Import centralisé' },
      { name: 'Enseignants', href: '/enseignants', description: 'Liste des enseignants' },
      { name: 'Examens', href: '/examens', description: 'Calendrier d\'examens' },
      { name: 'Vœux', href: '/voeux', description: 'Préférences' },
    ]
  },
  { 
    name: 'Planning', 
    icon: SparklesIcon, 
    description: 'Génération & Consultation',
    highlight: true,
    subItems: [
      { name: 'Génération', href: '/generation', description: 'Créer le planning' },
      { name: 'Consulter Planning', href: '/planning', description: 'Voir le planning' },
      { name: 'Export', href: '/export', description: 'Télécharger' },
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
          isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="relative h-28 px-6 bg-white border-b-2 border-gray-100 flex items-center gap-4 mt-16">
            <div className="relative flex items-center gap-4 w-full">
              {/* Logo Image - Replace src with your actual logo path */}
              <div className="w-16 h-16 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    // Fallback to emoji if image not found
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <span className="text-4xl" style={{ display: 'none' }}>📋</span>
              </div>
              {/* Title */}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">
                  Surveillance ISI
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Gestion des Examens</p>
              </div>
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
                        w-full group relative flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200
                        ${
                          isAnySubItemActive
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                            : item.highlight
                            ? 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-2 border-dashed border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                          isAnySubItemActive ? 'text-white' : item.highlight ? 'text-blue-500' : 'text-gray-400'
                        }`}
                      />
                      <div className="flex-1 text-left">
                        <div className={isAnySubItemActive ? 'text-white' : ''}>{item.name}</div>
                        {!isAnySubItemActive && (
                          <div className="text-xs text-gray-500 group-hover:text-gray-600">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isMenuOpen ? (
                        <ChevronDownIcon className={`w-4 h-4 ml-2 ${isAnySubItemActive ? 'text-white' : 'text-gray-400'}`} />
                      ) : (
                        <ChevronRightIcon className={`w-4 h-4 ml-2 ${isAnySubItemActive ? 'text-white' : 'text-gray-400'}`} />
                      )}
                      {item.highlight && !isAnySubItemActive && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full font-semibold">
                          ★
                        </span>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      className={`
                        group relative flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                            : item.highlight
                            ? 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-2 border-dashed border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full"></div>
                      )}
                      <item.icon
                        className={`mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-white' : item.highlight ? 'text-blue-500' : 'text-gray-400'
                        }`}
                      />
                      <div className="flex-1">
                        <div className={isActive ? 'text-white' : ''}>{item.name}</div>
                        {!isActive && (
                          <div className="text-xs text-gray-500 group-hover:text-gray-600">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.highlight && !isActive && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full font-semibold">
                          ★
                        </span>
                      )}
                    </Link>
                  )}

                  {/* SubMenu Items */}
                  {hasSubItems && isMenuOpen && (
                    <div className="mt-1 ml-4 space-y-1 animate-slideDown">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location.pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={`
                              group flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200
                              ${
                                isSubActive
                                  ? 'bg-blue-100 text-blue-700 font-semibold shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              isSubActive ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-gray-400'
                            }`}></div>
                            <div className="flex-1">
                              <div>{subItem.name}</div>
                              {!isSubActive && (
                                <div className="text-xs text-gray-400 group-hover:text-gray-500">
                                  {subItem.description}
                                </div>
                              )}
                            </div>
                            {isSubActive && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
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
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                U
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">Gestionnaire</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Version 2.0.0</p>
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
          isSidebarOpen ? 'ml-72' : 'ml-0'
        }`}
      >
        <main className="p-8 max-w-[1800px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
