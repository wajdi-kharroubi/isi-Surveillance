from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import GenerationRequest, GenerationResponse
from models.models import Affectation, Examen
from algorithms.optimizer_v1 import SurveillanceOptimizer
from algorithms.optimizer_v2 import SurveillanceOptimizerV2
from algorithms.optimizer_v3 import SurveillanceOptimizerV3
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generation", tags=["Génération"])


@router.post("/generer-v1", response_model=GenerationResponse)
def generer_planning_v1(request: GenerationRequest, db: Session = Depends(get_db)):
    """
    Génère automatiquement le planning avec l'algorithme V1 (Charge égale par grade).
    
    ALGORITHME V1 - QUOTA FIXE PAR GRADE:
    ====================================
    
    Caractéristiques:
    - Quotas FIXES par grade (tous les enseignants d'un grade font le même nombre de séances)
    - Groupe les examens par séance (date + créneau horaire + semestre + session)
    - Les enseignants affectés couvrent TOUS les examens de la séance
    
    Prend en compte:
    - Les contraintes de disponibilité (vœux)
    - Le nombre minimum de surveillants par séance
    - L'équité stricte selon les grades (quota fixe)
    - Équilibrage de la charge entre enseignants
    
    Paramètres:
        - min_surveillants_par_salle: Nombre minimum de surveillants par examen (défaut: 2)
        - allow_single_surveillant: Autoriser le fallback à 1 surveillant si nécessaire
    """
    try:
        optimizer = SurveillanceOptimizer(db)
        
        success, nb_affectations, temps_exec, messages, scores = optimizer.generer_planning_optimise(
            min_surveillants_par_examen=request.min_surveillants_par_salle,
            allow_fallback=request.allow_single_surveillant,
            respecter_voeux=True,
            equilibrer_temporel=True
        )
        
        if success:
            # Calculer le nombre de surveillances uniques (comme dans le dashboard)
            from sqlalchemy import func, distinct
            nb_surveillances_uniques = db.query(
                func.count(distinct(func.concat(
                    Affectation.enseignant_id, '-',
                    func.date(Examen.dateExam), '-',
                    Examen.h_debut
                )))
            ).join(Examen, Affectation.examen_id == Examen.id).scalar() or 0
            
            # Ajouter les scores aux messages
            messages_avec_scores = messages + [
                "\n📊 === SCORES V1 (Quota Fixe) ===",
                f"   • Score global: {scores.get('score_global', 0):.1f}%",
                f"   • Respect des vœux: {scores.get('respect_voeux', 0):.1f}%",
                f"   • Équilibre global: {scores.get('equilibre_global', 0):.1f}%",
                f"   • Quotas respectés: {scores.get('quota_respecte', 0):.1f}%"
            ]
            
            return GenerationResponse(
                success=True,
                message=f"✅ Planning V1 généré avec succès en {temps_exec:.2f}s - {nb_surveillances_uniques} affectations créées - Score: {scores.get('score_global', 0):.1f}%",
                nb_affectations=nb_surveillances_uniques,
                temps_generation=temps_exec,
                warnings=messages_avec_scores
            )
        else:
            return GenerationResponse(
                success=False,
                message="❌ Échec de la génération du planning V1",
                nb_affectations=0,
                temps_generation=temps_exec,
                warnings=messages
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération V1: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/generer-v2", response_model=GenerationResponse)
def generer_planning_v2(request: GenerationRequest, db: Session = Depends(get_db)):
    """
    Génère automatiquement le planning avec l'algorithme d'optimisation V2.0 avancé.
    
    NOUVELLES FONCTIONNALITÉS V2:
    =============================
    
    1. RÈGLES DE BASE (Contraintes fortes):
       • Charge obligatoire par grade (quota minimal)
       • Responsable d'examen DOIT être présent
       • Non-conflit horaire garanti
       • Nombre minimal d'enseignants par créneau
       • Fallback: Au moins 1 enseignant par examen
    
    2. RÈGLES DE PRÉFÉRENCE (Flexibles):
       • Vœux et disponibilités des enseignants
       • Équilibre temporel (éviter toujours mêmes créneaux)
       • Équilibre global de charge
    
    3. PRIORITÉ DES CONTRAINTES:
       1. Présence du responsable d'examen
       2. Nombre minimal par examen
       3. Quota obligatoire par grade
       4. Disponibilités et vœux
       5. Équilibre global
    
    4. SCORE D'OPTIMISATION:
       • Évaluation multi-critères de la solution
       • Maximisation de la satisfaction globale
       • Rapport détaillé des scores
    
    Paramètres:
        - min_surveillants_par_salle: Nombre minimum de surveillants par examen (défaut: 2)
        - allow_single_surveillant: Autoriser le fallback à 1 surveillant si nécessaire
    
    Retour:
        - success: Statut de la génération
        - nb_affectations: Nombre total d'affectations créées
        - temps_generation: Temps d'exécution en secondes
        - warnings: Liste des avertissements et informations
        - scores: Scores d'optimisation de la solution
    """
    try:
        optimizer = SurveillanceOptimizerV2(db)
        
        success, nb_affectations, temps_exec, messages, scores = optimizer.generer_planning_optimise(
            min_surveillants_par_examen=request.min_surveillants_par_salle,
            allow_fallback=request.allow_single_surveillant,
            respecter_voeux=True,
            equilibrer_temporel=True
        )
        
        if success:
            # Calculer le nombre de surveillances uniques (comme dans le dashboard)
            from sqlalchemy import func, distinct
            nb_surveillances_uniques = db.query(
                func.count(distinct(func.concat(
                    Affectation.enseignant_id, '-',
                    func.date(Examen.dateExam), '-',
                    Examen.h_debut
                )))
            ).join(Examen, Affectation.examen_id == Examen.id).scalar() or 0
            
            # Ajouter les scores aux messages
            messages_avec_scores = messages + [
                "\n🎯 === SCORES D'OPTIMISATION ===",
                f"   • Score global: {scores.get('score_global', 0):.1f}%",
                f"   • Respect des vœux: {scores.get('respect_voeux', 0):.1f}%",
                f"   • Équilibre global: {scores.get('equilibre_global', 0):.1f}%",
                f"   • Quotas respectés: {scores.get('quota_respecte', 0):.1f}%"
            ]
            
            return GenerationResponse(
                success=True,
                message=f"✅ Planning V2 généré avec succès en {temps_exec:.2f}s - {nb_surveillances_uniques} affectations créées - Score: {scores.get('score_global', 0):.1f}%",
                nb_affectations=nb_surveillances_uniques,
                temps_generation=temps_exec,
                warnings=messages_avec_scores
            )
        else:
            return GenerationResponse(
                success=False,
                message="❌ Échec de la génération du planning V2",
                nb_affectations=0,
                temps_generation=temps_exec,
                warnings=messages
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération V2: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


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
    
    4. SCORE D'OPTIMISATION:
       • Évaluation multi-critères de la solution
       • Maximisation de la satisfaction globale
       • Rapport détaillé des scores
    
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
        - scores: Scores d'optimisation de la solution
    """
    try:
        optimizer = SurveillanceOptimizerV3(db)
        
        success, nb_affectations, temps_exec, messages, scores = optimizer.generer_planning_optimise(
            min_surveillants_par_examen=request.min_surveillants_par_salle,
            allow_fallback=request.allow_single_surveillant,
            respecter_voeux=True,
            equilibrer_temporel=True,
            activer_regroupement_temporel=True,  # ✅ Activé par défaut pour le confort enseignants
            max_time_in_seconds=request.max_time_in_seconds,
            relative_gap_limit=request.relative_gap_limit
        )
        
        if success:
            # Calculer le nombre de surveillances uniques (comme dans le dashboard)
            from sqlalchemy import func, distinct
            nb_surveillances_uniques = db.query(
                func.count(distinct(func.concat(
                    Affectation.enseignant_id, '-',
                    func.date(Examen.dateExam), '-',
                    Examen.h_debut
                )))
            ).join(Examen, Affectation.examen_id == Examen.id).scalar() or 0
            
            # Ajouter les scores aux messages
            messages_avec_scores = messages + [
                "\n🎯 === SCORES D'OPTIMISATION V3 ===",
                f"   • Score global: {scores.get('score_global', 0):.1f}%",
                f"   • Respect des vœux: {scores.get('respect_voeux', 0):.1f}%",
                f"   • Équilibre global: {scores.get('equilibre_global', 0):.1f}%",
                f"   • Quotas respectés: {scores.get('quota_respecte', 0):.1f}%"
            ]
            
            return GenerationResponse(
                success=True,
                message=f"✅ Planning V3 généré avec succès en {temps_exec:.2f}s - {nb_surveillances_uniques} affectations créées - Score: {scores.get('score_global', 0):.1f}%",
                nb_affectations=nb_surveillances_uniques,
                temps_generation=temps_exec,
                warnings=messages_avec_scores
            )
        else:
            return GenerationResponse(
                success=False,
                message="❌ Échec de la génération du planning V3",
                nb_affectations=0,
                temps_generation=temps_exec,
                warnings=messages
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération V3: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.delete("/reinitialiser")
def reinitialiser_planning(db: Session = Depends(get_db)):
    """Supprime toutes les affectations actuelles"""
    from models.models import Affectation
    
    try:
        count = db.query(Affectation).delete()
        db.commit()
        
        return {
            "success": True,
            "message": f"{count} affectations supprimées",
            "nb_supprimes": count
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
        nb_surveillants = db.query(Affectation).filter(
            Affectation.examen_id == examen.id
        ).count()
        
        if nb_surveillants == 0:
            problemes.append({
                "type": "couverture",
                "severite": "critique",
                "message": f"Examen {examen.id} ({examen.date_examen}): AUCUN surveillant"
            })
        elif nb_surveillants == 1:
            avertissements.append({
                "type": "couverture",
                "severite": "attention",
                "message": f"Examen {examen.id} ({examen.date_examen}): 1 seul surveillant"
            })
    
    # 2. Vérifier le respect des vœux
    affectations = db.query(Affectation).all()
    for aff in affectations:
        examen = aff.examen
        seance = "Matin" if examen.heure_debut.hour < 13 else "Après-midi"
        
        voeu = db.query(Voeu).filter(
            Voeu.enseignant_id == aff.enseignant_id,
            Voeu.date_indisponible == examen.date_examen,
            Voeu.seance_indisponible == seance
        ).first()
        
        if voeu:
            problemes.append({
                "type": "voeu",
                "severite": "critique",
                "message": f"Enseignant {aff.enseignant_id} affecté malgré un vœu de non-disponibilité"
            })
    
    # 3. Vérifier les chevauchements
    enseignants = db.query(Enseignant).all()
    for ens in enseignants:
        affectations_ens = db.query(Affectation).filter(
            Affectation.enseignant_id == ens.id
        ).join(Examen).order_by(Examen.date_examen, Examen.heure_debut).all()
        
        for i in range(len(affectations_ens) - 1):
            aff1 = affectations_ens[i]
            aff2 = affectations_ens[i + 1]
            
            # Même date et heure
            if (aff1.examen.date_examen == aff2.examen.date_examen and
                aff1.examen.heure_debut == aff2.examen.heure_debut):
                problemes.append({
                    "type": "chevauchement",
                    "severite": "critique",
                    "message": f"Enseignant {ens.id} affecté à 2 examens simultanés"
                })
    
    return {
        "valide": len(problemes) == 0,
        "nb_problemes": len(problemes),
        "nb_avertissements": len(avertissements),
        "problemes": problemes,
        "avertissements": avertissements
    }
