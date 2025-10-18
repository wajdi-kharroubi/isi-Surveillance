import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examensAPI, importAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

export default function Examens() {
  const fileInputRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: 'dateExam', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemestre, setFilterSemestre] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterSalle, setFilterSalle] = useState('all');
  const queryClient = useQueryClient();

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens'],
    queryFn: () => examensAPI.getAll().then(res => res.data),
  });

  // Get unique values for filters
  const semestres = useMemo(() => {
    if (!examens) return [];
    return [...new Set(examens.map(e => e.semestre))].filter(Boolean).sort();
  }, [examens]);

  const sessions = useMemo(() => {
    if (!examens) return [];
    return [...new Set(examens.map(e => e.session))].filter(Boolean);
  }, [examens]);

  const salles = useMemo(() => {
    if (!examens) return [];
    return [...new Set(examens.map(e => e.cod_salle))].filter(Boolean).sort();
  }, [examens]);

  const importMutation = useMutation({
    mutationFn: (file) => importAPI.importExamens(file),
    onSuccess: (response) => {
      toast.success(response.data.message);
      queryClient.invalidateQueries(['examens']);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const formatTime = (timeString) => {
    return timeString?.substring(0, 5) || '';
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredExamens = useMemo(() => {
    if (!examens) return [];
    
    let filtered = [...examens];
    
    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.enseignant?.toLowerCase().includes(search) ||
        e.cod_salle?.toLowerCase().includes(search) ||
        e.type_ex?.toLowerCase().includes(search)
      );
    }
    
    // Filter by semestre
    if (filterSemestre !== 'all') {
      filtered = filtered.filter(e => e.semestre === filterSemestre);
    }
    
    // Filter by session
    if (filterSession !== 'all') {
      filtered = filtered.filter(e => e.session === filterSession);
    }
    
    
    // Filter by salle
    if (filterSalle !== 'all') {
      filtered = filtered.filter(e => e.cod_salle === filterSalle);
    }
    
    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle null/undefined - put them at the end
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Special handling for enseignant - treat as integer
        if (sortConfig.key === 'enseignant') {
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
  }, [examens, searchTerm, filterSemestre, filterSession, filterSalle, sortConfig]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
        <p className="text-gray-600 font-medium">Chargement des examens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <AcademicCapIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Examens</h1>
              <p className="text-green-100 text-lg mt-1">
                {filteredExamens?.length || 0} examen(s)
                {searchTerm || filterSemestre !== 'all' || filterSession !== 'all' || filterSalle !== 'all' ? ' (filtrés)' : ''}
                {' '} sur {examens?.length || 0} au total
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
              className="btn bg-white text-green-600 hover:bg-green-50 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Importer Excel
                </>
              )}
            </button>
            {/* <button className="btn bg-white text-green-600 hover:bg-green-50 shadow-lg flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Ajouter
            </button> */}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-r from-gray-50 to-green-50 p-6 rounded-2xl border-2 border-gray-200 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 flex flex-wrap gap-3">
            {/* Search Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
              <MagnifyingGlassIcon className="w-5 h-5 text-green-600" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
              />
            </div>

            {/* Semestre Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
              <FunnelIcon className="w-5 h-5 text-blue-600" />
              <select
                value={filterSemestre}
                onChange={(e) => setFilterSemestre(e.target.value)}
                className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
              >
                <option value="all">Tous les semestres</option>
                {semestres.map(sem => (
                  <option key={sem} value={sem}>Semestre {sem.replace('SEMESTRE ', '')}</option>
                ))}
              </select>
            </div>

            {/* Session Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
              <FunnelIcon className="w-5 h-5 text-purple-600" />
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
              >
                <option value="all">Toutes les sessions</option>
                {sessions.map(sess => (
                  <option key={sess} value={sess}>
                    {sess === 'P' ? 'Principale' : sess === 'R' ? 'Rattrapage' : sess}
                  </option>
                ))}
              </select>
            </div>

            {/* Salle Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-gray-200 shadow-sm">
              <FunnelIcon className="w-5 h-5 text-pink-600" />
              <select
                value={filterSalle}
                onChange={(e) => setFilterSalle(e.target.value)}
                className="border-none focus:ring-0 outline-none focus:outline-none font-semibold text-sm bg-transparent cursor-pointer"
              >
                <option value="all">Toutes les salles</option>
                {salles.map(salle => (
                  <option key={salle} value={salle}>{salle}</option>
                ))}
              </select>
            </div>

            {/* Reset filters */}
            {(searchTerm || filterSemestre !== 'all' || filterSession !== 'all' || filterSalle !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterSemestre('all');
                  setFilterSession('all');
                  setFilterSalle('all');
                }}
                className="px-4 py-2.5 bg-red-100 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors border-2 border-red-200"
              >
                Réinitialiser filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>
                <button 
                  onClick={() => handleSort('dateExam')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Date
                  {sortConfig.key === 'dateExam' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('h_debut')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Horaire
                  {sortConfig.key === 'h_debut' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('semestre')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Semestre
                  {sortConfig.key === 'semestre' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('session')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Session
                  {sortConfig.key === 'session' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('type_ex')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Type
                  {sortConfig.key === 'type_ex' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('enseignant')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Responsable
                  {sortConfig.key === 'enseignant' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  onClick={() => handleSort('cod_salle')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  Salle
                  {sortConfig.key === 'cod_salle' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredExamens?.map((exam) => (
              <tr key={exam.id}>
                <td className="font-semibold">{formatDate(exam.dateExam)}</td>
                <td>
                  <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                    {formatTime(exam.h_debut)} - {formatTime(exam.h_fin)}
                  </div>
                </td>
                <td>
                  <span className="badge badge-info">Semestre {exam.semestre.replace('SEMESTRE ', '')}</span>
                </td>
                <td>
                  <span className={`badge ${exam.session === 'P' || exam.session === 'Principale' ? 'badge-success' : 'badge-warning'}`}>
                    {exam.session === 'P' ? 'Principale' : 'Rattrapage'}
                  </span>
                </td>
                <td className="text-gray-700">{exam.type_ex === 'E' ? 'Examen' : 'DS'}</td>
                <td className="text-gray-600">{exam.enseignant}</td>
                <td>
                  <span className="badge badge-secondary">{exam.cod_salle}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredExamens?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun examen trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
