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
- [Quotas d'Exception](#-quotas-dexception-individuels)
- [Aide à la Décision](#-aide-à-la-décision)
- [Validation des Contraintes](#-validation-des-contraintes-en-temps-réel)
- [Envoi d'Emails](#-envoi-des-convocations-par-email)
- [Gestion des Présences/Absences](#-gestion-des-présencesabsences)
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

**[▶️ Voir la démonstration sur YouTube de la version 2](https://www.youtube.com)**

**[▶️ Voir la démonstration sur YouTube de la version 1](https://www.youtube.com/watch?v=JNGDvO74-O0)**

Cette vidéo présente :

- L'interface utilisateur complète
- Le processus d'import des données (Enseignants, Examens, Souhaits)
- La génération automatique du planning
- La consultation et modification manuelle des affectations
- L'export des documents (Word/PDF)

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

- Import des enseignants via fichiers Excel
- Configuration des quotas de surveillance par grade
- **Quotas d'exception individuels** pour des enseignants spécifiques
- Gestion de la participation aux surveillances
- Codes SmartEx pour l'intégration avec les systèmes existants
- Nombre maximum de séances par jour personnalisable

### 2️⃣ Gestion des Examens

- Import des examens depuis fichiers Excel
- Organisation par semestre et salles
- Planification horaire détaillée
- Identification des enseignants responsables

### 3️⃣ Gestion des Souhaits (Indisponibilités)

- Déclaration des créneaux d'indisponibilité par enseignant
- Import massif des souhaits via Excel
- Visualisation des souhaits par jour et séance
- Prise en compte prioritaire lors de la génération

### 4️⃣ Aide à la Décision

- **Calcul automatique des quotas recommandés par grade**
- Analyse de faisabilité (OPTIMAL/ACCEPTABLE/CRITIQUE)
- Recommandations sur le nombre de souhaits autorisés par grade
- Alertes et recommandations d'actions
- Export des créneaux de non-souhaits autorisés

### 5️⃣ Génération Automatique de Planning

- **Algorithme d'optimisation avancé** (OR-Tools CP-SAT Solver)
- Respect strict de l'égalité par grade
- Respect des quotas maximum de surveillance
- **Support des quotas d'exception individuels**
- Prise en compte des souhaits de non-disponibilité
- Mode adaptatif pour gérer les situations complexes
- Équilibrage temporel des surveillances
- Regroupement intelligent des séances
- **Respect du nombre maximum de séances par jour**

### 6️⃣ Statistiques et Analyses

- Tableau de bord complet
- Charge de travail par enseignant
- **Visualisation des enseignants avec quotas d'exception**
- Historique des générations
- Analyse des souhaits violés
- Statistiques des responsables absents
- Graphiques et visualisations

### 7️⃣ Gestion Manuelle des Affectations

- Ajout/Suppression d'enseignants par séance
- **Validation en temps réel des contraintes** avant modification
- **Échange d'enseignants** entre deux séances avec vérification
- Modification après génération automatique
- Suivi des modifications manuelles
- Détection automatique des conflits horaires
- Vérification du dépassement des quotas
- Vérification des souhaits de non-disponibilité

### 8️⃣ Export et Rapports

- Export Word avec tableaux détaillés
- Conversion automatique Word → PDF
- Convocations individuelles (Word/PDF)
- Listes par créneaux (Word/PDF)
- **Export CSV/XLSX des convocations**
- Visualisation des affectations par séance

### 9️⃣ Envoi d'Emails

- **Intégration Gmail OAuth2** pour l'envoi sécurisé
- **Envoi en masse des convocations** par email
- Pièces jointes PDF automatiques
- **Création des événements** dans Google Agenda

### 🔟 Gestion des Présences/Absences

- **Enregistrement des présences** par séance
- Visualisation en grille ou liste
- Filtres avancés (date, heure, session, semestre)
- **Statistiques de présence** par enseignant
- **Export Excel des absences** pour suivi administratif
- Recherche rapide d'enseignants

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
│   │   ├── voeux.py                 # Gestion des souhaits
│   │   ├── imports.py               # Import Excel
│   │   ├── generation.py            # Génération de planning
│   │   ├── export.py                # Export Word/PDF/Email
│   │   ├── statistiques.py          # Statistiques
│   │   ├── grades.py                # Configuration grades
│   │   ├── planning.py              # Consultation et modification planning
│   │   └── decision.py              # Aide à la décision
│   │
│   ├── 📁 algorithms/               # Algorithmes d'optimisation
│   │   └── optimizer_v3.py          # Optimiseur OR-Tools
│   │
│   └── 📁 services/                 # Services métier
│       ├── import_service.py        # Logique d'import
│       ├── export_service.py        # Logique d'export
│       ├── decision_service.py      # Service d'aide à la décision
│       └── gmail_oauth_service.py   # Service Gmail OAuth2
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
│   │   │   ├── Voeux.jsx            # Gestion souhaits
│   │   │   ├── Generation.jsx       # Génération planning
│   │   │   ├── Planning.jsx         # Visualisation/modification planning
│   │   │   ├── Export.jsx           # Export documents
│   │   │   ├── Absence.jsx          # Gestion présences/absences
│   │   │   ├── Statistiques.jsx     # Statistiques
│   │   │   ├── ConfigGrades.jsx     # Configuration grades et exceptions
│   │   │   ├── AideDecision.jsx     # Aide à la décision
│   │   │   └── DataManager.jsx      # Import/Export données
│   │   │
│   │   ├── 📁 components/           # Composants réutilisables
│   │   │   ├── Layout.jsx           # Layout principal
│   │   │   ├── GestionEnseignantsSeanceInline.jsx  # Gestion manuelle
│   │   │   ├── GmailOAuthModal.jsx  # Modal OAuth Gmail
│   │   │   └── EmailConvocationsModal.jsx  # Modal envoi emails
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

- Backend autonome (sans Python requis)
- Application React compilée
- Application complète non installée
- **Installateur Windows** : `frontend/dist-electron/Gestion Surveillances-1.0.0-Setup.exe`

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
- **Gérant les quotas d'exception individuels** pour certains enseignants
- Tenant compte des **souhaits de non-disponibilité**
- Garantissant un **nombre suffisant de surveillants** par séance
- **Limitant le nombre de séances par jour** par enseignant
- Respectant la présence du **responsable** de la matière
- Optimisant la **répartition temporelle**

### Architecture de la Solution

L'application suit une architecture **client-serveur** moderne :

```
┌─────────────────────────────────────────────┐
│         Frontend (Electron + React)         │
│  - Interface utilisateur intuitive          │
│  - Gestion des imports/exports              │
│  - Visualisation des résultats              │
│  - Modification manuelle avec validation    │
│  - Aide à la décision                       │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼───────────────────────────┐
│          Backend (FastAPI)                  │
│  - API RESTful                              │
│  - Logique métier                           │
│  - Orchestration des services               │
│  - Validation des contraintes               │
│  - Service Gmail OAuth2                     │
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

| Priorité | Contrainte                 | Description                                                                                                                                         | Impact                    |
| -------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **P1**   | Égalité par grade          | Tous les enseignants NORMAUX d'un même grade font **exactement** le même nombre de séances (les enseignants avec `is_Exception=True` sont exemptés) | Équité garantie           |
| **P1**   | Quota maximum              | Aucun enseignant ne dépasse son quota : quota du grade pour les normaux, `quota_Exception` pour ceux avec `is_Exception=True`                       | Respect charge de travail |
| **P2**   | Nombre surveillants/séance | Chaque séance a le bon nombre de surveillants selon le mode (normal/adaptatif)                                                                      | Qualité surveillance      |
| **P2**   | Non-conflit horaire        | Un enseignant ne peut pas être affecté à deux examens simultanés                                                                                    | Faisabilité physique      |

#### Contraintes Souples (SOFT - Optimisées)

| Priorité | Contrainte                    | Poids | Description                                                        |
| -------- | ----------------------------- | ----- | ------------------------------------------------------------------ |
| **P3**   | Souhaits de non-disponibilité | 10000 | Minimiser les affectations sur les créneaux déclarés indisponibles |
| **P4**   | Responsables d'examen         | 5000  | Favoriser la présence des enseignants responsables d'examen        |
| **P5**   | Nombre max séances/jour       | 3000  | Respecter la limite de séances de chaque enseignant par jour       |
| **P6**   | Équilibrage temporel          | 1000  | Répartir les séances sur toute la période d'examen                 |
| **P7**   | Isolement première/dernière   | 500   | Éviter qu'un enseignant n'ait que la 1ère ou la dernière séance    |
| **P8**   | Regroupement                  | 100   | Favoriser les séances consécutives pour limiter les déplacements   |

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
  - 10000 × violations_souhaits              # Priorité 3
  - 5000 × responsables_absents              # Priorité 4
  - 1000 × déséquilibre_temporel             # Priorité 5
  - 500 × séances_isolées                    # Priorité 6
  - 100 × non_regroupement                   # Priorité 7
  + bonus_dispersion_grades                  # Bonus pour égalité parfaite
```

---

## 📊 Configuration des Grades

Les grades configurables incluent :

| Code Grade | Libellé complet                      | Quota par défaut | Modifiable |
| ---------- | ------------------------------------ | ---------------- | ---------- |
| **PR**     | Professeur                           | 4                | ✅         |
| **MC**     | Maître de Conférences                | 4                | ✅         |
| **MA**     | Maître Assistant                     | 7                | ✅         |
| **AS**     | Assistant                            | 8                | ✅         |
| **AC**     | Assistant Contractuel                | 9                | ✅         |
| **PTC**    | Professeur Tronc Commun              | 9                | ✅         |
| **PES**    | Professeur d'enseignement secondaire | 9                | ✅         |
| **EX**     | Expert                               | 3                | ✅         |
| **V**      | Vacataire                            | 4                | ✅         |

### Personnalisation des Quotas

Les quotas sont **entièrement configurables** via :

- Interface graphique (page Configuration des Grades)
- API REST (`/api/grades/`)

### Nombre Maximum de Séances par Jour

Chaque enseignant peut avoir un **nombre maximum de séances par jour** configurable :

- Par défaut : **4 séances/jour**
- Modifiable individuellement : **0-10 séances/jour**
- Vérifié lors de la génération automatique
- Vérifié lors des modifications manuelles

---

## 🎯 Quotas d'Exception Individuels

### Concept

Les **quotas d'exception** permettent de définir des quotas personnalisés pour des enseignants spécifiques, indépendamment de leur grade.

### Cas d'usage

- Enseignants à temps partiel
- Enseignants avec charges administratives
- Enseignants en situation particulière (santé, famille, etc.)
- Nouveaux enseignants avec charge réduite

### Configuration

1. Aller dans **Configuration** → **Grades et Exceptions**
2. Sélectionner l'onglet **"Exceptions Individuelles"**
3. Rechercher l'enseignant concerné
4. Cliquer sur **"Définir Exception"**
5. Définir le quota personnalisé
6. Sauvegarder

### Fonctionnement dans l'Algorithme

- Les enseignants avec `is_Exception = True` sont **exemptés** de la contrainte d'égalité stricte par grade
- Ils utilisent leur `quota_Exception` personnel au lieu du quota de leur grade
- L'algorithme respecte toujours leur quota maximum
- Ils apparaissent avec un badge **"EXCEPTION"** dans l'interface

### Réinitialisation

Pour revenir au quota du grade :

```http
DELETE /api/enseignants/{enseignant_id}/exception
```

---

## 🎯 Aide à la Décision

### Concept

L'**Aide à la Décision** est un outil d'analyse qui calcule automatiquement :

- Les quotas recommandés par grade
- Le nombre de souhaits autorisés par grade
- L'analyse de faisabilité du planning
- Les alertes et recommandations

### Fonctionnalités

#### 1. Calcul des Quotas Recommandés

L'outil analyse :

- Le nombre d'enseignants par grade
- Le nombre total de séances à couvrir
- Les besoins en surveillants par séance
- Les absences potentielles (majoration configurable)

Et produit des quotas respectant la **hiérarchie des grades** :

```
PR/MC/V (quota le plus bas) < MA < AS < AC/PES/PTC
```

#### 2. Analyse de Faisabilité

Trois niveaux d'évaluation :

| Statut            | Marge | Description                                     |
| ----------------- | ----- | ----------------------------------------------- |
| 🟢 **OPTIMAL**    | ≥ 20% | Large marge pour gérer les absences et imprévus |
| 🟡 **ACCEPTABLE** | 5-20% | Marge suffisante mais limitée                   |
| 🔴 **CRITIQUE**   | < 5%  | Ressources insuffisantes, risques élevés        |

#### 3. Souhaits Autorisés

Calcul du nombre de créneaux de non-souhaits autorisés par grade :

**Formule stricte :**

```
nb_voeux_max = max(0, floor((nb_total_seances - quota) × 0.6))
```

**Logique :**

- Plus le quota est élevé, moins l'enseignant peut exprimer de souhaits
- Garantit la faisabilité du planning
- 60% de la différence entre total et quota

#### 4. Distribution Temporelle

Analyse la répartition des séances dans le temps :

- Nombre de séances par jour
- Jours les plus chargés
- Équilibre hebdomadaire

#### 5. Alertes et Recommandations

Génération automatique d'alertes :

- ⚠️ Quotas insuffisants
- ⚠️ Déséquilibre entre grades
- ⚠️ Manque d'enseignants
- ✅ Recommandations d'actions

### Paramètres Configurables

| Paramètre                    | Description                    | Valeur par défaut |
| ---------------------------- | ------------------------------ | ----------------- |
| `min_surveillants_par_salle` | Surveillants minimum par salle | 3                 |
| `majoration_absences`        | Coefficient pour absences      | 1.20 (20%)        |
| `quota_min_groupe1`          | Quota minimal PR/MC/V          | 4                 |
| `difference_min_pr_ma`       | Écart minimal PR/MC/V → MA     | 2                 |
| `difference_min_ma_as`       | Écart minimal MA → AS          | 1                 |
| `difference_min_as_ac`       | Écart minimal AS → AC/PES/PTC  | 1                 |
| `expert_quota`               | Quota fixe pour experts        | 3                 |

### Actions Disponibles

1. **Calculer les recommandations** : Analyse complète
2. **Appliquer les quotas** : Mise à jour automatique dans la BDD
3. **Exporter les souhaits autorisés** : Fichier Excel avec les limites par grade

---

## ✅ Validation des Contraintes en Temps Réel

### Concept

Avant toute modification manuelle du planning, le système **vérifie automatiquement** toutes les contraintes pour éviter les erreurs.

### Vérifications Effectuées

#### 1. Lors de l'Ajout d'un Enseignant

✅ **Conflit horaire** : L'enseignant n'a pas déjà une séance au même moment  
✅ **Quota maximum** : L'enseignant ne dépasse pas son quota (grade ou exception)  
✅ **Nombre max séances/jour** : Respect du `nombre_max` de l'enseignant  
✅ **Souhait de non-disponibilité** : Avertissement si l'enseignant a déclaré être indisponible

#### 2. Lors de la Suppression d'un Enseignant

✅ **Nombre minimum** : La séance conserve assez de surveillants après suppression  
✅ **Responsable** : Avertissement si l'enseignant est responsable d'un examen de la séance

#### 3. Lors de l'Échange d'Enseignants

Vérifications sur les **deux enseignants** :

- Pas de conflit horaire pour chacun
- Respect des quotas
- Respect du nombre max de séances/jour
- Vérification des souhaits

### Interface Utilisateur

#### Messages de Validation

🟢 **Succès** : Action autorisée, contraintes respectées  
🟡 **Avertissement** : Action possible mais attention (ex: souhait violé)  
🔴 **Erreur** : Action interdite, contrainte dure violée

#### Composant de Gestion

Le composant `GestionEnseignantsSeanceInline` offre :

- Ajout avec validation
- Suppression avec validation
- Échange entre séances
- Affichage des contraintes violées
- Suggestions d'enseignants disponibles

---

## 📧 Envoi des Convocations par Email

### Concept

Envoi automatique et sécurisé des convocations de surveillance aux enseignants via **Gmail API** avec **OAuth2**.

### Configuration Gmail OAuth2

#### 1. Créer un Projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet
3. Activer **Gmail API**
4. Configurer l'écran de consentement OAuth

#### 2. Créer des Identifiants OAuth2

1. Dans **APIs & Services** → **Identifiants**
2. Créer des identifiants → **ID client OAuth 2.0**
3. Type : **Application Web**
4. URI de redirection : `http://localhost:3000/oauth2callback`
5. Télécharger le fichier JSON

#### 3. Configuration de l'Application

Créer un fichier `.env` dans le dossier `backend` :

```env
GOOGLE_CLIENT_ID=votre_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

### Utilisation

#### 1. Authentification

1. Aller dans **Export** → **Envoi Emails**
2. Cliquer sur **"Configurer Gmail"**
3. Se connecter avec le compte Gmail institutionnel
4. Autoriser l'application
5. Le token est sauvegardé automatiquement

#### 2. Envoi en Masse

1. Cliquer sur **"Envoyer Convocations"**
2. Personnaliser le message (optionnel)
3. Choisir les options :
   - Joindre les convocations PDF
   - Inclure le planning complet
4. Lancer l'envoi

### Fonctionnalités

- **Authentification OAuth2** sécurisée
- **Envoi en masse** avec gestion des quotas Gmail
- **Personnalisation** des messages
- **Pièces jointes PDF** automatiques
- **Gestion des erreurs** et retry
- **Logs d'envoi** pour traçabilité
- **Test de connexion** avant envoi

### Sécurité

- Aucun mot de passe stocké
- Token OAuth2 sécurisé
- Refresh automatique du token
- Scopes minimaux (send only)
- Révocation possible à tout moment

### Endpoints API

```http
GET  /api/export/gmail/auth-url
POST /api/export/gmail/oauth-callback
POST /api/export/gmail/tester-token
POST /api/export/gmail/envoyer-convocations
```

---

## 📊 Gestion des Présences/Absences

### Concept

Système de suivi des **présences réelles** des enseignants aux séances de surveillance pour contrôle a posteriori.

### Fonctionnalités

#### 1. Enregistrement des Présences

**Interface en deux modes :**

- 🔲 **Mode Grille** : Vue compacte par séance
- 📋 **Mode Liste** : Vue détaillée par enseignant

**Actions :**

- ✅ Marquer **présent** (badge vert)
- ❌ Marquer **absent** (badge rouge)
- 🔄 Modifier l'état à tout moment

#### 2. Filtres Avancés

Filtrage par :

- 📅 **Date** : Sélection d'une date spécifique
- ⏰ **Heure** : Filtrer par séance (S1, S2, S3, S4)
- 📚 **Session** : Principale ou Rattrapage
- 📖 **Semestre** : Semestre 1 ou 2
- 🔍 **Recherche** : Par nom d'enseignant

#### 3. Statistiques

**Statistiques globales :**

- Nombre total de présences
- Nombre total d'absences
- Taux de présence global

**Statistiques par enseignant :**

- Nombre de présences
- Nombre d'absences
- Taux de présence individuel
- Historique complet

#### 4. Export Excel

Export complet au format `.xlsx` contenant :

- Liste de toutes les séances
- Présences/absences par enseignant et séance
- Statistiques agrégées
- Totaux et pourcentages

**Colonnes exportées :**

- Date, Heure début, Heure fin
- Session, Semestre
- Enseignant (nom, prénom, grade)
- Statut (Présent/Absent)
- Code SmartEx

### Visualisation

#### Vue Grille

```
┌─────────────────────────────────────┐
│ Séance: Lundi 15/01 - 08:30-10:30   │
├─────────────────────────────────────┤
│ ✅ BENAMMOU Marwen    [Présent]    │
│ ❌ KHARROUBI Wajdi    [Absent]     │
│ ✅ DUPONT Jean        [Présent]    │
└─────────────────────────────────────┘
```

#### Vue Liste

Tableau détaillé avec toutes les informations et possibilité de tri/recherche.

### Cas d'Usage

1. **Contrôle a posteriori** : Vérifier qui était réellement présent
2. **Gestion administrative** : Calculer les heures effectuées
3. **Statistiques RH** : Analyser les taux d'absentéisme
4. **Justificatifs** : Tracer les absences pour suivi
5. **Planification future** : Identifier les enseignants fiables

### Endpoints API

```http
GET  /api/planning/absences/seances
POST /api/planning/absences/mark
GET  /api/planning/absences/stats
GET  /api/planning/absences/export-excel
```

---

## 📤 Formats d'Import/Export

### Import Excel - Enseignants

**Format requis :**

| Colonne                  | Type      | Obligatoire | Description                 | Exemple                     |
| ------------------------ | --------- | ----------- | --------------------------- | --------------------------- |
| `nom_ens`                | Texte     | ✅          | Nom de famille              | BENAMMOU                    |
| `prenom_ens`             | Texte     | ✅          | Prénom                      | Marwen                      |
| `abrv_ens`               | Texte     | ✅          | Abréviation enseignant      | M.BENAMMOU                  |
| `email_ens`              | Email     | ✅          | Adresse email unique        | marwen.benammou@example.com |
| `grade_code_ens`         | Code      | ✅          | Code du grade (2-3 lettres) | MA                          |
| `code_smartex_ens`       | int       | ✅          | Identifiant SmartEx unique  | 65                          |
| `participe_surveillance` | VRAI/FAUX | ✅          | Participe aux surveillances | VRAI                        |

**Exemple de fichier :**

| nom_ens   | prenom_ens | email_ens               | abrv_ens    | grade_code_ens | code_smartex_ens | participe_surveillance |
| --------- | ---------- | ----------------------- | ----------- | -------------- | ---------------- | ---------------------- |
| BENAMMOU  | Marwen     | marwen.b@example.com    | M.BENAMMOU  | MA             | 65               | VRAI                   |
| KHARROUBI | Wajdi      | wajdi.k@example.com     | W.KHARROUBI | PR             | 66               | VRAI                   |
| DUPONT    | Jean       | jean.dupont@example.com | J.DUPONT    | AS             | 67               | FAUX                   |

### Import Excel - Examens

**Format requis :**

| Colonne      | Type  | Obligatoire | Description                     | Exemple    |
| ------------ | ----- | ----------- | ------------------------------- | ---------- |
| `dateExam`   | Date  | ✅          | Date de l'examen (format j/m/a) | 15/01/2025 |
| `h_debut`    | Heure | ✅          | Heure de début (HH:MM)          | 08:30      |
| `h_fin`      | Heure | ✅          | Heure de fin (HH:MM)            | 10:30      |
| `session`    | Code  | ✅          | Session (P/R)                   | P          |
| `type ex`    | Texte | ✅          | Type                            | E          |
| `semestre`   | Texte | ✅          | Semestre                        | SEMESTRE 1 |
| `enseignant` | Code  | ✅          | Code SmartEx responsable        | 65         |
| `cod_salle`  | Code  | ✅          | Code de la salle                | A201       |

**Exemple de fichier :**

| dateExam   | h_debut | h_fin | session | type ex | semestre   | enseignant | cod_salle |
| ---------- | ------- | ----- | ------- | ------- | ---------- | ---------- | --------- |
| 15/01/2025 | 08:30   | 10:30 | P       | E       | SEMESTRE 1 | 58         | A201      |
| 15/01/2025 | 08:30   | 10:30 | P       | E       | SEMESTRE 1 | 41         | A202      |
| 15/01/2025 | 14:00   | 16:00 | P       | E       | SEMESTRE 1 | 64         | B101      |

### Import Excel - Souhaits

**Format requis :**

| Colonne      | Type  | Obligatoire | Description                         | Exemple    |
| ------------ | ----- | ----------- | ----------------------------------- | ---------- |
| `Enseignant` | Code  | ✅          | Code enseignant                     | M.BENAMMOU |
| `Semestre`   | Texte | ✅          | Semestre (Semestre 1/Semestre 2)    | Semestre 1 |
| `Session`    | Texte | ✅          | Session (Partiel/Examen/Rattrapage) | Partiel    |
| `Date`       | Date  | ✅          | Date (format j/m/a)                 | 15/01/2025 |
| `Jour`       | Texte | ✅          | Jour de la semaine                  | Lundi      |
| `Séances`    | Code  | ✅          | Code séance (S1/S2/S3/S4)           | S1,S2,S3   |

**Exemple de fichier :**

| Enseignant  | Semestre   | Session | Date       | Jour   | Séances |
| ----------- | ---------- | ------- | ---------- | ------ | ------- |
| M.BENAMMOU  | Semestre 1 | Partiel | 15/01/2025 | Lundi  | S1      |
| W.KHARROUBI | Semestre 1 | Partiel | 15/01/2025 | Lundi  | S3      |
| J.DUPEN     | Semestre 1 | Partiel | 20/01/2025 | Samedi | S2      |

### Exports Disponibles

#### Documents Word/PDF

- Planning complet
- Convocations individuelles
- Listes par créneaux
- Liste par creneau spécifique

#### Fichiers Excel

- Planning complet (.xlsx)
- Convocations (.xlsx)
- Présences/Absences (.xlsx)
- Souhaits autorisés (.xlsx)

#### Fichiers CSV

- Convocations (.csv)
- Statistiques (.csv)

---

## 📖 Recommandations d'Utilisation

### 🎯 Workflow Recommandé

#### Phase 1 : Configuration Initiale (Une fois)

1. **Installer l'application**

   - Exécuter `Gestion Surveillances-1.0.0-Setup.exe`
   - Laisser l'installation se terminer

2. **Utiliser l'Aide à la Décision** (Recommandé)

   - Aller dans `Aide à la Décision`
   - Cliquer sur `Calculer les Recommandations`
   - Analyser les quotas recommandés
   - Appliquer les quotas recommandés
   - Exporter les souhaits autorisés

3. **Configurer les grades**

   - Ouvrir l'application
   - Aller dans `Configuration` → `Grades`
   - Vérifier les quotas par grade
   - Sauvegarder

#### Phase 2 : Import des Données (Chaque session)

4. **Importer les enseignants**

   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel enseignants
   - Confirmer l'import
   - Vérifier dans `Enseignants`

5. **Configurer les exceptions** (Si nécessaire)

   - Aller dans `Configuration` → `Exceptions Individuelles`
   - Définir les quotas d'exception pour enseignants spéciaux
   - Sauvegarder

6. **Importer les examens**

   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel examens
   - Confirmer l'import
   - Vérifier dans `Examens`

7. **Importer les souhaits**
   - Aller dans `Gestion des Données` → `Import`
   - Sélectionner fichier Excel souhaits
   - Confirmer l'import
   - Vérifier dans `Souhaits`

#### Phase 3 : Génération du Planning

8. **Configurer la génération**

   - Aller dans `Génération`
   - Définir la durée maximale d'exécution
   - Définir le nombre minimum de surveillants par examen (2 recommandé)
   - Définir la tolérance maximale admissible

9. **Lancer la génération**

   - Cliquer sur `Générer le Planning`
   - Observer la progression

10. **Analyser les résultats**
    - Lire le résumé (succès/échec)
    - Consulter les **warnings** (très important)
    - Vérifier les statistiques de génération
    - Noter les violations éventuelles

#### Phase 4 : Ajustements Manuels (Optionnel)

11. **Consulter le planning**

    - Aller dans `Planning`
    - Visualiser les affectations par séance
    - Identifier les ajustements nécessaires

12. **Modifier manuellement**
    - Utiliser le composant `Gestion Enseignants Séance`
    - Ajouter/Retirer des enseignants (validation automatique)
    - Échanger des enseignants entre séances
    - Sauvegarder les modifications

#### Phase 5 : Export et Distribution

13. **Exporter le planning ou les convocations**

    - Aller dans `Export`
    - Choisir le format (Word/PDF/Excel)
    - Télécharger les fichiers

14. **Envoyer les convocations par email** (Optionnel)
    - Configurer Gmail OAuth2 (première fois)
    - Sélectionner les options d'envoi
    - Envoyer en masse

#### Phase 6 : Suivi (Pendant les examens)

15. **Enregistrer les présences**
    - Aller dans `Présences/Absences`
    - Marquer présent/absent pour chaque séance
    - Exporter le fichier Excel si nécessaire

### ⚠️ Bonnes Pratiques

#### ✅ À FAIRE

1. **Préparation des données**

   - Vérifier le format Excel avant import (colonnes, types)
   - Nettoyer les données (corriger fautes)
   - Utiliser l'Aide à la Décision avant génération

2. **Configuration**

   - Ajuster les quotas en fonction de la charge réelle
   - Définir les exceptions individuelles si nécessaire
   - Vérifier le nombre max de séances/jour par enseignant

3. **Génération**

   - Consulter le dashboard avant génération
   - Lire et comprendre les warnings
   - Commencer avec 2 surveillants/examen puis ajuster
   - Activer le mode adaptatif si quotas limites

4. **Vérification**

   - Vérifier le respect des souhaits (rapport)
   - Vérifier l'égalité par grade (Consulter Planning)
   - Vérifier qu'il n'y a pas de conflits horaires
   - Utiliser la validation automatique pour modifications

5. **Suivi**
   - Enregistrer les présences réelles
   - Analyser les statistiques d'absence
   - Garder une trace pour les futures sessions

#### ❌ À ÉVITER

1. **Configuration incorrecte**

   - Oublier d'importer les fichiers
   - Oublier de vérifier la configuration des grades
   - Avoir des doublons dans les codes SmartEx
   - Définir des quotas trop faibles par rapport au besoin
   - Ignorer les recommandations de l'Aide à la Décision

2. **Modifications manuelles**

   - Ignorer les avertissements de validation
   - Forcer des affectations impossibles
   - Ne pas vérifier les contraintes après modification

3. **Souhaits**
   - Autoriser trop de souhaits par rapport au quota
   - Ne pas communiquer les limites aux enseignants

---

## 🔍 Résolution de Problèmes

### Problème 1 : "Aucune solution trouvée"

**Symptômes :**

- L'algorithme se termine sans solution
- Message : "No solution found" ou "INFEASIBLE"

**Causes possibles :**

1. Quotas très insuffisants
2. Contraintes incompatibles
3. Trop de souhaits restrictifs
4. Nombre max séances/jour trop restrictif

**Solutions :**

1. **Utiliser l'Aide à la Décision** (priorité haute)  
   **Actions :**

   - Aller dans `Aide à la Décision`
   - Calculer les recommandations
   - Analyser le statut de faisabilité
   - Appliquer les quotas recommandés

2. **Vérifier les quotas**
   **Actions :**

   - Augmenter les quotas par grade
   - Ou réduire le nombre de surveillants requis
   - Vérifier les quotas d'exception

3. **Activer le mode adaptatif**

   - Cocher `Mode adaptatif` dans les options
   - Relancer la génération
   - L'algorithme ajustera automatiquement

4. **Réviser les contraintes**
   - Augmenter le `nombre_max` de séances/jour
   - Demander aux enseignants de réduire leurs souhaits

### Problème 2 : "Souhaits non respectés"

**Symptômes :**

- Planning généré avec succès
- Warning : "X souhaits non respectés"
- Enseignants affectés sur créneaux indisponibles

**Explication :**
Les souhaits sont des contraintes **souples** (SOFT). Si nécessaire pour trouver une solution, l'algorithme peut les violer.

**Causes :**

- Quotas justes ou insuffisants
- Trop de souhaits sur mêmes créneaux
- Conflit entre égalité stricte et souhaits

**Solutions :**

1. **Utiliser l'Aide à la Décision**

   - Calculer les souhaits autorisés par grade
   - Exporter le fichier Excel
   - Communiquer les limites aux enseignants

2. **Analyser le rapport de violations**

   - Identifier les enseignants concernés
   - Vérifier si violations mineures ou majeures

3. **Ajuster manuellement**

   - Aller dans `Planning`
   - Retirer l'enseignant du créneau problématique
   - Affecter un autre enseignant disponible
   - Le système valide automatiquement les contraintes

4. **Réviser les souhaits**
   - Demander aux enseignants de réduire souhaits
   - Prioriser les souhaits vraiment critiques
   - Réimporter et régénérer

### Problème 3 : "Génération très lente"

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

   - Augmenter la tolérance
   - Désactiver temporairement le regroupement

3. **Utiliser l'Aide à la Décision**
   - Optimiser les quotas avant génération
   - Équilibrer les charges

### Problème 4 : "Import Excel échoue"

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

### Problème 5 : "Validation refuse l'ajout d'un enseignant"

**Symptômes :**

- Message d'erreur lors de l'ajout manuel
- "Conflit horaire"

**Causes :**

- L'enseignant a déjà une séance au même moment

**Solutions :**

1. **Vérifier le planning de l'enseignant**

   - Consulter son emploi du temps
   - Identifier les conflits

2. **Choisir un autre enseignant**
   - Utiliser la liste des enseignants disponibles
   - Le système suggère des alternatives

### Problème 6 : "Envoi d'emails échoue"

**Symptômes :**

- Erreur lors de l'envoi Gmail
- "Authentification échouée"

**Causes :**

- Token OAuth2 expiré
- Configuration incorrecte
- Quota Gmail dépassé

**Solutions :**

1. **Réauthentifier**

   - Cliquer sur "Configurer Gmail"
   - Se reconnecter
   - Autoriser à nouveau

2. **Vérifier la configuration**

   - Variables d'environnement `.env`
   - Client ID et Secret corrects
   - URI de redirection valide

3. **Respecter les quotas Gmail**
   - Maximum 500 emails/jour (Gmail gratuit)
   - Attendre 24h si quota dépassé

---

## 📚 Documentation Supplémentaire

### API Documentation

Une fois le backend démarré en mode développement, accédez à :

- **Swagger UI** (interactif) : [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc** (documentation) : [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

### Support

Pour toute question ou problème :

- 📧 Email : [contact]
- 🐛 Issues GitHub : [https://github.com/wajdi-kharroubi/isi-Surveillance/issues](https://github.com/wajdi-kharroubi/isi-Surveillance/issues)

---

**Dernière mise à jour :** Novembre 2025  
**Version du document :** 2.0.0
