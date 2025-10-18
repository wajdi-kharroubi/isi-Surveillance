from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import StatistiquesResponse
from models.models import Enseignant, Examen, Affectation, Voeu

router = APIRouter(prefix="/statistiques", tags=["Statistiques"])


@router.get("/", response_model=StatistiquesResponse)
def obtenir_statistiques(db: Session = Depends(get_db)):
    """Retourne les statistiques globales du système"""
    from sqlalchemy import func, distinct
    
    nb_enseignants = db.query(Enseignant).count()
    nb_enseignants_actifs = db.query(Enseignant).filter(
        Enseignant.participe_surveillance == True
    ).count()
    nb_examens = db.query(Examen).count()
    
    # Calculer le nombre de salles uniques
    nb_salles = db.query(func.count(func.distinct(Examen.cod_salle))).scalar() or 0
    
    # Compter les surveillances uniques (par enseignant et séance)
    # Une séance = même date, même heure de début
    nb_affectations = db.query(
        func.count(distinct(func.concat(
            Affectation.enseignant_id, '-',
            func.date(Examen.dateExam), '-',
            Examen.h_debut
        )))
    ).join(Examen, Affectation.examen_id == Examen.id).scalar() or 0
    
    nb_voeux = db.query(Voeu).count()
    
    # Calculer le taux de couverture
    if nb_examens > 0:
        examens_couverts = db.query(Examen).join(Affectation).distinct().count()
        taux_couverture = (examens_couverts / nb_examens) * 100
    else:
        taux_couverture = 0.0
    
    return StatistiquesResponse(
        nb_enseignants=nb_enseignants,
        nb_enseignants_actifs=nb_enseignants_actifs,
        nb_examens=nb_examens,
        nb_salles=nb_salles,
        nb_affectations=nb_affectations,
        nb_voeux=nb_voeux,
        taux_couverture=round(taux_couverture, 2)
    )


@router.get("/repartition-grades")
def repartition_par_grade(db: Session = Depends(get_db)):
    """Retourne la répartition des enseignants par grade"""
    from sqlalchemy import func
    
    repartition = db.query(
        Enseignant.grade_code,
        func.count(Enseignant.id).label('count')
    ).group_by(Enseignant.grade_code).all()
    
    return {
        "repartition": [
            {"grade": grade, "nombre": count}
            for grade, count in repartition
        ]
    }


@router.get("/charge-enseignants")
def charge_par_enseignant(db: Session = Depends(get_db)):
    """Retourne la charge de travail par enseignant"""
    from sqlalchemy import func
    
    charges = db.query(
        Enseignant.id,
        Enseignant.nom,
        Enseignant.prenom,
        Enseignant.grade_code,
        func.count(Affectation.id).label('nb_surveillances')
    ).join(
        Affectation, Enseignant.id == Affectation.enseignant_id, isouter=True
    ).group_by(Enseignant.id).all()
    
    return {
        "charges": [
            {
                "enseignant_id": ens_id,
                "nom": nom,
                "prenom": prenom,
                "grade": grade,
                "nb_surveillances": nb or 0
            }
            for ens_id, nom, prenom, grade, nb in charges
        ]
    }


@router.get("/examens-par-jour")
def examens_par_jour(db: Session = Depends(get_db)):
    """Retourne le nombre d'examens par jour"""
    from sqlalchemy import func
    
    examens = db.query(
        Examen.date_examen,
        func.count(Examen.id).label('count')
    ).group_by(Examen.date_examen).order_by(Examen.date_examen).all()
    
    return {
        "examens_par_jour": [
            {
                "date": date.strftime('%Y-%m-%d'),
                "nombre": count
            }
            for date, count in examens
        ]
    }


@router.get("/disponibilites")
def statistiques_disponibilites(db: Session = Depends(get_db)):
    """Statistiques sur les disponibilités des enseignants"""
    from sqlalchemy import func
    
    voeux_par_enseignant = db.query(
        Voeu.enseignant_id,
        func.count(Voeu.id).label('nb_voeux')
    ).group_by(Voeu.enseignant_id).all()
    
    voeux_par_date = db.query(
        Voeu.date_indisponible,
        func.count(Voeu.id).label('nb_voeux')
    ).group_by(Voeu.date_indisponible).order_by(Voeu.date_indisponible).all()
    
    return {
        "nb_enseignants_avec_voeux": len(voeux_par_enseignant),
        "voeux_par_date": [
            {
                "date": date.strftime('%Y-%m-%d'),
                "nombre": count
            }
            for date, count in voeux_par_date
        ]
    }
