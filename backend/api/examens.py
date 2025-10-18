from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ExamenCreate, ExamenUpdate, ExamenResponse, Examen, Affectation

router = APIRouter(prefix="/examens", tags=["Examens"])


@router.get("/", response_model=List[ExamenResponse])
def lister_examens(
    skip: int = 0,
    limit: int = 1000,
    session: str = None,
    semestre: str = None,
    db: Session = Depends(get_db),
):
    """Liste tous les examens avec filtres optionnels"""
    query = db.query(Examen)

    if session:
        query = query.filter(Examen.session == session)

    if semestre:
        query = query.filter(Examen.semestre == semestre)

    # Si limit est -1, retourner tous les résultats
    if limit == -1:
        examens = query.offset(skip).all()
    else:
        examens = query.offset(skip).limit(limit).all()

    return examens


@router.get("/{examen_id}", response_model=ExamenResponse)
def obtenir_examen(examen_id: int, db: Session = Depends(get_db)):
    """Obtient un examen par son ID"""
    examen = db.query(Examen).filter(Examen.id == examen_id).first()

    if not examen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examen avec l'ID {examen_id} introuvable",
        )

    return examen


@router.post("/", response_model=ExamenResponse, status_code=status.HTTP_201_CREATED)
def creer_examen(examen_data: ExamenCreate, db: Session = Depends(get_db)):
    """Crée un nouvel examen"""

    examen = Examen(**examen_data.model_dump())
    db.add(examen)
    db.commit()
    db.refresh(examen)

    return examen


@router.delete("/vider", status_code=status.HTTP_200_OK)
def vider_examens(db: Session = Depends(get_db)):
    """Vide complètement la table examens"""
    try:

        nb_supprimes = db.query(Examen).delete(synchronize_session=False)
        db.commit()
        return {
            "message": f"Table examens vidée avec succès",
            "nb_supprimes": nb_supprimes
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression : {str(e)}"
        )


@router.put("/{examen_id}", response_model=ExamenResponse)
def modifier_examen(
    examen_id: int, examen_data: ExamenUpdate, db: Session = Depends(get_db)
):
    """Modifie un examen existant"""
    examen = db.query(Examen).filter(Examen.id == examen_id).first()

    if not examen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examen avec l'ID {examen_id} introuvable",
        )

    # Mise à jour des champs
    update_data = examen_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(examen, field, value)

    db.commit()
    db.refresh(examen)

    return examen


@router.delete("/{examen_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_examen(examen_id: int, db: Session = Depends(get_db)):
    """Supprime un examen"""
    examen = db.query(Examen).filter(Examen.id == examen_id).first()

    if not examen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examen avec l'ID {examen_id} introuvable",
        )

    db.delete(examen)
    db.commit()

    return None


@router.get("/search/", response_model=List[ExamenResponse])
def rechercher_examens(
    enseignant: str = None,
    cod_salle: str = None,
    type_ex: str = None,
    db: Session = Depends(get_db),
):
    """Recherche des examens par critères"""
    query = db.query(Examen)

    if enseignant:
        query = query.filter(Examen.enseignant == enseignant)

    if cod_salle:
        query = query.filter(Examen.cod_salle.ilike(f"%{cod_salle}%"))

    if type_ex:
        query = query.filter(Examen.type_ex == type_ex)

    return query.all()

