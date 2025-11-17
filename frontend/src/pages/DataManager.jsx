import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importAPI, enseignantsAPI, examensAPI, voeuxAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';

export default function DataManager() {
  const [dragActive, setDragActive] = useState({
    enseignants: false,
    examens: false,
    voeux: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [deleteMutation, setDeleteMutation] = useState(null);
  const fileInputRefs = {
    enseignants: useRef(null),
    examens: useRef(null),
    voeux: useRef(null),
  };
  const queryClient = useQueryClient();

  // Fetch existing data
  const { data: enseignants } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantsAPI.getAll().then(res => res.data),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: examens } = useQuery({
    queryKey: ['examens'],
    queryFn: () => examensAPI.getAll().then(res => res.data),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: voeux } = useQuery({
    queryKey: ['voeux'],
    queryFn: () => voeuxAPI.getAll().then(res => res.data),
    staleTime: 0,
    gcTime: 0,
  });

  // Import mutations
  const importEnseignantsMutation = useMutation({
    mutationFn: (file) => importAPI.importEnseignants(file),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Enseignants importés avec succès!');
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import des enseignants');
    },
  });

  const importExamensMutation = useMutation({
    mutationFn: (file) => importAPI.importExamens(file),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Examens importés avec succès!');
      queryClient.invalidateQueries({ queryKey: ['examens'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import des examens');
    },
  });

  const importVoeuxMutation = useMutation({
    mutationFn: (file) => importAPI.importVoeux(file),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Souhaits importés avec succès!');
      queryClient.invalidateQueries({ queryKey: ['voeux'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import des souhaits');
    },
  });

  // Delete mutations
  const deleteEnseignantsMutation = useMutation({
    mutationFn: () => enseignantsAPI.vider(),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Table enseignants vidée avec succès!');
      queryClient.invalidateQueries({ queryKey: ['enseignants'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  const deleteExamensMutation = useMutation({
    mutationFn: () => examensAPI.vider(),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Table examens vidée avec succès!');
      queryClient.invalidateQueries({ queryKey: ['examens'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  const deleteVoeuxMutation = useMutation({
    mutationFn: () => voeuxAPI.vider(),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Table souhaits vidée avec succès!');
      queryClient.invalidateQueries({ queryKey: ['voeux'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    },
  });

  const handleDelete = (type, mutation) => {
    setDeleteType(type);
    setDeleteMutation(() => mutation);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteMutation) {
      deleteMutation.mutate();
    }
  };

  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive({ ...dragActive, [type]: true });
    } else if (e.type === 'dragleave') {
      setDragActive({ ...dragActive, [type]: false });
    }
  };

  const handleDrop = (e, type, mutation) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive({ ...dragActive, [type]: false });

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      mutation.mutate(files[0]);
    }
  };

  const handleFileInput = (e, mutation) => {
    const file = e.target.files[0];
    if (file) {
      mutation.mutate(file);
    }
  };

  const dataCards = [
    {
      id: 'enseignants',
      title: 'Enseignants',
      description: 'Liste des enseignants avec leurs grades et disponibilités',
      icon: '👨‍🏫',
      count: enseignants?.length || 0,
      mutation: importEnseignantsMutation,
      deleteMutation: deleteEnseignantsMutation,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      examples: ['nom_ens', 'prenom_ens', 'abrv_ens', 'email_ens', 'grade_code_ens','code_smartex_ens','participe_surveillance'],
    },
    {
      id: 'examens',
      title: 'Examens',
      description: 'Calendrier des examens avec salles et horaires',
      icon: '📝',
      count: examens?.length || 0,
      mutation: importExamensMutation,
      deleteMutation: deleteExamensMutation,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      examples: ['dateExam', 'h_debut', 'h_fin', 'session', 'type ex', 'semestre', 'enseignant', 'cod_salle'],
    },
    {
      id: 'voeux',
      title: 'Souhaits',
      description: 'Préférences de surveillance des enseignants',
      icon: '❤️',
      count: voeux?.length || 0,
      mutation: importVoeuxMutation,
      deleteMutation: deleteVoeuxMutation,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      examples: ['Enseignant', 'Semestre', 'Session', 'Date', 'Jour', 'Séances', 'Nombre-Max'],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <FolderOpenIcon className="w-10 h-10 text-blue-600" />
            Gestionnaire de Données
          </h1>
          <p className="section-subtitle">
            Importez et gérez vos fichiers Excel pour générer le planning
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dataCards.map((card) => (
          <div
            key={card.id}
            className={`stat-card ${card.bgColor} border-2 ${card.borderColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">{card.icon}</span>
              <span className="text-3xl font-bold text-gray-700">{card.count}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-600 mt-1">entrées enregistrées</p>
          </div>
        ))}
      </div>

      {/* Import Sections */}
      <div className="space-y-6">
        {dataCards.map((card) => (
          <div key={card.id} className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-3xl shadow-lg`}>
                  {card.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{card.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {card.count > 0 && (
                  <>
                    <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                      <CheckCircleIcon className="w-5 h-5" />
                      {card.count} entrées
                    </span>
                    <button 
                      className="btn btn-danger flex items-center"
                      onClick={() => handleDelete(card.title, card.deleteMutation)}
                      disabled={card.deleteMutation.isPending}
                    >
                      <TrashIcon className="w-5 h-5 mr-2" />
                      {card.deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Dropzone */}
            <div
              className={`dropzone ${dragActive[card.id] ? 'dropzone-active' : ''}`}
              onDragEnter={(e) => handleDrag(e, card.id)}
              onDragLeave={(e) => handleDrag(e, card.id)}
              onDragOver={(e) => handleDrag(e, card.id)}
              onDrop={(e) => handleDrop(e, card.id, card.mutation)}
              onClick={() => fileInputRefs[card.id].current?.click()}
            >
              <input
                ref={fileInputRefs[card.id]}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileInput(e, card.mutation)}
                className="hidden"
                disabled={card.mutation.isPending}
              />
              
              {card.mutation.isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <ArrowPathIcon className="w-16 h-16 text-blue-500 animate-spin" />
                  <p className="text-lg font-semibold text-blue-700">Import en cours...</p>
                </div>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    Glissez-déposez votre fichier Excel ici
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    ou cliquez pour parcourir vos fichiers
                  </p>
                  <div className="flex justify-center">
                    <button className={`btn bg-gradient-to-r ${card.color} text-white hover:opacity-90 flex items-center shadow-lg`}>
                      <DocumentTextIcon className="w-5 h-5 mr-2" />
                      Choisir un fichier
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Formats acceptés: .xlsx, .xls
                  </p>
                </>
              )}
            </div>

            {/* Expected columns */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">📋 Colonnes attendues :</p>
              <div className="flex flex-wrap gap-2">
                {card.examples.map((example, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white text-gray-700 rounded-full text-xs font-medium border border-gray-200 shadow-sm"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          💡 Conseils d'utilisation
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Ordre recommandé :</strong> Importez d'abord les enseignants, puis les examens, et enfin les souhaits
            </span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Format Excel :</strong> Assurez-vous que vos fichiers contiennent les colonnes nécessaires
            </span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Mise à jour :</strong> Réimportez un fichier pour mettre à jour les données existantes
            </span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Vérification :</strong> Consultez les pages dédiées après import pour vérifier les données
            </span>
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteType(null);
          setDeleteMutation(null);
        }}
        onConfirm={confirmDelete}
        title={`Supprimer toutes les données de ${deleteType} ?`}
        message="Cette action est irréversible. Toutes les données seront supprimées définitivement."
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
}
