from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ExamenResponse, Examen, Affectation, Enseignant

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

    # Enrichir chaque examen avec le nom et prénom du responsable
    result = []
    for examen in examens:
        # Chercher l'enseignant responsable par code_smartex
        responsable = db.query(Enseignant).filter(
            Enseignant.code_smartex == examen.enseignant
        ).first()
        
        examen_dict = {
            "id": examen.id,
            "dateExam": examen.dateExam,
            "h_debut": examen.h_debut,
            "h_fin": examen.h_fin,
            "session": examen.session,
            "type_ex": examen.type_ex,
            "semestre": examen.semestre,
            "enseignant": examen.enseignant,
            "cod_salle": examen.cod_salle,
            "created_at": examen.created_at,
            "updated_at": examen.updated_at,
            "responsable_nom": responsable.nom if responsable else None,
            "responsable_prenom": responsable.prenom if responsable else None,
        }
        result.append(examen_dict)

    return result


@router.delete("/vider", status_code=status.HTTP_200_OK)
def vider_examens(db: Session = Depends(get_db)):
    """Vide complètement la table examens et les affectations associées"""
    try:
        # Supprimer d'abord les affectations (dépendances)
        nb_affectations = db.query(Affectation).delete(synchronize_session=False)
        
        # Puis supprimer les examens
        nb_supprimes = db.query(Examen).delete(synchronize_session=False)
        db.commit()
        return {
            "message": f"Table examens et affectations vidées avec succès",
            "nb_examens_supprimes": nb_supprimes,
            "nb_affectations_supprimees": nb_affectations
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression : {str(e)}"
        )

