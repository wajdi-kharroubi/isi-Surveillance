from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import (
    VoeuResponse,
    Voeu, Affectation
)

router = APIRouter(prefix="/voeux", tags=["Voeux"])

# Mapping indice -> nom du jour
JOURS_SEMAINE = {
    0: "Lundi",
    1: "Mardi",
    2: "Mercredi",
    3: "Jeudi",
    4: "Vendredi",
    5: "Samedi"
}


@router.get("/", response_model=List[VoeuResponse])
def lister_voeux(
    skip: int = 0,
    limit: int = 1000,
    enseignant_id: int = None,
    semestre_code_libelle: str = None,
    session_libelle: str = None,
    db: Session = Depends(get_db)
):
    """Liste tous les vœux avec filtres optionnels"""
    query = db.query(Voeu).options(joinedload(Voeu.enseignant))
    
    if enseignant_id:
        query = query.filter(Voeu.enseignant_id == enseignant_id)
    
    if semestre_code_libelle:
        query = query.filter(Voeu.semestre_code_libelle == semestre_code_libelle)
    
    if session_libelle:
        query = query.filter(Voeu.session_libelle == session_libelle)
    
    # Si limit est -1, retourner tous les résultats
    if limit == -1:
        voeux = query.offset(skip).all()
    else:
        voeux = query.offset(skip).limit(limit).all()
    
    # Ajouter les informations de l'enseignant dans la réponse
    result = []
    for voeu in voeux:
        voeu_dict = {
            "id": voeu.id,
            "enseignant_id": voeu.enseignant_id,
            "code_smartex_ens": voeu.code_smartex_ens,
            "enseignant_nom": voeu.enseignant.nom if voeu.enseignant else None,
            "enseignant_prenom": voeu.enseignant.prenom if voeu.enseignant else None,
            "jour": voeu.jour,
            "seance": voeu.seance,
            "semestre_code_libelle": voeu.semestre_code_libelle,
            "session_libelle": voeu.session_libelle,
            "date_voeu": voeu.date_voeu if hasattr(voeu, 'date_voeu') else None,
            "created_at": voeu.created_at
        }
        result.append(voeu_dict)
    
    return result


@router.delete("/vider", status_code=status.HTTP_200_OK)
def vider_voeux(db: Session = Depends(get_db)):
    """Vide complètement la table voeux et les affectations"""
    try:
        # Supprimer d'abord les affectations (pour réinitialiser complètement le planning)
        nb_affectations = db.query(Affectation).delete(synchronize_session=False)
        
        # Puis supprimer les voeux
        nb_supprimes = db.query(Voeu).delete(synchronize_session=False)
        db.commit()
        return {
            "message": f"Table voeux et affectations vidées avec succès",
            "nb_voeux_supprimes": nb_supprimes,
            "nb_affectations_supprimees": nb_affectations
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression : {str(e)}"
        )

