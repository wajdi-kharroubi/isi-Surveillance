# Modifications des Paramètres d'Optimisation

## Résumé des changements

Les paramètres de l'endpoint `/generer-v3` ont été modifiés pour permettre une configuration dynamique du temps de résolution et du gap relatif d'optimisation.

## Backend

### 1. Schéma `GenerationRequest` (models/schemas.py)

**Nouveaux paramètres ajoutés :**
```python
max_time_in_seconds: int = Field(
    default=900, 
    ge=10, 
    le=3600, 
    description="Temps maximum de résolution en secondes (10s - 1h)"
)
relative_gap_limit: float = Field(
    default=0.01, 
    ge=0.0, 
    le=1.0, 
    description="Gap relatif accepté pour arrêter l'optimisation (0.01 = 1%)"
)
```

### 2. Endpoint `/generer-v3` (api/generation.py)

**Mise à jour de l'appel à l'optimiseur :**
```python
success, nb_affectations, temps_exec, messages, scores = optimizer.generer_planning_optimise(
    min_surveillants_par_examen=request.min_surveillants_par_salle,
    allow_fallback=request.allow_single_surveillant,
    respecter_voeux=True,
    equilibrer_temporel=True,
    activer_regroupement_temporel=True,
    max_time_in_seconds=request.max_time_in_seconds,  # ✅ NOUVEAU
    relative_gap_limit=request.relative_gap_limit      # ✅ NOUVEAU
)
```

### 3. Optimiseur V3 (algorithms/optimizer_v3.py)

**Signature de la méthode `generer_planning_optimise` :**
```python
def generer_planning_optimise(
    self,
    min_surveillants_par_examen: int = 2,
    allow_fallback: bool = True,
    respecter_voeux: bool = True,
    equilibrer_temporel: bool = True,
    activer_regroupement_temporel: bool = True,
    max_time_in_seconds: int = 900,        # ✅ NOUVEAU
    relative_gap_limit: float = 0.01,      # ✅ NOUVEAU
) -> Tuple[bool, int, float, List[str], Dict]:
```

**Configuration du solveur OR-Tools :**
```python
# Timeout configurable
self.solver.parameters.max_time_in_seconds = max_time_in_seconds

# Gap relatif configurable
self.solver.parameters.relative_gap_limit = relative_gap_limit

# Temps déterministe adaptatif
self.solver.parameters.max_deterministic_time = max_time_in_seconds / 2.0
```

## Frontend

### 1. État du composant Generation.jsx

**Nouveaux noms de paramètres :**
```javascript
const [config, setConfig] = useState({
    min_surveillants_par_salle: 2,
    allow_single_surveillant: true,
    max_time_in_seconds: 900,      // ✅ Renommé (anciennement max_time_seconds)
    relative_gap_limit: 0.01,       // ✅ Renommé (anciennement tolerance)
});
```

### 2. Interface utilisateur

**Modification des contrôles :**
- Input temps : `config.max_time_in_seconds` (range: 10-3600 secondes)
- Input tolérance : `config.relative_gap_limit` (range: 0.0-1.0)
- Presets temps : 5 min, 10 min, 15 min, 30 min
- Valeur par défaut temps : 900 secondes (15 minutes)
- Valeur par défaut gap : 0.01 (1%)

## Utilisation

### Exemple de requête API

```json
POST /generation/generer-v3
{
    "min_surveillants_par_salle": 2,
    "allow_single_surveillant": true,
    "max_time_in_seconds": 900,
    "relative_gap_limit": 0.01
}
```

### Recommandations

**Temps de résolution (`max_time_in_seconds`) :**
- **300 secondes (5 min)** : Pour tests rapides ou petites instances
- **600 secondes (10 min)** : Configuration standard pour la plupart des cas
- **900 secondes (15 min)** : Valeur par défaut recommandée
- **1800 secondes (30 min)** : Pour instances complexes

**Gap relatif (`relative_gap_limit`) :**
- **0.01 (1%)** : Valeur par défaut - Précision maximale
- **0.02 (2%)** : Bon compromis précision/vitesse
- **0.05 (5%)** : Solution acceptable plus rapide
- **0.10 (10%)** : Solution rapide avec moins de précision

### Impact sur les performances

- **Diminuer `max_time_in_seconds`** → Résolution plus rapide, mais solution potentiellement moins optimale
- **Augmenter `relative_gap_limit`** → Résolution plus rapide, le solveur s'arrête dès qu'il trouve une solution à X% de l'optimal
- **Diminuer `relative_gap_limit`** → Résolution plus lente, mais solution plus proche de l'optimal

## Tests

Pour tester les modifications :

1. **Backend** : Démarrer le serveur
   ```bash
   cd backend
   python main.py
   ```

2. **Frontend** : Démarrer l'application
   ```bash
   cd frontend
   npm run dev
   ```

3. **Vérifier** :
   - Les nouveaux paramètres apparaissent dans l'interface
   - Les valeurs sont correctement transmises à l'API
   - Le solveur utilise les paramètres configurés
   - Les logs affichent les bonnes valeurs

## Compatibilité

✅ **Rétrocompatibilité** : Les valeurs par défaut garantissent que l'endpoint fonctionne sans modifications des clients existants.

✅ **Validation** : Les paramètres sont validés par Pydantic avec des limites appropriées.

✅ **Documentation** : La documentation de l'endpoint a été mise à jour pour refléter les nouveaux paramètres.
