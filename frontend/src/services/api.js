import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// ========== Enseignants ==========
export const enseignantsAPI = {
  getAll: (params) => api.get('/enseignants/', { params }),
  vider: () => api.delete('/enseignants/vider'),
  updateException: (enseignantId, data) => api.patch(`/enseignants/${enseignantId}/exception`, data),
  resetException: (enseignantId) => api.delete(`/enseignants/${enseignantId}/exception`),
};

// ========== Examens ==========
export const examensAPI = {
  getAll: (params) => api.get('/examens/', { params }),
  vider: () => api.delete('/examens/vider'),
};

// ========== Voeux ==========
export const voeuxAPI = {
  getAll: (params) => api.get('/voeux/', { params }),
  vider: () => api.delete('/voeux/vider'),
};

// ========== Import ==========
export const importAPI = {
  importEnseignants: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/enseignants', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importVoeux: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/voeux', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importExamens: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/examens', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ========== Génération ==========
export const generationAPI = {
  // V3: Algorithme d'optimisation V3 avec quota maximum strict
  genererV3: (data) => api.post('/generation/generer-v3', data),
  reinitialiser: () => api.delete('/generation/reinitialiser'),
  verifier: () => api.get('/generation/verification'),
};

// ========== Export ==========
export const exportAPI = {
  planningPDF: (params) => 
    api.post('/export/planning-pdf', null, { 
      params, 
      responseType: 'blob' 
    }),
  convocations: () => 
    api.post('/export/convocations', null, { 
      responseType: 'blob' 
    }),
  convocationsPDF: () => 
    api.post('/export/convocationsPDF', null, { 
      responseType: 'blob' 
    }),
  convocationEnseignant: (enseignantId) =>
    api.post(`/export/convocation/${enseignantId}`, null, {
      responseType: 'blob'
    }),
  convocationEnseignantPDF: (enseignantId) =>
    api.post(`/export/convocationPDF/${enseignantId}`, null, {
      responseType: 'blob'
    }),
  listesCreneaux: () => 
    api.post('/export/listes-creneaux', null, { 
      responseType: 'blob' 
    }),
  listesCreneauxPDF: () => 
    api.post('/export/listes-creneauxPDF', null, { 
      responseType: 'blob' 
    }),
  listeCreneau: (params) =>
    api.post('/export/liste-creneau', null, {
      params,
      responseType: 'blob'
    }),
  listeCreneauPDF: (params) =>
    api.post('/export/liste-creneauPDF', null, {
      params,
      responseType: 'blob'
    }),
  planningExcel: (params) => 
    api.post('/export/planning-excel', null, { 
      params, 
      responseType: 'blob' 
    }),
  // Nouveaux exports CSV et XLSX pour les convocations
  convocationsCSV: () =>
    api.get('/export/convocations/csv', {
      responseType: 'blob'
    }),
  convocationsXLSX: () =>
    api.get('/export/convocations/xlsx', {
      responseType: 'blob'
    }),
  // Endpoints Gmail OAuth2
  getGmailAuthUrl: () =>
    api.get('/export/gmail/auth-url'),
  handleGmailOAuthCallback: (data) =>
    api.post('/export/gmail/oauth-callback', data),
  testerTokenGmail: (tokenInfo) =>
    api.post('/export/gmail/tester-token', tokenInfo),
  envoyerConvocationsGmail: (data) =>
    api.post('/export/gmail/envoyer-convocations', data),
  listeFichiers: () => api.get('/export/fichiers'),
  telechargerFichier: (filename) => 
    api.get(`/export/fichiers/${filename}`, { 
      responseType: 'blob' 
    }),
};

// ========== Planning ==========
export const planningAPI = {
  getEmploiEnseignant: (enseignantId) => api.get(`/planning/emploi-enseignant/${enseignantId}`),
  getEmploiSeances: () => api.get('/planning/emploi-seances'),
  supprimerEnseignantSeance: (data) => api.delete('/planning/supprimer-enseignant-seance', { data }),
  ajouterEnseignantSeance: (data) => api.post('/planning/ajouter-enseignant-seance', data),
  ajouterEnseignantParDateHeure: (data) => api.post('/planning/ajouter-enseignant-par-date-heure', data),
  verifierContraintesAjout: (data) => api.post('/planning/verifier-contraintes-ajout', data),
  verifierContraintesEchange: (data) => api.post('/planning/verifier-contraintes-echange', data),
  exchangeEnseignants: (data) => api.post('/planning/exchange-enseignants', data),
};

// ========== Absences (Présences) ==========
export const absenceAPI = {
  getSeances: () => api.get('/planning/absences/seances'),
  markPresence: (data) => api.post('/planning/absences/mark', data),
  getStats: () => api.get('/planning/absences/stats'),
  exportExcel: () => 
    api.get('/planning/absences/export-excel', { 
      responseType: 'blob' 
    }),
};

// ========== Statistiques ==========
export const statistiquesAPI = {
  getGlobal: () => api.get('/statistiques/'),
  getChargeEnseignants: () => api.get('/statistiques/charge-enseignants'),
  getDerniereGeneration: (includeDetails = true) => 
    api.get('/statistiques/generations/derniere', { 
      params: { include_details: includeDetails } 
    }),
  getGenerations: (limit = 10, includeDetails = false) =>
    api.get('/statistiques/generations', {
      params: { limit, include_details: includeDetails }
    })
};

// ========== Grades Configuration ==========
export const gradesAPI = {
  getAll: () => api.get('/grades/'),
  update: (code, data) => api.put(`/grades/${code}`, data),
  reset: () => api.post('/grades/reset'),
};

// ========== Aide à la Décision ==========
export const decisionAPI = {
  calculerRecommandations: (params) => api.post('/decision/calculer-recommandations', params),
  appliquerQuotas: (quotas) => api.post('/decision/appliquer-quotas', quotas),
  getQuotasActuels: () => api.get('/decision/quotas-actuels'),
  exporterVoeuxAutorises: (params) => 
    api.post('/decision/exporter-voeux-autorises', params, {
      responseType: 'blob'
    }),
  importerExceptions: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/decision/importer-exceptions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getEnseignantsExceptions: () => api.get('/decision/enseignants-exceptions'),
  supprimerExceptions: () => api.delete('/decision/supprimer-exceptions'),
};

// ========== Health Check ==========
export const healthCheck = () => api.get('/health');

export default api;
