from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import GenerationRequest, GenerationResponse
from models.models import Affectation, Examen, GenerationStatistique, SouhaitViole, ResponsableAbsent, DepassementMaxJour
from algorithms.optimizer_v3 import SurveillanceOptimizerV3
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generation", tags=["Génération"])


@router.post("/generer-v3", response_model=GenerationResponse)
def generer_planning_v3(request: GenerationRequest, db: Session = Depends(get_db)):
    """
    Génère automatiquement le planning avec l'algorithme d'optimisation V3.0 avancé.

    NOUVELLES FONCTIONNALITÉS V3:
    =============================

    1. RÈGLES DE BASE (Contraintes fortes):
       • Quota MAXIMUM strict par grade (pas de dépassement)
       • Responsable d'examen DOIT être présent
       • Non-conflit horaire garanti
       • Nombre minimal d'enseignants par créneau
       • Mode adaptatif avec fallback intelligent

    2. RÈGLES DE PRÉFÉRENCE (Flexibles):
       • Vœux et disponibilités des enseignants
       • Équilibre temporel (éviter toujours mêmes créneaux)
       • Équilibre global de charge

    3. PRIORITÉ DES CONTRAINTES:
       1. Présence du responsable d'examen
       2. Nombre minimal par examen
       3. Quota MAXIMUM strict par grade (ne jamais dépasser)
       4. Disponibilités et vœux (préférence)
       5. Équilibre global

    Paramètres:
        - min_surveillants_par_salle: Nombre minimum de surveillants par examen (défaut: 2)
        - allow_single_surveillant: Autoriser le fallback à 1 surveillant si nécessaire
        - max_time_in_seconds: Temps maximum de résolution en secondes (défaut: 900 = 15 min, range: 10-3600)
        - relative_gap_limit: Gap relatif accepté pour arrêter l'optimisation (défaut: 0.01 = 1%, range: 0.0-1.0)

    Retour:
        - success: Statut de la génération
        - nb_affectations: Nombre total d'affectations créées
        - temps_generation: Temps d'exécution en secondes
        - warnings: Liste des avertissements et informations
    """
    try:
        # Vider toutes les tables de statistiques de génération avant une nouvelle génération
        try:
            # Supprimer d'abord les tables enfants (à cause des clés étrangères)
            db.query(SouhaitViole).delete()
            db.query(ResponsableAbsent).delete()
            db.query(DepassementMaxJour).delete()
            # Puis la table parent
            db.query(GenerationStatistique).delete()
            db.commit()
            logger.info("Anciennes statistiques de génération supprimées")
        except Exception as e:
            logger.warning(f"Erreur lors de la suppression des anciennes statistiques: {str(e)}")
            db.rollback()
        
        optimizer = SurveillanceOptimizerV3(db)

        success, nb_affectations, temps_exec, messages, statistiques_data = (
            optimizer.generer_planning_optimise(
                min_surveillants_par_examen=request.min_surveillants_par_salle,
                allow_fallback=request.allow_single_surveillant,
                respecter_voeux=True,
                equilibrer_temporel=False,
                activer_regroupement_temporel=True,  # ✅ Activé par défaut pour le confort enseignants
                max_time_in_seconds=request.max_time_in_seconds,
                relative_gap_limit=request.relative_gap_limit,
            )
        )

        if success and statistiques_data:
            # Calculer le nombre de surveillances uniques (comme dans le dashboard)
            from sqlalchemy import func, distinct

            nb_surveillances_uniques = (
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
            
            # Enregistrer les statistiques dans la base de données
            try:
                # Créer l'enregistrement principal des statistiques
                stats_souhaits = statistiques_data.get('souhaits', {})
                stats_responsables = statistiques_data.get('responsables', {})
                stats_max_seances = statistiques_data.get('max_seances_jour', {})
                
                # Calculer les taux en pourcentage
                taux_souhaits = int((stats_souhaits.get('respectes', 0) / stats_souhaits.get('total', 1) * 100)) if stats_souhaits.get('total', 0) > 0 else 100
                taux_responsables = int((stats_responsables.get('presents', 0) / stats_responsables.get('total', 1) * 100)) if stats_responsables.get('total', 0) > 0 else 100
                taux_seances = int((stats_max_seances.get('respectees', 0) / stats_max_seances.get('total', 1) * 100)) if stats_max_seances.get('total', 0) > 0 else 100
                
                generation_stat = GenerationStatistique(
                    date_generation=datetime.utcnow(),
                    nb_affectations=nb_surveillances_uniques,
                    temps_generation=int(temps_exec),
                    
                    # Statistiques des souhaits
                    nb_souhaits_total=stats_souhaits.get('total', 0),
                    nb_souhaits_respectes=stats_souhaits.get('respectes', 0),
                    nb_souhaits_violes=stats_souhaits.get('violes', 0),
                    taux_souhaits_respectes=taux_souhaits,
                    
                    # Statistiques des responsables
                    nb_responsables_total=stats_responsables.get('total', 0),
                    nb_responsables_presents=stats_responsables.get('presents', 0),
                    nb_responsables_absents=stats_responsables.get('absents', 0),
                    taux_responsables_presents=taux_responsables,
                    
                    # Statistiques des contraintes de séances par jour
                    nb_contraintes_seances_total=stats_max_seances.get('total', 0),
                    nb_contraintes_seances_respectees=stats_max_seances.get('respectees', 0),
                    nb_contraintes_seances_violees=stats_max_seances.get('violees', 0),
                    taux_contraintes_seances_respectees=taux_seances,
                )
                
                db.add(generation_stat)
                db.flush()  # Pour obtenir l'ID
                
                # Enregistrer les souhaits violés
                for souhait_viole in stats_souhaits.get('details_violes', []):
                    souhait = SouhaitViole(
                        generation_statistique_id=generation_stat.id,
                        enseignant_id=souhait_viole['enseignant_id'],
                        enseignant_nom=souhait_viole['enseignant_nom'],
                        enseignant_prenom=souhait_viole['enseignant_prenom'],
                        code_smartex=souhait_viole['code'],
                        date_exam=souhait_viole['date_obj'],
                        seance=souhait_viole['seance'],
                        jour=souhait_viole.get('jour', 'Inconnu')
                    )
                    db.add(souhait)
                
                # Enregistrer les responsables absents
                for responsable_absent in stats_responsables.get('details_absents', []):
                    responsable = ResponsableAbsent(
                        generation_statistique_id=generation_stat.id,
                        enseignant_id=responsable_absent['enseignant_id'],
                        enseignant_nom=responsable_absent['enseignant_nom'],
                        enseignant_prenom=responsable_absent['enseignant_prenom'],
                        code_smartex=responsable_absent['code'],
                        date_exam=responsable_absent['date_obj'],
                        seance=responsable_absent['seance'],
                        salle=responsable_absent['salle']
                    )
                    db.add(responsable)
                
                # Enregistrer les dépassements du nombre max de séances par jour
                for depassement in stats_max_seances.get('details_violations', []):
                    depass = DepassementMaxJour(
                        generation_statistique_id=generation_stat.id,
                        enseignant_id=depassement['enseignant_id'],
                        enseignant_nom=depassement['enseignant_nom'],
                        enseignant_prenom=depassement['enseignant_prenom'],
                        code_smartex=depassement['code'],
                        date_exam=depassement['date_obj'],
                        nb_seances=depassement['nb_seances'],
                        max_autorise=depassement['max_autorise'],
                        depassement=depassement['depassement'],
                        seances=depassement['seances']
                    )
                    db.add(depass)
                
                db.commit()
                logger.info(f"Statistiques de génération enregistrées avec succès (ID: {generation_stat.id})")
                
            except Exception as e:
                logger.error(f"Erreur lors de l'enregistrement des statistiques: {str(e)}")
                db.rollback()
                # Continue même si l'enregistrement des statistiques échoue

            return GenerationResponse(
                success=True,
                message=f"✅ Planning V3 généré avec succès en {temps_exec:.2f}s - {nb_surveillances_uniques} affectations créées",
                nb_affectations=nb_surveillances_uniques,
                temps_generation=temps_exec,
                warnings=messages,
            )
        else:
            return GenerationResponse(
                success=False,
                message="❌ Échec de la génération du planning V3",
                nb_affectations=0,
                temps_generation=temps_exec if success is False else 0,
                warnings=messages if messages else [],
            )

    except Exception as e:
        logger.error(f"Erreur lors de la génération V3: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.delete("/reinitialiser")
def reinitialiser_planning(db: Session = Depends(get_db)):
    """Supprime toutes les affectations actuelles et les statistiques de génération"""
    from models.models import Affectation

    try:
        # Vider les statistiques de génération
        try:
            db.query(SouhaitViole).delete()
            db.query(ResponsableAbsent).delete()
            db.query(DepassementMaxJour).delete()
            db.query(GenerationStatistique).delete()
            logger.info("Statistiques de génération supprimées")
        except Exception as e:
            logger.warning(f"Erreur lors de la suppression des statistiques: {str(e)}")
        
        # Supprimer les affectations
        count = db.query(Affectation).delete()
        db.commit()

        return {
            "success": True,
            "message": f"{count} affectations supprimées et statistiques vidées",
            "nb_supprimes": count,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.get("/verification")
def verifier_contraintes(db: Session = Depends(get_db)):
    """
    Vérifie que toutes les contraintes sont respectées dans le planning actuel
    """
    from models.models import Examen, Affectation, Voeu, Enseignant
    from datetime import datetime, time as dt_time

    problemes = []
    avertissements = []

    # 1. Vérifier la couverture des examens
    examens = db.query(Examen).all()
    for examen in examens:
        nb_surveillants = (
            db.query(Affectation).filter(Affectation.examen_id == examen.id).count()
        )

        if nb_surveillants == 0:
            problemes.append(
                {
                    "type": "couverture",
                    "severite": "critique",
                    "message": f"Examen {examen.id} ({examen.date_examen}): AUCUN surveillant",
                }
            )
        elif nb_surveillants == 1:
            avertissements.append(
                {
                    "type": "couverture",
                    "severite": "attention",
                    "message": f"Examen {examen.id} ({examen.date_examen}): 1 seul surveillant",
                }
            )

    # 2. Vérifier le respect des vœux
    affectations = db.query(Affectation).all()
    for aff in affectations:
        examen = aff.examen
        seance = "Matin" if examen.heure_debut.hour < 13 else "Après-midi"

        voeu = (
            db.query(Voeu)
            .filter(
                Voeu.enseignant_id == aff.enseignant_id,
                Voeu.date_indisponible == examen.date_examen,
                Voeu.seance_indisponible == seance,
            )
            .first()
        )

        if voeu:
            problemes.append(
                {
                    "type": "voeu",
                    "severite": "critique",
                    "message": f"Enseignant {aff.enseignant_id} affecté malgré un vœu de non-disponibilité",
                }
            )

    # 3. Vérifier les chevauchements
    enseignants = db.query(Enseignant).all()
    for ens in enseignants:
        affectations_ens = (
            db.query(Affectation)
            .filter(Affectation.enseignant_id == ens.id)
            .join(Examen)
            .order_by(Examen.date_examen, Examen.heure_debut)
            .all()
        )

        for i in range(len(affectations_ens) - 1):
            aff1 = affectations_ens[i]
            aff2 = affectations_ens[i + 1]

            # Même date et heure
            if (
                aff1.examen.date_examen == aff2.examen.date_examen
                and aff1.examen.heure_debut == aff2.examen.heure_debut
            ):
                problemes.append(
                    {
                        "type": "chevauchement",
                        "severite": "critique",
                        "message": f"Enseignant {ens.id} affecté à 2 examens simultanés",
                    }
                )

    return {
        "valide": len(problemes) == 0,
        "nb_problemes": len(problemes),
        "nb_avertissements": len(avertissements),
        "problemes": problemes,
        "avertissements": avertissements,
    }
