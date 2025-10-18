# Application de Gestion des Surveillances d'Examens

## 📋 Description

Application desktop pour générer automatiquement les plannings de surveillance des examens en tenant compte des contraintes et disponibilités des enseignants.

## 🏗️ Architecture

- **Frontend**: Electron + React + TypeScript
- **Backend**: Python + FastAPI
- **Base de données**: SQLite (local)
- **Type**: Application monolithique standalone

## 📁 Structure du Projet

```
project/
├── frontend/          # Application Electron
├── backend/           # API Python + Algorithmes
├── database/          # SQLite local
└── docs/             # Documentation
```

## 🚀 Installation et Lancement

### Prérequis
- Node.js 18+
- Python 3.11+
- npm ou yarn

### Backend (Python)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend (Electron)
```bash
cd frontend
npm install
npm run dev
```

## 📦 Build Production

```bash
# Backend
cd backend
pyinstaller --onefile main.py

# Frontend
cd frontend
npm run build
npm run package
```

## ✨ Fonctionnalités

- ✅ Gestion des enseignants et grades
- ✅ Gestion des vœux de non-surveillance
- ✅ Import fichiers Excel
- ✅ Génération automatique des plannings
- ✅ Algorithme d'optimisation
- ✅ Export PDF, Word, Excel
- ✅ Convocations individuelles
- ✅ Listes par créneau
- ✅ **NOUVEAU** : Gestion manuelle des affectations (ajout/suppression d'enseignants par séance)
- ✅ **NOUVEAU** : Statistiques corrigées (nombre de surveillances et de salles)

## 📚 Documentation

### Documentation générale
- Détails de l'algorithme d'optimisation, règles, contraintes et cas problématiques: `docs/ALGORITHME_SURVEILLANCE.md`

### Nouvelles fonctionnalités (Octobre 2025)
- **📘 Gestion des affectations** : [`GESTION_AFFECTATIONS.md`](GESTION_AFFECTATIONS.md)
  - Documentation complète des nouveaux endpoints
  - Exemples d'utilisation avec curl, JavaScript, Python
  - Guide d'intégration frontend

- **📋 Résumé des modifications** : [`README_MODIFICATIONS_AFFECTATIONS.md`](README_MODIFICATIONS_AFFECTATIONS.md)
  - Vue d'ensemble de toutes les modifications
  - Fichiers modifiés et créés
  - Impact sur le système

- **🧪 Guide de test** : [`GUIDE_TEST_AFFECTATIONS.md`](GUIDE_TEST_AFFECTATIONS.md)
  - Tests pas à pas des nouveaux endpoints
  - Validation des cas d'erreur
  - Checklist de validation complète

## �📄 Licence

Propriétaire - Établissement d'Enseignement Supérieur

## 👨‍💻 Auteur

Développé pour la gestion des examens - 2025
