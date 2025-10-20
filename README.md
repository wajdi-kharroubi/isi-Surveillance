# 📋 Application de Gestion des Surveillances d'Examens

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Propriétaire-red.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)


## 📑 Table des Matières
- [Description](#-description)
- [Démonstration Vidéo](#-démonstration-vidéo)
- [Installation du Logiciel Desktop](#-installation-du-logiciel-desktop)
- [Fonctionnalités](#-fonctionnalités-principales)
- [Structure du Projet](#-structure-du-projet)
- [Installation](#-installation-et-exécution)
- [Modes d'Exécution](#-modes-dexécution)
- [Solution et Algorithme](#-solution-proposée-et-algorithme)
- [Configuration des Grades](#-configuration-des-grades)
- [Formats Import/Export](#-formats-dimportexport)
- [Recommandations](#-recommandations-dutilisation)
- [Résolution de Problèmes](#-résolution-de-problèmes)

## 🔗 Lien GitHub du Projet

**Repository:** [https://github.com/wajdi-kharroubi/isi-Surveillance](https://github.com/wajdi-kharroubi/isi-Surveillance)

## 📝 Description

Application de bureau complète pour la **gestion automatisée des plannings de surveillance des examens**. Cette solution utilise des algorithmes d'optimisation avancés pour générer des plannings équitables tout en respectant les contraintes et les préférences des enseignants.

### 👥 Auteurs
- **Marwen Benammou**
- **Wajdi Kharroubi**

---

## 🎥 Démonstration Vidéo

Découvrez l'application en action à travers cette démonstration complète :

**[▶️ Voir la démonstration sur YouTube](https://www.youtube.com/watch?v=JNGDvO74-O0)**

Cette vidéo présente :
-  L'interface utilisateur complète
-  Le processus d'import des données (Enseignants, Examens, Souhaits)
-  La génération automatique du planning
-  La consultation et modification manuelle des affectations
-  L'export des documents (Word/PDF)

---

## 💻 Installation du Logiciel Desktop

### 📦 Installation via l'exécutable (.exe)

Pour une installation rapide et simple, installez la version desktop de l'application :

#### Étapes d'installation :

1. **Exécuter l'installateur**
   - Double-cliquez sur le fichier "Gestion Surveillances-1.0.0-Setup"
   - Si Windows Defender SmartScreen affiche un avertissement, cliquez sur "Plus d'informations" puis "Exécuter quand même"

2. **Suivre l'assistant d'installation**
   - Acceptez les termes de la licence
   - Choisissez le dossier d'installation (par défaut : `C:\Program Files\Gestion Surveillances`)
   - Cliquez sur "Installer"

3. **Lancer l'application**
   - Une fois l'installation terminée, l'application se lance automatiquement
   - Un raccourci est créé sur le bureau et dans le menu Démarrer

---

## 🎯 Fonctionnalités Principales

### 1️⃣ Gestion des Enseignants
-  Import des enseignants via fichiers Excel
-  Configuration des quotas de surveillance par grade
-  Gestion de la participation aux surveillances
-  Codes SmartEx pour l'intégration avec les systèmes existants

### 2️⃣ Gestion des Examens
-  Import des examens depuis fichiers Excel
-  Organisation par semestre et salles
-  Planification horaire détaillée

### 3️⃣ Gestion des Souhait (Indisponibilités)
-  Déclaration des créneaux d'indisponibilité par enseignant
-  Import massif des souhaits via Excel
-  Visualisation des souhaits par jour et séance

### 4️⃣ Génération Automatique de Planning
-  **Algorithme d'optimisation avancé** (OR-Tools CP-SAT Solver)
-  Respect strict de l'égalité par grade
-  Respect des quotas maximum de surveillance
-  Prise en compte des souhais de non-disponibilité
-  Mode adaptatif pour gérer les situations complexes
-  Équilibrage temporel des surveillances
-  Regroupement intelligent des séances

### 5️⃣ Gestion Manuelle des Affectations
-  Ajout/Suppression d'enseignants par séance
-  Modification après génération automatique
-  Validation des contraintes en temps réel
-  Suivi des modifications manuelles

### 6️⃣ Export et Rapports
-  Export Word avec tableaux détaillés
-  Conversion automatique Word → PDF
-  Visualisation des affectations par séance
-  Convocations individuelles

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
│   │   ├── voeux.py                 # Gestion des souhais
│   │   ├── imports.py               # Import Excel
│   │   ├── generation.py            # Génération de planning
│   │   ├── export.py                # Export Word/PDF
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
│   │   │   ├── Voeux.jsx            # Gestion souhais
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

```

#### 3. Installation du Frontend

```powershell
cd frontend

# Installer les dépendances Node.js
npm install

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

1.  **Vérification de l'environnement** Python et Node.js
2.  **Build du Backend** → Exécutable `backend.exe` (PyInstaller)
3.  **Build du Frontend** → Application React (Vite)
4.  **Packaging Electron** → Application de bureau
5.  **Création de l'installateur** → `Gestion Surveillances-1.0.0-Setup.exe`

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
- Tenant compte des **souhais de non-disponibilité**
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
┌────────▼────────┐ ┌──────▼─────────────────┐
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
| **P3** | souhais de non-disponibilité | 10000 | Minimiser les affectations sur les créneaux déclarés indisponibles |
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


#### Fonction Objectif

```python
Minimiser :
  - 10000 × violations_souhais              # Priorité 3
  - 5000 × responsables_absents          # Priorité 4
  - 1000 × déséquilibre_temporel         # Priorité 5
  - 500 × séances_isolées                # Priorité 6
  - 100 × non_regroupement               # Priorité 7
  + bonus_dispersion_grades              # Bonus pour égalité parfaite
```



## 🔒 Contraintes et Règles Métier

### Contraintes du Problème

#### 1. Contraintes Organisationnelles
-  Chaque examen doit avoir au minimum N surveillants
-  Les enseignants sont affectés par **séance** (pas par examen individuel)
-  Une séance = ensemble d'examens au même créneau horaire
-  Les salles d'examens sont assignées dans les affectations

#### 2. Contraintes d'Équité
-  **Égalité stricte par grade** : tous les Professeurs font le même nombre de séances, tous les Maîtres Assistants font le même nombre, etc.
-  Respect des quotas configurés par grade
-  Pas de favoritisme ou de surcharge
-  Transparence totale des affectations

#### 3. Contraintes Temporelles
-  Respect des souhais de non-disponibilité
-  Pas de conflits horaires (un enseignant ne peut pas être à deux endroits en même temps)
-  Répartition équilibrée dans le temps

#### 4. Contraintes de Qualité
-  Présence privilégiée des responsables d'examen
-  Nombre suffisant de surveillants par séance
-  Éviter les séances isolées (uniquement première ou dernière)

### Gestion des Cas Limites

#### Cas 1 : Quotas insuffisants

**Solution de l'algorithme** :
1. Activation automatique du **mode adaptatif**
2. Réduction du nombre de surveillants par séance
3. Maintien d'au minimum 1 surveillant par examen
4. Génération de **warnings** explicites
5. Suggestions d'ajustement :
   - Recruter plus d'enseignants
   - Augmenter les quotas
   - Réduire le nombre d'examens simultanés

#### Cas 2 : Trop de souhais de non-disponibilité

**Problème** : Si 80% des enseignants déclarent être indisponibles sur une séance critique.

**Solution** :
1. Violations minimales des souhais (contrainte souple P3)
2. Priorité aux enseignants sans vœu sur cette séance
3. Génération d'un rapport des violations
4. Suggestion de révision des souhais

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
   - Désactiver le respect des souhais
   - Augmenter les quotas
   - Activer le mode adaotative

---

## 📊 Configuration des Grades

Les grades configurables incluent :

| Code Grade | Libellé complet | Quota par défaut | Modifiable |
|------------|----------------|------------------|------------|
| **PR** | Professeur | 4 | ✅ |
| **MC** | Maître de Conférences | 4 | ✅ |
| **MA** | Maître Assistant | 7 | ✅ |
| **AS** | Assistant | 8 | ✅ |
| **AC** | Assistant Contractuel  | 9 | ✅ |
| **PTC** | Professeur Tronc Commun | 9 | ✅ |
| **PES** | Professeur d’enseignement secondaire | 9 | ✅ |
| **EX** | Expert | 3 | ✅ |
| **V** | Vacataire | 4 | ✅ |


### Personnalisation des Quotas

Les quotas sont **entièrement configurables** via :
- Interface graphique (page Configuration des Grades)


## 📤 Formats d'Import/Export

### Import Excel - Enseignants

**Format requis :**
								


| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `nom_ens` | Texte | ✅ | Nom de famille | BENAMMOU |
| `prenom_ens` | Texte | ✅ | Prénom | Marwen |
| `abrv_ens` | Texte | ✅ | Abréviation enseignant | M.BENAMMOU |
| `email_ens` | Email | ✅ | Adresse email unique | marwen.benammou@example.com |
| `grade_code_ens` | Code | ✅ | Code du grade (2-3 lettres) | MA |
| `code_smartex_ens` | int | ✅ | Identifiant SmartEx unique | 65 |
| `participe_surveillance` | VRAI/FAUX | ✅ | Participe aux surveillances | VRAI/FAUX |

**Exemple de fichier :**

| nom_ens   | prenom_ens | email_ens                | abrv_ens    | grade_code_ens | code_smartex_ens | participe_surveillance |
|-----------|------------|--------------------------|-------------|----------------|------------------|------------------------|
| BENAMMOU  | Marwen     | marwen.b@example.com     | M.BENAMMOU  | MA             | 65               | VRAI                    |
| KHARROUBI | Wajdi      | wajdi.k@example.com      | W.KHARROUBI | PR             | 66               | VRAI                    |
| DUPONT    | Jean       | jean.dupont@example.com  | J.DUPONT    | AS             | 67               | FAUX                    |

### Import Excel - Examens

**Format requis :**

| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `dateExam` | Date | ✅ | Date de l'examen (format j/m/a) | 15/01/2025 |
| `h_debut` | Heure | ✅ | Heure de début (HH:MM) | 08:30 |
| `h_fin` | Heure | ✅ | Heure de fin (HH:MM) | 10:30 |
| `session` | Code | ✅ | Session (P/R) | P |
| `type ex` | Texte | ✅ | Type  | E |
| `semestre` | Texte | ✅ | Semestre | SEMESTRE 1 |
| `enseignant` | Code | ✅ | Code SmartEx responsable | 65 |
| `cod_salle` | Code | ✅ | Code de la salle | A201 |


**Exemple de fichier :**

| dateExam   | h_debut | h_fin | session | type ex | semestre   | enseignant | cod_salle |
|------------|---------|-------|---------|---------|------------|------------|-----------|
| 15/01/2025 | 08:30   | 10:30 | P       | E       | SEMESTRE 1 | 58         | A201      |
| 15/01/2025 | 08:30   | 10:30 | P       | E       | SEMESTRE 1 | 41         | A202      |
| 15/01/2025 | 14:00   | 16:00 | P       | E       | SEMESTRE 1 | 64         | B101      |

### Import Excel - souhais

**Format requis :**


| Colonne | Type | Obligatoire | Description | Exemple |
|---------|------|-------------|-------------|---------|
| `Enseignant` | Code | ✅ | Code enseignant | M.BENAMMOU |
| `Semestre` | Texte | ✅ | Semestre (Semestre 1/Semestre 2) | Semestre 1 |
| `Session` | Texte | ✅ | Session (Partiel/Examen/Rattrapage) | Partiel |
| `Date` | Date | ✅ | Date (format j/m/a) | 15/01/2025 |
| `Jour` | Texte | ✅ | Jour de la semaine | Lundi |
| `Séances` | Code | ✅ | Code séance (S1/S2/S3/S4) | S1,S2,S3 |

**Exemple de fichier :**

Enseignant   | Semestre  | Session | Date       | Jour    | Séances 
-------------|-----------|---------|------------|---------|--------
M.BENAMMOU   | Semestre 1 | Partiel | 15/01/2025 | Lundi   | S1   
W.KHARROUBI  | Semestre 1 | Partiel | 15/01/2025 | Lundi   | S3     
J.DUPEN      | Semestre 1 | Partiel  | 20/01/2025 | Samedi  | S2      

### Exports disponibles

#### Export Word ou PDF
- Documents formatés avec tableaux
- Planning détaillé
- Convocations individuelles
- Listes enseignant par créneau


## 📖 Recommandations d'Utilisation

### 🎯 Workflow Recommandé

#### Phase 1 : Configuration Initiale (Une fois)

1. **Installer l'application**
   - Exécuter `Gestion Surveillances-1.0.0-Setup.exe`
   - Laisser l'installation se terminer

2. **Configurer les grades**
   - Ouvrir l'application
   - Aller dans `Configuration` → `Grades`
   - Vérifier les quotas par grade
   - Sauvegarder

#### Phase 2 : Import des Données (Chaque session)

3. **Importer les enseignants**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel enseignants
   - Confirmer l'import
   - Vérifier dans `Enseignants`

4. **Importer les examens**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel examens
   - Confirmer l'import
   - Vérifier dans `Examens`

5. **Importer les souhait**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel souhait
   - Confirmer l'import
   - Vérifier dans `Souhait`

#### Phase 3 : Génération du Planning

6. **Configurer la génération**
   - Aller dans `Génération`
   - Définir la durée maximale d’exécution
   - Définir le nombre minimum de surveillants par examen (2 recommandé)
   - Définir la tolérance maximale admissible.
7. **Lancer la génération**
    - Cliquer sur `Générer le Planning`
    - Observer la progression
8. **Analyser les résultats**
    - Lire le résumé (succès/échec)
    - Consulter les **warnings** (très important)
    - Vérifier les statistiques de génération
    - Noter les violations éventuelles

#### Phase 4 : Ajustements Manuels (Optionnel)

9. **Consulter le planning**
    - Aller dans `Planning`
    - Visualiser les affectations par séance
    - Identifier les ajustements nécessaires

10. **Modifier manuellement**
    - Utiliser le composant `Gestion Enseignants Séance`
    - Ajouter/Retirer des enseignants
    - Sauvegarder les modifications

#### Phase 5 : Export et Distribution

11. **Exporter le planning ou les convocations**
    - Aller dans `Export`
    - Choisir le format 
    - Télécharger les fichiers 

### ⚠️ Bonnes Pratiques

#### ✅ À FAIRE

1. **Préparation des données**
   -  Vérifier le format Excel avant import (colonnes, types)
   -  Nettoyer les données (corriger fautes)

2. **Configuration**
   -  Ajuster les quotas en fonction de la charge réelle

3. **Génération**
   -  Consulter le dashboard avant génération
   -  Lire et comprendre les warnings
   -  Commencer avec 2 surveillants/examen puis ajuster
   -  Activer le mode adaptatif si quotas limites

4. **Vérification**
   -  Vérifier le respect des souhais (rapport)
   -  Vérifier l'égalité par grade (Consulter Planning)
   -  Vérifier qu'il n'y a pas de conflits horaires

#### ❌ À ÉVITER

1. **Configuration incorrecte**
   -  Oublier d'importer les fichiers
   -  Oublier de verifier la configuration des grades
   -  Avoir des doublons dans les codes SmartEx
   -  Définir des quotas trop faibles par rapport au besoin


### 🔍 Résolution de Problèmes

#### Problème 1 : "Aucune solution trouvée"

**Symptômes :**
- L'algorithme se termine sans solution
- Message : "No solution found" ou "INFEASIBLE"

**Causes possibles :**
1. Quotas très insuffisants
2. Contraintes incompatibles
3. Trop de souhais restrictifs

**Solutions :**

1. **Vérifier les quotas** (priorité haute)   
   **Actions :**
   - Augmenter les quotas par grade
   - Ou réduire le nombre de surveillants requis

2. **Activer le mode adaptatif**
   - Cocher `Mode adaptatif` dans les options
   - Relancer la génération
   - L'algorithme ajustera automatiquement



#### Problème 2 : "souhais non respectés"

**Symptômes :**
- Planning généré avec succès
- Warning : "X souhais non respectés"
- Enseignants affectés sur créneaux indisponibles

**Explication :**
Les souhais sont des contraintes **souples** (SOFT). Si nécessaire pour trouver une solution, l'algorithme peut les violer.

**Causes :**
- Quotas justes ou insuffisants
- Trop de souhais sur mêmes créneaux
- Conflit entre égalité stricte et souhais

**Solutions :**

1. **Analyser le rapport de violations**
   - Identifier les enseignants concernés
   - Vérifier si violations mineures ou majeures

2. **Ajuster manuellement**
   - Aller dans `Planning`
   - Retirer l'enseignant du créneau problématique
   - Affecter un autre enseignant disponible
   - Vérifier que les contraintes restent satisfaites

3. **Réviser les souhais**
   - Demander aux enseignants de réduire souhais
   - Prioriser les souhais vraiment critiques
   - Réimporter et régénérer



#### Problème 3 : "Génération très lente"

**Symptômes :**
- Barre de progression bloquée
- CPU à 100%

**Causes :**
- Problème très grand (> 200 enseignants, > 500 séances)
- Contraintes très complexes
- Manque de RAM

**Solutions :**

1. **Réduire le temps maximum**
   - Par défaut : 900 secondes (15 min)
   - Réduire à 300 secondes (5 min)
   - Accepter solution sub-optimale

2. **Simplifier les contraintes**
   - Ajuster les paramètres

#### Problème 4 : "Import Excel échoue"

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

---



## 📚 Documentation Supplémentaire

### API Documentation

Une fois le backend démarré en mode développement, accédez à :

- **Swagger UI** (interactif) : [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc** (documentation) : [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)


**Dernière mise à jour :** Octobre 2025

**Version du document :** 1.0.0
