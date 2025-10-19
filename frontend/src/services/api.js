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
  convocationEnseignant: (enseignantId) =>
    api.post(`/export/convocation/${enseignantId}`, null, {
      responseType: 'blob'
    }),
  listesCreneaux: () => 
    api.post('/export/listes-creneaux', null, { 
      responseType: 'blob' 
    }),
  listeCreneau: (params) =>
    api.post('/export/liste-creneau', null, {
      params,
      responseType: 'blob'
    }),
  planningExcel: (params) => 
    api.post('/export/planning-excel', null, { 
      params, 
      responseType: 'blob' 
    }),
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
  ajouterEnseignantParDateHeure: (data) => api.post('/planning/ajouter-enseignant-par-date-heure', data),
};

// ========== Statistiques ==========
export const statistiquesAPI = {
  getGlobal: () => api.get('/statistiques/'),
  getChargeEnseignants: () => api.get('/statistiques/charge-enseignants')
};

// ========== Grades Configuration ==========
export const gradesAPI = {
  getAll: () => api.get('/grades/'),
  update: (code, data) => api.put(`/grades/${code}`, data),
  reset: () => api.post('/grades/reset'),
};

// ========== Health Check ==========
export const healthCheck = () => api.get('/health');

export default api;
