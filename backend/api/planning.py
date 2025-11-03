from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models.models import Enseignant, Affectation, Examen, GradeConfig, Presence
from models.schemas import (
    AjouterEnseignantSeanceRequest,
    SupprimerEnseignantSeanceRequest,
    AjouterEnseignantParDateHeureRequest,
    ExchangeEnseignantsRequest,
    AffectationOperationResponse,
    PresenceMarkRequest,
    PresenceResponse,
)
from typing import List, Dict
from datetime import datetime

router = APIRouter(prefix="/planning", tags=["Planning"])


@router.get("/emploi-enseignant/{enseignant_id}")
def emploi_enseignant(enseignant_id: int, db: Session = Depends(get_db)):
    """
    Retourne l'emploi du temps de surveillance d'un enseignant (toutes ses séances de surveillance)
    Regroupe par séance pour éviter la duplication (un enseignant peut surveiller plusieurs salles de la même séance)
    """
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    affectations = (
        db.query(Affectation)
        .options(joinedload(Affectation.examen))
        .filter(Affectation.enseignant_id == enseignant_id)
        .all()
    )

    # Regrouper par séance (date + h_debut + h_fin + session + semestre)
    seances = {}
    for aff in affectations:
        ex = aff.examen
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)

        if key not in seances:
            seances[key] = {
                "date": ex.dateExam,
                "h_debut": ex.h_debut,
                "h_fin": ex.h_fin,
                "session": ex.session,
                "semestre": ex.semestre,
                "type": ex.type_ex,
                "est_responsable": aff.est_responsable,
                "salles": [],
            }

        # Ajouter la salle à la liste (optionnel, pour info)
        seances[key]["salles"].append(aff.cod_salle)

        # Si une affectation est responsable, marquer toute la séance comme responsable
        if aff.est_responsable:
            seances[key]["est_responsable"] = True

    # Convertir en liste
    result = []
    for key, seance in seances.items():
        # Joindre les salles pour information (optionnel)
        seance["salles"] = ", ".join(sorted(set(seance["salles"])))
        result.append(seance)

    # Récupérer la configuration du grade pour calculer le pourcentage de quota
    grade_config = (
        db.query(GradeConfig)
        .filter(GradeConfig.grade_code == enseignant.grade_code)
        .first()
    )

    # Utiliser quota_Exception si is_Exception est true, sinon utiliser le quota du grade
    if enseignant.is_Exception and enseignant.quota_Exception is not None:
        quota_max = enseignant.quota_Exception
    else:
        quota_max = grade_config.nb_surveillances if grade_config else 0

    nb_surveillances_affectees = len(result)
    pourcentage_quota = (
        round((nb_surveillances_affectees / quota_max * 100), 2) if quota_max > 0 else 0
    )

    return {
        "enseignant": {
            "id": enseignant.id,
            "nom": enseignant.nom,
            "prenom": enseignant.prenom,
            "grade": enseignant.grade_code,
            "quota_max": quota_max,
            "nb_surveillances_affectees": nb_surveillances_affectees,
            "pourcentage_quota": pourcentage_quota,
            "is_Exception": enseignant.is_Exception,
            "quota_Exception": enseignant.quota_Exception,
        },
        "emplois": result,
    }


@router.get("/emploi-seances")
def emploi_seances(db: Session = Depends(get_db)):
    """
    Retourne, pour chaque séance (date + h_debut + h_fin + session + semestre), le nombre d'enseignants UNIQUES affectés
    ainsi que la liste détaillée des enseignants
    """
    examens = db.query(Examen).all()
    seances = {}
    for ex in examens:
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key not in seances:
            seances[key] = {"examens": [], "enseignants": {}}
        seances[key]["examens"].append(
            {"id": ex.id, "salle": ex.cod_salle, "type": ex.type_ex}
        )

    # Récupérer les enseignants UNIQUES affectés par séance avec leurs informations
    affectations = (
        db.query(Affectation)
        .options(joinedload(Affectation.examen), joinedload(Affectation.enseignant))
        .all()
    )

    for aff in affectations:
        ex = aff.examen
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key in seances:
            # Utiliser un dictionnaire pour éviter les doublons d'enseignants
            # et garder l'information si l'enseignant est responsable
            if aff.enseignant_id not in seances[key]["enseignants"]:
                seances[key]["enseignants"][aff.enseignant_id] = {
                    "id": aff.enseignant_id,
                    "nom": aff.enseignant.nom,
                    "prenom": aff.enseignant.prenom,
                    "est_responsable": aff.est_responsable,
                }
            elif aff.est_responsable:
                # Si l'enseignant existe déjà mais cette affectation est responsable, mettre à jour
                seances[key]["enseignants"][aff.enseignant_id]["est_responsable"] = True

    # Mise en forme
    result = []
    for (date, h_debut, h_fin, session, semestre), val in seances.items():
        # Convertir le dictionnaire d'enseignants en liste
        enseignants_list = list(val["enseignants"].values())

        result.append(
            {
                "date": date,
                "h_debut": h_debut,
                "h_fin": h_fin,
                "session": session,
                "semestre": semestre,
                "examens": val["examens"],
                "nb_examens": len(val["examens"]),
                "nb_enseignants": len(enseignants_list),
                "enseignants": enseignants_list,
            }
        )
    return result


@router.get("/absences/seances")
def absences_seances(db: Session = Depends(get_db)):
    """Retourne les séances avec la liste des enseignants et l'état de présence si enregistré."""
    examens = db.query(Examen).all()
    seances = {}
    for ex in examens:
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key not in seances:
            seances[key] = {"examens": [], "enseignants": {}}
        seances[key]["examens"].append(
            {"id": ex.id, "salle": ex.cod_salle, "type": ex.type_ex}
        )

    # Récupérer les affectations pour construire la liste des enseignants par séance
    affectations = (
        db.query(Affectation)
        .options(joinedload(Affectation.examen), joinedload(Affectation.enseignant))
        .all()
    )

    for aff in affectations:
        ex = aff.examen
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key in seances:
            if aff.enseignant_id not in seances[key]["enseignants"]:
                seances[key]["enseignants"][aff.enseignant_id] = {
                    "id": aff.enseignant_id,
                    "nom": aff.enseignant.nom,
                    "prenom": aff.enseignant.prenom,
                    "est_responsable": aff.est_responsable,
                    "present": None,
                }
            elif aff.est_responsable:
                seances[key]["enseignants"][aff.enseignant_id]["est_responsable"] = True

    # Récupérer les enregistrements de présence et les appliquer
    presences = db.query(Presence).all()
    presence_map = {}
    for p in presences:
        key = (p.date_exam, p.h_debut, p.h_fin, p.session, p.semestre, p.enseignant_id)
        presence_map[key] = p.present

    # Mise en forme
    result = []
    for (date, h_debut, h_fin, session, semestre), val in seances.items():
        enseignants_list = list(val["enseignants"].values())
        # Appliquer le statut de présence
        for ens in enseignants_list:
            pkey = (date, h_debut, h_fin, session, semestre, ens["id"])
            if pkey in presence_map:
                ens["present"] = presence_map[pkey]

        result.append(
            {
                "date": date,
                "h_debut": h_debut,
                "h_fin": h_fin,
                "session": session,
                "semestre": semestre,
                "examens": val["examens"],
                "nb_examens": len(val["examens"]),
                "nb_enseignants": len(enseignants_list),
                "enseignants": enseignants_list,
            }
        )

    return result


@router.post("/absences/mark", response_model=PresenceResponse)
def mark_presence(request: PresenceMarkRequest, db: Session = Depends(get_db)):
    """Marquer la présence/absence d'un enseignant pour une séance (upsert)."""
    # Vérifier enseignant
    enseignant = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    )
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    # Chercher enregistrement existant
    existing = (
        db.query(Presence)
        .filter(
            Presence.enseignant_id == request.enseignant_id,
            Presence.date_exam == request.date_exam,
            Presence.h_debut == request.h_debut,
            Presence.h_fin == request.h_fin,
            Presence.session == request.session,
            Presence.semestre == request.semestre,
        )
        .first()
    )

    if existing:
        existing.present = request.present
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    # Sinon créer
    p = Presence(
        enseignant_id=request.enseignant_id,
        date_exam=request.date_exam,
        h_debut=request.h_debut,
        h_fin=request.h_fin,
        session=request.session,
        semestre=request.semestre,
        present=request.present,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    return p


@router.get("/absences/stats")
def absences_stats(db: Session = Depends(get_db)):
    """Calcul rapide de statistiques d'absences: totals et pourcentage par séance et global."""
    presences = db.query(Presence).all()
    stats_by_seance = {}
    total_present = 0
    total_absent = 0

    for p in presences:
        key = (p.date_exam, p.h_debut, p.h_fin, p.session, p.semestre)
        if key not in stats_by_seance:
            stats_by_seance[key] = {"present": 0, "absent": 0}
        if p.present:
            stats_by_seance[key]["present"] += 1
            total_present += 1
        else:
            stats_by_seance[key]["absent"] += 1
            total_absent += 1

    seances = []
    for (date, h_debut, h_fin, session, semestre), counts in stats_by_seance.items():
        total = counts["present"] + counts["absent"]
        taux_presence = (
            round((counts["present"] / total * 100), 2) if total > 0 else None
        )
        seances.append(
            {
                "date": date,
                "h_debut": h_debut,
                "h_fin": h_fin,
                "session": session,
                "semestre": semestre,
                "present": counts["present"],
                "absent": counts["absent"],
                "taux_presence": taux_presence,
            }
        )

    global_total = total_present + total_absent
    global_taux = (
        round((total_present / global_total * 100), 2) if global_total > 0 else None
    )

    return {
        "total_present": total_present,
        "total_absent": total_absent,
        "global_taux_presence": global_taux,
        "seances": seances,
    }


@router.get("/absences/export-excel")
def export_absences_excel(db: Session = Depends(get_db)):
    """Exporte les statistiques d'absences par enseignant au format Excel."""
    import pandas as pd
    import os
    from config import EXPORT_DIR
    from fastapi.responses import FileResponse

    # Récupérer tous les enseignants
    enseignants = db.query(Enseignant).all()

    # Calculer les absences par enseignant
    rows = []
    for enseignant in enseignants:
        presences = (
            db.query(Presence).filter(Presence.enseignant_id == enseignant.id).all()
        )

        total_seances = len(presences)
        absences = sum(1 for p in presences if not p.present)
        presences_count = sum(1 for p in presences if p.present)
        taux_presence = (
            round((presences_count / total_seances * 100), 2)
            if total_seances > 0
            else 0
        )

        rows.append(
            {
                "Nom": enseignant.nom,
                "Prénom": enseignant.prenom,
                "Grade": enseignant.grade_code or "",
                "Code": enseignant.code_smartex or "",
                "Total Séances": total_seances,
                "Présences": presences_count,
                "Absences": absences,
                "Taux de Présence (%)": taux_presence,
            }
        )

    # Créer le DataFrame
    df = pd.DataFrame(rows)

    # Trier par nombre d'absences décroissant
    df = df.sort_values("Absences", ascending=False)

    # Générer le fichier Excel
    filename = f"absences_enseignants_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(EXPORT_DIR, filename)

    # Sauvegarder en Excel avec mise en forme
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Absences", index=False)

        # Récupérer la feuille pour la mise en forme
        worksheet = writer.sheets["Absences"]

        # Ajuster la largeur des colonnes
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width

        # Formater l'en-tête
        from openpyxl.styles import Font, PatternFill, Alignment

        header_fill = PatternFill(
            start_color="1F4E78", end_color="1F4E78", fill_type="solid"
        )
        header_font = Font(bold=True, color="FFFFFF")

        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

    # Retourner le fichier
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.post("/ajouter-enseignant-seance", response_model=AffectationOperationResponse)
def ajouter_enseignant_seance(
    request: AjouterEnseignantSeanceRequest, db: Session = Depends(get_db)
):
    """
    Ajoute un enseignant à une séance spécifique.
    L'enseignant sera affecté à tous les examens de cette séance.
    """
    # Vérifier que l'enseignant existe
    enseignant = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    )
    if not enseignant:
        raise HTTPException(
            status_code=404,
            detail=f"Enseignant avec ID {request.enseignant_id} introuvable",
        )

    # Vérifier que l'enseignant participe aux surveillances
    if not enseignant.participe_surveillance:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} ne participe pas aux surveillances",
        )

    # Récupérer tous les examens de la séance
    examens_seance = (
        db.query(Examen)
        .filter(
            Examen.dateExam == request.date_examen,
            Examen.h_debut == request.h_debut,
            Examen.h_fin == request.h_fin,
            Examen.session == request.session,
            Examen.semestre == request.semestre,
        )
        .all()
    )

    if not examens_seance:
        raise HTTPException(
            status_code=404, detail="Aucun examen trouvé pour cette séance"
        )

    # Vérifier si l'enseignant est déjà affecté à cette séance
    affectations_existantes = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance]),
        )
        .all()
    )

    if affectations_existantes:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} est déjà affecté à cette séance",
        )

    # Vérifier si l'enseignant est responsable d'un examen dans cette séance
    # On compare le code_smartex de l'enseignant avec le champ 'enseignant' des examens de la séance
    # (le champ 'enseignant' contient le code_smartex du responsable de l'examen)
    est_responsable_examen = False
    for examen in examens_seance:
        if examen.enseignant == enseignant.code_smartex:
            est_responsable_examen = True
            break

    doit_etre_responsable = est_responsable_examen

    # Ajouter l'enseignant à tous les examens de la séance
    nb_affectations = 0
    for examen in examens_seance:
        affectation = Affectation(
            examen_id=examen.id,
            enseignant_id=request.enseignant_id,
            cod_salle=examen.cod_salle,
            est_responsable=doit_etre_responsable,
        )
        db.add(affectation)
        nb_affectations += 1

    db.commit()

    # Message simple
    message = f"Enseignant {enseignant.nom} {enseignant.prenom} ajouté avec succès"

    return AffectationOperationResponse(
        success=True,
        message=message,
        nb_affectations_modifiees=nb_affectations,
        est_responsable=doit_etre_responsable,
    )


@router.delete(
    "/supprimer-enseignant-seance", response_model=AffectationOperationResponse
)
def supprimer_enseignant_seance(
    request: SupprimerEnseignantSeanceRequest, db: Session = Depends(get_db)
):
    """
    Supprime un enseignant d'une séance spécifique.
    Toutes les affectations de cet enseignant pour cette séance seront supprimées.
    """
    # Vérifier que l'enseignant existe
    enseignant = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    )
    if not enseignant:
        raise HTTPException(
            status_code=404,
            detail=f"Enseignant avec ID {request.enseignant_id} introuvable",
        )

    # Récupérer tous les examens de la séance
    examens_seance = (
        db.query(Examen)
        .filter(
            Examen.dateExam == request.date_examen,
            Examen.h_debut == request.h_debut,
            Examen.h_fin == request.h_fin,
            Examen.session == request.session,
            Examen.semestre == request.semestre,
        )
        .all()
    )

    if not examens_seance:
        raise HTTPException(
            status_code=404, detail="Aucun examen trouvé pour cette séance"
        )

    # Récupérer toutes les affectations de cet enseignant pour cette séance
    affectations_a_supprimer = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance]),
        )
        .all()
    )

    if not affectations_a_supprimer:
        raise HTTPException(
            status_code=404,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} n'est pas affecté à cette séance",
        )

    # Supprimer les affectations
    nb_supprimees = len(affectations_a_supprimer)
    for affectation in affectations_a_supprimer:
        db.delete(affectation)

    db.commit()

    return AffectationOperationResponse(
        success=True,
        message=f"✅ Enseignant {enseignant.nom} {enseignant.prenom} supprimé avec succès de la séance ({nb_supprimees} affectations supprimées)",
        nb_affectations_modifiees=nb_supprimees,
    )


@router.post(
    "/ajouter-enseignant-par-date-heure", response_model=AffectationOperationResponse
)
def ajouter_enseignant_par_date_heure(
    request: AjouterEnseignantParDateHeureRequest, db: Session = Depends(get_db)
):
    """
    Ajoute un enseignant à une séance en spécifiant uniquement la date et l'heure de début.
    Le backend recherchera automatiquement tous les examens correspondants et affectera l'enseignant.
    L'enseignant sera automatiquement marqué comme responsable s'il est responsable d'un examen dans cette séance.
    """
    # Vérifier que l'enseignant existe
    enseignant = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    )
    if not enseignant:
        raise HTTPException(
            status_code=404,
            detail=f"Enseignant avec ID {request.enseignant_id} introuvable",
        )

    # Vérifier que l'enseignant participe aux surveillances
    if not enseignant.participe_surveillance:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} ne participe pas aux surveillances",
        )

    # Récupérer tous les examens qui correspondent à cette date et heure de début
    examens_seance = (
        db.query(Examen)
        .filter(
            Examen.dateExam == request.date_examen, Examen.h_debut == request.h_debut
        )
        .all()
    )

    if not examens_seance:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun examen trouvé pour la date {request.date_examen} à {request.h_debut}",
        )

    # Extraire les informations de la séance (on prend le premier examen comme référence)
    premier_examen = examens_seance[0]
    h_fin = premier_examen.h_fin
    session = premier_examen.session
    semestre = premier_examen.semestre

    # Vérifier si l'enseignant est déjà affecté à cette séance
    affectations_existantes = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance]),
        )
        .all()
    )

    if affectations_existantes:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant.nom} {enseignant.prenom} est déjà affecté à cette séance",
        )

    # Vérifier si l'enseignant est responsable d'un examen dans cette séance
    # On compare le code_smartex de l'enseignant avec le champ 'enseignant' des examens de la séance
    est_responsable_examen = False
    for examen in examens_seance:
        if examen.enseignant == enseignant.code_smartex:
            est_responsable_examen = True
            break

    doit_etre_responsable = est_responsable_examen

    # Ajouter l'enseignant à tous les examens de la séance
    nb_affectations = 0
    for examen in examens_seance:
        affectation = Affectation(
            examen_id=examen.id,
            enseignant_id=request.enseignant_id,
            cod_salle=examen.cod_salle,
            est_responsable=doit_etre_responsable,
        )
        db.add(affectation)
        nb_affectations += 1

    db.commit()

    # Message simple
    message = f"Enseignant {enseignant.nom} {enseignant.prenom} ajouté avec succès"

    return AffectationOperationResponse(
        success=True,
        message=message,
        nb_affectations_modifiees=nb_affectations,
        est_responsable=doit_etre_responsable,
    )


@router.post("/exchange-enseignants", response_model=AffectationOperationResponse)
def exchange_enseignants(
    request: ExchangeEnseignantsRequest, db: Session = Depends(get_db)
):
    """
    Échange deux enseignants entre deux séances.
    Supprime les affectations de chaque enseignant dans leur séance respective
    et les ajoute à la séance de l'autre.
    """
    # Vérifier que les deux enseignants existent
    enseignant1 = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant1_id).first()
    )
    if not enseignant1:
        raise HTTPException(
            status_code=404,
            detail=f"Enseignant 1 avec ID {request.enseignant1_id} introuvable",
        )

    enseignant2 = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant2_id).first()
    )
    if not enseignant2:
        raise HTTPException(
            status_code=404,
            detail=f"Enseignant 2 avec ID {request.enseignant2_id} introuvable",
        )

    # Récupérer tous les examens de la séance 1
    examens_seance1 = (
        db.query(Examen)
        .filter(
            Examen.dateExam == request.date1,
            Examen.h_debut == request.h_debut1,
            Examen.h_fin == request.h_fin1,
            Examen.session == request.session1,
            Examen.semestre == request.semestre1,
        )
        .all()
    )

    if not examens_seance1:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun examen trouvé pour la séance 1 ({request.date1} {request.h_debut1}-{request.h_fin1})",
        )

    # Récupérer tous les examens de la séance 2
    examens_seance2 = (
        db.query(Examen)
        .filter(
            Examen.dateExam == request.date2,
            Examen.h_debut == request.h_debut2,
            Examen.h_fin == request.h_fin2,
            Examen.session == request.session2,
            Examen.semestre == request.semestre2,
        )
        .all()
    )

    if not examens_seance2:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun examen trouvé pour la séance 2 ({request.date2} {request.h_debut2}-{request.h_fin2})",
        )

    # Vérifier que l'enseignant 1 est affecté à la séance 1
    affectations_ens1 = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant1_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance1]),
        )
        .all()
    )

    if not affectations_ens1:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant1.nom} {enseignant1.prenom} n'est pas affecté à la séance 1",
        )

    # Vérifier que l'enseignant 2 est affecté à la séance 2
    affectations_ens2 = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant2_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance2]),
        )
        .all()
    )

    if not affectations_ens2:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant2.nom} {enseignant2.prenom} n'est pas affecté à la séance 2",
        )

    # Vérifier que l'enseignant 1 n'est pas déjà affecté à la séance 2 (destination)
    ens1_deja_dans_seance2 = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant1_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance2]),
        )
        .first()
    )

    if ens1_deja_dans_seance2:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant1.nom} {enseignant1.prenom} est déjà affecté à la séance 2. Impossible d'échanger.",
        )

    # Vérifier que l'enseignant 2 n'est pas déjà affecté à la séance 1 (destination)
    ens2_deja_dans_seance1 = (
        db.query(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant2_id,
            Affectation.examen_id.in_([ex.id for ex in examens_seance1]),
        )
        .first()
    )

    if ens2_deja_dans_seance1:
        raise HTTPException(
            status_code=400,
            detail=f"L'enseignant {enseignant2.nom} {enseignant2.prenom} est déjà affecté à la séance 1. Impossible d'échanger.",
        )

    # Déterminer si les enseignants doivent être responsables dans leurs nouvelles séances
    # Enseignant 1 responsable dans séance 2?
    ens1_responsable_seance2 = any(
        examen.enseignant == enseignant1.code_smartex for examen in examens_seance2
    )

    # Enseignant 2 responsable dans séance 1?
    ens2_responsable_seance1 = any(
        examen.enseignant == enseignant2.code_smartex for examen in examens_seance1
    )

    # Commencer la transaction d'échange
    nb_affectations = 0

    # 1. Supprimer les affectations de l'enseignant 1 de la séance 1
    for aff in affectations_ens1:
        db.delete(aff)
        nb_affectations += 1

    # 2. Supprimer les affectations de l'enseignant 2 de la séance 2
    for aff in affectations_ens2:
        db.delete(aff)
        nb_affectations += 1

    # 3. Ajouter l'enseignant 1 à la séance 2
    for examen in examens_seance2:
        affectation = Affectation(
            examen_id=examen.id,
            enseignant_id=request.enseignant1_id,
            cod_salle=examen.cod_salle,
            est_responsable=ens1_responsable_seance2,
        )
        db.add(affectation)
        nb_affectations += 1

    # 4. Ajouter l'enseignant 2 à la séance 1
    for examen in examens_seance1:
        affectation = Affectation(
            examen_id=examen.id,
            enseignant_id=request.enseignant2_id,
            cod_salle=examen.cod_salle,
            est_responsable=ens2_responsable_seance1,
        )
        db.add(affectation)
        nb_affectations += 1

    db.commit()

    message = (
        f"Échange effectué avec succès : "
        f"{enseignant1.nom} {enseignant1.prenom} "
        f"({request.date1} {request.h_debut1}) ↔ "
        f"{enseignant2.nom} {enseignant2.prenom} "
        f"({request.date2} {request.h_debut2})"
    )

    return AffectationOperationResponse(
        success=True,
        message=message,
        nb_affectations_modifiees=nb_affectations,
        est_responsable=None,  # Non applicable pour un échange
    )
