# 📋 Application de Gestion des Surveillances d'Examens

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Propriétaire-red.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)

## 🔗 Lien GitHub du Projet

**Repository:** [https://github.com/wajdi-kharroubi/isi-Surveillance](https://github.com/wajdi-kharroubi/isi-Surveillance)

## 📝 Description

Application de bureau complète pour la **gestion automatisée des plannings de surveillance des examens**. Cette solution utilise des algorithmes d'optimisation avancés pour générer des plannings équitables tout en respectant les contraintes et les préférences des enseignants.

### 👥 Auteurs
- **Marwen Benammou**
- **Wajdi Kharroubi**

---

## 🎯 Fonctionnalités Principales

### 1️⃣ Gestion des Enseignants
- ✅ Import des enseignants via fichiers Excel
- ✅ Configuration des quotas de surveillance par grade
- ✅ Gestion de la participation aux surveillances
- ✅ Codes SmartEx pour l'intégration avec les systèmes existants

### 2️⃣ Gestion des Examens
- ✅ Import des examens depuis fichiers Excel
- ✅ Organisation par semestre et salles
- ✅ Planification horaire détaillée

### 3️⃣ Gestion des Vœux (Indisponibilités)
- ✅ Déclaration des créneaux d'indisponibilité par enseignant
- ✅ Import massif des vœux via Excel
- ✅ Visualisation des vœux par jour et séance

### 4️⃣ Génération Automatique de Planning
- ✅ **Algorithme d'optimisation avancé** (OR-Tools CP-SAT Solver)
- ✅ Respect strict de l'égalité par grade
- ✅ Respect des quotas maximum de surveillance
- ✅ Prise en compte des vœux de non-disponibilité
- ✅ Mode adaptatif pour gérer les situations complexes
- ✅ Équilibrage temporel des surveillances
- ✅ Regroupement intelligent des séances

### 5️⃣ Gestion Manuelle des Affectations
- ✅ Ajout/Suppression d'enseignants par séance
- ✅ Modification après génération automatique
- ✅ Validation des contraintes en temps réel
- ✅ Suivi des modifications manuelles

### 6️⃣ Export et Rapports
- ✅ Export Word avec tableaux détaillés
- ✅ Conversion automatique Word → PDF
- ✅ Visualisation des affectations par séance
- ✅ Convocations individuelles

---

## 🏗️ Structure du Projet

```
isi-Surveillance/
│
├── 📁 backend/                      # Backend FastAPI (Python)
│   ├── main.py                      # Point d'entrée de l'API
│   ├── config.py                    # Configuration
│   ├── database.py                  # Configuration SQLAlchemy
│   ├── requirements.txt             # Dépendances Python
│   ├── build_backend.spec           # Configuration PyInstaller
│   │
│   ├── 📁 models/                   # Modèles de données
│   │   ├── models.py                # Modèles SQLAlchemy
│   │   └── schemas.py               # Schémas Pydantic
│   │
│   ├── 📁 api/                      # Endpoints API
│   │   ├── enseignants.py           # CRUD enseignants
│   │   ├── examens.py               # CRUD examens
│   │   ├── voeux.py                 # Gestion des vœux
│   │   ├── imports.py               # Import Excel
│   │   ├── generation.py            # Génération de planning
│   │   ├── export.py                # Export Excel/Word/PDF
│   │   ├── statistiques.py          # Statistiques
│   │   ├── grades.py                # Configuration grades
│   │   └── planning.py              # Consultation planning
│   │
│   ├── 📁 algorithms/               # Algorithmes d'optimisation
│   │   └── optimizer_v3.py          # Optimiseur OR-Tools
│   │
│   └── 📁 services/                 # Services métier
│       ├── import_service.py        # Logique d'import
│       └── export_service.py        # Logique d'export
│
├── 📁 frontend/                     # Frontend Electron + React + Vite
│   ├── index.html                   # Page HTML principale
│   ├── package.json                 # Dépendances Node.js
│   ├── vite.config.js               # Configuration Vite
│   ├── tailwind.config.js           # Configuration Tailwind CSS
│   │
│   ├── 📁 electron/                 # Configuration Electron
│   │   ├── main.js                  # Process principal Electron
│   │   └── preload.js               # Script de préchargement
│   │
│   ├── 📁 src/                      # Code source React
│   │   ├── main.jsx                 # Point d'entrée React
│   │   ├── App.jsx                  # Composant racine
│   │   │
│   │   ├── 📁 pages/                # Pages de l'application
│   │   │   ├── Dashboard.jsx        # Tableau de bord
│   │   │   ├── Enseignants.jsx      # Gestion enseignants
│   │   │   ├── Examens.jsx          # Gestion examens
│   │   │   ├── Voeux.jsx            # Gestion vœux
│   │   │   ├── Generation.jsx       # Génération planning
│   │   │   ├── Planning.jsx         # Visualisation planning
│   │   │   ├── Export.jsx           # Export documents
│   │   │   ├── Statistiques.jsx     # Statistiques
│   │   │   ├── ConfigGrades.jsx     # Configuration grades
│   │   │   └── DataManager.jsx      # Import/Export données
│   │   │
│   │   ├── 📁 components/           # Composants réutilisables
│   │   │   ├── Layout.jsx           # Layout principal
│   │   │   └── GestionEnseignantsSeanceInline.jsx  # Gestion manuelle
│   │   │
│   │   └── 📁 services/             # Services API
│   │       └── api.js               # Client API
│   │
│   └── 📁 dist-electron/            # Builds Electron
│
├── 📁 database/                     # Fichiers de base de données SQLite
├── 📁 exports/                      # Fichiers exportés (Word, PDF)
├── 📁 uploads/                      # Fichiers importés
├── 📁 scripts/                      # Scripts utilitaires
│   └── create_icon.py               # Création d'icônes
│
│
├── build_all.ps1                    # 🚀 Script de build complet
└── README.md                        # Ce fichier
```

---

## 🚀 Installation et Exécution

### ⚙️ Prérequis

#### Système d'exploitation
- **Windows 10/11** (64-bit)

#### Logiciels requis
- **Python 3.10+** (recommandé : 3.11)
- **Node.js 18+** et npm
- **PowerShell** (intégré à Windows)
- **Git** (pour cloner le repository)

#### Logiciels optionnels
- **Microsoft Word** (pour la conversion Word → PDF automatique)

---

### 📥 Installation

#### 1. Cloner le Repository

```powershell
git clone https://github.com/wajdi-kharroubi/isi-Surveillance.git
cd isi-Surveillance
```

#### 2. Installation du Backend

```powershell
cd backend

# Créer un environnement virtuel Python
python -m venv venv

# Activer l'environnement virtuel
.\venv\Scripts\Activate.ps1

# Installer les dépendances
pip install -r requirements.txt

# Retourner à la racine
cd ..
```

#### 3. Installation du Frontend

```powershell
cd frontend

# Installer les dépendances Node.js
npm install

# Retourner à la racine
cd ..
```

---

## 🎮 Modes d'Exécution

### 🔧 Mode Développement

#### Démarrage manuel Backend + Frontend

**Terminal 1 - Backend :**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

Le backend démarre sur : **http://localhost:8000**
- API Docs (Swagger) : **http://localhost:8000/api/docs**
- ReDoc : **http://localhost:8000/api/redoc**

**Terminal 2 - Frontend (Web) :**
```powershell
cd frontend
npm run dev
```

Le frontend démarre sur : **http://localhost:5173**

**Terminal 2 - Frontend (Electron - Desktop) :**
```powershell
cd frontend
npm run electron:dev
```

Cette commande lance Vite + Electron simultanément.


### 📦 Mode Production (Build Complet)

Pour créer l'application complète prête à distribuer, utilisez le script **`build_all.ps1`** :

```powershell
.\build_all.ps1
```

#### Ce script effectue automatiquement :

1. ✅ **Vérification de l'environnement** Python et Node.js
2. ✅ **Build du Backend** → Exécutable `backend.exe` (PyInstaller)
3. ✅ **Build du Frontend** → Application React (Vite)
4. ✅ **Packaging Electron** → Application de bureau
5. ✅ **Création de l'installateur** → `Gestion Surveillances-1.0.0-Setup.exe`

#### Résultats de la compilation

1. Backend autonome (sans Python requis)
2. Application React compilée
3. Application complète non installée
|**Installateur Windows** : `frontend/dist-electron/Gestion Surveillances-1.0.0-Setup.exe`

#### Distribution

Distribuez le fichier **`Gestion Surveillances-1.0.0-Setup.exe`** aux utilisateurs finaux.

**Pas besoin de :**
- Python installé
- Node.js installé
- Dépendances externes

**Uniquement requis :**
- Windows 10/11 64-bit
- ~500 MB d'espace disque
- Droits administrateur (pour l'installation)

---

## 🧠 Solution Proposée et Algorithme

### Problématique

Générer automatiquement un planning de surveillance d'examens en :
- Respectant l'**égalité stricte** entre enseignants d'un même grade
- Respectant les **quotas maximum** de surveillance par grade
- Tenant compte des **vœux de non-disponibilité**
- Garantissant un **nombre suffisant de surveillants** par séance
- Optimisant la **répartition temporelle**

### Architecture de la Solution

L'application suit une architecture **client-serveur** moderne :

```
┌─────────────────────────────────────────────┐
│         Frontend (Electron + React)         │
│  - Interface utilisateur intuitive          │
│  - Gestion des imports/exports              │
│  - Visualisation des résultats              │
│  - Modification manuelle des affectations   │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼───────────────────────────┐
│          Backend (FastAPI)                  │
│  - API RESTful                              │
│  - Logique métier                           │
│  - Orchestration des services               │
│  - Validation des contraintes               │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
┌────────▼────────┐ ┌─────▼──────────────────┐
│   Base de       │ │  Algorithme            │
│   Données       │ │  d'Optimisation        │
│   (SQLite)      │ │  (OR-Tools CP-SAT)     │
└─────────────────┘ └────────────────────────┘
```

### Algorithme d'Optimisation (OR-Tools CP-SAT)

L'application utilise **Google OR-Tools** avec le solveur **CP-SAT** (Constraint Programming - Satisfiability).

#### Principe

Le problème est modélisé comme un **problème de satisfaction de contraintes** (CSP) :
- **Variables** : Affectations enseignant → séance (binaires 0/1)
- **Domaines** : Enseignants disponibles, séances planifiées
- **Contraintes** : Règles à respecter obligatoirement
- **Objectif** : Minimiser les violations de contraintes souples

#### Contraintes Strictes (HARD - Obligatoires)

| Priorité | Contrainte | Description | Impact |
|----------|------------|-------------|--------|
| **P1** | Égalité par grade | Tous les enseignants d'un même grade font **exactement** le même nombre de séances | Équité garantie |
| **P1** | Quota maximum | Aucun enseignant ne dépasse son quota de surveillance (défini par grade) | Respect charge de travail |
| **P2** | Nombre surveillants/séance | Chaque séance a le bon nombre de surveillants selon le mode (normal/adaptatif) | Qualité surveillance |
| **P2** | Non-conflit horaire | Un enseignant ne peut pas être affecté à deux examens simultanés | Faisabilité physique |

#### Contraintes Souples (SOFT - Optimisées)

| Priorité | Contrainte | Poids | Description |
|----------|------------|-------|-------------|
| **P3** | Vœux de non-disponibilité | 10000 | Minimiser les affectations sur les créneaux déclarés indisponibles |
| **P4** | Responsables d'examen | 5000 | Favoriser la présence des enseignants responsables d'examen |
| **P5** | Équilibrage temporel | 1000 | Répartir les séances sur toute la période d'examen |
| **P6** | Isolement première/dernière | 500 | Éviter qu'un enseignant n'ait que la 1ère ou la dernière séance |
| **P7** | Regroupement | 100 | Favoriser les séances consécutives pour limiter les déplacements |

#### Modes d'Optimisation

##### 1. Mode Normal
- Nombre fixe de surveillants par séance
- **Formule** : `nb_surveillants = nb_examens × min_surveillants_par_examen`
- **Exemple** : 5 examens × 2 surveillants = 10 surveillants par séance
- **Usage** : Situation standard avec quotas suffisants

##### 2. Mode Adaptatif
Activé automatiquement quand les quotas sont insuffisants.

**Conditions d'activation :**
```
besoin_total > quotas_disponibles
```

**Ajustement du nombre de surveillants :**
- Si `min_surveillants_par_examen > 2` :
  - MIN = `nb_examens × (quotas_totaux // besoin_ideal)`
  - MAX = `nb_examens × min_surveillants_par_examen`
  
- Si `min_surveillants_par_examen ≤ 2` :
  - MIN = `nb_examens` (1 surveillant par examen minimum)
  - MAX = `nb_examens × min_surveillants_par_examen`

**Exemple de calcul :**
```
Données :
- 20 séances à couvrir
- 5 examens par séance
- Min 2 surveillants par examen souhaité
- 15 enseignants avec quota de 5 séances

Calcul :
- Besoin idéal = 20 séances × 5 examens × 2 = 200 surveillances
- Quotas disponibles = 15 enseignants × 5 = 75 surveillances
- Ratio = 75 / 200 = 0.375

Mode adaptatif activé :
- Surveillants par séance = 5 examens × 1 = 5 (au lieu de 10)
- Total nécessaire = 20 × 5 = 100 surveillances
- Encore insuffisant → Alerte générée
```

#### Fonction Objectif

```python
Minimiser :
  - 10000 × violations_vœux              # Priorité 3
  - 5000 × responsables_absents          # Priorité 4
  - 1000 × déséquilibre_temporel         # Priorité 5
  - 500 × séances_isolées                # Priorité 6
  - 100 × non_regroupement               # Priorité 7
  + bonus_dispersion_grades              # Bonus pour égalité parfaite
```

#### Algorithme de Résolution

```
1. INITIALISATION
   ├─ Charger les données (enseignants, examens, vœux, grades)
   ├─ Calculer les besoins et quotas disponibles
   └─ Détecter si mode adaptatif nécessaire

2. CRÉATION DU MODÈLE
   ├─ Créer variables binaires : affectation[enseignant][séance]
   ├─ Définir domaines des variables
   └─ Initialiser le modèle CP-SAT

3. CONTRAINTES STRICTES (P1-P2)
   ├─ Égalité par grade : ∀ grade, ∀ (ens1, ens2) du grade :
   │    Σ affectations[ens1] = Σ affectations[ens2]
   ├─ Quota maximum : ∀ enseignant :
   │    Σ affectations[enseignant] ≤ quota[grade]
   ├─ Nombre surveillants/séance : ∀ séance :
   │    MIN ≤ Σ affectations[séance] ≤ MAX
   └─ Non-conflit : ∀ enseignant, ∀ (séance1, séance2) simultanées :
        affectation[ens][s1] + affectation[ens][s2] ≤ 1

4. CONTRAINTES SOUPLES (P3-P7)
   ├─ Créer variables de pénalité pour chaque violation
   └─ Définir les termes de la fonction objectif

5. RÉSOLUTION
   ├─ Paramètres : max_time=900s, gap_limit=1%
   ├─ Lancer le solveur CP-SAT
   └─ Collecter la solution optimale

6. POST-TRAITEMENT
   ├─ Extraire les affectations
   ├─ Calculer les statistiques
   ├─ Générer les warnings
   └─ Enregistrer dans la base de données
```

#### Performances

| Taille du problème | Temps de résolution | Qualité solution |
|--------------------|---------------------|------------------|
| Petit (< 20 enseignants, < 30 séances) | < 5 secondes | Optimale |
| Moyen (20-50 enseignants, 30-100 séances) | 10-60 secondes | Optimale ou quasi-optimale (< 1% gap) |
| Grand (> 50 enseignants, > 100 séances) | 60-900 secondes | Bonne solution (< 5% gap) |

---

## 🔒 Contraintes et Règles Métier

### Contraintes du Problème

#### 1. Contraintes Organisationnelles
- ✅ Chaque examen doit avoir au minimum N surveillants
- ✅ Les enseignants sont affectés par **séance** (pas par examen individuel)
- ✅ Une séance = ensemble d'examens au même créneau horaire
- ✅ Tous les surveillants d'une séance surveillent TOUS les examens de cette séance
- ✅ Les salles d'examens sont assignées dans les affectations

#### 2. Contraintes d'Équité
- ✅ **Égalité stricte par grade** : tous les Professeurs font le même nombre de séances, tous les Maîtres Assistants font le même nombre, etc.
- ✅ Respect des quotas configurés par grade
- ✅ Pas de favoritisme ou de surcharge
- ✅ Transparence totale des affectations

#### 3. Contraintes Temporelles
- ✅ Respect des vœux de non-disponibilité
- ✅ Pas de conflits horaires (un enseignant ne peut pas être à deux endroits en même temps)
- ✅ Répartition équilibrée dans le temps
- ✅ Regroupement des séances pour limiter les déplacements

#### 4. Contraintes de Qualité
- ✅ Présence privilégiée des responsables d'examen
- ✅ Nombre suffisant de surveillants par séance
- ✅ Éviter les séances isolées (uniquement première ou dernière)

### Gestion des Cas Limites

#### Cas 1 : Quotas insuffisants

**Exemple** : 
- 100 séances à couvrir
- 20 enseignants avec quota de 4 séances/enseignant
- Besoin : 100 séances ÷ 20 enseignants = 5 séances/enseignant
- Quota : 4 séances maximum

**Solution de l'algorithme** :
1. Activation automatique du **mode adaptatif**
2. Réduction du nombre de surveillants par séance
3. Maintien d'au minimum 1 surveillant par examen
4. Génération de **warnings** explicites
5. Suggestions d'ajustement :
   - Recruter plus d'enseignants
   - Augmenter les quotas
   - Réduire le nombre d'examens simultanés

#### Cas 2 : Trop de vœux de non-disponibilité

**Problème** : Si 80% des enseignants déclarent être indisponibles sur une séance critique.

**Solution** :
1. Violations minimales des vœux (contrainte souple P3)
2. Priorité aux enseignants sans vœu sur cette séance
3. Génération d'un rapport des violations
4. Suggestion de révision des vœux

#### Cas 3 : Grades déséquilibrés

**Exemple** :
- 1 Professeur
- 20 Assistants
- 50 séances

**Solution** :
- Le Professeur fera son quota maximum (ex: 5 séances)
- Les Assistants se répartiront équitablement les séances restantes
- L'algorithme maintient l'égalité dans chaque grade

#### Cas 4 : Aucune solution trouvée

**Causes possibles** :
- Contraintes incompatibles
- Quotas très insuffisants
- Trop de conflits horaires

**Actions** :
1. Message d'erreur explicite
2. Rapport des contraintes problématiques
3. Suggestions de relaxation :
   - Désactiver le respect des vœux
   - Augmenter les quotas
   - Activer le mode fallback

---

## 📊 Configuration des Grades

Les grades configurables incluent :

| Code Grade | Libellé complet | Quota par défaut | Modifiable |
|------------|----------------|------------------|------------|
| **PR** | Professeur | 5 | ✅ |
| **MC** | Maître de Conférences | 6 | ✅ |
| **MA** | Maître Assistant | 7 | ✅ |
| **AS** | Assistant | 8 | ✅ |
| **TE** | Technologue | 8 | ✅ |
| **VA** | Vacataire | 10 | ✅ |

### Personnalisation des Quotas

Les quotas sont **entièrement configurables** via :
- Interface graphique (page Configuration des Grades)
- API REST (`/api/grade-config`)

**Exemple de configuration personnalisée :**
```json
{
  "grade_code": "MA",
  "grade_nom": "Maître Assistant",
  "nb_surveillances": 6
}
```

---

## 📤 Formats d'Import/Export

### Import Excel - Enseignants

**Format requis :**

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `Nom` | Texte | ✅ | Nom de famille | BENAMMOU |
| `Prenom` | Texte | ✅ | Prénom | Marwen |
| `Email` | Email | ✅ | Adresse email unique | marwen.benammou@example.com |
| `Grade` | Texte | ✅ | Libellé du grade | Maître Assistant |
| `Code Grade` | Code | ✅ | Code du grade (2-3 lettres) | MA |
| `Code SmartEx` | Texte | ✅ | Identifiant SmartEx unique | MAR.BEN |
| `Abréviation` | Texte | ❌ | Abréviation enseignant | M.BEN |
| `Participe` | Oui/Non | ❌ | Participe aux surveillances | Oui |

**Exemple de fichier :**
```
Nom       | Prenom | Email                    | Grade            | Code Grade | Code SmartEx | Abréviation | Participe
----------|--------|--------------------------|------------------|------------|--------------|-------------|----------
BENAMMOU  | Marwen | marwen.b@example.com     | Maître Assistant | MA         | MAR.BEN      | M.BEN       | Oui
KHARROUBI | Wajdi  | wajdi.k@example.com      | Professeur       | PR         | WAJ.KHA      | W.KHA       | Oui
DUPONT    | Jean   | jean.dupont@example.com  | Assistant        | AS         | JEA.DUP      | J.DUP       | Non
```

### Import Excel - Examens

**Format requis :**

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `dateExam` | Date | ✅ | Date de l'examen (format j/m/a) | 15/01/2025 |
| `h_debut` | Heure | ✅ | Heure de début (HH:MM) | 08:30 |
| `h_fin` | Heure | ✅ | Heure de fin (HH:MM) | 10:30 |
| `session` | Code | ✅ | Session (P/C/R) | P |
| `type_ex` | Texte | ✅ | Type (Écrit/TP/Oral) | Écrit |
| `semestre` | Texte | ✅ | Semestre | SEMESTRE 1 |
| `enseignant` | Code | ✅ | Code SmartEx responsable | MAR.BEN |
| `cod_salle` | Code | ✅ | Code de la salle | A.201 |

**Codes de session :**
- `P` = Principale
- `C` = Contrôle
- `R` = Rattrapage

**Exemple de fichier :**
```
dateExam   | h_debut | h_fin | session | type_ex | semestre    | enseignant | cod_salle
-----------|---------|-------|---------|---------|-------------|------------|----------
15/01/2025 | 08:30   | 10:30 | P       | Écrit   | SEMESTRE 1  | MAR.BEN    | A.201
15/01/2025 | 08:30   | 10:30 | P       | Écrit   | SEMESTRE 1  | WAJ.KHA    | A.202
15/01/2025 | 14:00   | 16:00 | P       | TP      | SEMESTRE 2  | JEA.DUP    | B.101
```

### Import Excel - Vœux

**Format requis :**

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `Code SmartEx` | Code | ✅ | Code enseignant | MAR.BEN |
| `Semestre` | Texte | ❌ | Semestre (Semestre1/Semestre2) | Semestre1 |
| `Session` | Texte | ❌ | Session (Partiel/Examen/Rattrapage) | Partiel |
| `Date` | Date | ❌ | Date (format j/m/a) | 15/01/2025 |
| `Jour` | Texte | ✅ | Jour de la semaine | Lundi |
| `Séances` | Code | ✅ | Code séance (S1/S2/S3/S4) | S1 |
| `Motif` | Texte | ❌ | Raison de l'indisponibilité | Cours |

**Codes de séance :**
- `S1` = Séance 1 (généralement 08:00-10:00)
- `S2` = Séance 2 (généralement 10:00-12:00)
- `S3` = Séance 3 (généralement 14:00-16:00)
- `S4` = Séance 4 (généralement 16:00-18:00)

**Exemple de fichier :**
```
Code SmartEx | Semestre  | Session | Date       | Jour    | Séances | Motif
-------------|-----------|---------|------------|---------|---------|--------
MAR.BEN      | Semestre1 | Partiel | 15/01/2025 | Lundi   | S1      | Cours
WAJ.KHA      | Semestre1 | Partiel | 15/01/2025 | Lundi   | S3      | Réunion
JEA.DUP      | Semestre2 | Examen  | 20/01/2025 | Samedi  | S2      | Personnel
```

### Exports disponibles

#### 1. Export Excel
- Planning complet avec toutes les séances
- Feuilles multiples (par jour, par enseignant, par salle)
- Statistiques intégrées
- Format : `.xlsx`

#### 2. Export Word
- Documents formatés avec tableaux
- Planning détaillé
- Convocations individuelles
- Listes par créneau
- Format : `.docx`

#### 3. Export PDF
- Conversion automatique depuis Word
- Nécessite Microsoft Word installé
- Qualité professionnelle
- Format : `.pdf`

#### 4. Export Statistiques
- Répartition par grade
- Nombre de surveillances par enseignant
- Taux de respect des vœux
- Détection des conflits
- Format : `.xlsx` ou `.json`

---

## 🛠️ Technologies Utilisées

### Backend
| Technologie | Version | Usage |
|-------------|---------|-------|
| **Python** | 3.11+ | Langage principal |
| **FastAPI** | 0.109+ | Framework web moderne et rapide |
| **SQLAlchemy** | 2.0+ | ORM Python |
| **Pydantic** | 2.10+ | Validation de données |
| **OR-Tools** | 9.14+ | Bibliothèque d'optimisation Google |
| **Pandas** | 2.2+ | Manipulation de données |
| **openpyxl** | 3.1+ | Lecture/écriture Excel |
| **python-docx** | 1.1+ | Génération de documents Word |
| **ReportLab** | 4.0+ | Génération de PDF |
| **docx2pdf** | 0.1+ | Conversion Word → PDF |
| **Uvicorn** | 0.27+ | Serveur ASGI |

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| **Electron** | Latest | Framework d'application de bureau |
| **React** | 18+ | Bibliothèque UI |
| **Vite** | Latest | Build tool ultra-rapide |
| **Tailwind CSS** | Latest | Framework CSS utilitaire |
| **Axios** | Latest | Client HTTP |
| **React Router** | 6+ | Routing |

### Base de Données
| Technologie | Type | Usage |
|-------------|------|-------|
| **SQLite** | Embarquée | Base de données locale |

### Outils de Build
| Outil | Usage |
|-------|-------|
| **PyInstaller** | Compilation Python → EXE |
| **electron-builder** | Packaging Electron |
| **NSIS** | Création d'installateur Windows |

---

## 📖 Recommandations d'Utilisation

### 🎯 Workflow Recommandé

#### Phase 1 : Configuration Initiale (Une fois)

1. **Installer l'application**
   - Exécuter `Gestion Surveillances-1.0.0-Setup.exe`
   - Laisser l'installation se terminer

2. **Configurer les grades**
   - Ouvrir l'application
   - Aller dans `Configuration` → `Grades`
   - Vérifier/Ajuster les quotas par grade
   - Sauvegarder

#### Phase 2 : Import des Données (Chaque session)

3. **Préparer les fichiers Excel**
   - Utiliser les templates fournis
   - Vérifier le format (colonnes, types de données)
   - Sauvegarder en `.xlsx`

4. **Importer les enseignants**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel enseignants
   - Vérifier l'aperçu
   - Confirmer l'import
   - Vérifier dans `Enseignants`

5. **Importer les examens**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel examens
   - Vérifier l'aperçu
   - Confirmer l'import
   - Vérifier dans `Examens`

6. **Importer les vœux**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel vœux
   - Vérifier l'aperçu
   - Confirmer l'import
   - Vérifier dans `Vœux`

#### Phase 3 : Vérification (Important)

7. **Consulter le tableau de bord**
   - Vérifier le nombre d'enseignants actifs
   - Vérifier le nombre d'examens
   - Vérifier le nombre de séances
   - Noter les alertes éventuelles

8. **Vérifier les statistiques**
   - Aller dans `Statistiques`
   - Vérifier la répartition par grade
   - Calculer le ratio besoin/quotas
   - Identifier les problèmes potentiels

#### Phase 4 : Génération du Planning

9. **Configurer la génération**
   - Aller dans `Génération`
   - Définir le nombre minimum de surveillants par examen (2 recommandé)
   - Activer/Désactiver les options :
     - ✅ Respecter les vœux (recommandé)
     - ✅ Mode adaptatif (si quotas limites)
     - ✅ Regroupement temporel
     - ❌ Équilibrage temporel strict (si beaucoup de contraintes)

10. **Lancer la génération**
    - Cliquer sur `Générer le Planning`
    - Attendre (10 secondes à 15 minutes selon la taille)
    - Observer la progression

11. **Analyser les résultats**
    - Lire le résumé (succès/échec)
    - Consulter les **warnings** (très important)
    - Vérifier les statistiques de génération
    - Noter les violations éventuelles

#### Phase 5 : Ajustements Manuels (Optionnel)

12. **Consulter le planning**
    - Aller dans `Planning`
    - Visualiser les affectations par séance
    - Identifier les ajustements nécessaires

13. **Modifier manuellement**
    - Utiliser le composant `Gestion Enseignants Séance`
    - Ajouter/Retirer des enseignants
    - Valider les contraintes en temps réel
    - Sauvegarder les modifications

#### Phase 6 : Export et Distribution

14. **Exporter le planning**
    - Aller dans `Export`
    - Choisir le format :
      - Excel → pour analyse
      - Word → pour impression
      - PDF → pour distribution officielle
    - Télécharger le fichier

15. **Exporter les convocations**
    - Générer les convocations individuelles
    - Vérifier le contenu
    - Distribuer aux enseignants

### ⚠️ Bonnes Pratiques

#### ✅ À FAIRE

1. **Préparation des données**
   - ✅ Vérifier le format Excel avant import (colonnes, types)
   - ✅ Nettoyer les données (supprimer doublons, corriger fautes)
   - ✅ Tester avec un petit échantillon avant import massif
   - ✅ Garder une copie de sauvegarde des fichiers Excel

2. **Configuration**
   - ✅ Ajuster les quotas en fonction de la charge réelle
   - ✅ Configurer tous les grades avant génération
   - ✅ Vérifier que les codes SmartEx sont uniques

3. **Génération**
   - ✅ Consulter le dashboard avant génération
   - ✅ Lire et comprendre les warnings
   - ✅ Commencer avec 2 surveillants/examen puis ajuster
   - ✅ Activer le mode adaptatif si quotas limites
   - ✅ Sauvegarder les résultats après chaque génération réussie

4. **Vérification**
   - ✅ Vérifier l'égalité par grade (statistiques)
   - ✅ Vérifier le respect des vœux (rapport)
   - ✅ Vérifier qu'il n'y a pas de conflits horaires
   - ✅ Tester les exports avant distribution

5. **Maintenance**
   - ✅ Nettoyer la base régulièrement (supprimer anciennes sessions)
   - ✅ Sauvegarder la base de données (`database/surveillance.db`)
   - ✅ Exporter les données importantes (Excel)

#### ❌ À ÉVITER

1. **Erreurs de manipulation**
   - ❌ Importer des fichiers Excel mal formatés
   - ❌ Modifier manuellement la base de données SQLite
   - ❌ Ignorer les warnings de l'algorithme
   - ❌ Forcer une génération avec des contraintes incompatibles

2. **Configuration incorrecte**
   - ❌ Définir des quotas trop faibles par rapport au besoin
   - ❌ Oublier de configurer les grades
   - ❌ Avoir des doublons dans les codes SmartEx
   - ❌ Mélanger les formats de date/heure

3. **Erreurs de workflow**
   - ❌ Exporter avant de vérifier les résultats
   - ❌ Distribuer un planning non vérifié
   - ❌ Ignorer les violations de vœux importantes
   - ❌ Ne pas tester les modifications manuelles

4. **Problèmes de performance**
   - ❌ Importer des milliers de lignes sans vérification
   - ❌ Générer plusieurs fois sans analyser les échecs
   - ❌ Garder trop de données anciennes dans la base

### 🔍 Résolution de Problèmes

#### Problème 1 : "Aucune solution trouvée"

**Symptômes :**
- L'algorithme se termine sans solution
- Message : "No solution found" ou "INFEASIBLE"

**Causes possibles :**
1. Quotas très insuffisants
2. Contraintes incompatibles
3. Trop de vœux restrictifs
4. Erreurs dans les données

**Solutions :**

1. **Vérifier les quotas** (priorité haute)
   ```
   Calcul manuel :
   - Besoin total = nb_séances × nb_examens_par_séance × min_surveillants
   - Quotas disponibles = Σ (nb_enseignants_grade × quota_grade)
   - Si Besoin > Quotas → PROBLÈME
   ```
   
   **Actions :**
   - Augmenter les quotas par grade
   - Ou ajouter des enseignants
   - Ou réduire le nombre de surveillants requis

2. **Activer le mode adaptatif**
   - Cocher `Mode adaptatif` dans les options
   - Relancer la génération
   - L'algorithme ajustera automatiquement

3. **Réduire les contraintes**
   - Décocher `Respecter les vœux`
   - Relancer
   - Analyser si une solution existe sans vœux

4. **Vérifier les données**
   - Examens avec dates/heures correctes
   - Pas de conflits impossibles
   - Enseignants avec `Participe = Oui`

#### Problème 2 : "Vœux non respectés"

**Symptômes :**
- Planning généré avec succès
- Warning : "X vœux non respectés"
- Enseignants affectés sur créneaux indisponibles

**Explication :**
Les vœux sont des contraintes **souples** (SOFT). Si nécessaire pour trouver une solution, l'algorithme peut les violer.

**Causes :**
- Quotas justes ou insuffisants
- Trop de vœux sur mêmes créneaux
- Conflit entre égalité stricte et vœux

**Solutions :**

1. **Analyser le rapport de violations**
   - Consulter le détail dans `Statistiques`
   - Identifier les enseignants concernés
   - Vérifier si violations mineures ou majeures

2. **Ajuster manuellement**
   - Aller dans `Planning`
   - Retirer l'enseignant du créneau problématique
   - Affecter un autre enseignant disponible
   - Vérifier que les contraintes restent satisfaites

3. **Réviser les vœux**
   - Demander aux enseignants de réduire vœux
   - Prioriser les vœux vraiment critiques
   - Réimporter et régénérer

4. **Accepter les violations mineures**
   - Si < 5% de violations : acceptable
   - Si violations critiques uniquement : discuter avec enseignants
   - Documenter et justifier

#### Problème 3 : "Export Word → PDF échoue"

**Symptômes :**
- Export Word réussit
- Conversion PDF échoue
- Erreur : "Microsoft Word not found"

**Causes :**
- Microsoft Word pas installé
- Word pas accessible via COM
- Permissions insuffisantes

**Solutions :**

1. **Installer Microsoft Word**
   - Version complète requise (pas Office Online)
   - Redémarrer l'application après installation

2. **Alternative : Conversion manuelle**
   - Ouvrir le fichier `.docx` exporté
   - Dans Word : `Fichier` → `Enregistrer sous` → `PDF`
   - Sauvegarder

3. **Alternative : Autre logiciel**
   - Installer LibreOffice (gratuit)
   - Utiliser : `libreoffice --headless --convert-to pdf fichier.docx`

#### Problème 4 : "Génération très lente"

**Symptômes :**
- Génération prend > 10 minutes
- Barre de progression bloquée
- CPU à 100%

**Causes :**
- Problème très grand (> 100 enseignants, > 200 séances)
- Contraintes très complexes
- Manque de RAM

**Solutions :**

1. **Réduire le temps maximum**
   - Par défaut : 900 secondes (15 min)
   - Réduire à 300 secondes (5 min)
   - Accepter solution sub-optimale

2. **Simplifier les contraintes**
   - Désactiver `Équilibrage temporel strict`
   - Désactiver `Regroupement`
   - Garder uniquement contraintes essentielles

3. **Diviser le problème**
   - Générer par semestre séparément
   - Générer par session séparément
   - Fusionner manuellement après

#### Problème 5 : "Import Excel échoue"

**Symptômes :**
- Erreur lors de l'import
- Message : "Format invalide" ou "Colonne manquante"

**Causes :**
- Colonnes mal nommées
- Types de données incorrects
- Encodage de fichier

**Solutions :**

1. **Vérifier les colonnes**
   - Respecter exactement les noms (case-sensitive)
   - Supprimer espaces superflus
   - Vérifier l'ordre (pas forcément important mais recommandé)

2. **Vérifier les types**
   - Dates en format : `15/01/2025` (j/m/a)
   - Heures en format : `08:30` (HH:MM)
   - Codes sans caractères spéciaux

3. **Vérifier l'encodage**
   - Sauvegarder en UTF-8
   - Ou Windows-1252
   - Pas de caractères exotiques

4. **Utiliser le template**
   - Télécharger le template depuis l'application
   - Copier vos données dedans
   - Réimporter

---

## 📞 Support et Contribution

### 🐛 Rapporter un Bug

Ouvrez une **issue** sur GitHub avec :

**Template :**
```markdown
**Description du bug**
Décrivez clairement le problème.

**Étapes pour reproduire**
1. Aller sur '...'
2. Cliquer sur '...'
3. Voir l'erreur

**Comportement attendu**
Ce qui devrait se passer normalement.

**Comportement observé**
Ce qui se passe réellement.

**Captures d'écran**
Si applicable, ajouter des captures.

**Environnement**
- OS : Windows 10/11
- Version de l'application : 1.0.0
- Navigateur (si applicable) : ...

**Logs/Erreurs**
Copier les messages d'erreur ici.
```

### 💡 Demandes de Fonctionnalités

Ouvrez une **issue** avec le tag `enhancement`.

**Template :**
```markdown
**Fonctionnalité souhaitée**
Description claire de la fonctionnalité.

**Motivation**
Pourquoi cette fonctionnalité est-elle importante ?

**Solution proposée**
Comment devrait-elle fonctionner ?

**Alternatives considérées**
Autres approches possibles.
```

### 🤝 Contributions

Les **Pull Requests** sont les bienvenues !

**Process :**
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

**Guidelines :**
- Code propre et commenté
- Tests si applicable
- Documentation mise à jour
- Respect des conventions du projet

---

## 📜 License

**Propriétaire** - Tous droits réservés.

© 2025 Marwen Benammou & Wajdi Kharroubi

Ce logiciel est la propriété de ses auteurs. Toute utilisation, reproduction ou distribution non autorisée est strictement interdite.

---

## 📚 Documentation Supplémentaire

### API Documentation

Une fois le backend démarré en mode développement, accédez à :

- **Swagger UI** (interactif) : [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc** (documentation) : [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

### Documentation Technique

| Document | Description | Lien |
|----------|-------------|------|
| `ALGORITHME_SURVEILLANCE.md` | Détails de l'algorithme d'optimisation | `docs/` |
| `GESTION_AFFECTATIONS.md` | Guide gestion manuelle des affectations | `docs/` |
| `GUIDE_TEST_AFFECTATIONS.md` | Guide de test des endpoints | `docs/` |
| `README_MODIFICATIONS_AFFECTATIONS.md` | Résumé des modifications | `docs/` |

### Structure de la Base de Données

```
┌─────────────────┐
│  Enseignants    │
├─────────────────┤
│ id              │◄──┐
│ nom             │   │
│ prenom          │   │
│ email           │   │
│ grade           │   │
│ grade_code      │   │
│ code_smartex    │   │
│ abrv_ens        │   │
│ participe_...   │   │
└─────────────────┘   │
                      │
┌─────────────────┐   │   ┌──────────────┐
│    Examens      │   │   │    Voeux     │
├─────────────────┤   │   ├──────────────┤
│ id              │◄──┼───│ id           │
│ dateExam        │   │   │ enseignant_id│───┘
│ h_debut         │   │   │ code_smartex │
│ h_fin           │   │   │ semestre_... │
│ session         │   │   │ session_...  │
│ type_ex         │   │   │ date_voeu    │
│ semestre        │   │   │ jour         │
│ enseignant      │   │   │ seance       │
│ cod_salle       │   │   │ motif        │
└─────────────────┘   │   └──────────────┘
        ▲             │
        │             │
┌───────┴─────────┐   │
│  Affectations   │   │
├─────────────────┤   │
│ id              │   │
│ examen_id       │───┘
│ enseignant_id   │───────┘
│ cod_salle       │
│ est_responsable │
└─────────────────┘

┌──────────────────┐
│  GradeConfig     │
├──────────────────┤
│ id               │
│ grade_code       │
│ grade_nom        │
│ nb_surveillances │
└──────────────────┘
```

**Relations :**
- `Enseignants` 1-N `Voeux`
- `Enseignants` 1-N `Affectations`
- `Examens` 1-N `Affectations`
- `GradeConfig` 1-N `Enseignants` (via `grade_code`)

---

## 🎓 Glossaire

| Terme | Définition |
|-------|------------|
| **Séance** | Créneau horaire regroupant plusieurs examens simultanés (ex: tous les examens de 08:00 à 10:00 le même jour) |
| **Vœu** | Déclaration de non-disponibilité d'un enseignant sur un créneau spécifique |
| **Quota** | Nombre maximum de séances qu'un enseignant peut surveiller (défini par grade) |
| **Grade** | Catégorie d'enseignant (PR, MC, MA, AS, TE, VA) déterminant son quota |
| **Affectation** | Attribution d'un enseignant à un examen dans une salle |
| **Responsable** | Enseignant en charge d'un examen (souvent le professeur du cours) |
| **CP-SAT** | Constraint Programming - Satisfiability, solveur d'optimisation de Google |
| **Contrainte dure (HARD)** | Règle obligatoire qui ne peut jamais être violée |
| **Contrainte souple (SOFT)** | Règle préférentielle qui peut être violée si nécessaire pour trouver une solution |
| **Mode adaptatif** | Mode où l'algorithme ajuste automatiquement le nombre de surveillants pour respecter les quotas |
| **Égalité stricte** | Principe garantissant que tous les enseignants d'un même grade font exactement le même nombre de séances |
| **SmartEx** | Système de codes d'identification des enseignants et examens |
| **Session** | Période d'examens (Principale, Contrôle, Rattrapage) |
| **Semestre** | Période académique (Semestre 1, Semestre 2) |

---

## 🚀 Roadmap Future

### Version 1.1 (Court terme)
- [ ] Support de l'authentification multi-utilisateurs
- [ ] Historique des plannings générés
- [ ] Comparaison entre versions de planning
- [ ] Amélioration des performances (cache, indexation)

### Version 1.2 (Moyen terme)
- [ ] Notifications par email aux enseignants
- [ ] Export iCal pour intégration calendrier
- [ ] Application mobile de consultation
- [ ] Support multi-langue (Français, Anglais, Arabe)

### Version 2.0 (Long terme)
- [ ] Support multi-plateforme (Linux, macOS)
- [ ] Mode cloud avec base de données PostgreSQL
- [ ] API publique pour intégrations tierces
- [ ] Machine Learning pour prédiction des vœux
- [ ] Dashboard analytique avancé avec graphiques
- [ ] Gestion de multiples établissements

### Améliorations continues
- [ ] Optimisation de l'algorithme (réduction temps de calcul)
- [ ] Nouvelles contraintes configurables
- [ ] Templates d'export personnalisables
- [ ] Import depuis autres systèmes (Moodle, etc.)

---

## 🙏 Remerciements

Nous tenons à remercier :

- **Google OR-Tools** pour leur excellente bibliothèque d'optimisation
- **FastAPI** pour le framework web moderne
- **Electron** pour la plateforme d'application de bureau
- **La communauté open-source** pour les nombreuses bibliothèques utilisées
- **Les beta-testeurs** pour leurs retours précieux

---

## 📧 Contact

Pour toute question, suggestion ou problème :

- **GitHub Issues** : [https://github.com/wajdi-kharroubi/isi-Surveillance/issues](https://github.com/wajdi-kharroubi/isi-Surveillance/issues)
- **Email** : (À définir si souhaité)

---

**Dernière mise à jour :** Octobre 2025

**Version du document :** 1.0.0
