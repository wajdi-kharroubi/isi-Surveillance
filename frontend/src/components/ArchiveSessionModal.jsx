import { useState, useEffect } from 'react';
import { XMarkIcon, ArchiveBoxIcon, CalendarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function ArchiveSessionModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [formData, setFormData] = useState({
    nom_session: '',
    semestre: 'SEMESTRE 1',
    session: 'P',
    annee_universitaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    date_debut: '',
    date_fin: '',
    commentaire: '',
    archive_par: '',
  });

  // Charger automatiquement les dates des examens
  useEffect(() => {
    const fetchExamDates = async () => {
      if (!isOpen) return;
      
      setLoadingDates(true);
      try {
        const response = await api.get('/examens');
        const examens = response.data;
        
        console.log('Examens récupérés:', examens);
        
        if (examens && examens.length > 0) {
          // Trouver la date minimale et maximale (le champ est dateExam)
          const examensAvecDate = examens.filter(e => e.dateExam);
          const dates = examensAvecDate
            .map(e => e.dateExam) // dateExam est déjà au format 'YYYY-MM-DD'
            .sort();
          
          console.log('Dates triées:', dates);
          
          if (dates.length > 0) {
            const dateDebut = dates[0]; // Première date
            const dateFin = dates[dates.length - 1]; // Dernière date
            
            // Trouver le premier examen pour récupérer semestre et session
            const premierExamen = examensAvecDate.find(e => e.dateExam === dateDebut);
            
            // Calculer l'année universitaire à partir de la date du premier examen
            const anneeDebut = new Date(dateDebut).getFullYear();
            const anneeUniversitaire = `${anneeDebut}-${anneeDebut + 1}`;
            
            // Récupérer le semestre et la session du premier examen
            const semestre = premierExamen?.semestre || 'SEMESTRE 1';
            const session = premierExamen?.session || 'P';
            
            // Générer un nom de session automatique
            const sessionLabels = {
              'P': 'Partiel',
              'Pr': 'Principale',
              'C': 'Contrôle',
              'R': 'Rattrapage'
            };
            const sessionLabel = sessionLabels[session] || 'Session';
            const semestreNum = semestre.includes('1') ? '1' : '2';
            const nomSessionAuto = `Session ${sessionLabel} - Semestre ${semestreNum} - ${anneeDebut}`;
            
            console.log('Date début:', dateDebut, 'Date fin:', dateFin);
            console.log('Année universitaire calculée:', anneeUniversitaire);
            console.log('Semestre:', semestre, 'Session:', session);
            console.log('Nom session auto:', nomSessionAuto);
            
            setFormData(prev => ({
              ...prev,
              nom_session: nomSessionAuto,
              date_debut: dateDebut,
              date_fin: dateFin,
              annee_universitaire: anneeUniversitaire,
              semestre: semestre,
              session: session
            }));
          } else {
            console.warn('Aucune date valide trouvée dans les examens');
          }
        } else {
          console.warn('Aucun examen trouvé');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des dates:', error);
      } finally {
        setLoadingDates(false);
      }
    };
    
    fetchExamDates();
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('FormData avant envoi:', formData);
      
      // Vérifier que les dates sont définies
      if (!formData.date_debut || !formData.date_fin) {
        alert('Les dates n\'ont pas pu être récupérées automatiquement. Veuillez réessayer.');
        setLoading(false);
        return;
      }

      const response = await api.post('/archives/archiver-session', formData);
      
      // Réinitialiser le formulaire
      setFormData({
        nom_session: '',
        semestre: 'SEMESTRE 1',
        session: 'P',
        annee_universitaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        date_debut: '',
        date_fin: '',
        commentaire: '',
        archive_par: '',
      });
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error);
      alert(error.response?.data?.detail || 'Erreur lors de l\'archivage de la session');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArchiveBoxIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Archiver une Session
              </h2>
              <p className="text-sm text-gray-600">
                Créer une archive de la session validée
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nom de la session */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la session <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nom_session"
              value={formData.nom_session}
              onChange={handleChange}
              required
              placeholder="Ex: Session Partiel - Semestre 1 - 2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Archivé par */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivé par
            </label>
            <input
              type="text"
              name="archive_par"
              value={formData.archive_par}
              onChange={handleChange}
              placeholder="Nom de l'archiveur (optionnel)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire
            </label>
            <textarea
              name="commentaire"
              value={formData.commentaire}
              onChange={handleChange}
              rows={3}
              placeholder="Notes ou commentaires (optionnel)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Archivage en cours...</span>
                </>
              ) : (
                <>
                  <ArchiveBoxIcon className="w-5 h-5" />
                  <span>Archiver la session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
