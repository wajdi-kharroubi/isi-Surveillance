from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models.models import Enseignant, Affectation, Examen, GradeConfig
from models.schemas import (
    AjouterEnseignantSeanceRequest, 
    SupprimerEnseignantSeanceRequest, 
    AjouterEnseignantParDateHeureRequest,
    AffectationOperationResponse
)
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
                "nb_examens": len(val["examens"]),
                "nb_enseignants": len(enseignants_list),
                "enseignants": enseignants_list,
            }
        )
    return result


@router.delete("/supprimer-enseignant-seance", response_model=AffectationOperationResponse)
def supprimer_enseignant_seance(
    request: SupprimerEnseignantSeanceRequest,
    db: Session = Depends(get_db)
):
    """
    Supprime un enseignant d'une séance spécifique.
    Toutes les affectations de cet enseignant pour cette séance seront supprimées.
    """
    # Vérifier que l'enseignant existe
    enseignant = db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail=f"Enseignant avec ID {request.enseignant_id} introuvable")
    
    # Récupérer tous les examens de la séance
    examens_seance = db.query(Examen).filter(
        Examen.dateExam == request.date_examen,
        Examen.h_debut == request.h_debut,
        Examen.h_fin == request.h_fin,
        Examen.session == request.session,
        Examen.semestre == request.semestre
    ).all()
    
    if not examens_seance:
        raise HTTPException(
            status_code=404,
            detail="Aucun examen trouvé pour cette séance"
        )
    
    # Récupérer toutes les affectations de cet enseignant pour cette séance
    affectations_a_supprimer = db.query(Affectation).filter(
        Affectation.enseignant_id == request.enseignant_id,
        Affectation.examen_id.in_([ex.id for ex in examens_seance])
    ).all()
    
    if not affectations_a_supprimer:
        raise HTTPException(
            status_code=404,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} n'est pas affecté à cette séance"
        )
    
    # Supprimer les affectations
    nb_supprimees = len(affectations_a_supprimer)
    for affectation in affectations_a_supprimer:
        db.delete(affectation)
    
    db.commit()
    
    return AffectationOperationResponse(
        success=True,
        message=f"✅ Enseignant {enseignant.nom} {enseignant.prenom} supprimé avec succès de la séance ({nb_supprimees} affectations supprimées)",
        nb_affectations_modifiees=nb_supprimees
    )


@router.post("/ajouter-enseignant-par-date-heure", response_model=AffectationOperationResponse)
def ajouter_enseignant_par_date_heure(
    request: AjouterEnseignantParDateHeureRequest,
    db: Session = Depends(get_db)
):
    """
    Ajoute un enseignant à une séance en spécifiant uniquement la date et l'heure de début.
    Le backend recherchera automatiquement tous les examens correspondants et affectera l'enseignant.
    L'enseignant sera automatiquement marqué comme responsable s'il est responsable d'un examen dans cette séance.
    """
    # Vérifier que l'enseignant existe
    enseignant = db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail=f"Enseignant avec ID {request.enseignant_id} introuvable")
    
    # Vérifier que l'enseignant participe aux surveillances
    if not enseignant.participe_surveillance:
        raise HTTPException(
            status_code=400, 
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} ne participe pas aux surveillances"
        )
    
    # Récupérer tous les examens qui correspondent à cette date et heure de début
    examens_seance = db.query(Examen).filter(
        Examen.dateExam == request.date_examen,
        Examen.h_debut == request.h_debut
    ).all()
    
    if not examens_seance:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun examen trouvé pour la date {request.date_examen} à {request.h_debut}"
        )
    
    # Extraire les informations de la séance (on prend le premier examen comme référence)
    premier_examen = examens_seance[0]
    h_fin = premier_examen.h_fin
    session = premier_examen.session
    semestre = premier_examen.semestre
    
    # Vérifier si l'enseignant est déjà affecté à cette séance
    affectations_existantes = db.query(Affectation).filter(
        Affectation.enseignant_id == request.enseignant_id,
        Affectation.examen_id.in_([ex.id for ex in examens_seance])
    ).all()
    
    if affectations_existantes:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} est déjà affecté à cette séance"
        )
    
    # Vérifier si l'enseignant est responsable d'un examen dans cette séance
    # On compare le code_smartex de l'enseignant avec le champ 'enseignant' des examens de la séance
    est_responsable_examen = False
    for examen in examens_seance:
        if examen.enseignant == enseignant.code_smartex:
            est_responsable_examen = True
            break
    
    doit_etre_responsable = est_responsable_examen
    
    # Ajouter l'enseignant à tous les examens de la séance
    nb_affectations = 0
    for examen in examens_seance:
        affectation = Affectation(
            examen_id=examen.id,
            enseignant_id=request.enseignant_id,
            cod_salle=examen.cod_salle,
            est_responsable=doit_etre_responsable
        )
        db.add(affectation)
        nb_affectations += 1
    
    db.commit()
    
    # Message personnalisé selon le statut responsable
    message = f"✅ Enseignant {enseignant.nom} {enseignant.prenom} ajouté avec succès à la séance du {request.date_examen} à {request.h_debut} ({nb_affectations} affectations créées)"
    if doit_etre_responsable:
        message += " ⭐ Marqué comme responsable (responsable d'un examen dans cette séance)"
    
    # Ajouter les informations de la séance dans le message
    message += f"\n📅 Séance: {request.h_debut} - {h_fin} | Session: {session} | Semestre: {semestre}"
    
    return AffectationOperationResponse(
        success=True,
        message=message,
        nb_affectations_modifiees=nb_affectations,
        est_responsable=doit_etre_responsable
    )
