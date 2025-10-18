from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import (
    EnseignantCreate, EnseignantUpdate, EnseignantResponse,
    Enseignant, Voeu, Affectation
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


@router.get("/{enseignant_id}", response_model=EnseignantResponse)
def obtenir_enseignant(enseignant_id: int, db: Session = Depends(get_db)):
    """Obtient un enseignant par son ID"""
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    
    if not enseignant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enseignant avec l'ID {enseignant_id} introuvable"
        )
    
    return enseignant


@router.post("/", response_model=EnseignantResponse, status_code=status.HTTP_201_CREATED)
def creer_enseignant(enseignant_data: EnseignantCreate, db: Session = Depends(get_db)):
    """Crée un nouvel enseignant"""
    
    # Vérifier l'unicité de l'email
    if db.query(Enseignant).filter(Enseignant.email == enseignant_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un enseignant avec cet email existe déjà"
        )
    
    # Vérifier l'unicité du code smartex
    if db.query(Enseignant).filter(Enseignant.code_smartex == enseignant_data.code_smartex).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un enseignant avec ce code smartex existe déjà"
        )
    
    enseignant = Enseignant(**enseignant_data.model_dump())
    db.add(enseignant)
    db.commit()
    db.refresh(enseignant)
    
    return enseignant


@router.delete("/vider", status_code=status.HTTP_200_OK)
def vider_enseignants(db: Session = Depends(get_db)):
    """Vide complètement la table enseignants"""
    try:
        nb_supprimes = db.query(Enseignant).delete(synchronize_session=False)
        db.commit()
        return {
            "message": f"Table enseignants vidée avec succès",
            "nb_supprimes": nb_supprimes
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression : {str(e)}"
        )


@router.put("/{enseignant_id}", response_model=EnseignantResponse)
def modifier_enseignant(
    enseignant_id: int,
    enseignant_data: EnseignantUpdate,
    db: Session = Depends(get_db)
):
    """Modifie un enseignant existant"""
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    
    if not enseignant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enseignant avec l'ID {enseignant_id} introuvable"
        )
    
    # Mise à jour des champs
    update_data = enseignant_data.model_dump(exclude_unset=True)
    
    # Vérifier l'unicité de l'email si modifié
    if "email" in update_data:
        existing = db.query(Enseignant).filter(
            Enseignant.email == update_data["email"],
            Enseignant.id != enseignant_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un enseignant avec cet email existe déjà"
            )
    
    for field, value in update_data.items():
        setattr(enseignant, field, value)
    
    db.commit()
    db.refresh(enseignant)
    
    return enseignant


@router.delete("/{enseignant_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_enseignant(enseignant_id: int, db: Session = Depends(get_db)):
    """Supprime un enseignant"""
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    
    if not enseignant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enseignant avec l'ID {enseignant_id} introuvable"
        )
    
    db.delete(enseignant)
    db.commit()
    
    return None


@router.get("/search/", response_model=List[EnseignantResponse])
def rechercher_enseignants(
    nom: str = None,
    prenom: str = None,
    grade: str = None,
    db: Session = Depends(get_db)
):
    """Recherche des enseignants par critères"""
    query = db.query(Enseignant)
    
    if nom:
        query = query.filter(Enseignant.nom.ilike(f"%{nom}%"))
    
    if prenom:
        query = query.filter(Enseignant.prenom.ilike(f"%{prenom}%"))
    
    if grade:
        query = query.filter(Enseignant.grade_code == grade)
    
    return query.all()

