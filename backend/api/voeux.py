from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import (
    VoeuCreate, VoeuUpdate, VoeuResponse,
    Voeu, Affectation
)

router = APIRouter(prefix="/voeux", tags=["Voeux"])


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
            "created_at": voeu.created_at
        }
        result.append(voeu_dict)
    
    return result


@router.get("/{voeu_id}", response_model=VoeuResponse)
def obtenir_voeu(voeu_id: int, db: Session = Depends(get_db)):
    """Obtient un vœu par son ID"""
    voeu = db.query(Voeu).filter(Voeu.id == voeu_id).first()
    
    if not voeu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vœu avec l'ID {voeu_id} introuvable"
        )
    
    return voeu


@router.post("/", response_model=VoeuResponse, status_code=status.HTTP_201_CREATED)
def creer_voeu(voeu_data: VoeuCreate, db: Session = Depends(get_db)):
    """Crée un nouveau vœu"""
    
    # Si code_smartex_ens n'est pas fourni, le récupérer depuis l'enseignant
    data_dict = voeu_data.model_dump()
    
    if not data_dict.get('code_smartex_ens'):
        from models.models import Enseignant
        enseignant = db.query(Enseignant).filter(Enseignant.id == voeu_data.enseignant_id).first()
        
        if enseignant:
            data_dict['code_smartex_ens'] = enseignant.code_smartex
    
    voeu = Voeu(**data_dict)
    db.add(voeu)
    db.commit()
    db.refresh(voeu)
    
    return voeu


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


@router.put("/{voeu_id}", response_model=VoeuResponse)
def modifier_voeu(
    voeu_id: int,
    voeu_data: VoeuUpdate,
    db: Session = Depends(get_db)
):
    """Modifie un vœu existant"""
    voeu = db.query(Voeu).filter(Voeu.id == voeu_id).first()
    
    if not voeu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vœu avec l'ID {voeu_id} introuvable"
        )
    
    # Mise à jour des champs
    update_data = voeu_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(voeu, field, value)
    
    db.commit()
    db.refresh(voeu)
    
    return voeu


@router.delete("/{voeu_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_voeu(voeu_id: int, db: Session = Depends(get_db)):
    """Supprime un vœu"""
    voeu = db.query(Voeu).filter(Voeu.id == voeu_id).first()
    
    if not voeu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vœu avec l'ID {voeu_id} introuvable"
        )
    
    db.delete(voeu)
    db.commit()
    
    return None


@router.get("/search/", response_model=List[VoeuResponse])
def rechercher_voeux(
    jour: int = None,
    seance: str = None,
    db: Session = Depends(get_db)
):
    """Recherche des vœux par critères"""
    query = db.query(Voeu)
    
    if jour:
        query = query.filter(Voeu.jour == jour)
    
    if seance:
        query = query.filter(Voeu.seance == seance)
    
    return query.all()

