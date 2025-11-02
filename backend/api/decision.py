from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

from services.decision_service import estimate_quotas

router = APIRouter()


class RoomSchema(BaseModel):
    min_supervisors: Optional[int] = Field(None, ge=0)


class SlotSchema(BaseModel):
    date: Optional[str]
    rooms: List[RoomSchema] = []


class DecisionRequest(BaseModel):
    counts_per_grade: Dict[str, int]
    planning: List[SlotSchema]
    default_min_per_room: Optional[int] = Field(1, ge=0)
    absence_majoration_pct: Optional[float] = Field(10.0, ge=0)
    min_diff_PR_MA: Optional[int] = Field(3, ge=0)
    max_quota_per_teacher: Optional[int] = Field(10, ge=1)


@router.post("/decision/estimate")
def estimate(request: DecisionRequest):
    try:
        res = estimate_quotas(
            counts_per_grade=request.counts_per_grade,
            planning=[s.dict() for s in request.planning],
            default_min_per_room=request.default_min_per_room,
            absence_majoration_pct=request.absence_majoration_pct,
            min_diff_PR_MA=request.min_diff_PR_MA,
            max_quota_per_teacher=request.max_quota_per_teacher,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.decision_service import DecisionService
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

router = APIRouter(prefix="/decision", tags=["Aide à la Décision"])


class DecisionRequest(BaseModel):
    """Paramètres pour le calcul des recommandations"""

    min_surveillants_par_salle: int = Field(
        default=2, ge=1, le=5, description="Nombre minimum de surveillants par salle"
    )
    majoration_absences: float = Field(
        default=1.1,
        ge=1.0,
        le=1.5,
        description="Coefficient de majoration pour absences (1.1 = +10%)",
    )
    difference_min_pr_ma: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Différence minimale entre PR/MC/V et MA",
    )
    difference_min_ma_as: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Différence minimale entre MA et AS",
    )
    difference_min_as_ac: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Différence minimale entre AS et AC/PES/PTC",
    )
    expert_quota: int = Field(
        default=3, ge=1, le=10, description="Quota fixe pour les experts"
    )


class DecisionResponse(BaseModel):
    """Réponse contenant les recommandations"""

    statistiques_globales: Dict
    quotas_recommandes: Dict
    voeux_autorises: Dict
    faisabilite: Dict
    distribution_temporelle: Dict  # Analyse de la distribution dans le temps
    alertes: List[Dict]
    parametres: Dict


@router.post("/calculer-recommandations", response_model=DecisionResponse)
def calculer_recommandations(
    request: DecisionRequest, db: Session = Depends(get_db)
):
    """
    📊 CALCULE LES RECOMMANDATIONS POUR LA CONFIGURATION DU PLANNING

    Ce endpoint analyse la situation actuelle (enseignants, examens) et produit:

    1. **Quotas recommandés par grade** selon la hiérarchie:
       - PR, MC, V: même quota (le plus bas)
       - MA: quota supérieur à PR/MC/V
       - AS: quota supérieur à MA
       - AC, PES, PTC: quota supérieur à AS
       - EX: quota fixe configurable

    2. **Nombre de créneaux de non-souhaits autorisés** par grade:
       - Plus le quota est élevé, moins l'enseignant peut exprimer de non-souhaits
       - Calcul automatique pour garantir la faisabilité

    3. **Analyse de faisabilité**:
       - OPTIMAL: Large marge pour gérer les absences
       - ACCEPTABLE: Marge faible mais suffisante
       - CRITIQUE: Ressources insuffisantes

    4. **Alertes et recommandations**:
       - Alertes critiques si problèmes détectés
       - Recommandations d'actions à entreprendre

    **Paramètres configurables:**
    - `min_surveillants_par_salle`: Nombre minimum de surveillants par salle (1-5)
    - `majoration_absences`: Coefficient pour absences (1.0-1.5, ex: 1.1 = +10%)
    - `difference_min_pr_ma`: Écart minimal entre PR/MC/V et MA (1-5)
    - `difference_min_ma_as`: Écart minimal entre MA et AS (1-5)
    - `difference_min_as_ac`: Écart minimal entre AS et AC/PES/PTC (1-5)
    - `expert_quota`: Quota fixe pour les experts (1-10)

    **Exemple d'utilisation:**
    ```json
    {
      "min_surveillants_par_salle": 2,
      "majoration_absences": 1.1,
      "difference_min_pr_ma": 1,
      "difference_min_ma_as": 1,
      "difference_min_as_ac": 1,
      "expert_quota": 3
    }
    ```

    **Retour:**
    - Statistiques globales (enseignants, examens, séances)
    - Quotas recommandés par grade
    - Créneaux de non-souhaits autorisés par grade
    - Analyse de faisabilité (statut, marges)
    - Liste d'alertes et recommandations
    """
    try:
        decision_service = DecisionService(db)

        recommandations = decision_service.calculer_recommandations(
            min_surveillants_par_salle=request.min_surveillants_par_salle,
            majoration_absences=request.majoration_absences,
            difference_min_pr_ma=request.difference_min_pr_ma,
            difference_min_ma_as=request.difference_min_ma_as,
            difference_min_as_ac=request.difference_min_as_ac,
            expert_quota=request.expert_quota,
        )

        return DecisionResponse(**recommandations)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erreur lors du calcul des recommandations: {str(e)}"
        )


@router.post("/appliquer-quotas")
def appliquer_quotas(quotas: Dict[str, int], db: Session = Depends(get_db)):
    """
    💾 APPLIQUE LES QUOTAS RECOMMANDÉS DANS LA BASE DE DONNÉES

    Met à jour la configuration des quotas par grade dans la table `grade_config`.

    **Paramètres:**
    - `quotas`: Dictionnaire {grade_code: quota}

    **Exemple:**
    ```json
    {
      "PR": 4,
      "MC": 4,
      "MA": 5,
      "AS": 6,
      "AC": 7,
      "PTC": 7,
      "PES": 7,
      "EX": 3,
      "V": 4
    }
    ```

    **Retour:**
    - Nombre de grades mis à jour
    - Détails des modifications
    """
    from models.models import GradeConfig
    from config import GRADES

    try:
        modifications = []
        nb_updates = 0

        for grade_code, quota in quotas.items():
            # Vérifier que le grade existe dans la config
            if grade_code not in GRADES:
                continue

            # Chercher ou créer la configuration du grade
            grade_config = (
                db.query(GradeConfig)
                .filter(GradeConfig.grade_code == grade_code)
                .first()
            )

            ancien_quota = grade_config.nb_surveillances if grade_config else None

            if grade_config:
                # Mise à jour
                grade_config.nb_surveillances = quota
            else:
                # Création
                grade_config = GradeConfig(
                    grade_code=grade_code,
                    grade_nom=GRADES[grade_code]["nom"],
                    nb_surveillances=quota,
                )
                db.add(grade_config)

            modifications.append(
                {
                    "grade_code": grade_code,
                    "grade_nom": GRADES[grade_code]["nom"],
                    "ancien_quota": ancien_quota,
                    "nouveau_quota": quota,
                    "action": "mise_a_jour" if ancien_quota else "creation",
                }
            )

            nb_updates += 1

        db.commit()

        return {
            "success": True,
            "message": f"{nb_updates} grade(s) mis à jour avec succès",
            "nb_updates": nb_updates,
            "modifications": modifications,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erreur lors de l'application des quotas: {str(e)}"
        )


@router.get("/quotas-actuels")
def obtenir_quotas_actuels(db: Session = Depends(get_db)):
    """
    📋 RÉCUPÈRE LES QUOTAS ACTUELLEMENT CONFIGURÉS

    Retourne la configuration actuelle des quotas par grade depuis la base de données.

    **Retour:**
    - Quotas par grade
    - Date de dernière modification
    """
    from models.models import GradeConfig
    from config import GRADES

    try:
        configs = db.query(GradeConfig).all()

        quotas = {}
        for config in configs:
            quotas[config.grade_code] = {
                "grade_nom": config.grade_nom,
                "quota": config.nb_surveillances,
                "created_at": config.created_at.isoformat() if config.created_at else None,
            }

        # Ajouter les grades qui n'ont pas encore de config
        for grade_code, grade_info in GRADES.items():
            if grade_code not in quotas:
                quotas[grade_code] = {
                    "grade_nom": grade_info["nom"],
                    "quota": grade_info["nb_surveillances"],
                    "created_at": None,
                    "source": "config_par_defaut",
                }

        return {"quotas": quotas, "nb_grades": len(quotas)}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des quotas: {str(e)}",
        )


@router.post("/quotas-individuels")
def modifier_quota_individuel(
    enseignant_id: int, nouveau_quota: int, db: Session = Depends(get_db)
):
    """
    👤 MODIFIE LE QUOTA D'UN ENSEIGNANT SPÉCIFIQUE

    Permet d'ajuster manuellement le quota d'un enseignant particulier.

    **Paramètres:**
    - `enseignant_id`: ID de l'enseignant
    - `nouveau_quota`: Nouveau quota de surveillances

    **Note:** Cette modification est individuelle et écrase le quota par grade
    pour cet enseignant spécifique.
    """
    from models.models import Enseignant

    try:
        enseignant = (
            db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
        )

        if not enseignant:
            raise HTTPException(status_code=404, detail="Enseignant introuvable")

        # Note: Pour implémenter cette fonctionnalité, il faudrait ajouter
        # un champ `quota_individuel` dans la table Enseignant
        # Pour l'instant, on retourne un message informatif

        return {
            "success": False,
            "message": "Fonctionnalité à implémenter: ajout d'un champ quota_individuel dans la table Enseignant",
            "enseignant": {
                "id": enseignant.id,
                "nom": enseignant.nom,
                "prenom": enseignant.prenom,
                "grade_code": enseignant.grade_code,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la modification du quota individuel: {str(e)}",
        )
