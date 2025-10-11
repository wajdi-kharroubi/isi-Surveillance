# Guide d'Installation et de Lancement

## 📋 Prérequis

- **Python 3.11+** : [Télécharger Python](https://www.python.org/downloads/)
- **Node.js 18+** : [Télécharger Node.js](https://nodejs.org/)
- **npm** (inclus avec Node.js)

## 🚀 Installation

### 1. Backend (Python)

```powershell
# Se placer dans le dossier backend
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
.\venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

### 2. Frontend (Electron + React)

```powershell
# Se placer dans le dossier frontend
cd ..\frontend

# Installer les dépendances
npm install
```

## ▶️ Lancement en Mode Développement

### Option 1: Lancement Séparé (Recommandé pour le développement)

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\activate
python main.py
```
Le backend démarre sur `http://localhost:8000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
Le frontend démarre sur `http://localhost:5173`

**Terminal 3 - Electron:**
```powershell
cd frontend
npm run electron:dev
```

### Option 2: Lancement Automatique (Tout en un)

```powershell
cd frontend
npm run electron:dev
```
Cette commande lance automatiquement:
- Le serveur de développement Vite
- L'application Electron
- Le backend Python

## 🔧 Tester l'API

Une fois le backend lancé, accédez à la documentation interactive :
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## 📦 Build pour Production

### Backend
```powershell
cd backend
.\venv\Scripts\activate
pip install pyinstaller
pyinstaller --onefile --name surveillance-api main.py
```

L'exécutable sera dans `backend/dist/surveillance-api.exe`

### Frontend + Electron
```powershell
cd frontend
npm run build
npm run package
```

L'installateur sera dans `frontend/dist-electron/`

## 🗂️ Structure des Fichiers

```
project/
├── backend/
│   ├── main.py              # Point d'entrée API
│   ├── config.py            # Configuration
│   ├── database.py          # Connexion DB
│   ├── requirements.txt     # Dépendances Python
│   ├── api/                 # Routes API
│   ├── models/              # Modèles et Schémas
│   ├── services/            # Services (Import/Export)
│   └── algorithms/          # Algorithme d'optimisation
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # Point d'entrée React
│   │   ├── App.jsx          # Composant principal
│   │   ├── pages/           # Pages de l'application
│   │   ├── components/      # Composants réutilisables
│   │   └── services/        # API client
│   ├── electron/
│   │   ├── main.js          # Process principal Electron
│   │   └── preload.js       # Script preload
│   ├── package.json
│   └── vite.config.js
│
└── database/
    └── surveillance.db      # Base SQLite (créée auto)
```

## 🎯 Fonctionnalités Implémentées

✅ **Backend complet:**
- API REST avec FastAPI
- Base de données SQLite
- CRUD Enseignants
- Import Excel (Enseignants, Vœux, Examens)
- Algorithme d'optimisation (Google OR-Tools)
- Génération de documents (PDF, Word, Excel)
- Système de statistiques

✅ **Frontend de base:**
- Interface Electron + React
- Navigation multi-pages
- Tableaux de bord
- Gestion des enseignants
- Module de génération
- Module d'export
- Design moderne avec Tailwind CSS

## 🔄 Prochaines Étapes

Pour compléter l'application:

1. **Pages Examens et Vœux** : Ajouter les interfaces complètes
2. **Visualisation Planning** : Calendrier interactif
3. **Modification manuelle** : Éditer les affectations après génération
4. **Validation avancée** : Plus de contrôles qualité
5. **Notifications** : Système d'alertes
6. **Historique** : Sauvegarder les versions de plannings

## ⚠️ Résolution de Problèmes

### Port 8000 déjà utilisé
```powershell
# Trouver le processus
netstat -ano | findstr :8000
# Tuer le processus
taskkill /PID <PID> /F
```

### Erreur d'import Python
```powershell
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Erreur npm
```powershell
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

Pour toute question ou problème:
1. Vérifiez les logs dans la console
2. Consultez la documentation API sur `/api/docs`
3. Vérifiez que tous les prérequis sont installés

## 📄 Licence

Application propriétaire - Établissement d'Enseignement Supérieur - 2025
