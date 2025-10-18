# Fonctionnement du Paramètre `allow_single_surveillant`

## Vue d'ensemble

Le paramètre `allow_single_surveillant` (nommé `allow_fallback` dans le backend) contrôle si l'algorithme peut passer en **mode adaptatif** lorsque les quotas disponibles sont insuffisants.

## Comportements selon la valeur

### ✅ `allow_single_surveillant = true` (Mode Adaptatif Autorisé)

**Activation :**
- Lorsque les quotas totaux sont insuffisants pour respecter `min_surveillants_par_salle` sur tous les examens

**Comportement :**
```
Si quotas_totaux < (nb_examens × min_surveillants_par_salle):
  → MODE ADAPTATIF ACTIVÉ
  → Pour chaque séance:
      • Minimum: 1 surveillant par examen (nb_examens)
      • Maximum: min_surveillants_par_salle × nb_examens
  → Le solveur optimise dans cette fourchette flexible
```

**Exemple concret :**
- 50 examens × 2 surveillants = 100 surveillances nécessaires
- Quotas disponibles = 70 surveillances
- **Résultat :** Certains examens auront 2 surveillants, d'autres 1 seul
- **Optimisation :** Le solveur essaie de maximiser le nombre d'examens avec 2 surveillants

**Messages :**
```
⚠️ MODE ADAPTATIF ACTIVÉ (allow_single_surveillant=True): 
   Quotas totaux (70) < besoin idéal (100)
→ Adaptation: ~30 examens avec 2 surveillants, ~20 examens avec 1 seul surveillant
```

### ❌ `allow_single_surveillant = false` (Mode Strict)

**Comportement :**
```
Si quotas_totaux < (nb_examens × min_surveillants_par_salle):
  → MODE ADAPTATIF DÉSACTIVÉ
  → Contrainte stricte: EXACTEMENT min_surveillants_par_salle par séance
  → Si impossible → Génération échoue (INFEASIBLE)
```

**Exemple concret :**
- 50 examens × 2 surveillants = 100 surveillances nécessaires
- Quotas disponibles = 70 surveillances
- **Résultat :** ÉCHEC - Impossible de générer le planning
- **Message d'erreur :** INFEASIBLE (aucune solution trouvée)

**Messages :**
```
❌ AVERTISSEMENT CRITIQUE: Quotas totaux (70) < besoin idéal (100)
→ Mode adaptatif DÉSACTIVÉ (allow_single_surveillant=False)
→ Le solveur tentera de respecter 2 surveillants par examen
→ Si impossible, la génération échouera (INFEASIBLE)
```

## Code Backend Modifié

### Dans `optimizer_v3.py` - Ligne ~618

**AVANT :**
```python
mode_adaptatif = quotas_totaux < besoin_ideal
```

**APRÈS :**
```python
# ⚠️ MODE ADAPTATIF SEULEMENT SI allow_fallback=True
mode_adaptatif = allow_fallback and (quotas_totaux < besoin_ideal)

# Si quotas insuffisants mais allow_fallback=False, avertissement critique
if not allow_fallback and quotas_totaux < besoin_ideal:
    self.warnings.append(
        f"❌ AVERTISSEMENT CRITIQUE: Quotas totaux ({quotas_totaux}) < besoin idéal ({besoin_ideal})"
    )
    self.warnings.append(
        f"   → Mode adaptatif DÉSACTIVÉ (allow_single_surveillant=False)"
    )
    self.warnings.append(
        f"   → Le solveur tentera de respecter {min_surveillants_par_examen} surveillants par examen"
    )
    self.warnings.append(
        f"   → Si impossible, la génération échouera (INFEASIBLE)"
    )
```

## Cas d'usage recommandés

### ✅ Utiliser `allow_single_surveillant = true` quand :
- Vous préférez avoir un planning incomplet plutôt que pas de planning du tout
- Vous acceptez que certains examens aient moins de surveillants que souhaité
- Les quotas sont limités et vous voulez maximiser l'utilisation des ressources
- **Recommandé pour la production** (plus flexible)

### ❌ Utiliser `allow_single_surveillant = false` quand :
- Vous avez des contraintes réglementaires strictes (minimum 2 surveillants obligatoire)
- Vous préférez échouer plutôt que de générer un planning non conforme
- Vous voulez forcer l'augmentation des quotas si insuffisants
- **Recommandé pour la validation** (détecte les problèmes de configuration)

## Workflow recommandé

### Phase 1 : Validation (Mode Strict)
```json
{
  "min_surveillants_par_salle": 2,
  "allow_single_surveillant": false
}
```
- Vérifie si les quotas sont suffisants
- Détecte les problèmes de configuration
- Force la correction avant génération

### Phase 2 : Production (Mode Adaptatif)
```json
{
  "min_surveillants_par_salle": 2,
  "allow_single_surveillant": true
}
```
- Génère le meilleur planning possible avec les ressources disponibles
- Adapte automatiquement si nécessaire
- Maximise la couverture

## Interface Utilisateur

Dans `Generation.jsx`, le paramètre est contrôlé par une checkbox :

```jsx
<label>
  <input
    type="checkbox"
    checked={config.allow_single_surveillant}
    onChange={(e) =>
      setConfig({
        ...config,
        allow_single_surveillant: e.target.checked,
      })
    }
  />
  Autoriser 1 seul surveillant
  <p>En cas de manque d'enseignants disponibles</p>
</label>
```

**Recommandation UI :**
- Par défaut : `true` (plus flexible)
- Afficher un tooltip expliquant l'impact
- Désactiver automatiquement si `min_surveillants_par_salle = 1` (pas de fallback possible)

## Résumé

| Paramètre | Quotas suffisants | Quotas insuffisants |
|-----------|------------------|---------------------|
| `true` (Adaptatif) | Mode normal : X surveillants par examen | Mode adaptatif : 1 à X surveillants par examen |
| `false` (Strict) | Mode normal : X surveillants par examen | **ÉCHEC** : INFEASIBLE |

**Équation du mode adaptatif :**
```
mode_adaptatif = allow_single_surveillant AND (quotas_disponibles < besoins_idéaux)
```
