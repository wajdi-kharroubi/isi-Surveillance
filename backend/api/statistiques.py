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
    nb_enseignants_actifs = (
        db.query(Enseignant).filter(Enseignant.participe_surveillance == True).count()
    )
    nb_examens = db.query(Examen).count()

    # Calculer le nombre de salles uniques
    nb_salles = db.query(func.count(func.distinct(Examen.cod_salle))).scalar() or 0

    # Compter les surveillances uniques (par enseignant et séance)
    # Une séance = même date, même heure de début
    nb_affectations = (
        db.query(
            func.count(
                distinct(
                    func.concat(
                        Affectation.enseignant_id,
                        "-",
                        func.date(Examen.dateExam),
                        "-",
                        Examen.h_debut,
                    )
                )
            )
        )
        .join(Examen, Affectation.examen_id == Examen.id)
        .scalar()
        or 0
    )

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
        taux_couverture=round(taux_couverture, 2),
    )




@router.get("/charge-enseignants")
def charge_par_enseignant(db: Session = Depends(get_db)):
    """Retourne la charge de travail par enseignant (séances uniques)"""
    from sqlalchemy import func, distinct, case

    # Compter les séances uniques par enseignant (même date + même heure = 1 séance)
    # Utiliser CASE pour retourner 0 quand il n'y a pas d'affectations au lieu de 1
    charges = (
        db.query(
            Enseignant.id,
            Enseignant.nom,
            Enseignant.prenom,
            Enseignant.grade_code,
            func.count(
                distinct(
                    case(
                        (Examen.id.isnot(None), func.concat(func.date(Examen.dateExam), "-", Examen.h_debut)),
                        else_=None
                    )
                )
            ).label("nb_surveillances"),
        )
        .join(Affectation, Enseignant.id == Affectation.enseignant_id, isouter=True)
        .join(Examen, Affectation.examen_id == Examen.id, isouter=True)
        .group_by(Enseignant.id)
        .all()
    )

    return {
        "charges": [
            {
                "enseignant_id": ens_id,
                "nom": nom,
                "prenom": prenom,
                "grade": grade,
                "nb_surveillances": nb or 0,
            }
            for ens_id, nom, prenom, grade, nb in charges
        ]
    }





