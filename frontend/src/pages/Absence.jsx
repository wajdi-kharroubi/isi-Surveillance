import React, { useEffect, useState } from 'react';
import { absenceAPI } from '../services/api';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  Filter, 
  Download, 
  Grid3x3, 
  List,
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Absence() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [seances, setSeances] = useState([]);
  const [selectedSeanceKey, setSelectedSeanceKey] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [semestreFilter, setSemestreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [heureFilter, setHeureFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [seanceSearches, setSeanceSearches] = useState({});
  const [stats, setStats] = useState({
    total_present: 0,
    total_absent: 0,
    global_taux_presence: 0
  });

  useEffect(() => {
    loadSeances();
    refreshStats();
  }, []);

  const loadSeances = async () => {
    try {
      setLoading(true);
      const res = await absenceAPI.getSeances();
      setSeances(res.data || []);
    } catch (err) {
      console.error('Erreur chargement seances', err);
      toast.error('Erreur lors du chargement des séances');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const res = await absenceAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats', err);
    }
  };

  const exportToExcel = async () => {
    try {
      toast.loading('Génération du fichier Excel...');
      const response = await absenceAPI.exportExcel();
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `absences_enseignants_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('Fichier Excel téléchargé avec succès');
    } catch (err) {
      console.error('Erreur export Excel', err);
      toast.dismiss();
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const seanceKey = (s) => `${s.date}|${s.h_debut}|${s.h_fin}|${s.session}|${s.semestre}`;

  // Unique values for filters (derived from seances)
  const sessionsUniques = Array.from(new Set(seances.map(s => s.session))).sort();
  const semestresUniques = Array.from(new Set(seances.map(s => s.semestre))).sort();
  const datesUniques = Array.from(new Set(seances.map(s => s.date))).sort();
  const heuresUniques = Array.from(new Set(seances.map(s => s.h_debut))).sort();

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0,5);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const formatted = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
      // Capitalize first letter of weekday and month
      return formatted.replace(/^\w/, c => c.toUpperCase()).replace(/(\d+\s)(\w)/, (match, p1, p2) => p1 + p2.toUpperCase());
    } catch (e) {
      return dateStr;
    }
  };

  const formatSessionLabel = (session) => {
    if (!session) return '';
    return session === 'P' ? 'Principale' : session === 'R' ? 'Rattrapage' : session;
  };

  const formatSemestreLabel = (sem) => {
    if (!sem) return '';
    return String(sem).replace(/SEMESTRE/i, 'Semestre');
  };

  const seanceOptions = seances.map((s) => ({
    key: seanceKey(s),
    label: `${formatDate(s.date)} ${formatTime(s.h_debut)}-${formatTime(s.h_fin)} • ${formatSessionLabel(s.session)} • ${formatSemestreLabel(s.semestre)}`,
  }));

  // Apply filters similar to Planning page
  const seancesFiltrees = seances.filter(seance => {
    if (sessionFilter !== 'all' && seance.session !== sessionFilter) return false;
    if (semestreFilter !== 'all' && seance.semestre !== semestreFilter) return false;
    if (dateFilter !== 'all' && seance.date !== dateFilter) return false;
    if (heureFilter !== 'all' && seance.h_debut !== heureFilter) return false;
    if (searchFilter && searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      // check enseignants names and codes
      const match = (seance.enseignants || []).some(e => {
        const nom = (e.nom || '').toLowerCase();
        const prenom = (e.prenom || '').toLowerCase();
        const code = (e.code_smartex || '').toLowerCase();
        return nom.includes(q) || prenom.includes(q) || code.includes(q);
      });
      if (!match) return false;
    }
    return true;
  });

  const filteredSeances = selectedSeanceKey === 'all'
    ? seancesFiltrees
    : seancesFiltrees.filter((s) => seanceKey(s) === selectedSeanceKey);

  // Trier les séances par date puis par heure
  const sortedSeances = [...filteredSeances].sort((a, b) => {
    // Tri par date d'abord
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // Si même date, trier par heure de début
    return a.h_debut.localeCompare(b.h_debut);
  });

  const togglePresence = async (seance, enseignant) => {
    // seance: {date,h_debut,h_fin,session,semestre}
    const payload = {
      enseignant_id: enseignant.id,
      date_exam: seance.date,
      h_debut: seance.h_debut,
      h_fin: seance.h_fin,
      session: seance.session,
      semestre: seance.semestre,
      present: !enseignant.present,
    };

    try {
      const res = await absenceAPI.markPresence(payload);
      // Update local state
      setSeances((prev) =>
        prev.map((s) => {
          if (
            s.date === seance.date &&
            s.h_debut === seance.h_debut &&
            s.h_fin === seance.h_fin &&
            s.session === seance.session &&
            s.semestre === seance.semestre
          ) {
            return {
              ...s,
              enseignants: s.enseignants.map((e) =>
                e.id === enseignant.id ? { ...e, present: res.data.present } : e
              ),
            };
          }
          return s;
        })
      );
      toast.success('Statut mis à jour');
      refreshStats(); // Update stats after marking presence
    } catch (err) {
      console.error('Erreur mark presence', err);
      toast.error('Impossible de mettre à jour');
    }
  };

  const setPresence = async (seance, enseignant, value) => {
    const payload = {
      enseignant_id: enseignant.id,
      date_exam: seance.date,
      h_debut: seance.h_debut,
      h_fin: seance.h_fin,
      session: seance.session,
      semestre: seance.semestre,
      present: value,
    };

    try {
      const res = await absenceAPI.markPresence(payload);
      setSeances((prev) =>
        prev.map((s) => {
          if (
            s.date === seance.date &&
            s.h_debut === seance.h_debut &&
            s.h_fin === seance.h_fin &&
            s.session === seance.session &&
            s.semestre === seance.semestre
          ) {
            return {
              ...s,
              enseignants: s.enseignants.map((e) =>
                e.id === enseignant.id ? { ...e, present: res.data.present } : e
              ),
            };
          }
          return s;
        })
      );
      toast.success('Statut mis à jour');
      refreshStats(); // Update stats after setting presence
    } catch (err) {
      console.error('Erreur set presence', err);
      toast.error('Impossible de mettre à jour');
    }
  };

  if (loading) {
    return (
      <div className="py-10">
        <div className="text-center">
          <p className="text-gray-600">Chargement des séances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header - Compact */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md">
                  Gestion des Présences
                </h1>
                <p className="text-blue-100 text-sm font-medium">
                  Suivi en temps réel de la présence des enseignants
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={loadSeances}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all duration-200 border border-white/30"
              >
                Actualiser
              </button>
              <button 
                onClick={exportToExcel}
                className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-lg flex items-center gap-2 font-semibold text-sm transition-all duration-200 hover:scale-105"
              >
                Exporter Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Total</p>
              <p className="text-3xl font-black text-gray-900">{(stats.total_present || 0) + (stats.total_absent || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">Présents</p>
              <p className="text-3xl font-black text-green-900">{stats.total_present || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-sm border border-red-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium mb-1">Absents</p>
              <p className="text-3xl font-black text-red-900">{stats.total_absent || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
              <XCircleIcon className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">Taux présence</p>
              <p className="text-3xl font-black text-blue-900">{stats.global_taux_presence ?? 0}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border-none bg-transparent focus:ring-0 text-sm font-medium cursor-pointer"
              >
                <option value="all">Toutes les dates</option>
                {datesUniques.map(date => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-4 h-4 text-orange-600" />
              <select
                value={heureFilter}
                onChange={(e) => setHeureFilter(e.target.value)}
                className="border-none bg-transparent focus:ring-0 text-sm font-medium cursor-pointer"
              >
                <option value="all">Toutes les heures</option>
                {heuresUniques.map(heure => (
                  <option key={heure} value={heure}>
                    {formatTime(heure)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <Filter className="w-4 h-4 text-green-600" />
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="border-none bg-transparent focus:ring-0 text-sm font-medium cursor-pointer"
              >
                <option value="all">Toutes les sessions</option>
                <option value="P">Principale</option>
                <option value="R">Rattrapage</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <Filter className="w-4 h-4 text-purple-600" />
              <select
                value={semestreFilter}
                onChange={(e) => setSemestreFilter(e.target.value)}
                className="border-none bg-transparent focus:ring-0 text-sm font-medium cursor-pointer"
              >
                <option value="all">Tous les semestres</option>
                <option value="SEMESTRE 1">Semestre 1</option>
                <option value="SEMESTRE 2">Semestre 2</option>
              </select>
            </div>

            {(sessionFilter !== 'all' || semestreFilter !== 'all' || dateFilter !== 'all' || heureFilter !== 'all') && (
              <button
                onClick={() => {
                  setSessionFilter('all');
                  setSemestreFilter('all');
                  setDateFilter('all');
                  setHeureFilter('all');
                  setSearchFilter('');
                  setSelectedSeanceKey('all');
                }}
                className="ml-auto px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors border border-red-200"
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seances List */}
      <div className="max-w-7xl mx-auto space-y-4">
        {sortedSeances.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-700 mb-2">Aucune séance trouvée</p>
            <p className="text-gray-500">Modifiez vos filtres pour afficher des résultats</p>
          </div>
        )}

        {sortedSeances.map((s, idx) => {
          const seanceKeyStr = seanceKey(s);
          const seanceSearch = seanceSearches[seanceKeyStr] || '';
          
          // Filter enseignants based on search
          const filteredEnseignants = (s.enseignants || []).filter(e => {
            if (!seanceSearch.trim()) return true;
            const searchLower = seanceSearch.toLowerCase();
            const nom = (e.nom || '').toLowerCase();
            const prenom = (e.prenom || '').toLowerCase();
            const code = (e.code_smartex || '').toLowerCase();
            const grade = (e.grade_code || '').toLowerCase();
            return nom.includes(searchLower) || prenom.includes(searchLower) || 
                   code.includes(searchLower) || grade.includes(searchLower);
          });
          
          const presentCount = (s.enseignants || []).filter(e => e.present === true).length;
          const absentCount = (s.enseignants || []).filter(e => e.present === false).length;
          const unknownCount = (s.enseignants || []).filter(e => e.present === null || e.present === undefined).length;
          const total = s.enseignants?.length || 0;
          const tauxPresence = total > 0 ? Math.round((presentCount / total) * 100) : 0;

          return (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Seance Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{formatDate(s.date)}</h3>
                      <p className="text-blue-100 text-sm font-medium">
                        {formatTime(s.h_debut)} - {formatTime(s.h_fin)} • {formatSessionLabel(s.session)} • {formatSemestreLabel(s.semestre)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <div className="text-2xl font-black text-white">{s.examens?.length || 0}</div>
                      <div className="text-xs text-blue-100 font-medium">Salles</div>
                    </div>
                    <div className="text-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <div className="text-2xl font-black text-white">{tauxPresence}%</div>
                      <div className="text-xs text-blue-100 font-medium">Présence</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-gray-700">Présents: <span className="text-green-600">{presentCount}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-semibold text-gray-700">Absents: <span className="text-red-600">{absentCount}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-semibold text-gray-700">Non marqués: <span className="text-gray-600">{unknownCount}</span></span>
                  </div>
                  <div className="ml-auto text-sm text-gray-600 font-medium">
                    Total: {total} enseignant{total > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Search Input */}
              <div className="px-6 py-3 bg-white border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un enseignant..."
                    value={seanceSearch}
                    onChange={(e) => setSeanceSearches({...seanceSearches, [seanceKeyStr]: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {seanceSearch && (
                    <button
                      onClick={() => setSeanceSearches({...seanceSearches, [seanceKeyStr]: ''})}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Enseignants Table */}
              <div className="p-6">
                {filteredEnseignants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 font-medium">Aucun enseignant trouvé</p>
                    {seanceSearch && (
                      <button
                        onClick={() => setSeanceSearches({...seanceSearches, [seanceKeyStr]: ''})}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        Réinitialiser la recherche
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEnseignants
                    .sort((a, b) => {
                      const nomA = (a.nom || '').toLowerCase();
                      const nomB = (b.nom || '').toLowerCase();
                      const prenomA = (a.prenom || '').toLowerCase();
                      const prenomB = (b.prenom || '').toLowerCase();
                      
                      if (nomA < nomB) return -1;
                      if (nomA > nomB) return 1;
                      if (prenomA < prenomB) return -1;
                      if (prenomA > prenomB) return 1;
                      return 0;
                    })
                    .map((e) => (
                    <div 
                      key={e.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        e.present === true 
                          ? 'bg-green-50 border-green-200 hover:border-green-300' 
                          : e.present === false 
                          ? 'bg-red-50 border-red-200 hover:border-red-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-gray-900">{e.prenom} {e.nom}</p>
                            {e.est_responsable && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                Responsable
                              </span>
                            )}
                            {e.grade_code && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                                {e.grade_code}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3">
                          {e.present === null || e.present === undefined ? (
                            <span className="text-gray-400 text-sm font-medium">Non marqué</span>
                          ) : e.present ? (
                            <span className="flex items-center gap-2 text-green-700 font-bold">
                              <CheckCircleIcon className="w-5 h-5" />
                              Présent
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-red-700 font-bold">
                              <XCircleIcon className="w-5 h-5" />
                              Absent
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setPresence(s, e, true)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            e.present === true
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                          }`}
                        >
                          ✓ Présent
                        </button>
                        <button
                          onClick={() => setPresence(s, e, false)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            e.present === false
                              ? 'bg-red-600 text-white shadow-md'
                              : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                          }`}
                        >
                          ✕ Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
