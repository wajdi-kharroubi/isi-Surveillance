from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_
from database import get_db
from models.models import (
    SessionArchive,
    Examen,
    Affectation,
    Enseignant,
    GenerationStatistique,
    Voeu,
    Presence,
    GradeConfig,
    SouhaitViole,
    ResponsableAbsent,
    DepassementMaxJour,
)
from models.schemas import (
    SessionArchiveCreate,
    SessionArchiveResponse,
    SessionArchiveDetail,
    SessionArchiveListItem,
)
from typing import List, Optional
from datetime import datetime, date
import json
import logging

router = APIRouter(prefix="/archives", tags=["Archives"])
logger = logging.getLogger(__name__)


def _serialize_time(obj):
    """Convertit les objets time en string pour JSON"""
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)


def _serialize_date(obj):
    """Convertit les objets date en string pour JSON"""
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)


def _create_snapshot_examens(db: Session, semestre: str, session: str, date_debut: date, date_fin: date) -> str:
    """Crée un snapshot JSON des examens pour la période donnée"""
    examens = (
        db.query(Examen)
        .filter(
            Examen.semestre == semestre,
            Examen.session == session,
            Examen.dateExam >= date_debut,
            Examen.dateExam <= date_fin,
        )
        .all()
    )
    
    examens_data = []
    for examen in examens:
        examens_data.append({
            "id": examen.id,
            "dateExam": _serialize_date(examen.dateExam),
            "h_debut": _serialize_time(examen.h_debut),
            "h_fin": _serialize_time(examen.h_fin),
            "session": examen.session,
            "type_ex": examen.type_ex,
            "semestre": examen.semestre,
            "enseignant": examen.enseignant,
            "cod_salle": examen.cod_salle,
        })
    
    return json.dumps(examens_data, ensure_ascii=False)


def _create_snapshot_affectations(db: Session, semestre: str, session: str, date_debut: date, date_fin: date) -> str:
    """Crée un snapshot JSON des affectations pour la période donnée"""
    affectations = (
        db.query(Affectation)
        .join(Examen, Affectation.examen_id == Examen.id)
        .join(Enseignant, Affectation.enseignant_id == Enseignant.id)
        .filter(
            Examen.semestre == semestre,
            Examen.session == session,
            Examen.dateExam >= date_debut,
            Examen.dateExam <= date_fin,
        )
        .all()
    )
    
    affectations_data = []
    for aff in affectations:
        affectations_data.append({
            "id": aff.id,
            "examen_id": aff.examen_id,
            "enseignant_id": aff.enseignant_id,
            "enseignant_nom": aff.enseignant.nom,
            "enseignant_prenom": aff.enseignant.prenom,
            "enseignant_code_smartex": aff.enseignant.code_smartex,
            "cod_salle": aff.cod_salle,
            "est_responsable": aff.est_responsable,
            "date_exam": _serialize_date(aff.examen.dateExam),
            "h_debut": _serialize_time(aff.examen.h_debut),
            "h_fin": _serialize_time(aff.examen.h_fin),
        })
    
    return json.dumps(affectations_data, ensure_ascii=False)


def _create_snapshot_enseignants(db: Session, semestre: str, session: str, date_debut: date, date_fin: date) -> str:
    """Crée un snapshot JSON des enseignants ayant participé"""
    enseignants = (
        db.query(Enseignant)
        .join(Affectation, Affectation.enseignant_id == Enseignant.id)
        .join(Examen, Affectation.examen_id == Examen.id)
        .filter(
            Examen.semestre == semestre,
            Examen.session == session,
            Examen.dateExam >= date_debut,
            Examen.dateExam <= date_fin,
        )
        .distinct()
        .all()
    )
    
    enseignants_data = []
    for ens in enseignants:
        enseignants_data.append({
            "id": ens.id,
            "nom": ens.nom,
            "prenom": ens.prenom,
            "email": ens.email,
            "grade": ens.grade,
            "grade_code": ens.grade_code,
            "code_smartex": ens.code_smartex,
            "abrv_ens": ens.abrv_ens,
            "nombre_max": ens.nombre_max,
            "participe_surveillance": ens.participe_surveillance,
            "is_Exception": ens.is_Exception,
            "quota_Exception": ens.quota_Exception,
        })
    
    return json.dumps(enseignants_data, ensure_ascii=False)


def _create_snapshot_voeux(db: Session, semestre: str, session: str, date_debut: date, date_fin: date) -> str:
    """Crée un snapshot JSON des vœux des enseignants ayant participé"""
    # Récupérer les IDs des enseignants ayant participé
    enseignants_ids = (
        db.query(Enseignant.id)
        .join(Affectation, Affectation.enseignant_id == Enseignant.id)
        .join(Examen, Affectation.examen_id == Examen.id)
        .filter(
            Examen.semestre == semestre,
            Examen.session == session,
            Examen.dateExam >= date_debut,
            Examen.dateExam <= date_fin,
        )
        .distinct()
    ).subquery()
    
    # Récupérer tous les vœux de ces enseignants
    voeux = (
        db.query(Voeu)
        .join(Enseignant, Voeu.enseignant_id == Enseignant.id)
        .filter(Voeu.enseignant_id.in_(enseignants_ids))
        .all()
    )
    
    voeux_data = []
    for voeu in voeux:
        voeux_data.append({
            "id": voeu.id,
            "enseignant_id": voeu.enseignant_id,
            "enseignant_nom": voeu.enseignant.nom,
            "enseignant_prenom": voeu.enseignant.prenom,
            "enseignant_code_smartex": voeu.enseignant.code_smartex,
            "code_smartex_ens": voeu.code_smartex_ens,
            "semestre_code_libelle": voeu.semestre_code_libelle,
            "session_libelle": voeu.session_libelle,
            "seance": voeu.seance,
            "jour": voeu.jour,
            "date_voeu": _serialize_date(voeu.date_voeu) if voeu.date_voeu else None,
            "motif": voeu.motif,
        })
    
    return json.dumps(voeux_data, ensure_ascii=False)


def _create_snapshot_presences(db: Session, semestre: str, session: str, date_debut: date, date_fin: date) -> str:
    """Crée un snapshot JSON des présences/absences"""
    presences = (
        db.query(Presence)
        .join(Enseignant, Presence.enseignant_id == Enseignant.id)
        .filter(
            Presence.semestre == semestre,
            Presence.session == session,
            Presence.date_exam >= date_debut,
            Presence.date_exam <= date_fin,
        )
        .all()
    )
    
    presences_data = []
    for pres in presences:
        presences_data.append({
            "id": pres.id,
            "enseignant_id": pres.enseignant_id,
            "enseignant_nom": pres.enseignant.nom,
            "enseignant_prenom": pres.enseignant.prenom,
            "date_exam": _serialize_date(pres.date_exam),
            "h_debut": _serialize_time(pres.h_debut),
            "h_fin": _serialize_time(pres.h_fin),
            "semestre": pres.semestre,
            "session": pres.session,
            "present": pres.present,
            "salle_affectee": pres.salle_affectee,
        })
    
    return json.dumps(presences_data, ensure_ascii=False)


def _create_snapshot_quotas_grades(db: Session) -> str:
    """Crée un snapshot JSON des quotas par grade"""
    quotas = db.query(GradeConfig).all()
    
    quotas_data = []
    for quota in quotas:
        quotas_data.append({
            "id": quota.id,
            "grade_code": quota.grade_code,
            "grade_nom": quota.grade_nom,
            "nb_surveillances": quota.nb_surveillances,
        })
    
    return json.dumps(quotas_data, ensure_ascii=False)


def _create_snapshot_exceptions(db: Session, generation_id: int) -> str:
    """Crée un snapshot JSON des exceptions (souhaits violés, responsables absents, dépassements)"""
    if not generation_id:
        return json.dumps({"souhaits_violes": [], "responsables_absents": [], "depassements": []}, ensure_ascii=False)
    
    # Souhaits violés
    souhaits_violes = db.query(SouhaitViole).filter(
        SouhaitViole.generation_statistique_id == generation_id
    ).all()
    
    souhaits_data = []
    for sv in souhaits_violes:
        souhaits_data.append({
            "id": sv.id,
            "enseignant_id": sv.enseignant_id,
            "enseignant_nom": sv.enseignant_nom,
            "enseignant_prenom": sv.enseignant_prenom,
            "code_smartex": sv.code_smartex,
            "date_exam": _serialize_date(sv.date_exam),
            "seance": sv.seance,
            "jour": sv.jour,
        })
    
    # Responsables absents
    responsables_absents = db.query(ResponsableAbsent).filter(
        ResponsableAbsent.generation_statistique_id == generation_id
    ).all()
    
    responsables_data = []
    for ra in responsables_absents:
        responsables_data.append({
            "id": ra.id,
            "enseignant_id": ra.enseignant_id,
            "enseignant_nom": ra.enseignant_nom,
            "enseignant_prenom": ra.enseignant_prenom,
            "code_smartex": ra.code_smartex,
            "date_exam": _serialize_date(ra.date_exam),
            "seance": ra.seance,
            "nb_examens": ra.nb_examens,
            "raison": ra.raison,
        })
    
    # Dépassements
    depassements = db.query(DepassementMaxJour).filter(
        DepassementMaxJour.generation_statistique_id == generation_id
    ).all()
    
    depassements_data = []
    for dp in depassements:
        depassements_data.append({
            "id": dp.id,
            "enseignant_id": dp.enseignant_id,
            "enseignant_nom": dp.enseignant_nom,
            "enseignant_prenom": dp.enseignant_prenom,
            "code_smartex": dp.code_smartex,
            "date_exam": _serialize_date(dp.date_exam),
            "nb_seances": dp.nb_seances,
            "max_autorise": dp.max_autorise,
            "depassement": dp.depassement,
            "seances": dp.seances,
        })
    
    exceptions_data = {
        "souhaits_violes": souhaits_data,
        "responsables_absents": responsables_data,
        "depassements": depassements_data,
    }
    
    return json.dumps(exceptions_data, ensure_ascii=False)


def _create_snapshot_generation_statistique(db: Session, generation_id: int) -> str:
    """Crée un snapshot JSON complet de la génération statistique"""
    if not generation_id:
        return json.dumps({}, ensure_ascii=False)
    
    generation = db.query(GenerationStatistique).filter(
        GenerationStatistique.id == generation_id
    ).first()
    
    if not generation:
        return json.dumps({}, ensure_ascii=False)
    
    generation_data = {
        "id": generation.id,
        "date_generation": generation.date_generation.isoformat() if generation.date_generation else None,
        "nb_affectations": generation.nb_affectations,
        "temps_generation": generation.temps_generation,
        # Statistiques des souhaits
        "nb_souhaits_total": generation.nb_souhaits_total,
        "nb_souhaits_respectes": generation.nb_souhaits_respectes,
        "nb_souhaits_violes": generation.nb_souhaits_violes,
        "taux_souhaits_respectes": generation.taux_souhaits_respectes,
        # Statistiques des responsables
        "nb_responsables_total": generation.nb_responsables_total,
        "nb_responsables_presents": generation.nb_responsables_presents,
        "nb_responsables_absents": generation.nb_responsables_absents,
        "nb_responsables_non_participants": generation.nb_responsables_non_participants,
        "taux_responsables_presents": generation.taux_responsables_presents,
        # Statistiques des contraintes de séances
        "nb_contraintes_seances_total": generation.nb_contraintes_seances_total,
        "nb_contraintes_seances_respectees": generation.nb_contraintes_seances_respectees,
        "nb_contraintes_seances_violees": generation.nb_contraintes_seances_violees,
        "taux_contraintes_seances_respectees": generation.taux_contraintes_seances_respectees,
    }
    
    return json.dumps(generation_data, ensure_ascii=False)


@router.post("/archiver-session", response_model=SessionArchiveResponse)
async def archiver_session(
    archive_data: SessionArchiveCreate,
    db: Session = Depends(get_db),
):
    """
    Archive automatiquement une session validée.
    Crée un snapshot complet des examens, affectations et enseignants.
    """
    try:
        # Vérifier qu'il existe des données pour cette session
        nb_examens = (
            db.query(func.count(Examen.id))
            .filter(
                Examen.semestre == archive_data.semestre,
                Examen.session == archive_data.session,
                Examen.dateExam >= archive_data.date_debut,
                Examen.dateExam <= archive_data.date_fin,
            )
            .scalar()
        )
        
        if nb_examens == 0:
            raise HTTPException(
                status_code=404,
                detail="Aucun examen trouvé pour cette session dans la période spécifiée"
            )
        
        # Compter les affectations (séances uniques par enseignant)
        # Une séance = même date, même heure de début pour un enseignant
        nb_affectations = (
            db.query(
                func.count(
                    func.distinct(
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
            .filter(
                Examen.semestre == archive_data.semestre,
                Examen.session == archive_data.session,
                Examen.dateExam >= archive_data.date_debut,
                Examen.dateExam <= archive_data.date_fin,
            )
            .scalar()
            or 0
        )
        
        # Compter les enseignants distincts
        nb_enseignants = (
            db.query(func.count(func.distinct(Affectation.enseignant_id)))
            .join(Examen, Affectation.examen_id == Examen.id)
            .filter(
                Examen.semestre == archive_data.semestre,
                Examen.session == archive_data.session,
                Examen.dateExam >= archive_data.date_debut,
                Examen.dateExam <= archive_data.date_fin,
            )
            .scalar()
        )
        
        # Compter les vœux des enseignants participants
        enseignants_ids_subquery = (
            db.query(Enseignant.id)
            .join(Affectation, Affectation.enseignant_id == Enseignant.id)
            .join(Examen, Affectation.examen_id == Examen.id)
            .filter(
                Examen.semestre == archive_data.semestre,
                Examen.session == archive_data.session,
                Examen.dateExam >= archive_data.date_debut,
                Examen.dateExam <= archive_data.date_fin,
            )
            .distinct()
        ).subquery()
        
        nb_voeux = (
            db.query(func.count(Voeu.id))
            .filter(Voeu.enseignant_id.in_(enseignants_ids_subquery))
            .scalar()
            or 0
        )
        
        # Créer les snapshots
        snapshot_examens = _create_snapshot_examens(
            db, archive_data.semestre, archive_data.session, 
            archive_data.date_debut, archive_data.date_fin
        )
        
        snapshot_affectations = _create_snapshot_affectations(
            db, archive_data.semestre, archive_data.session,
            archive_data.date_debut, archive_data.date_fin
        )
        
        snapshot_enseignants = _create_snapshot_enseignants(
            db, archive_data.semestre, archive_data.session,
            archive_data.date_debut, archive_data.date_fin
        )
        
        snapshot_voeux = _create_snapshot_voeux(
            db, archive_data.semestre, archive_data.session,
            archive_data.date_debut, archive_data.date_fin
        )
        
        snapshot_presences = _create_snapshot_presences(
            db, archive_data.semestre, archive_data.session,
            archive_data.date_debut, archive_data.date_fin
        )
        
        snapshot_quotas_grades = _create_snapshot_quotas_grades(db)
        
        # Récupérer la dernière génération statistique si disponible
        derniere_generation = (
            db.query(GenerationStatistique)
            .order_by(desc(GenerationStatistique.date_generation))
            .first()
        )
        
        snapshot_exceptions = _create_snapshot_exceptions(
            db, derniere_generation.id if derniere_generation else None
        )
        
        snapshot_generation_statistique = _create_snapshot_generation_statistique(
            db, derniere_generation.id if derniere_generation else None
        )
        
        # Créer l'archive
        nouvelle_archive = SessionArchive(
            nom_session=archive_data.nom_session,
            semestre=archive_data.semestre,
            session=archive_data.session,
            annee_universitaire=archive_data.annee_universitaire,
            date_debut=archive_data.date_debut,
            date_fin=archive_data.date_fin,
            date_validation=datetime.utcnow(),
            nb_examens=nb_examens,
            nb_affectations=nb_affectations,
            nb_enseignants=nb_enseignants,
            nb_voeux=nb_voeux,
            snapshot_examens=snapshot_examens,
            snapshot_affectations=snapshot_affectations,
            snapshot_enseignants=snapshot_enseignants,
            snapshot_voeux=snapshot_voeux,
            snapshot_presences=snapshot_presences,
            snapshot_quotas_grades=snapshot_quotas_grades,
            snapshot_exceptions=snapshot_exceptions,
            snapshot_generation_statistique=snapshot_generation_statistique,
            generation_statistique_id=derniere_generation.id if derniere_generation else None,
            commentaire=archive_data.commentaire,
            archive_par=archive_data.archive_par,
        )
        
        db.add(nouvelle_archive)
        db.commit()
        db.refresh(nouvelle_archive)
        
        logger.info(f"Session archivée avec succès: {nouvelle_archive.nom_session} (ID: {nouvelle_archive.id})")
        
        return nouvelle_archive
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de l'archivage de la session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'archivage: {str(e)}"
        )


@router.get("/sessions", response_model=List[SessionArchiveListItem])
async def lister_archives(
    annee_universitaire: Optional[str] = Query(None, description="Filtrer par année universitaire"),
    semestre: Optional[str] = Query(None, description="Filtrer par semestre"),
    session: Optional[str] = Query(None, description="Filtrer par session"),
    limit: int = Query(50, ge=1, le=200, description="Nombre maximum de résultats"),
    offset: int = Query(0, ge=0, description="Décalage pour la pagination"),
    db: Session = Depends(get_db),
):
    """
    Liste toutes les sessions archivées avec filtres optionnels.
    Retourne une version allégée sans les snapshots JSON.
    """
    try:
        query = db.query(SessionArchive)
        
        # Appliquer les filtres
        if annee_universitaire:
            query = query.filter(SessionArchive.annee_universitaire == annee_universitaire)
        if semestre:
            query = query.filter(SessionArchive.semestre == semestre)
        if session:
            query = query.filter(SessionArchive.session == session)
        
        # Trier par date d'archivage décroissante
        query = query.order_by(desc(SessionArchive.date_archivage))
        
        # Pagination
        archives = query.offset(offset).limit(limit).all()
        
        return archives
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des archives: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des archives: {str(e)}"
        )


@router.get("/sessions/{archive_id}", response_model=SessionArchiveDetail)
async def obtenir_archive_detail(
    archive_id: int,
    db: Session = Depends(get_db),
):
    """
    Récupère les détails complets d'une archive, incluant les snapshots JSON.
    """
    try:
        archive = db.query(SessionArchive).filter(SessionArchive.id == archive_id).first()
        
        if not archive:
            raise HTTPException(
                status_code=404,
                detail=f"Archive avec l'ID {archive_id} non trouvée"
            )
        
        return archive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'archive {archive_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération de l'archive: {str(e)}"
        )


@router.post("/sessions/{archive_id}/restaurer")
async def restaurer_archive(
    archive_id: int,
    db: Session = Depends(get_db),
):
    """
    Restaure une session archivée dans le système actuel.
    ATTENTION : Supprime toutes les données existantes avant de restaurer l'archive.
    """
    try:
        # Récupérer l'archive
        archive = db.query(SessionArchive).filter(SessionArchive.id == archive_id).first()
        
        if not archive:
            raise HTTPException(
                status_code=404,
                detail=f"Archive avec l'ID {archive_id} non trouvée"
            )
        
        # ÉTAPE 1 : Vider complètement le système
        logger.info("Suppression de toutes les données existantes...")
        
        # Supprimer dans l'ordre des dépendances
        # 1. Supprimer les exceptions (dépendent de GenerationStatistique)
        db.query(SouhaitViole).delete()
        db.query(ResponsableAbsent).delete()
        db.query(DepassementMaxJour).delete()
        
        # 2. Supprimer les générations statistiques
        db.query(GenerationStatistique).delete()
        
        # 3. Supprimer les présences
        db.query(Presence).delete()
        
        # 4. Supprimer les vœux
        db.query(Voeu).delete()
        
        # 5. Supprimer les affectations (dépendent d'examens et enseignants)
        db.query(Affectation).delete()
        
        # 6. Supprimer les examens
        db.query(Examen).delete()
        
        # 7. Supprimer les enseignants
        db.query(Enseignant).delete()
        
        # 8. Supprimer les quotas de grades
        db.query(GradeConfig).delete()
        
        db.commit()
        logger.info("Toutes les données ont été supprimées avec succès")
        
        # ÉTAPE 2 : Parser les snapshots JSON
        examens_data = json.loads(archive.snapshot_examens)
        affectations_data = json.loads(archive.snapshot_affectations)
        enseignants_data = json.loads(archive.snapshot_enseignants)
        
        # ÉTAPE 3 : Restaurer les enseignants
        enseignants_map = {}  # ancien_id -> nouvel_id
        nb_enseignants_ajoutes = 0
        
        for ens_data in enseignants_data:
            # Créer l'enseignant (la base est vide maintenant)
            nouvel_enseignant = Enseignant(
                nom=ens_data['nom'],
                prenom=ens_data['prenom'],
                email=ens_data['email'],
                grade=ens_data['grade'],
                grade_code=ens_data['grade_code'],
                code_smartex=ens_data['code_smartex'],
                abrv_ens=ens_data['abrv_ens'],
                nombre_max=ens_data['nombre_max'],
                participe_surveillance=ens_data.get('participe_surveillance', True),
                is_Exception=ens_data.get('is_Exception', False),
                quota_Exception=ens_data.get('quota_Exception'),
            )
            db.add(nouvel_enseignant)
            db.flush()  # Pour obtenir l'ID
            enseignants_map[ens_data['id']] = nouvel_enseignant.id
            nb_enseignants_ajoutes += 1
        
        # ÉTAPE 4 : Restaurer les examens
        examens_map = {}  # ancien_id -> nouvel_id
        
        for exam_data in examens_data:
            from datetime import datetime as dt, time as time_module
            
            # Convertir les dates et heures
            date_exam = dt.fromisoformat(exam_data['dateExam']).date()
            
            # Parser les heures au format HH:MM:SS
            if isinstance(exam_data['h_debut'], str):
                h_parts = exam_data['h_debut'].split(':')
                h_debut = time_module(int(h_parts[0]), int(h_parts[1]), int(h_parts[2]) if len(h_parts) > 2 else 0)
            else:
                h_debut = exam_data['h_debut']
                
            if isinstance(exam_data['h_fin'], str):
                h_parts = exam_data['h_fin'].split(':')
                h_fin = time_module(int(h_parts[0]), int(h_parts[1]), int(h_parts[2]) if len(h_parts) > 2 else 0)
            else:
                h_fin = exam_data['h_fin']
            
            nouvel_examen = Examen(
                dateExam=date_exam,
                h_debut=h_debut,
                h_fin=h_fin,
                session=exam_data['session'],
                type_ex=exam_data['type_ex'],
                semestre=exam_data['semestre'],
                enseignant=exam_data['enseignant'],
                cod_salle=exam_data['cod_salle'],
            )
            db.add(nouvel_examen)
            db.flush()  # Pour obtenir l'ID
            examens_map[exam_data['id']] = nouvel_examen.id
        
        # Restaurer les affectations
        nb_affectations_ajoutees = 0
        
        for aff_data in affectations_data:
            nouvel_examen_id = examens_map.get(aff_data['examen_id'])
            nouvel_enseignant_id = enseignants_map.get(aff_data['enseignant_id'])
            
            if nouvel_examen_id and nouvel_enseignant_id:
                nouvelle_affectation = Affectation(
                    examen_id=nouvel_examen_id,
                    enseignant_id=nouvel_enseignant_id,
                    cod_salle=aff_data['cod_salle'],
                    est_responsable=aff_data['est_responsable'],
                )
                db.add(nouvelle_affectation)
                nb_affectations_ajoutees += 1
        
        # Restaurer les vœux si disponibles
        nb_voeux_ajoutes = 0
        if archive.snapshot_voeux:
            voeux_data = json.loads(archive.snapshot_voeux)
            
            for voeu_data in voeux_data:
                nouvel_enseignant_id = enseignants_map.get(voeu_data['enseignant_id'])
                
                if nouvel_enseignant_id:
                    from datetime import datetime as dt
                    date_voeu = dt.fromisoformat(voeu_data['date_voeu']).date() if voeu_data.get('date_voeu') else None
                    
                    nouveau_voeu = Voeu(
                        enseignant_id=nouvel_enseignant_id,
                        code_smartex_ens=voeu_data.get('code_smartex_ens'),
                        semestre_code_libelle=voeu_data.get('semestre_code_libelle'),
                        session_libelle=voeu_data.get('session_libelle'),
                        seance=voeu_data['seance'],
                        jour=voeu_data['jour'],
                        date_voeu=date_voeu,
                        motif=voeu_data.get('motif'),
                    )
                    db.add(nouveau_voeu)
                    nb_voeux_ajoutes += 1
        
        # Restaurer les présences si disponibles
        nb_presences_ajoutees = 0
        if archive.snapshot_presences:
            presences_data = json.loads(archive.snapshot_presences)
            
            for presence_data in presences_data:
                nouvel_enseignant_id = enseignants_map.get(presence_data['enseignant_id'])
                
                if nouvel_enseignant_id:
                    from datetime import datetime as dt, time as time_module
                    date_exam = dt.fromisoformat(presence_data['date_exam']).date()
                    
                    # Parser les heures
                    h_parts_debut = presence_data['h_debut'].split(':')
                    h_debut = time_module(int(h_parts_debut[0]), int(h_parts_debut[1]), int(h_parts_debut[2]) if len(h_parts_debut) > 2 else 0)
                    
                    h_parts_fin = presence_data['h_fin'].split(':')
                    h_fin = time_module(int(h_parts_fin[0]), int(h_parts_fin[1]), int(h_parts_fin[2]) if len(h_parts_fin) > 2 else 0)
                    
                    nouvelle_presence = Presence(
                        enseignant_id=nouvel_enseignant_id,
                        date_exam=date_exam,
                        h_debut=h_debut,
                        h_fin=h_fin,
                        session=presence_data['session'],
                        semestre=presence_data['semestre'],
                        present=presence_data['present'],
                        salle_affectee=presence_data.get('salle_affectee'),
                    )
                    db.add(nouvelle_presence)
                    nb_presences_ajoutees += 1
        
        # Restaurer les quotas des grades si disponibles
        nb_quotas_ajoutes = 0
        if archive.snapshot_quotas_grades:
            quotas_data = json.loads(archive.snapshot_quotas_grades)
            
            for quota_data in quotas_data:
                # Créer le quota (la base est vide maintenant)
                nouveau_quota = GradeConfig(
                    grade_code=quota_data['grade_code'],
                    grade_nom=quota_data['grade_nom'],
                    nb_surveillances=quota_data['nb_surveillances'],
                )
                db.add(nouveau_quota)
                nb_quotas_ajoutes += 1
        
        # Restaurer la génération statistique depuis le snapshot
        nb_exceptions_ajoutees = 0
        nouvelle_generation = None
        
        if archive.snapshot_generation_statistique:
            try:
                generation_data = json.loads(archive.snapshot_generation_statistique)
                
                if generation_data:
                    # Restaurer la génération statistique complète depuis le snapshot
                    from datetime import datetime as dt
                    
                    nouvelle_generation = GenerationStatistique(
                        date_generation=dt.fromisoformat(generation_data['date_generation']) if generation_data.get('date_generation') else datetime.utcnow(),
                        nb_affectations=generation_data['nb_affectations'],
                        temps_generation=generation_data['temps_generation'],
                        # Statistiques des souhaits
                        nb_souhaits_total=generation_data['nb_souhaits_total'],
                        nb_souhaits_respectes=generation_data['nb_souhaits_respectes'],
                        nb_souhaits_violes=generation_data['nb_souhaits_violes'],
                        taux_souhaits_respectes=generation_data['taux_souhaits_respectes'],
                        # Statistiques des responsables
                        nb_responsables_total=generation_data['nb_responsables_total'],
                        nb_responsables_presents=generation_data['nb_responsables_presents'],
                        nb_responsables_absents=generation_data['nb_responsables_absents'],
                        nb_responsables_non_participants=generation_data['nb_responsables_non_participants'],
                        taux_responsables_presents=generation_data['taux_responsables_presents'],
                        # Statistiques des contraintes de séances
                        nb_contraintes_seances_total=generation_data['nb_contraintes_seances_total'],
                        nb_contraintes_seances_respectees=generation_data['nb_contraintes_seances_respectees'],
                        nb_contraintes_seances_violees=generation_data['nb_contraintes_seances_violees'],
                        taux_contraintes_seances_respectees=generation_data['taux_contraintes_seances_respectees'],
                    )
                    db.add(nouvelle_generation)
                    db.flush()  # Pour obtenir l'ID
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Erreur lors du parsing du snapshot de génération: {e}")
                nouvelle_generation = None
        
        # Restaurer les exceptions si disponibles
        nb_exceptions_ajoutees = 0
        if archive.snapshot_exceptions and nouvelle_generation:
            exceptions_data = json.loads(archive.snapshot_exceptions)
            
            # Restaurer les souhaits violés
            if 'souhaits_violes' in exceptions_data:
                for sv_data in exceptions_data['souhaits_violes']:
                    nouvel_enseignant_id = enseignants_map.get(sv_data['enseignant_id'])
                    
                    if nouvel_enseignant_id:
                        from datetime import datetime as dt
                        date_exam = dt.fromisoformat(sv_data['date_exam']).date()
                        
                        nouveau_sv = SouhaitViole(
                            generation_statistique_id=nouvelle_generation.id,
                            enseignant_id=nouvel_enseignant_id,
                            enseignant_nom=sv_data['enseignant_nom'],
                            enseignant_prenom=sv_data['enseignant_prenom'],
                            code_smartex=sv_data['code_smartex'],
                            date_exam=date_exam,
                            seance=sv_data['seance'],
                            jour=sv_data['jour'],
                        )
                        db.add(nouveau_sv)
                        nb_exceptions_ajoutees += 1
            
            # Restaurer les responsables absents
            if 'responsables_absents' in exceptions_data:
                for ra_data in exceptions_data['responsables_absents']:
                    nouvel_enseignant_id = enseignants_map.get(ra_data['enseignant_id'])
                    
                    if nouvel_enseignant_id:
                        from datetime import datetime as dt
                        date_exam = dt.fromisoformat(ra_data['date_exam']).date()
                        
                        nouveau_ra = ResponsableAbsent(
                            generation_statistique_id=nouvelle_generation.id,
                            enseignant_id=nouvel_enseignant_id,
                            enseignant_nom=ra_data['enseignant_nom'],
                            enseignant_prenom=ra_data['enseignant_prenom'],
                            code_smartex=ra_data['code_smartex'],
                            date_exam=date_exam,
                            seance=ra_data['seance'],
                            nb_examens=ra_data['nb_examens'],
                            raison=ra_data.get('raison', 'autre'),
                        )
                        db.add(nouveau_ra)
                        nb_exceptions_ajoutees += 1
            
            # Restaurer les dépassements max jour
            if 'depassements' in exceptions_data:
                for dm_data in exceptions_data['depassements']:
                    nouvel_enseignant_id = enseignants_map.get(dm_data['enseignant_id'])
                    
                    if nouvel_enseignant_id:
                        from datetime import datetime as dt
                        date_exam = dt.fromisoformat(dm_data['date_exam']).date()
                        
                        nouveau_dm = DepassementMaxJour(
                            generation_statistique_id=nouvelle_generation.id,
                            enseignant_id=nouvel_enseignant_id,
                            enseignant_nom=dm_data['enseignant_nom'],
                            enseignant_prenom=dm_data['enseignant_prenom'],
                            code_smartex=dm_data['code_smartex'],
                            date_exam=date_exam,
                            nb_seances=dm_data['nb_seances'],
                            max_autorise=dm_data['max_autorise'],
                            depassement=dm_data['depassement'],
                            seances=dm_data['seances'],
                        )
                        db.add(nouveau_dm)
                        nb_exceptions_ajoutees += 1
        
        db.commit()
        
        logger.info(f"Archive restaurée: {archive.nom_session} (ID: {archive_id})")
        
        return {
            "success": True,
            "message": f"Archive '{archive.nom_session}' restaurée avec succès. Le système a été complètement réinitialisé avec les données archivées.",
            "details": {
                "nb_examens": len(examens_data),
                "nb_affectations": nb_affectations_ajoutees,
                "nb_enseignants_ajoutes": nb_enseignants_ajoutes,
                "nb_enseignants_total": len(enseignants_data),
                "nb_voeux": nb_voeux_ajoutes,
                "nb_presences": nb_presences_ajoutees,
                "nb_quotas": nb_quotas_ajoutes,
                "nb_exceptions": nb_exceptions_ajoutees,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la restauration de l'archive {archive_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la restauration: {str(e)}"
        )


@router.delete("/sessions/{archive_id}")
async def supprimer_archive(
    archive_id: int,
    db: Session = Depends(get_db),
):
    """
    Supprime une session archivée.
    À utiliser avec précaution car l'historique sera perdu.
    """
    try:
        archive = db.query(SessionArchive).filter(SessionArchive.id == archive_id).first()
        
        if not archive:
            raise HTTPException(
                status_code=404,
                detail=f"Archive avec l'ID {archive_id} non trouvée"
            )
        
        nom_session = archive.nom_session
        db.delete(archive)
        db.commit()
        
        logger.info(f"Archive supprimée: {nom_session} (ID: {archive_id})")
        
        return {
            "success": True,
            "message": f"Archive '{nom_session}' supprimée avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la suppression de l'archive {archive_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression: {str(e)}"
        )


@router.get("/annees-universitaires")
async def lister_annees_universitaires(
    db: Session = Depends(get_db),
):
    """
    Liste toutes les années universitaires disponibles dans les archives.
    """
    try:
        annees = (
            db.query(SessionArchive.annee_universitaire)
            .distinct()
            .order_by(desc(SessionArchive.annee_universitaire))
            .all()
        )
        
        return {"annees": [annee[0] for annee in annees]}
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des années universitaires: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des années: {str(e)}"
        )


@router.get("/statistiques")
async def obtenir_statistiques_archives(
    db: Session = Depends(get_db),
):
    """
    Retourne des statistiques globales sur les archives.
    """
    try:
        total_archives = db.query(func.count(SessionArchive.id)).scalar()
        total_examens = db.query(func.sum(SessionArchive.nb_examens)).scalar() or 0
        total_affectations = db.query(func.sum(SessionArchive.nb_affectations)).scalar() or 0
        
        # Archive la plus récente
        archive_recente = (
            db.query(SessionArchive)
            .order_by(desc(SessionArchive.date_archivage))
            .first()
        )
        
        # Archive la plus ancienne
        archive_ancienne = (
            db.query(SessionArchive)
            .order_by(SessionArchive.date_archivage)
            .first()
        )
        
        return {
            "total_archives": total_archives,
            "total_examens_archives": total_examens,
            "total_affectations_archivees": total_affectations,
            "archive_la_plus_recente": {
                "nom": archive_recente.nom_session if archive_recente else None,
                "date": archive_recente.date_archivage if archive_recente else None,
            } if archive_recente else None,
            "archive_la_plus_ancienne": {
                "nom": archive_ancienne.nom_session if archive_ancienne else None,
                "date": archive_ancienne.date_archivage if archive_ancienne else None,
            } if archive_ancienne else None,
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )
