# 🚀 GUIDE DE DÉMARRAGE RAPIDE

## ✅ Statut: Projet Opérationnel

**Date:** 10 Octobre 2025  
**Version:** 1.0.0  
**Status:** ✅ Toutes les dépendances installées et fonctionnelles

---

## 📋 Ce qui est prêt

- ✅ **Backend Python/FastAPI** - Opérationnel sur http://127.0.0.1:8000
- ✅ **Frontend React/Vite** - Opérationnel sur http://localhost:5173
- ✅ **Base de données SQLite** - Créée et initialisée
- ✅ **Algorithme OR-Tools** - Chargé et fonctionnel
- ✅ **Tailwind CSS** - Configuré correctement
- ✅ **Toutes les dépendances** - Installées (voir CORRECTIONS.md)

---

## 🎯 DÉMARRAGE EN 3 ÉTAPES

### Étape 1: Démarrer le Backend

```powershell
# Ouvrir un terminal PowerShell
cd backend
.\venv\Scripts\activate
python main.py
```

**Résultat attendu:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
✅ Database initialized successfully
📡 API disponible sur http://127.0.0.1:8000
📚 Documentation sur http://127.0.0.1:8000/api/docs
INFO:     Application startup complete.
```

### Étape 2: Démarrer le Frontend

```powershell
# Ouvrir un NOUVEAU terminal PowerShell
cd frontend
npm run dev
```

**Résultat attendu:**
```
VITE v5.4.20  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

### Étape 3: Ouvrir l'Application

```powershell
# Ouvrir dans votre navigateur:
http://localhost:5173
```

**Vous devriez voir:**
- 🏠 Page Dashboard avec statistiques
- 📊 Menu de navigation à gauche
- 🎨 Interface moderne avec Tailwind CSS

---

## 🔗 URLs Importantes

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Interface utilisateur React |
| **Backend API** | http://127.0.0.1:8000 | Serveur FastAPI |
| **API Docs (Swagger)** | http://127.0.0.1:8000/api/docs | Documentation interactive |
| **API Docs (ReDoc)** | http://127.0.0.1:8000/api/redoc | Documentation alternative |
| **Health Check** | http://127.0.0.1:8000/api/health | Vérifier l'état du serveur |

---

## 📱 Fonctionnalités Disponibles

### ✅ Fonctionnel Immédiatement

1. **Dashboard** (http://localhost:5173/)
   - Vue d'ensemble des statistiques
   - Nombre d'enseignants, examens, affectations
   - Taux de couverture
   - Actions rapides

2. **Gestion des Enseignants** (http://localhost:5173/enseignants)
   - Liste complète des enseignants
   - Import depuis Excel
   - Recherche et filtres
   - Modification (à implémenter)

3. **Génération de Planning** (http://localhost:5173/generation)
   - Configuration de l'algorithme
   - Génération automatique
   - Affichage des résultats
   - Avertissements et statistiques

4. **Export de Documents** (http://localhost:5173/export)
   - Planning global PDF
   - Planning global Excel
   - Convocations individuelles Word
   - Listes par créneau Word

### ⚠️ Pages à Développer

- **Examens** - CRUD + visualisation
- **Vœux** - CRUD + calendrier
- **Planning** - Visualisation + édition manuelle
- **Statistiques** - Graphiques et analyses

---

## 🧪 Test Rapide

### Test 1: Vérifier l'API

```powershell
# Dans PowerShell ou votre navigateur
Invoke-WebRequest http://127.0.0.1:8000/api/health
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Test 2: Vérifier le Frontend

Ouvrez http://localhost:5173 et vérifiez:
- ✅ La page charge sans erreur
- ✅ Le menu de navigation s'affiche
- ✅ Les statistiques montrent "0" partout (base vide)

### Test 3: Tester l'import

1. Créez un fichier Excel `enseignants.xlsx` avec:
   ```
   nom_ens | prenom_ens | email_ens | grade_ens | grade_code_ens | code_smartex_ens
   Dupont  | Jean       | j.dupont@example.com | PES | A | 12345
   Martin  | Marie      | m.martin@example.com | PA  | B | 12346
   ```

2. Allez sur http://localhost:5173/enseignants
3. Cliquez sur "Importer depuis Excel"
4. Sélectionnez votre fichier
5. Vérifiez que 2 enseignants sont importés

---

## 🛠️ Commandes Utiles

### Backend

```powershell
# Démarrer le serveur
cd backend
.\venv\Scripts\activate
python main.py

# Réinstaller les dépendances
pip install -r requirements.txt

# Mettre à jour une dépendance
pip install --upgrade sqlalchemy

# Vérifier les packages installés
pip list
```

### Frontend

```powershell
# Démarrer le dev server
cd frontend
npm run dev

# Réinstaller les dépendances
npm install

# Build pour production
npm run build

# Vérifier les packages
npm list
```

### Base de Données

```powershell
# La base SQLite est dans:
backend/database/surveillance.db

# Réinitialiser la base (ATTENTION: supprime toutes les données)
Remove-Item backend/database/surveillance.db
# Puis redémarrer le backend pour la recréer
```

---

## 🐛 Dépannage

### Le backend ne démarre pas

**Erreur:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Le frontend affiche une page blanche

**Vérification:**
1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs JavaScript
3. Vérifiez que le backend est démarré

**Solution commune:**
```powershell
cd frontend
npm install
npm run dev
```

### Port déjà utilisé

**Erreur:** `Error: Port 5173 is already in use`

**Solution:**
```powershell
# Trouver le processus qui utilise le port
Get-Process -Name node | Stop-Process -Force

# Ou utiliser un autre port
npm run dev -- --port 5174
```

### Erreur de compilation Tailwind

**Erreur:** `The XYZ class does not exist`

**Solution:** Voir fichier CORRECTIONS.md section 4

---

## 📚 Documentation Complète

- **README.md** - Vue d'ensemble du projet
- **INSTALLATION.md** - Installation détaillée
- **GUIDE_UTILISATION.md** - Manuel utilisateur complet
- **FORMATS_EXCEL.md** - Formats des fichiers d'import
- **STATUS.md** - État détaillé du projet
- **CORRECTIONS.md** - Corrections appliquées (Python 3.13)
- **PROJET_TERMINE.md** - Récapitulatif final

---

## 🎓 Workflow Typique

### 1. Préparation des Données

```powershell
# Créer 3 fichiers Excel:
1. enseignants.xlsx  (nom, prénom, email, grade, code)
2. voeux.xlsx        (code_smartex, date, seance, motif)
3. examens.xlsx      (date, heure, salle, matière, responsable)
```

### 2. Import

```powershell
# Via l'interface:
1. Ouvrir http://localhost:5173/enseignants
2. Cliquer "Importer depuis Excel"
3. Répéter pour vœux et examens (pages à développer)
```

### 3. Génération

```powershell
# Via l'interface:
1. Ouvrir http://localhost:5173/generation
2. Configurer les paramètres (min surveillants, etc.)
3. Cliquer "Générer le Planning"
4. Attendre (max 30 secondes)
```

### 4. Export

```powershell
# Via l'interface:
1. Ouvrir http://localhost:5173/export
2. Choisir le format (PDF, Excel, Word)
3. Télécharger le fichier généré
```

---

## 🔐 Sécurité

**Note:** Cette application est conçue pour un usage local uniquement.

- ❌ Pas d'authentification (localhost uniquement)
- ❌ Pas de chiffrement (base locale)
- ✅ CORS configuré pour localhost seulement
- ✅ Données stockées localement (pas de cloud)

**Pour un déploiement en production:**
- Ajouter un système d'authentification (JWT)
- Chiffrer les données sensibles
- Configurer HTTPS
- Utiliser PostgreSQL au lieu de SQLite
- Ajouter des logs de sécurité

---

## 💻 Développement

### Structure du Projet

```
project/
├── backend/          # Python/FastAPI
│   ├── venv/         # Environnement virtuel
│   ├── main.py       # Point d'entrée
│   ├── config.py     # Configuration
│   ├── database.py   # Connexion DB
│   ├── api/          # Routes API
│   ├── models/       # Modèles et schémas
│   ├── services/     # Services métier
│   └── algorithms/   # Algorithme OR-Tools
├── frontend/         # React/Electron
│   ├── src/          # Code source
│   │   ├── pages/    # Composants pages
│   │   ├── components/ # Composants réutilisables
│   │   └── services/ # API client
│   ├── electron/     # Process Electron
│   └── public/       # Assets statiques
└── docs/             # Documentation
```

### Hot Reload

- **Backend:** Uvicorn redémarre automatiquement
- **Frontend:** Vite recharge instantanément
- **Base:** Modifications visibles immédiatement

---

## 🎉 Félicitations !

Votre application est maintenant opérationnelle. 

**Prochaines étapes suggérées:**
1. ✅ Tester l'import de données
2. ✅ Générer un premier planning
3. ✅ Exporter les documents
4. 🚧 Développer les pages manquantes
5. 🚧 Ajouter des tests automatisés

**Besoin d'aide ?** Consultez la documentation dans le dossier `docs/`

---

**Version:** 1.0.0  
**Date:** 10 Octobre 2025  
**Status:** ✅ OPÉRATIONNEL
