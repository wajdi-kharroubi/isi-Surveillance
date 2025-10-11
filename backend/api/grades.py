from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import (
    GradeConfigCreate, GradeConfigUpdate, GradeConfigResponse,
    GradeConfig
)
from config import GRADES

router = APIRouter(prefix="/grades", tags=["Grades"])


@router.get("/", response_model=List[GradeConfigResponse])
def lister_grades(db: Session = Depends(get_db)):
    """Liste toutes les configurations de grades"""
    grades = db.query(GradeConfig).all()
    
    # Si aucune configuration n'existe, initialiser avec les valeurs par défaut
    if not grades:
        for code, info in GRADES.items():
            grade_config = GradeConfig(
                grade_code=code,
                grade_nom=info["nom"],
                nb_surveillances=info["nb_surveillances"]
            )
            db.add(grade_config)
        db.commit()
        grades = db.query(GradeConfig).all()
    
    return grades


@router.get("/{grade_code}", response_model=GradeConfigResponse)
def obtenir_grade(grade_code: str, db: Session = Depends(get_db)):
    """Obtient la configuration d'un grade par son code"""
    grade = db.query(GradeConfig).filter(GradeConfig.grade_code == grade_code).first()
    
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grade '{grade_code}' non trouvé"
        )
    
    return grade


@router.post("/", response_model=GradeConfigResponse, status_code=status.HTTP_201_CREATED)
def creer_grade(grade_data: GradeConfigCreate, db: Session = Depends(get_db)):
    """Crée une nouvelle configuration de grade"""
    
    # Vérifier si le grade existe déjà
    grade_exist = db.query(GradeConfig).filter(
        GradeConfig.grade_code == grade_data.grade_code
    ).first()
    
    if grade_exist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le grade '{grade_data.grade_code}' existe déjà"
        )
    
    grade = GradeConfig(**grade_data.model_dump())
    db.add(grade)
    db.commit()
    db.refresh(grade)
    
    return grade


@router.put("/{grade_code}", response_model=GradeConfigResponse)
def modifier_grade(
    grade_code: str,
    grade_data: GradeConfigUpdate,
    db: Session = Depends(get_db)
):
    """Modifie une configuration de grade existante"""
    
    grade = db.query(GradeConfig).filter(GradeConfig.grade_code == grade_code).first()
    
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grade '{grade_code}' non trouvé"
        )
    
    # Mettre à jour les champs
    update_data = grade_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grade, field, value)
    
    db.commit()
    db.refresh(grade)
    
    return grade


@router.delete("/{grade_code}")
def supprimer_grade(grade_code: str, db: Session = Depends(get_db)):
    """Supprime une configuration de grade"""
    
    grade = db.query(GradeConfig).filter(GradeConfig.grade_code == grade_code).first()
    
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grade '{grade_code}' non trouvé"
        )
    
    db.delete(grade)
    db.commit()
    
    return {"success": True, "message": f"Grade '{grade_code}' supprimé"}


@router.post("/reset")
def reset_grades(db: Session = Depends(get_db)):
    """Réinitialise toutes les configurations avec les valeurs par défaut"""
    
    # Supprimer toutes les configurations existantes
    db.query(GradeConfig).delete()
    
    # Recréer avec les valeurs par défaut
    for code, info in GRADES.items():
        grade_config = GradeConfig(
            grade_code=code,
            grade_nom=info["nom"],
            nb_surveillances=info["nb_surveillances"]
        )
        db.add(grade_config)
    
    db.commit()
    
    return {"success": True, "message": f"{len(GRADES)} grades réinitialisés"}
