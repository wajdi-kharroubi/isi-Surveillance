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

### 🚀 Quick Build (Complete Installer)

Build a complete Windows installer (.exe) with backend, frontend, and database:

```powershell
# One command builds everything
.\build_all.ps1
```

**Output:** `frontend\dist-electron\Gestion Surveillances-1.0.0-Setup.exe`

### 📚 Build Documentation

- **Quick Start**: [`QUICK_START.md`](QUICK_START.md) - Fast reference for building
- **Complete Guide**: [`BUILD_GUIDE.md`](BUILD_GUIDE.md) - Detailed build instructions
- **Install Guide**: [`INSTALL_GUIDE.md`](INSTALL_GUIDE.md) - User installation guide

### Build Scripts

| Script                   | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `build_all.ps1`          | Complete build (backend + frontend + installer) |
| `build_backend_only.ps1` | Build backend executable only                   |
| `test_backend.ps1`       | Test backend executable                         |

### What Gets Built

1. **Backend Executable** (`backend\dist\surveillance_backend.exe`)

   - Python + FastAPI + all dependencies bundled
   - No Python installation required on target machines

2. **Frontend** (`frontend\dist\`)

   - React app built with Vite
   - Electron wrapper for desktop experience

3. **NSIS Installer** (`frontend\dist-electron\*.exe`)
   - Complete installer with:
     - Electron app
     - Backend executable
     - SQLite database template
     - All config files

### Requirements for Building

- **Python 3.9+** (with venv)
- **Node.js 18+**
- **PyInstaller** (`pip install pyinstaller`)
- **Windows 10/11** (64-bit)

### Distribution

The final installer (`Gestion Surveillances-1.0.0-Setup.exe`) can be distributed to any Windows 10/11 machine without requiring Python or Node.js installation.

Target machines only need:

- Windows 10/11 64-bit
- ~500MB free disk space
- Administrator rights (for installation)

### Manual Build Steps

If you prefer step-by-step control:

```powershell
# 1. Build Backend
cd backend
.\venv\Scripts\Activate.ps1
pyinstaller build_backend.spec --clean --noconfirm

# 2. Build Frontend
cd ..\frontend
npm run build

# 3. Package with Electron
npm run electron:build
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
