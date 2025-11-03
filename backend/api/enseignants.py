from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import (
    EnseignantResponse,
    EnseignantExceptionUpdate,
    Enseignant, Affectation
)
from models.models import GenerationStatistique, SouhaitViole, ResponsableAbsent, DepassementMaxJour ,Presence
import logging

router = APIRouter(prefix="/enseignants", tags=["Enseignants"])
logger = logging.getLogger(__name__)


def vider_statistiques_generation(db: Session):
    """Vide toutes les tables de statistiques de génération"""
    try:
        db.query(SouhaitViole).delete()
        db.query(ResponsableAbsent).delete()
        db.query(DepassementMaxJour).delete()
        db.query(GenerationStatistique).delete()
        db.query(Presence).delete()
        db.commit()
        logger.info("Statistiques de génération vidées")
    except Exception as e:
        logger.warning(f"Erreur lors de la suppression des statistiques: {str(e)}")
        db.rollback()



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


@router.patch("/{enseignant_id}/exception", response_model=EnseignantResponse)
def definir_exception_enseignant(
    enseignant_id: int,
    exception_data: EnseignantExceptionUpdate,
    db: Session = Depends(get_db)
):
    """
    Définit le statut d'exception pour un enseignant.
    Met à jour is_Exception à True et définit quota_Exception avec la valeur fournie.
    """
    # Récupérer l'enseignant
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    
    if not enseignant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enseignant avec l'ID {enseignant_id} non trouvé"
        )
    
    # Mettre à jour les champs
    enseignant.is_Exception = exception_data.is_Exception
    enseignant.quota_Exception = exception_data.quota_Exception
    
    try:
        db.commit()
        db.refresh(enseignant)
        logger.info(f"Exception définie pour l'enseignant {enseignant.nom} {enseignant.prenom}: is_Exception={exception_data.is_Exception}, quota={exception_data.quota_Exception}")
        return enseignant
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la mise à jour de l'exception: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour: {str(e)}"
        )


@router.delete("/{enseignant_id}/exception", response_model=EnseignantResponse)
def reinitialiser_exception_enseignant(
    enseignant_id: int,
    db: Session = Depends(get_db)
):
    """
    Réinitialise l'exception d'un enseignant.
    Met is_Exception à False et quota_Exception à NULL.
    """
    # Récupérer l'enseignant
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    
    if not enseignant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enseignant avec l'ID {enseignant_id} non trouvé"
        )
    
    # Réinitialiser les champs
    enseignant.is_Exception = False
    enseignant.quota_Exception = None
    
    try:
        db.commit()
        db.refresh(enseignant)
        logger.info(f"Exception réinitialisée pour l'enseignant {enseignant.nom} {enseignant.prenom}")
        return enseignant
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la réinitialisation de l'exception: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la réinitialisation: {str(e)}"
        )


@router.delete("/vider", status_code=status.HTTP_200_OK)
def vider_enseignants(db: Session = Depends(get_db)):
    """Vide complètement la table enseignants et les affectations associées"""
    try:
        # Vider les statistiques de génération
        vider_statistiques_generation(db)
        
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

