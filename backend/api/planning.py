from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models.models import Enseignant, Affectation, Examen
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
    
    affectations = db.query(Affectation).options(joinedload(Affectation.examen)).filter(
        Affectation.enseignant_id == enseignant_id
    ).all()
    
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
                "salles": []
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
    
    return {
        "enseignant": {"id": enseignant.id, "nom": enseignant.nom, "prenom": enseignant.prenom, "grade": enseignant.grade_code},
        "emplois": result
    }

@router.get("/emploi-seances")
def emploi_seances(db: Session = Depends(get_db)):
    """
    Retourne, pour chaque séance (date + h_debut + h_fin + session + semestre), le nombre d'enseignants UNIQUES affectés
    """
    examens = db.query(Examen).all()
    seances = {}
    for ex in examens:
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key not in seances:
            seances[key] = {"examens": [], "enseignants_ids": set()}
        seances[key]["examens"].append({
            "id": ex.id,
            "salle": ex.cod_salle,
            "type": ex.type_ex
        })
    
    # Compter les enseignants UNIQUES affectés par séance
    affectations = db.query(Affectation).options(joinedload(Affectation.examen)).all()
    for aff in affectations:
        ex = aff.examen
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key in seances:
            # Ajouter l'enseignant_id dans un set pour éviter les doublons
            seances[key]["enseignants_ids"].add(aff.enseignant_id)
    
    # Mise en forme
    result = []
    for (date, h_debut, h_fin, session, semestre), val in seances.items():
        result.append({
            "date": date,
            "h_debut": h_debut,
            "h_fin": h_fin,
            "session": session,
            "semestre": semestre,
            "examens": val["examens"],
            "nb_enseignants": len(val["enseignants_ids"])  # Nombre d'enseignants UNIQUES
        })
    return result
