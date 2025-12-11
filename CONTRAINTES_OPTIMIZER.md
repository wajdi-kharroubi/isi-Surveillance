# 📋 Documentation des Contraintes de l'Optimiseur V3

## Vue d'ensemble

Ce document détaille toutes les contraintes utilisées dans l'algorithme d'optimisation pour la génération des plannings de surveillance (`optimizer_v3.py`).

---

## 🔴 CONTRAINTES FORTES (HARD) - OBLIGATOIRES

Ces contraintes **DOIVENT** être respectées. Si elles ne peuvent pas être satisfaites, l'algorithme échoue.

### 1. CONTRAINTE D'ÉGALITÉ STRICTE PAR GRADE (Priorité 1)

**Méthode:** `_contrainte_quotas_grades()`

**Rôle:**
- Garantir que tous les enseignants **normaux** d'un même grade font **EXACTEMENT** le même nombre de séances de surveillance
- Les enseignants avec `is_Exception=True` ne sont pas soumis à cette contrainte d'égalité

**Objectif:**
- **Équité parfaite** entre enseignants du même grade
- Éviter qu'un professeur du même grade travaille 3 séances pendant qu'un autre n'en fait qu'une
- Les enseignants avec exception suivent leur `quota_Exception` personnel

**Exemple:**
```
Grade "Professeur" avec 5 enseignants normaux :
✅ Tous font exactement 2 séances
❌ 2 profs font 3 séances et 3 profs font 1 séance (INTERDIT)
```

**Impact en cas de violation:** Solution INFAISABLE (INFEASIBLE)

---

### 2. CONTRAINTE DE QUOTA MAXIMUM STRICT (Priorité 1)

**Méthode:** `_contrainte_quotas_grades()`

**Rôle:**
- Empêcher tout dépassement du quota maximum défini pour chaque grade
- Pour les enseignants normaux : respecter le quota du grade
- Pour les enseignants avec exception : respecter leur `quota_Exception`

**Objectif:**
- **Respect absolu** des limites de charge de travail
- Protection contre la surcharge des enseignants
- Aucun enseignant ne peut dépasser son quota maximum

**Exemple:**
```
Professeur avec quota_max = 3 :
✅ Affecté à 0, 1, 2 ou 3 séances
❌ Affecté à 4 séances ou plus (INTERDIT)
```

**Impact en cas de violation:** Solution INFAISABLE (INFEASIBLE)

---

### 3. CONTRAINTE DU NOMBRE D'ENSEIGNANTS PAR SÉANCE (Priorité 2)

**Méthode:** `_contrainte_nombre_minimal()`

**Rôle:**
- Définir le nombre exact ou la plage de surveillants nécessaires par séance
- **Architecture importante:** Les enseignants affectés à une séance surveillent **TOUS** les examens de cette séance

**Objectif:**
- Garantir une **couverture suffisante** de chaque séance
- S'adapter aux ressources disponibles (mode adaptatif si quotas insuffisants)

#### Mode NORMAL (quotas suffisants)

```
Nombre d'enseignants = nb_examens × min_surveillants_par_examen (EXACTEMENT)

Exemple: 
- 15 examens × 2 surveillants = 30 enseignants EXACTEMENT
- Chaque examen aura exactement 2 surveillants
```

#### Mode ADAPTATIF (quotas insuffisants)

**Si `min_surveillants_par_examen > 2`:**
```
MIN = nb_examens × ratio_proportionnel
MAX = nb_examens × min_surveillants_par_examen

Exemple:
- Besoin idéal: 500 enseignants
- Quotas disponibles: 1005 enseignants
- Ratio: 2.01 → minimum = 2 surveillants/examen
```

**Si `min_surveillants_par_examen ≤ 2`:**
```
MIN = nb_examens (1 surveillant par examen minimum)
MAX = nb_examens × min_surveillants_par_examen

Exemple:
- 15 examens avec min=2
- MIN = 15 enseignants
- MAX = 30 enseignants
```

**Impact en cas de violation:** Solution INFAISABLE (INFEASIBLE)

---

### 4. CONTRAINTE DE NON-CONFLIT HORAIRE (Automatique)

**Rôle:**
- Empêcher qu'un enseignant soit affecté à deux séances qui se chevauchent dans le temps

**Objectif:**
- **Cohérence temporelle** : un enseignant ne peut pas être à deux endroits en même temps
- Garantie implicite par l'architecture (groupement par séances)

**Exemple:**
```
❌ Enseignant affecté à S2 (10:30-12:00) ET S3 (10:30-12:00) le même jour
✅ Enseignant affecté à S1 (08:30-10:00) ET S2 (10:30-12:00) le même jour
```

**Impact en cas de violation:** Impossible par conception

---

### 5. CONTRAINTE D'ÉQUILIBRE ENTRE SÉANCES (Priorité 6)

**Méthode:** `_contrainte_equilibre_entre_seances()`

**Rôle:**
- Équilibrer le nombre d'enseignants entre les séances ayant le même nombre d'examens
- Tolérance adaptative selon le mode (stricte en normal, large en adaptatif)

**Objectif:**
- Éviter les déséquilibres flagrants
- Assurer une **répartition équitable** des ressources entre séances similaires

**Exemple:**
```
Deux séances avec 10 examens chacune :
Mode NORMAL (tolérance stricte ±2) :
✅ Séance A: 20 enseignants, Séance B: 20 enseignants
✅ Séance A: 20 enseignants, Séance B: 21 enseignants
❌ Séance A: 20 enseignants, Séance B: 25 enseignants

Mode ADAPTATIF (tolérance large ±5) :
✅ Séance A: 15 enseignants, Séance B: 20 enseignants
❌ Séance A: 15 enseignants, Séance B: 25 enseignants
```

**Impact en cas de violation:** Solution INFAISABLE (INFEASIBLE)

---

## 🟡 CONTRAINTES SOUPLES (SOFT) - PRÉFÉRENCES

Ces contraintes sont **préférées** mais peuvent être violées si nécessaire. Elles sont intégrées dans la fonction objectif avec des poids différents.

### 6. CONTRAINTE DE RESPECT DES VŒUX (Priorité 3 - Poids le plus élevé)

**Méthode:** `_contrainte_voeux()`

**Rôle:**
- **Éviter** d'affecter un enseignant aux créneaux pour lesquels il a exprimé une **non-disponibilité**
- Les vœux sont des créneaux où l'enseignant **NE SOUHAITE PAS** surveiller

**Objectif:**
- **Respecter au maximum** les préférences personnelles des enseignants
- Améliorer la satisfaction et le bien-être du personnel
- Pénalise fortement les affectations qui violent les vœux

**Poids dans la fonction objectif:**
- Mode NORMAL : **-50** (sans regroupement) ou **-40** (avec regroupement)
- Mode ADAPTATIF : **-45** (sans regroupement) ou **-40** (avec regroupement)

**Exemple:**
```
Enseignant A a exprimé un vœu de NON-disponibilité pour :
- Mardi 10/12 - S1 (08:30-10:00)

✅ PRÉFÉRÉ : Affecté à d'autres créneaux
⚠️ POSSIBLE mais PÉNALISÉ : Affecté à Mardi 10/12 - S1
```

**Impact en cas de violation:** Forte pénalité dans le score, mais solution acceptée

---

### 7. CONTRAINTE DE PRÉSENCE DES RESPONSABLES (Priorité 4)

**Méthode:** `_contrainte_responsables()`

**Rôle:**
- **Favoriser** la présence du responsable d'un examen pendant sa surveillance
- Le responsable peut surveiller d'autres examens du même créneau
- Il **compte** dans les quotas de surveillance

**Objectif:**
- Assurer une meilleure **supervision** des examens
- Présence d'une personne de référence connaissant bien l'examen
- Faciliter la gestion des incidents ou questions

**Poids dans la fonction objectif:**
- Mode NORMAL : **+50** (sans regroupement) ou **+30** (avec regroupement)
- Mode ADAPTATIF : **+35** (sans regroupement) ou **+30** (avec regroupement)

**Exemple:**
```
Examen "Mathématiques" responsable : Prof. Dupont

✅ PRÉFÉRÉ : Prof. Dupont affecté à la séance de l'examen
✓ ACCEPTABLE : Un autre enseignant affecté à la séance
```

**Impact en cas de violation:** Perte du bonus, mais solution acceptée

---

### 8. CONTRAINTE DU NOMBRE MAX DE SÉANCES PAR JOUR (Priorité 5)

**Méthode:** `_contrainte_nombre_max_seances_par_jour()`

**Rôle:**
- Respecter l'attribut `nombre_max` de chaque enseignant (nombre max de séances par jour)
- **Si `nombre_max = 0`** : contrainte DURE (ne peut pas surveiller)
- **Si `nombre_max > 0`** : contrainte SOUPLE (préférence)

**Objectif:**
- **Limiter la fatigue** des enseignants
- Éviter de concentrer trop de séances le même jour
- Améliorer la qualité de vie au travail

**Poids dans la fonction objectif:**
- Mode NORMAL : **-30**
- Mode ADAPTATIF : **-15**

**Exemples:**
```
Enseignant avec nombre_max = 2 :
✅ PRÉFÉRÉ : 0, 1 ou 2 séances par jour
⚠️ PÉNALISÉ : 3 séances le même jour (dépassement = 1)
⚠️⚠️ TRÈS PÉNALISÉ : 4 séances le même jour (dépassement = 2)

Enseignant avec nombre_max = 0 :
❌ INTERDIT : Toute affectation (contrainte DURE)
```

**Impact en cas de violation:** Pénalité proportionnelle au dépassement

---

### 9. CONTRAINTE ANTI-ISOLEMENT (Priorité 7)

**Méthode:** `_contrainte_interdire_premiere_derniere_isolees()`

**Rôle:**
- **Pénaliser** le fait d'avoir **uniquement** la première ET la dernière séance d'un jour **sans séance intermédiaire**

**Objectif:**
- Éviter les journées **inconfortables** avec de longues pauses inutiles
- Améliorer le **confort** des enseignants
- Réduire le temps passé à l'université pour peu de séances

**Poids dans la fonction objectif:** **-20**

**Exemples:**
```
Jour avec séances [S1, S2, S3, S4] :

❌ PÉNALISÉ : S1 (08:30) + S4 (15:30) uniquement
              → Longue pause 08:30-15:30 (7h d'attente)

✅ PRÉFÉRÉ : S1 + S2 + S4
            → Pauses raisonnables

✅ PRÉFÉRÉ : S1 + S2
            → Séances consécutives

✅ PRÉFÉRÉ : S2 + S3
            → Séances consécutives
```

**Impact en cas de violation:** Pénalité modérée, mais solution acceptée

---

### 10. CONTRAINTE DE REGROUPEMENT DES SÉANCES (Priorité 8 - Optionnelle)

**Méthode:** `_contrainte_seances_consecutives()`  
**Activation:** Paramètre `activer_regroupement_temporel` (par défaut : True)

**Rôle:**
- **Favoriser** le regroupement des séances dans une même journée
- **Bonus** si plusieurs séances le même jour
- **Pénalité** si séance isolée dans un jour

**Objectif:**
- Améliorer le **confort** des enseignants (réduire les déplacements)
- Éviter les journées fragmentées avec une seule séance
- Optimiser les trajets domicile-université

**Poids dans la fonction objectif:** **+10** (bonus regroupement)

**Règles de scoring:**
```
Si N ≥ 2 séances dans un même jour : BONUS = +N
Si N = 1 séance dans un jour : PÉNALITÉ = -2
Si N = 0 séance dans un jour : NEUTRE = 0
```

**Exemples:**
```
Enseignant A sur une semaine :

Lundi : 3 séances → +3 points
Mardi : 2 séances → +2 points
Mercredi : 0 séance → 0 point
Jeudi : 1 séance → -2 points
Vendredi : 2 séances → +2 points

Score total de regroupement : +3 +2 +0 -2 +2 = +5
```

**Impact en cas de violation:** Faible pénalité, impact minimal sur la solution

---

## 📊 FONCTION OBJECTIF - COMPOSITION ET POIDS

La fonction objectif combine toutes les contraintes souples avec des poids différents selon le mode d'exécution.

### Mode NORMAL (quotas suffisants) - AVEC regroupement

```
Score = -40 × pénalité_vœux 
        +30 × bonus_responsables 
        -30 × pénalité_max_séances 
        -30 × dispersion_globale 
        -20 × pénalité_isolées
        +10 × bonus_regroupement
```

**Le solveur MAXIMISE ce score.**

### Mode NORMAL (quotas suffisants) - SANS regroupement

```
Score = -50 × pénalité_vœux 
        +50 × bonus_responsables 
        -30 × pénalité_max_séances 
        -40 × dispersion_globale 
        -20 × pénalité_isolées
```

### Mode ADAPTATIF (quotas insuffisants) - AVEC regroupement

```
Score = +100 × total_affectations          (MAXIMISER quotas utilisés)
        -40 × pénalité_vœux 
        +30 × bonus_responsables 
        -15 × pénalité_max_séances 
        -10 × déviation_proportionnelle   (équilibrage séances)
        -20 × pénalité_isolées
        +10 × bonus_regroupement
```

### Mode ADAPTATIF (quotas insuffisants) - SANS regroupement

```
Score = +120 × total_affectations          (MAXIMISER quotas utilisés)
        -45 × pénalité_vœux 
        +35 × bonus_responsables 
        -15 × pénalité_max_séances 
        -12 × déviation_proportionnelle   (équilibrage séances)
        -20 × pénalité_isolées
```

---

## 🎯 PRIORITÉS ET STRATÉGIES

### Hiérarchie des Contraintes

```
┌─────────────────────────────────────────────┐
│  PRIORITÉ 1 (OBLIGATOIRE)                   │
│  • Égalité stricte par grade                │
│  • Quota maximum strict                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 2 (OBLIGATOIRE)                   │
│  • Nombre d'enseignants par séance          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 3 (SOUPLE - POIDS TRÈS ÉLEVÉ)     │
│  • Respect des vœux de non-disponibilité    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 4 (SOUPLE - POIDS ÉLEVÉ)          │
│  • Présence des responsables d'examens      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 5 (SOUPLE - POIDS MOYEN)          │
│  • Respect nombre max séances/jour          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 6 (OBLIGATOIRE)                   │
│  • Équilibre entre séances similaires       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 7 (SOUPLE - POIDS MOYEN)          │
│  • Anti-isolement (1ère + dernière)         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PRIORITÉ 8 (SOUPLE - POIDS FAIBLE)         │
│  • Regroupement des séances par jour        │
└─────────────────────────────────────────────┘
```

### Stratégies par Mode

#### **Mode NORMAL** (ressources suffisantes)
- ✅ Toutes les contraintes fortes satisfaites
- ✅ Égalité parfaite par grade garantie
- 🎯 Focus : Maximiser satisfaction (vœux + responsables)
- 📊 Dispersion intra-grade : **0** (égalité stricte)

#### **Mode ADAPTATIF** (ressources limitées)
- ✅ Toutes les contraintes fortes satisfaites
- ✅ Égalité parfaite par grade garantie
- 🎯 Focus : Maximiser utilisation des quotas disponibles
- 📊 Équilibrage proportionnel entre séances
- ⚠️ Dispersion inter-grades : structurelle (quotas différents)

---

## 🔧 PARAMÈTRES DE CONFIGURATION

### Paramètres de la fonction `generer_planning_optimise()`

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `min_surveillants_par_examen` | int | 2 | Nombre minimum de surveillants par examen |
| `allow_fallback` | bool | True | Autoriser le mode adaptatif si quotas insuffisants |
| `respecter_voeux` | bool | True | Prendre en compte les vœux de non-disponibilité |
| `equilibrer_temporel` | bool | False | Équilibrer la répartition des créneaux horaires |
| `activer_regroupement_temporel` | bool | True | Activer le bonus de regroupement des séances |
| `max_time_in_seconds` | int | 900 | Temps maximum de résolution (15 min) |
| `relative_gap_limit` | float | 0.01 | Gap relatif accepté pour arrêter (1%) |

### Recommandations

```python
# Configuration RECOMMANDÉE pour un bon équilibre
generer_planning_optimise(
    min_surveillants_par_examen=2,         # 2 surveillants par examen
    allow_fallback=True,                    # S'adapter si nécessaire
    respecter_voeux=True,                   # IMPORTANT pour satisfaction
    equilibrer_temporel=False,              # Pas nécessaire
    activer_regroupement_temporel=True,     # Confort enseignants
    max_time_in_seconds=900,                # 15 minutes max
    relative_gap_limit=0.01                 # Stop à 1% du meilleur
)
```

---

## 📈 INDICATEURS DE PERFORMANCE

### Statistiques Générées

L'optimiseur génère automatiquement des statistiques sur :

1. **Souhaits (Vœux)**
   - Nombre total de vœux exprimés
   - Nombre de vœux respectés
   - Nombre de vœux violés
   - Détails des violations

2. **Responsables**
   - Nombre total de responsables
   - Nombre de responsables présents
   - Nombre de responsables absents
   - Détails des absences

3. **Nombre Max Séances/Jour**
   - Nombre total de contraintes
   - Nombre de contraintes respectées
   - Nombre de violations
   - Détails des violations

---

## 🚨 GESTION DES ÉCHECS

### Causes Possibles d'Échec (INFEASIBLE)

1. **Quotas insuffisants** avec `allow_fallback=False`
2. **Trop de contraintes contradictoires** entre elles
3. **Configuration des grades incohérente**
4. **Responsables avec trop d'examens** par rapport aux quotas
5. **Nombre d'enseignants insuffisant** pour couvrir toutes les séances

### Solutions Recommandées

En cas d'échec, l'optimiseur suggère :

```
💡 SOLUTIONS POSSIBLES :
• Vérifier la configuration des grades (quotas, disponibilité)
• Augmenter le temps de résolution (max_time_in_seconds)
• Réduire le nombre de surveillants par examen
• Augmenter le taux de tolérance pour l'équilibre
• Activer le mode fallback (allow_fallback=True)
• Vérifier que tous les enseignants sont bien configurés
```

---

## 📝 NOTES TECHNIQUES

### Architecture des Séances

```
SÉANCE = Groupement d'examens au même créneau horaire
│
├─ Date : 10/12/2024
├─ Créneau : S1 (08:30-10:00)
├─ Examens : [Exam1, Exam2, Exam3, ..., ExamN]
│
└─ Enseignants affectés → surveillent TOUS les examens de la séance
```

### Codes des Séances

| Code | Horaire | Description |
|------|---------|-------------|
| S1 | 08:30-10:00 | Première séance du matin |
| S2 | 10:30-12:00 | Deuxième séance du matin |
| S3 | 13:00-14:30 | Première séance de l'après-midi |
| S4 | 15:30-17:00 | Deuxième séance de l'après-midi |

### Solveur OR-Tools

- **Solveur utilisé :** Google OR-Tools CP-SAT
- **Type :** Programmation par contraintes (Constraint Programming)
- **Parallélisation :** Jusqu'à 16 workers (détection auto CPU)
- **Optimisations :** Pré-résolution, linéarisation avancée, probing

---

## 📚 RÉFÉRENCES

- **Fichier source :** `backend/algorithms/optimizer_v3.py`
- **Version :** 3.0
- **Modèles :** `backend/models/models.py`
- **Documentation OR-Tools :** https://developers.google.com/optimization

---

*Document généré automatiquement à partir du code source - Dernière mise à jour : Décembre 2024*
