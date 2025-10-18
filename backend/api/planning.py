from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models.models import Enseignant, Affectation, Examen, GradeConfig
from typing import List, Dict
from datetime import datetime

router = APIRouter(prefix="/planning", tags=["Planning"])


@router.get("/emploi-enseignant/{enseignant_id}")
def emploi_enseignant(enseignant_id: int, db: Session = Depends(get_db)):
    """
    Retourne l'emploi du temps de surveillance d'un enseignant (toutes ses séances de surveillance)
    Regroupe par séance pour éviter la duplication (un enseignant peut surveiller plusieurs salles de la même séance)
    """
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    affectations = (
        db.query(Affectation)
        .options(joinedload(Affectation.examen))
        .filter(Affectation.enseignant_id == enseignant_id)
        .all()
    )

    # Regrouper par séance (date + h_debut + h_fin + session + semestre)
    seances = {}
    for aff in affectations:
        ex = aff.examen
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)

        if key not in seances:
            seances[key] = {
                "date": ex.dateExam,
                "h_debut": ex.h_debut,
                "h_fin": ex.h_fin,
                "session": ex.session,
                "semestre": ex.semestre,
                "type": ex.type_ex,
                "est_responsable": aff.est_responsable,
                "salles": [],
            }

        # Ajouter la salle à la liste (optionnel, pour info)
        seances[key]["salles"].append(aff.cod_salle)

        # Si une affectation est responsable, marquer toute la séance comme responsable
        if aff.est_responsable:
            seances[key]["est_responsable"] = True

    # Convertir en liste
    result = []
    for key, seance in seances.items():
        # Joindre les salles pour information (optionnel)
        seance["salles"] = ", ".join(sorted(set(seance["salles"])))
        result.append(seance)

    # Récupérer la configuration du grade pour calculer le pourcentage de quota
    grade_config = (
        db.query(GradeConfig)
        .filter(GradeConfig.grade_code == enseignant.grade_code)
        .first()
    )
    quota_max = grade_config.nb_surveillances if grade_config else 0
    nb_surveillances_affectees = len(result)
    pourcentage_quota = (
        round((nb_surveillances_affectees / quota_max * 100), 2) if quota_max > 0 else 0
    )

    return {
        "enseignant": {
            "id": enseignant.id,
            "nom": enseignant.nom,
            "prenom": enseignant.prenom,
            "grade": enseignant.grade_code,
            "quota_max": quota_max,
            "nb_surveillances_affectees": nb_surveillances_affectees,
            "pourcentage_quota": pourcentage_quota,
        },
        "emplois": result,
    }


@router.get("/emploi-seances")
def emploi_seances(db: Session = Depends(get_db)):
    """
    Retourne, pour chaque séance (date + h_debut + h_fin + session + semestre), le nombre d'enseignants UNIQUES affectés
    ainsi que la liste détaillée des enseignants
    """
    examens = db.query(Examen).all()
    seances = {}
    for ex in examens:
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key not in seances:
            seances[key] = {"examens": [], "enseignants": {}}
        seances[key]["examens"].append(
            {"id": ex.id, "salle": ex.cod_salle, "type": ex.type_ex}
        )

    # Récupérer les enseignants UNIQUES affectés par séance avec leurs informations
    affectations = (
        db.query(Affectation)
        .options(joinedload(Affectation.examen), joinedload(Affectation.enseignant))
        .all()
    )

    for aff in affectations:
        ex = aff.examen
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key in seances:
            # Utiliser un dictionnaire pour éviter les doublons d'enseignants
            # et garder l'information si l'enseignant est responsable
            if aff.enseignant_id not in seances[key]["enseignants"]:
                seances[key]["enseignants"][aff.enseignant_id] = {
                    "id": aff.enseignant_id,
                    "nom": aff.enseignant.nom,
                    "prenom": aff.enseignant.prenom,
                    "est_responsable": aff.est_responsable,
                }
            elif aff.est_responsable:
                # Si l'enseignant existe déjà mais cette affectation est responsable, mettre à jour
                seances[key]["enseignants"][aff.enseignant_id]["est_responsable"] = True

    # Mise en forme
    result = []
    for (date, h_debut, h_fin, session, semestre), val in seances.items():
        # Convertir le dictionnaire d'enseignants en liste
        enseignants_list = list(val["enseignants"].values())

        result.append(
            {
                "date": date,
                "h_debut": h_debut,
                "h_fin": h_fin,
                "session": session,
                "semestre": semestre,
                "examens": val["examens"],
                "nb_enseignants": len(enseignants_list),
                "enseignants": enseignants_list,
            }
        )
    return result
