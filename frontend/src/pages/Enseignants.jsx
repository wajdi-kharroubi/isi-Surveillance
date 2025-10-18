import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enseignantsAPI, importAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

export default function Enseignants() {
  const fileInputRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSurveillance, setFilterSurveillance] = useState('all');
  const queryClient = useQueryClient();

  const { data: enseignants, isLoading } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
  });

  // Get unique grades for filter
  const grades = useMemo(() => {
    if (!enseignants) return [];
    return [...new Set(enseignants.map(e => e.grade_code))].filter(Boolean);
  }, [enseignants]);

  // Search and filter
  const filteredEnseignants = useMemo(() => {
    if (!enseignants) return [];
    
    let filtered = [...enseignants];
    
    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nom?.toLowerCase().includes(search) ||
        e.prenom?.toLowerCase().includes(search) ||
        e.email?.toLowerCase().includes(search) ||
        e.code_smartex?.toLowerCase().includes(search)
      );
    }
    
    // Filter by grade
    if (filterGrade !== 'all') {
      filtered = filtered.filter(e => e.grade_code === filterGrade);
    }
    
    // Filter by surveillance
    if (filterSurveillance !== 'all') {
      filtered = filtered.filter(e => 
        filterSurveillance === 'yes' ? e.participe_surveillance : !e.participe_surveillance
      );
    }
    
    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        // Special handling for code_smartex - treat as integer
        if (sortConfig.key === 'code_smartex') {
          const aNum = parseInt(aVal);
          const bNum = parseInt(bVal);
          
          // Handle NaN values - put them at the end
          const aIsNaN = isNaN(aNum);
          const bIsNaN = isNaN(bNum);
          
          if (aIsNaN && bIsNaN) return 0;
          if (aIsNaN) return 1; // a goes to the end
          if (bIsNaN) return -1; // b goes to the end
          
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
  }, [enseignants, searchTerm, filterGrade, filterSurveillance, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const importMutation = useMutation({
    mutationFn: (file) => importAPI.importEnseignants(file),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries(['enseignants']);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Chargement des enseignants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <UserGroupIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Enseignants</h1>
              <p className="text-cyan-100 text-lg mt-1">
                {filteredEnseignants?.length || 0} enseignant(s) 
                {searchTerm || filterGrade !== 'all' || filterSurveillance !== 'all' ? ' (filtrés)' : ''} 
                {' '} sur {enseignants?.length || 0} au total
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
              className="btn bg-white text-blue-600 hover:bg-blue-50 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Importer Excel
                </>
              )}
            </button>
            {/* <button className="btn bg-white text-blue-600 hover:bg-blue-50 shadow-lg flex items-center gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (nom, prénom, email, code)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Grade Filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="input"
          >
            <option value="all">Tous les grades</option>
            {grades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>

          {/* Surveillance Filter */}
          <select
            value={filterSurveillance}
            onChange={(e) => setFilterSurveillance(e.target.value)}
            className="input"
          >
            <option value="all">Toutes les surveillances</option>
            <option value="yes">Participe</option>
            <option value="no">Ne participe pas</option>
          </select>
        </div>

        {/* Reset filters */}
        {(searchTerm || filterGrade !== 'all' || filterSurveillance !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterGrade('all');
              setFilterSurveillance('all');
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                  onClick={() => handleSort('code_smartex')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Code Smartex
                  {sortConfig.key === 'code_smartex' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('nom')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Nom
                  {sortConfig.key === 'nom' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('prenom')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Prénom
                  {sortConfig.key === 'prenom' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Email
                  {sortConfig.key === 'email' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('grade_code')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Grade
                  {sortConfig.key === 'grade_code' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('participe_surveillance')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Surveillance
                  {sortConfig.key === 'participe_surveillance' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEnseignants?.map((ens) => (
              <tr key={ens.id}>
                <td>
                  <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">
                    {ens.code_smartex}
                  </span>
                </td>
                <td className="font-semibold">{ens.nom}</td>
                <td>{ens.prenom}</td>
                <td className="text-gray-600 text-sm">{ens.email}</td>
                <td>
                  <span className="badge badge-info">{ens.grade_code}</span>
                </td>
                <td>
                  {ens.participe_surveillance ? (
                    <span className="badge badge-success">✓ Oui</span>
                  ) : (
                    <span className="badge badge-danger">✕ Non</span>
                  )}
                </td>
                <td>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredEnseignants?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun enseignant trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
