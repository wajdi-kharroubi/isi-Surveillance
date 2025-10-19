from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import (
    EnseignantResponse,
    Enseignant, Affectation
)

router = APIRouter(prefix="/enseignants", tags=["Enseignants"])


@router.get("/", response_model=List[EnseignantResponse])
def lister_enseignants(
    skip: int = 0,
    limit: int = 1000,  # Augmenté à 1000 pour supporter plus d'enseignants
    participe_surveillance: bool = None,
    db: Session = Depends(get_db)
):
    """Liste tous les enseignants avec filtres optionnels"""
    query = db.query(Enseignant)
    
    if participe_surveillance is not None:
        query = query.filter(Enseignant.participe_surveillance == participe_surveillance)
    
    # Si limit est -1, retourner tous les résultats
    if limit == -1:
        enseignants = query.offset(skip).all()
    else:
        enseignants = query.offset(skip).limit(limit).all()
    
    return enseignants


@router.delete("/vider", status_code=status.HTTP_200_OK)
def vider_enseignants(db: Session = Depends(get_db)):
    """Vide complètement la table enseignants et les affectations associées"""
    try:
        # Supprimer d'abord les affectations (dépendances)
        nb_affectations = db.query(Affectation).delete(synchronize_session=False)
        
        # Puis supprimer les enseignants
        nb_supprimes = db.query(Enseignant).delete(synchronize_session=False)
        db.commit()
        return {
            "message": f"Table enseignants et affectations vidées avec succès",
            "nb_enseignants_supprimes": nb_supprimes,
            "nb_affectations_supprimees": nb_affectations
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression : {str(e)}"
        )

