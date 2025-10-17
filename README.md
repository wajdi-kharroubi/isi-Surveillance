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

## � Documentation

- Détails de l’algorithme d’optimisation, règles, contraintes et cas problématiques: `docs/ALGORITHME_SURVEILLANCE.md`

## �📄 Licence

Propriétaire - Établissement d'Enseignement Supérieur

## 👨‍💻 Auteur

Développé pour la gestion des examens - 2025
