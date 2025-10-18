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
  getById: (id) => api.get(`/enseignants/${id}`),
  create: (data) => api.post('/enseignants/', data),
  update: (id, data) => api.put(`/enseignants/${id}`, data),
  delete: (id) => api.delete(`/enseignants/${id}`),
  search: (params) => api.get('/enseignants/search/', { params }),
  vider: () => api.delete('/enseignants/vider'),
};

// ========== Examens ==========
export const examensAPI = {
  getAll: (params) => api.get('/examens/', { params }),
  getById: (id) => api.get(`/examens/${id}`),
  create: (data) => api.post('/examens/', data),
  update: (id, data) => api.put(`/examens/${id}`, data),
  delete: (id) => api.delete(`/examens/${id}`),
  search: (params) => api.get('/examens/search/', { params }),
  vider: () => api.delete('/examens/vider'),
};

// ========== Voeux ==========
export const voeuxAPI = {
  getAll: (params) => api.get('/voeux/', { params }),
  getById: (id) => api.get(`/voeux/${id}`),
  create: (data) => api.post('/voeux/', data),
  update: (id, data) => api.put(`/voeux/${id}`, data),
  delete: (id) => api.delete(`/voeux/${id}`),
  search: (params) => api.get('/voeux/search/', { params }),
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
  // V1: Algorithme avec quota fixe par grade
  genererV1: (data) => api.post('/generation/generer-v1', data),
  // V2: Algorithme d'optimisation avancé avec système de contraintes hiérarchisées
  genererV2: (data) => api.post('/generation/generer-v2', data),
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
};

// ========== Statistiques ==========
export const statistiquesAPI = {
  getGlobal: () => api.get('/statistiques/'),
  getRepartitionGrades: () => api.get('/statistiques/repartition-grades'),
  getChargeEnseignants: () => api.get('/statistiques/charge-enseignants'),
  getExamensParJour: () => api.get('/statistiques/examens-par-jour'),
  getDisponibilites: () => api.get('/statistiques/disponibilites'),
};

// ========== Grades Configuration ==========
export const gradesAPI = {
  getAll: () => api.get('/grades/'),
  getByCode: (code) => api.get(`/grades/${code}`),
  update: (code, data) => api.put(`/grades/${code}`, data),
  reset: () => api.post('/grades/reset'),
};

// ========== Health Check ==========
export const healthCheck = () => api.get('/health');

export default api;
