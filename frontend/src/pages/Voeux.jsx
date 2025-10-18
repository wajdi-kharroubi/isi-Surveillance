import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voeuxAPI, importAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export default function Voeux() {
  const fileInputRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeance, setFilterSeance] = useState('all');
  const [filterSemestre, setFilterSemestre] = useState('all');
  const [filterEnseignant, setFilterEnseignant] = useState('all');
  const [filterJour, setFilterJour] = useState('all');
  const queryClient = useQueryClient();

  const { data: voeux, isLoading } = useQuery({
    queryKey: ['voeux'],
    queryFn: () => voeuxAPI.getAll().then(res => res.data),
  });

  // Get unique values for filters
  const seances = useMemo(() => {
    if (!voeux) return [];
    return [...new Set(voeux.map(v => v.seance))].filter(Boolean).sort();
  }, [voeux]);

  const semestres = useMemo(() => {
    if (!voeux) return [];
    return [...new Set(voeux.map(v => v.semestre_code_libelle))].filter(Boolean).sort();
  }, [voeux]);

  const enseignants = useMemo(() => {
    if (!voeux) return [];
    const uniqueEnseignants = new Map();
    voeux.forEach(v => {
      if (v.enseignant_nom && v.enseignant_prenom) {
        const fullName = `${v.enseignant_prenom} ${v.enseignant_nom}`;
        if (!uniqueEnseignants.has(fullName)) {
          uniqueEnseignants.set(fullName, {
            nom: v.enseignant_nom,
            prenom: v.enseignant_prenom,
            fullName
          });
        }
      }
    });
    return Array.from(uniqueEnseignants.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [voeux]);

  const jours = useMemo(() => {
    if (!voeux) return [];
    return [...new Set(voeux.map(v => v.jour))].filter(j => j != null).sort((a, b) => a - b);
  }, [voeux]);

  const importMutation = useMutation({
    mutationFn: (file) => importAPI.importVoeux(file),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries(['voeux']);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const getSeanceLabel = (seance) => {
    const seances = {
      'S1': '08:30-10:00',
      'S2': '10:30-12:00',
      'S3': '12:30-14:00',
      'S4': '14:30-16:00'
    };
    return seances[seance] || seance;
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredVoeux = useMemo(() => {
    if (!voeux) return [];
    
    let filtered = [...voeux];
    
    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.enseignant_nom?.toLowerCase().includes(search) ||
        v.enseignant_prenom?.toLowerCase().includes(search) ||
        v.code_smartex_ens?.toLowerCase().includes(search)
      );
    }
    
    // Filter by seance
    if (filterSeance !== 'all') {
      filtered = filtered.filter(v => v.seance === filterSeance);
    }
    
    // Filter by semestre
    if (filterSemestre !== 'all') {
      filtered = filtered.filter(v => v.semestre_code_libelle === filterSemestre);
    }
    
    // Filter by enseignant
    if (filterEnseignant !== 'all') {
      filtered = filtered.filter(v => `${v.enseignant_prenom} ${v.enseignant_nom}` === filterEnseignant);
    }
    
    // Filter by jour
    if (filterJour !== 'all') {
      filtered = filtered.filter(v => v.jour === parseInt(filterJour));
    }
    
    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Special handling for code_smartex_ens - sort as integers
        if (sortConfig.key === 'code_smartex_ens') {
          const aNum = parseInt(aVal);
          const bNum = parseInt(bVal);
          const aIsNaN = isNaN(aNum);
          const bIsNaN = isNaN(bNum);
          
          // Both NaN - equal
          if (aIsNaN && bIsNaN) return 0;
          // a is NaN - put it last
          if (aIsNaN) return 1;
          // b is NaN - put it last
          if (bIsNaN) return -1;
          // Both are numbers - compare numerically
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [voeux, searchTerm, filterSeance, filterSemestre, filterEnseignant, filterJour, sortConfig]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
        <p className="text-gray-600 font-medium">Chargement des vœux...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <CalendarDaysIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Vœux de surveillance</h1>
              <p className="text-purple-100 text-lg mt-1">
                {filteredVoeux?.length || 0} vœu(x)
                {searchTerm || filterSeance !== 'all' || filterSemestre !== 'all' || filterEnseignant !== 'all' || filterJour !== 'all' ? ' (filtrés)' : ''}
                {' '} sur {voeux?.length || 0} au total
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importMutation.isPending}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              className="btn bg-white text-purple-600 hover:bg-purple-50 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Importer Excel
                </>
              )}
            </button>
            {/* <button className="btn bg-white text-purple-600 hover:bg-purple-50 shadow-lg flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Ajouter
            </button> */}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recherche et Filtres</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-3 lg:col-span-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (nom, prénom, code)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Enseignant Filter */}
          <select
            value={filterEnseignant}
            onChange={(e) => setFilterEnseignant(e.target.value)}
            className="input"
          >
            <option value="all">Tous les enseignants</option>
            {enseignants.map(ens => (
              <option key={ens.fullName} value={ens.fullName}>{ens.fullName}</option>
            ))}
          </select>

          {/* Jour Filter */}
          <select
            value={filterJour}
            onChange={(e) => setFilterJour(e.target.value)}
            className="input"
          >
            <option value="all">Tous les jours</option>
            {jours.map(jour => (
              <option key={jour} value={jour}>Jour {jour}</option>
            ))}
          </select>

          {/* Seance Filter */}
          <select
            value={filterSeance}
            onChange={(e) => setFilterSeance(e.target.value)}
            className="input"
          >
            <option value="all">Toutes les séances</option>
            {seances.map(seance => (
              <option key={seance} value={seance}>{seance} - {getSeanceLabel(seance)}</option>
            ))}
          </select>

          {/* Semestre Filter */}
          <select
            value={filterSemestre}
            onChange={(e) => setFilterSemestre(e.target.value)}
            className="input"
          >
            <option value="all">Tous les semestres</option>
            {semestres.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>

        {/* Reset filters */}
        {(searchTerm || filterSeance !== 'all' || filterSemestre !== 'all' || filterEnseignant !== 'all' || filterJour !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterSeance('all');
              setFilterSemestre('all');
              setFilterEnseignant('all');
              setFilterJour('all');
            }}
            className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>
                <button 
                  onClick={() => handleSort('enseignant_nom')}
                  className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                >
                  Enseignant
                  {sortConfig.key === 'enseignant_nom' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('code_smartex_ens')}
                  className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                >
                  Code Smartex
                  {sortConfig.key === 'code_smartex_ens' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('jour')}
                  className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                >
                  Jour
                  {sortConfig.key === 'jour' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('seance')}
                  className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                >
                  Séance
                  {sortConfig.key === 'seance' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Horaire</th>
              <th>
                <button 
                  onClick={() => handleSort('semestre_code_libelle')}
                  className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                >
                  Semestre
                  {sortConfig.key === 'semestre_code_libelle' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('session_libelle')}
                  className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                >
                  Session
                  {sortConfig.key === 'session_libelle' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVoeux?.map((voeu) => (
              <tr key={voeu.id}>
                <td className="font-semibold">
                  {voeu.enseignant_prenom} {voeu.enseignant_nom}
                </td>
                <td>
                  <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg">
                    {voeu.code_smartex_ens || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className="badge badge-info">Jour {voeu.jour}</span>
                </td>
                <td>
                  <span className="badge badge-secondary">{voeu.seance}</span>
                </td>
                <td className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                  {getSeanceLabel(voeu.seance)}
                </td>
                <td className="text-gray-700">{voeu.semestre_code_libelle}</td>
                <td>
                  <span className="badge badge-primary">{voeu.session_libelle}</span>
                </td>
                <td>
                  <button className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors">
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredVoeux?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun vœu trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
