from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import StatistiquesResponse
from models.models import Enseignant, Examen, Affectation, Voeu, GenerationStatistique, SouhaitViole, ResponsableAbsent, DepassementMaxJour, HeureCreuse, HeureCreuse
from typing import List, Optional
from pydantic import BaseModel

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
    """Retourne la charge de travail par enseignant (séances uniques) - uniquement pour les enseignants qui participent aux surveillances"""
    from sqlalchemy import func, distinct, case
    from models.models import GradeConfig

    # Compter les séances uniques par enseignant (même date + même heure = 1 séance)
    # Utiliser CASE pour retourner 0 quand il n'y a pas d'affectations au lieu de 1
    # Filtrer uniquement les enseignants qui participent aux surveillances
    charges = (
        db.query(
            Enseignant.id,
            Enseignant.nom,
            Enseignant.prenom,
            Enseignant.grade_code,
            Enseignant.is_Exception,
            Enseignant.quota_Exception,
            func.count(
                distinct(
                    case(
                        (Examen.id.isnot(None), func.concat(func.date(Examen.dateExam), "-", Examen.h_debut)),
                        else_=None
                    )
                )
            ).label("nb_surveillances"),
            func.count(
                distinct(
                    case(
                        (Examen.id.isnot(None), func.date(Examen.dateExam)),
                        else_=None
                    )
                )
            ).label("nb_jours"),
        )
        .filter(Enseignant.participe_surveillance == True)  # Ne compter que les enseignants qui participent
        .join(Affectation, Enseignant.id == Affectation.enseignant_id, isouter=True)
        .join(Examen, Affectation.examen_id == Examen.id, isouter=True)
        .group_by(Enseignant.id)
        .all()
    )

    # Récupérer les quotas de grade
    grade_configs = db.query(GradeConfig).all()
    quota_par_grade = {gc.grade_code: gc.nb_surveillances for gc in grade_configs}

    return {
        "charges": [
            {
                "enseignant_id": ens_id,
                "nom": nom,
                "prenom": prenom,
                "grade": grade,
                "nb_surveillances": nb or 0,
                "nb_jours": nb_jours or 0,
                "quota_initial": quota_exception if is_exception and quota_exception is not None else quota_par_grade.get(grade, 0),
                "is_exception": is_exception,
            }
            for ens_id, nom, prenom, grade, is_exception, quota_exception, nb, nb_jours in charges
        ]
    }


# ============ Schemas pour les statistiques de génération ============

class SouhaitVioleResponse(BaseModel):
    id: int
    enseignant_nom: str
    enseignant_prenom: str
    code_smartex: str
    date_exam: str
    seance: str
    jour: str
    
    class Config:
        from_attributes = True


class ResponsableAbsentResponse(BaseModel):
    id: int
    enseignant_nom: str
    enseignant_prenom: str
    code_smartex: str
    date_exam: str
    seance: str
    salle: Optional[str] = None  # Optionnel (déprécié après groupement)
    nb_examens: int = 1  # Nombre d'examens groupés
    raison: Optional[str] = 'autre'
    
    class Config:
        from_attributes = True


class DepassementMaxJourResponse(BaseModel):
    id: int
    enseignant_nom: str
    enseignant_prenom: str
    code_smartex: str
    date_exam: str
    nb_seances: int
    max_autorise: int
    depassement: int
    seances: str
    
    class Config:
        from_attributes = True

class HeureCreuseResponse(BaseModel):
    id: int
    enseignant_nom: str
    enseignant_prenom: str
    code_smartex: str
    date_exam: str
    jour_nom: str
    seances_affectees: str
    seance_debut: str
    seance_fin: str
    seances_manquantes: str
    nb_trous: int
    
    class Config:
        from_attributes = True


class GenerationStatistiqueResponse(BaseModel):
    id: int
    date_generation: str
    nb_affectations: int
    temps_generation: int
    
    # Statistiques des souhaits
    nb_souhaits_total: int
    nb_souhaits_respectes: int
    nb_souhaits_violes: int
    taux_souhaits_respectes: int
    
    # Statistiques des responsables
    nb_responsables_total: int
    nb_responsables_presents: int
    nb_responsables_absents: int
    nb_responsables_non_participants: int
    taux_responsables_presents: int
    
    # Statistiques des contraintes de séances par jour
    nb_contraintes_seances_total: int
    nb_contraintes_seances_respectees: int
    nb_contraintes_seances_violees: int
    taux_contraintes_seances_respectees: int
    
    # Statistiques des heures creuses
    nb_heures_creuses_total: int = 0
    nb_enseignants_heures_creuses: int = 0
    
    # Listes détaillées (optionnelles)
    souhaits_violes: Optional[List[SouhaitVioleResponse]] = []
    responsables_absents_participants: Optional[List[ResponsableAbsentResponse]] = []
    responsables_absents_non_surveillants: Optional[List[ResponsableAbsentResponse]] = []
    depassements_max_jour: Optional[List[DepassementMaxJourResponse]] = []
    heures_creuses: Optional[List[HeureCreuseResponse]] = []
    
    class Config:
        from_attributes = True


# ============ Endpoints pour les statistiques de génération ============

@router.get("/generations", response_model=List[GenerationStatistiqueResponse])
def obtenir_statistiques_generations(
    limit: int = 10,
    include_details: bool = False,
    db: Session = Depends(get_db)
):
    """
    Retourne l'historique des statistiques de génération.
    
    Args:
        limit: Nombre maximum de générations à retourner (défaut: 10)
        include_details: Inclure les listes détaillées des violations (défaut: False)
    """
    query = db.query(GenerationStatistique).order_by(GenerationStatistique.date_generation.desc()).limit(limit)
    
    if include_details:
        from sqlalchemy.orm import joinedload, selectinload
        query = query.options(
            joinedload(GenerationStatistique.souhaits_violes),
            joinedload(GenerationStatistique.responsables_absents),
            joinedload(GenerationStatistique.depassements_max_jour),
            selectinload(GenerationStatistique.heures_creuses)  # selectinload pour éviter les problèmes avec beaucoup de lignes
        )
    
    generations = query.all()
    
    # Convertir en réponse
    result = []
    for gen in generations:
        gen_dict = {
            'id': gen.id,
            'date_generation': gen.date_generation.strftime('%Y-%m-%d %H:%M:%S'),
            'nb_affectations': gen.nb_affectations,
            'temps_generation': gen.temps_generation,
            
            'nb_souhaits_total': gen.nb_souhaits_total,
            'nb_souhaits_respectes': gen.nb_souhaits_respectes,
            'nb_souhaits_violes': gen.nb_souhaits_violes,
            'taux_souhaits_respectes': gen.taux_souhaits_respectes,
            
            'nb_responsables_total': gen.nb_responsables_total,
            'nb_responsables_presents': gen.nb_responsables_presents,
            'nb_responsables_absents': gen.nb_responsables_absents,
            'nb_responsables_non_participants': gen.nb_responsables_non_participants,
            'taux_responsables_presents': gen.taux_responsables_presents,
            
            'nb_contraintes_seances_total': gen.nb_contraintes_seances_total,
            'nb_contraintes_seances_respectees': gen.nb_contraintes_seances_respectees,
            'nb_contraintes_seances_violees': gen.nb_contraintes_seances_violees,
            'taux_contraintes_seances_respectees': gen.taux_contraintes_seances_respectees,
            
            'nb_heures_creuses_total': gen.nb_heures_creuses_total,
            'nb_enseignants_heures_creuses': gen.nb_enseignants_heures_creuses,
        }
        
        if include_details:
            gen_dict['souhaits_violes'] = [
                {
                    'id': s.id,
                    'enseignant_nom': s.enseignant_nom,
                    'enseignant_prenom': s.enseignant_prenom,
                    'code_smartex': s.code_smartex,
                    'date_exam': s.date_exam.strftime('%Y-%m-%d'),
                    'seance': s.seance,
                    'jour': s.jour
                }
                for s in gen.souhaits_violes
            ]
            
            # Séparer les responsables absents en deux listes selon la raison
            tous_responsables_absents = [
                {
                    'id': r.id,
                    'enseignant_nom': r.enseignant_nom,
                    'enseignant_prenom': r.enseignant_prenom,
                    'code_smartex': r.code_smartex,
                    'date_exam': r.date_exam.strftime('%Y-%m-%d'),
                    'seance': r.seance,
                    'salle': r.salle,
                    'nb_examens': r.nb_examens,
                    'raison': r.raison or 'autre'
                }
                for r in gen.responsables_absents
            ]
            
            # Liste des responsables absents avec participe_surveillance=True (raison='autre')
            gen_dict['responsables_absents_participants'] = [
                r for r in tous_responsables_absents if r['raison'] == 'autre'
            ]
            
            # Liste des responsables absents avec participe_surveillance=False (raison='non_surveillant')
            gen_dict['responsables_absents_non_surveillants'] = [
                r for r in tous_responsables_absents if r['raison'] == 'non_surveillant'
            ]
            
            gen_dict['depassements_max_jour'] = [
                {
                    'id': d.id,
                    'enseignant_nom': d.enseignant_nom,
                    'enseignant_prenom': d.enseignant_prenom,
                    'code_smartex': d.code_smartex,
                    'date_exam': d.date_exam.strftime('%Y-%m-%d'),
                    'nb_seances': d.nb_seances,
                    'max_autorise': d.max_autorise,
                    'depassement': d.depassement,
                    'seances': d.seances
                }
                for d in gen.depassements_max_jour
            ]
            
            gen_dict['heures_creuses'] = [
                {
                    'id': h.id,
                    'enseignant_nom': h.enseignant_nom,
                    'enseignant_prenom': h.enseignant_prenom,
                    'code_smartex': h.code_smartex,
                    'date_exam': h.date_exam.strftime('%Y-%m-%d'),
                    'jour_nom': h.jour_nom,
                    'seances_affectees': h.seances_affectees,
                    'seance_debut': h.seance_debut,
                    'seance_fin': h.seance_fin,
                    'seances_manquantes': h.seances_manquantes,
                    'nb_trous': h.nb_trous
                }
                for h in gen.heures_creuses
            ]
        
        result.append(gen_dict)
    
    return result


@router.get("/generations/derniere", response_model=GenerationStatistiqueResponse)
def obtenir_derniere_statistique_generation(
    include_details: bool = True,
    db: Session = Depends(get_db)
):
    """
    Retourne les statistiques de la dernière génération.
    
    Args:
        include_details: Inclure les listes détaillées des violations (défaut: True)
    """
    query = db.query(GenerationStatistique).order_by(GenerationStatistique.date_generation.desc()).limit(1)
    
    if include_details:
        from sqlalchemy.orm import joinedload, selectinload
        query = query.options(
            joinedload(GenerationStatistique.souhaits_violes),
            joinedload(GenerationStatistique.responsables_absents),
            joinedload(GenerationStatistique.depassements_max_jour),
            selectinload(GenerationStatistique.heures_creuses)  # selectinload pour éviter les problèmes avec beaucoup de lignes
        )
    
    gen = query.first()
    
    if not gen:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Aucune statistique de génération trouvée")
    
    gen_dict = {
        'id': gen.id,
        'date_generation': gen.date_generation.strftime('%Y-%m-%d %H:%M:%S'),
        'nb_affectations': gen.nb_affectations,
        'temps_generation': gen.temps_generation,
        
        'nb_souhaits_total': gen.nb_souhaits_total,
        'nb_souhaits_respectes': gen.nb_souhaits_respectes,
        'nb_souhaits_violes': gen.nb_souhaits_violes,
        'taux_souhaits_respectes': gen.taux_souhaits_respectes,
        
        'nb_responsables_total': gen.nb_responsables_total,
        'nb_responsables_presents': gen.nb_responsables_presents,
        'nb_responsables_absents': gen.nb_responsables_absents,
        'nb_responsables_non_participants': gen.nb_responsables_non_participants,
        'taux_responsables_presents': gen.taux_responsables_presents,
        
        'nb_contraintes_seances_total': gen.nb_contraintes_seances_total,
        'nb_contraintes_seances_respectees': gen.nb_contraintes_seances_respectees,
        'nb_contraintes_seances_violees': gen.nb_contraintes_seances_violees,
        'taux_contraintes_seances_respectees': gen.taux_contraintes_seances_respectees,
        
        'nb_heures_creuses_total': gen.nb_heures_creuses_total,
        'nb_enseignants_heures_creuses': gen.nb_enseignants_heures_creuses,
    }
    
    if include_details:
        gen_dict['souhaits_violes'] = [
            {
                'id': s.id,
                'enseignant_nom': s.enseignant_nom,
                'enseignant_prenom': s.enseignant_prenom,
                'code_smartex': s.code_smartex,
                'date_exam': s.date_exam.strftime('%Y-%m-%d'),
                'seance': s.seance,
                'jour': s.jour
            }
            for s in gen.souhaits_violes
        ]
        
        # Séparer les responsables absents en deux listes selon la raison
        tous_responsables_absents = [
            {
                'id': r.id,
                'enseignant_nom': r.enseignant_nom,
                'enseignant_prenom': r.enseignant_prenom,
                'code_smartex': r.code_smartex,
                'date_exam': r.date_exam.strftime('%Y-%m-%d'),
                'seance': r.seance,
                'salle': r.salle,
                'nb_examens': r.nb_examens,
                'raison': r.raison or 'autre'
            }
            for r in gen.responsables_absents
        ]
        
        # Liste des responsables absents avec participe_surveillance=True (raison='autre')
        gen_dict['responsables_absents_participants'] = [
            r for r in tous_responsables_absents if r['raison'] == 'autre'
        ]
        
        # Liste des responsables absents avec participe_surveillance=False (raison='non_surveillant')
        gen_dict['responsables_absents_non_surveillants'] = [
            r for r in tous_responsables_absents if r['raison'] == 'non_surveillant'
        ]
        
        gen_dict['depassements_max_jour'] = [
            {
                'id': d.id,
                'enseignant_nom': d.enseignant_nom,
                'enseignant_prenom': d.enseignant_prenom,
                'code_smartex': d.code_smartex,
                'date_exam': d.date_exam.strftime('%Y-%m-%d'),
                'nb_seances': d.nb_seances,
                'max_autorise': d.max_autorise,
                'depassement': d.depassement,
                'seances': d.seances
            }
            for d in gen.depassements_max_jour
        ]
        
        gen_dict['heures_creuses'] = [
            {
                'id': h.id,
                'enseignant_nom': h.enseignant_nom,
                'enseignant_prenom': h.enseignant_prenom,
                'code_smartex': h.code_smartex,
                'date_exam': h.date_exam.strftime('%Y-%m-%d'),
                'jour_nom': h.jour_nom,
                'seances_affectees': h.seances_affectees,
                'seance_debut': h.seance_debut,
                'seance_fin': h.seance_fin,
                'seances_manquantes': h.seances_manquantes,
                'nb_trous': h.nb_trous
            }
            for h in gen.heures_creuses
        ]
    
    return gen_dict






