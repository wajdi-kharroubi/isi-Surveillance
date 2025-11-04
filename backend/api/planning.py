from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from database import get_db
from models.models import Enseignant, Affectation, Examen, GradeConfig, Presence, ResponsableAbsent, GenerationStatistique, SouhaitViole, Voeu, DepassementMaxJour
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
from datetime import datetime, time as dt_time

router = APIRouter(prefix="/planning", tags=["Planning"])


def _get_seance_code_from_time(heure: dt_time) -> str:
    """Détermine le code de séance (S1, S2, S3, S4) selon l'heure"""
    hour = heure.hour
    minute = heure.minute
    time_in_minutes = hour * 60 + minute

    # S1: 08:30-10:00
    if 510 <= time_in_minutes < 630:  # 08:30 = 510 min
        return "S1"
    # S2: 10:30-12:00
    elif 630 <= time_in_minutes < 750:  # 10:30 = 630 min
        return "S2"
    # S3: 12:30-14:00
    elif 750 <= time_in_minutes < 870:  # 12:30 = 750 min
        return "S3"
    # S4: 14:30-16:00
    elif 870 <= time_in_minutes < 1020:  # 14:30 = 870 min
        return "S4"
    else:
        # Par défaut
        if hour < 12:
            return "S1"
        else:
            return "S3"


def _get_jour_from_date(date_exam) -> str:
    """Retourne le nom du jour à partir d'une date"""
    jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    return jours[date_exam.weekday()]


def _verifier_et_gerer_depassement_max_jour(
    db: Session,
    enseignant_id: int,
    date_exam,
    derniere_generation,
    action: str  # "ajouter" ou "supprimer"
):
    """
    Vérifie si l'enseignant dépasse le nombre max de séances par jour après ajout/suppression
    et gère le DepassementMaxJour en conséquence
    """
    if not derniere_generation:
        return
    
    # Récupérer l'enseignant
    enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
    if not enseignant:
        return
    
    # Flush pour que les affectations ajoutées/supprimées soient prises en compte
    db.flush()
    
    # Compter le nombre de séances distinctes pour cet enseignant à cette date
    # Une séance = une combinaison unique de (dateExam, h_debut)
    seances_jour = (
        db.query(Examen.h_debut)
        .join(Affectation, Affectation.examen_id == Examen.id)
        .filter(
            Affectation.enseignant_id == enseignant_id,
            Examen.dateExam == date_exam
        )
        .distinct()
        .all()
    )
    
    nb_seances = len(seances_jour)
    max_autorise = enseignant.nombre_max
    
    # Récupérer les codes de séances
    seances_codes = []
    for (h_debut,) in seances_jour:
        code = _get_seance_code_from_time(h_debut)
        if code:
            seances_codes.append(code)
    seances_codes.sort()
    seances_str = ", ".join(seances_codes)
    
    # Chercher un dépassement existant
    depassement_existant = (
        db.query(DepassementMaxJour)
        .filter(
            DepassementMaxJour.generation_statistique_id == derniere_generation.id,
            DepassementMaxJour.enseignant_id == enseignant_id,
            DepassementMaxJour.date_exam == date_exam,
        )
        .first()
    )
    
    # Cas 1: Dépassement actuel
    if nb_seances > max_autorise:
        depassement = nb_seances - max_autorise
        
        if not depassement_existant:
            # Créer un nouveau dépassement
            nouveau_depassement = DepassementMaxJour(
                generation_statistique_id=derniere_generation.id,
                enseignant_id=enseignant_id,
                enseignant_nom=enseignant.nom,
                enseignant_prenom=enseignant.prenom,
                code_smartex=enseignant.code_smartex,
                date_exam=date_exam,
                nb_seances=nb_seances,
                max_autorise=max_autorise,
                depassement=depassement,
                seances=seances_str,
            )
            db.add(nouveau_depassement)
            
            # Mettre à jour les statistiques
            derniere_generation.nb_contraintes_seances_violees += 1
            if derniere_generation.nb_contraintes_seances_respectees > 0:
                derniere_generation.nb_contraintes_seances_respectees -= 1
            
            # Recalculer le taux
            if derniere_generation.nb_contraintes_seances_total > 0:
                derniere_generation.taux_contraintes_seances_respectees = round(
                    (derniere_generation.nb_contraintes_seances_respectees / derniere_generation.nb_contraintes_seances_total) * 100
                )
            
            return "cree"
        else:
            # Mettre à jour le dépassement existant
            depassement_existant.nb_seances = nb_seances
            depassement_existant.depassement = depassement
            depassement_existant.seances = seances_str
            return "mis_a_jour"
    
    # Cas 2: Plus de dépassement
    else:
        if depassement_existant:
            # Supprimer le dépassement
            db.delete(depassement_existant)
            
            # Mettre à jour les statistiques
            if derniere_generation.nb_contraintes_seances_violees > 0:
                derniere_generation.nb_contraintes_seances_violees -= 1
            derniere_generation.nb_contraintes_seances_respectees += 1
            
            # Recalculer le taux
            if derniere_generation.nb_contraintes_seances_total > 0:
                derniere_generation.taux_contraintes_seances_respectees = round(
                    (derniere_generation.nb_contraintes_seances_respectees / derniere_generation.nb_contraintes_seances_total) * 100
                )
            
            return "supprime"
    
    return None


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
            "grade_code": enseignant.grade_code,
            "grade": enseignant.grade,
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
                    "grade_code": aff.enseignant.grade_code,
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
def export_absences_excel(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Exporte les statistiques d'absences par enseignant au format Excel."""
    import pandas as pd
    import os
    from config import EXPORT_DIR
    from fastapi.responses import FileResponse

    # Récupérer tous les enseignants qui participent aux surveillances
    enseignants = db.query(Enseignant).filter(Enseignant.participe_surveillance == True).all()

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

    # Ajouter une tâche en arrière-plan pour supprimer le fichier après envoi
    background_tasks.add_task(os.remove, filepath)

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
    Vérifie également :
    - Si l'enseignant était marqué comme ResponsableAbsent → supprime cette absence
    - Si l'enseignant a un vœu de non-disponibilité → crée un SouhaitViole
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
    est_responsable_examen = False
    for examen in examens_seance:
        if examen.enseignant == enseignant.code_smartex:
            est_responsable_examen = True
            break

    doit_etre_responsable = est_responsable_examen

    # Déterminer le code de séance (S1, S2, S3, S4) et le jour
    seance_code = _get_seance_code_from_time(request.h_debut)
    jour = _get_jour_from_date(request.date_examen)

    # Récupérer la dernière génération de statistiques
    derniere_generation = (
        db.query(GenerationStatistique)
        .order_by(GenerationStatistique.date_generation.desc())
        .first()
    )

    messages_info = []

    # Gestion des ResponsableAbsent (si l'enseignant était absent en tant que responsable)
    responsable_absent = (
        db.query(ResponsableAbsent)
        .filter(
            ResponsableAbsent.enseignant_id == request.enseignant_id,
            ResponsableAbsent.date_exam == request.date_examen,
            ResponsableAbsent.seance == seance_code,
        )
        .first()
    )

    if responsable_absent and derniere_generation:
        # Supprimer l'enregistrement ResponsableAbsent
        db.delete(responsable_absent)

        # Mettre à jour les statistiques
        if derniere_generation.nb_responsables_absents > 0:
            derniere_generation.nb_responsables_absents -= 1
        derniere_generation.nb_responsables_presents += 1

        # Recalculer le taux
        if derniere_generation.nb_responsables_total > 0:
            derniere_generation.taux_responsables_presents = round(
                (derniere_generation.nb_responsables_presents / derniere_generation.nb_responsables_total) * 100
            )
        messages_info.append(f"Absence responsable supprimée")

    # Gestion des SouhaitViole (si l'enseignant a un vœu de non-disponibilité)
    # Vérifier si l'enseignant a un vœu pour cette séance/date
    voeu_existant = (
        db.query(Voeu)
        .filter(
            Voeu.enseignant_id == request.enseignant_id,
            Voeu.seance == seance_code,
        )
        .filter(
            (Voeu.date_voeu == request.date_examen) | (Voeu.jour == jour)
        )
        .first()
    )

    if voeu_existant and derniere_generation:
        # L'enseignant a un vœu de non-disponibilité, on crée un SouhaitViole
        # Vérifier qu'il n'existe pas déjà
        souhait_viole_existant = (
            db.query(SouhaitViole)
            .filter(
                SouhaitViole.generation_statistique_id == derniere_generation.id,
                SouhaitViole.enseignant_id == request.enseignant_id,
                SouhaitViole.date_exam == request.date_examen,
                SouhaitViole.seance == seance_code,
            )
            .first()
        )

        if not souhait_viole_existant:
            nouveau_souhait_viole = SouhaitViole(
                generation_statistique_id=derniere_generation.id,
                enseignant_id=request.enseignant_id,
                enseignant_nom=enseignant.nom,
                enseignant_prenom=enseignant.prenom,
                code_smartex=enseignant.code_smartex,
                date_exam=request.date_examen,
                seance=seance_code,
                jour=jour,
            )
            db.add(nouveau_souhait_viole)

            # Mettre à jour les statistiques
            derniere_generation.nb_souhaits_violes += 1
            if derniere_generation.nb_souhaits_respectes > 0:
                derniere_generation.nb_souhaits_respectes -= 1

            # Recalculer le taux
            if derniere_generation.nb_souhaits_total > 0:
                derniere_generation.taux_souhaits_respectes = round(
                    (derniere_generation.nb_souhaits_respectes / derniere_generation.nb_souhaits_total) * 100
                )
            messages_info.append(f"Vœu de non-disponibilité violé")

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

    # Gestion du DepassementMaxJour
    resultat_depassement = _verifier_et_gerer_depassement_max_jour(
        db, request.enseignant_id, request.date_examen, derniere_generation, "ajouter"
    )
    if resultat_depassement == "cree":
        messages_info.append(f"Dépassement max séances/jour détecté")
    elif resultat_depassement == "mis_a_jour":
        messages_info.append(f"Dépassement max séances/jour augmenté")

    db.commit()

    # Message avec informations
    message = f"Enseignant {enseignant.nom} {enseignant.prenom} ajouté avec succès"
    if messages_info:
        message += f" ({', '.join(messages_info)})"

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
    Vérifie également :
    - Si l'enseignant est responsable → le marque comme absent dans ResponsableAbsent
    - Si l'enseignant avait un vœu de non-disponibilité violé → supprime le SouhaitViole
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

    # Vérifier si l'enseignant est responsable d'un examen dans cette séance
    est_responsable_examen = False
    nb_examens_responsable = 0
    for examen in examens_seance:
        if examen.enseignant == enseignant.code_smartex:
            est_responsable_examen = True
            nb_examens_responsable += 1

    # Déterminer le code de séance (S1, S2, S3, S4) et le jour
    seance_code = _get_seance_code_from_time(request.h_debut)
    jour = _get_jour_from_date(request.date_examen)

    # Récupérer la dernière génération de statistiques
    derniere_generation = (
        db.query(GenerationStatistique)
        .order_by(GenerationStatistique.date_generation.desc())
        .first()
    )

    messages_info = []

    # Gestion des ResponsableAbsent
    if est_responsable_examen and enseignant.participe_surveillance and derniere_generation:
        # Vérifier si cet enseignant n'est pas déjà enregistré comme absent
        absence_existante = (
            db.query(ResponsableAbsent)
            .filter(
                ResponsableAbsent.generation_statistique_id == derniere_generation.id,
                ResponsableAbsent.enseignant_id == request.enseignant_id,
                ResponsableAbsent.date_exam == request.date_examen,
                ResponsableAbsent.seance == seance_code,
            )
            .first()
        )

        if not absence_existante:
            # Créer un nouvel enregistrement ResponsableAbsent
            nouvelle_absence = ResponsableAbsent(
                generation_statistique_id=derniere_generation.id,
                enseignant_id=request.enseignant_id,
                enseignant_nom=enseignant.nom,
                enseignant_prenom=enseignant.prenom,
                code_smartex=enseignant.code_smartex,
                date_exam=request.date_examen,
                seance=seance_code,
                nb_examens=nb_examens_responsable,
                raison="autre",
            )
            db.add(nouvelle_absence)

            # Mettre à jour les statistiques
            derniere_generation.nb_responsables_absents += 1
            if derniere_generation.nb_responsables_presents > 0:
                derniere_generation.nb_responsables_presents -= 1

            # Recalculer le taux
            if derniere_generation.nb_responsables_total > 0:
                derniere_generation.taux_responsables_presents = round(
                    (derniere_generation.nb_responsables_presents / derniere_generation.nb_responsables_total) * 100
                )
            messages_info.append(f"Responsable marqué absent")

    # Gestion des SouhaitViole
    # Si l'enseignant avait un vœu de non-disponibilité et qu'il était marqué comme SouhaitViole
    # On supprime le SouhaitViole car maintenant on respecte son vœu
    if derniere_generation:
        souhait_viole = (
            db.query(SouhaitViole)
            .filter(
                SouhaitViole.generation_statistique_id == derniere_generation.id,
                SouhaitViole.enseignant_id == request.enseignant_id,
                SouhaitViole.date_exam == request.date_examen,
                SouhaitViole.seance == seance_code,
            )
            .first()
        )

        if souhait_viole:
            # Supprimer le SouhaitViole
            db.delete(souhait_viole)

            # Mettre à jour les statistiques
            if derniere_generation.nb_souhaits_violes > 0:
                derniere_generation.nb_souhaits_violes -= 1
            derniere_generation.nb_souhaits_respectes += 1

            # Recalculer le taux
            if derniere_generation.nb_souhaits_total > 0:
                derniere_generation.taux_souhaits_respectes = round(
                    (derniere_generation.nb_souhaits_respectes / derniere_generation.nb_souhaits_total) * 100
                )
            messages_info.append(f"Vœu de non-disponibilité respecté")

    # Supprimer les affectations
    nb_supprimees = len(affectations_a_supprimer)
    for affectation in affectations_a_supprimer:
        db.delete(affectation)

    # Gestion du DepassementMaxJour
    resultat_depassement = _verifier_et_gerer_depassement_max_jour(
        db, request.enseignant_id, request.date_examen, derniere_generation, "supprimer"
    )
    if resultat_depassement == "supprime":
        messages_info.append(f"Dépassement max séances/jour résolu")
    elif resultat_depassement == "mis_a_jour":
        messages_info.append(f"Dépassement max séances/jour réduit")

    db.commit()

    # Message avec informations
    message = f"✅ Enseignant {enseignant.nom} {enseignant.prenom} supprimé avec succès de la séance ({nb_supprimees} affectations supprimées)"
    if messages_info:
        message += f" - {', '.join(messages_info)}"

    return AffectationOperationResponse(
        success=True,
        message=message,
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
    Vérifie également :
    - Si l'enseignant était marqué comme ResponsableAbsent → supprime cette absence
    - Si l'enseignant a un vœu de non-disponibilité → crée un SouhaitViole
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

    # Extraire les informations de la séance
    premier_examen = examens_seance[0]

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
    est_responsable_examen = False
    for examen in examens_seance:
        if examen.enseignant == enseignant.code_smartex:
            est_responsable_examen = True
            break

    doit_etre_responsable = est_responsable_examen

    # Déterminer le code de séance (S1, S2, S3, S4) et le jour
    seance_code = _get_seance_code_from_time(request.h_debut)
    jour = _get_jour_from_date(request.date_examen)

    # Récupérer la dernière génération de statistiques
    derniere_generation = (
        db.query(GenerationStatistique)
        .order_by(GenerationStatistique.date_generation.desc())
        .first()
    )

    messages_info = []

    # Gestion des ResponsableAbsent
    responsable_absent = (
        db.query(ResponsableAbsent)
        .filter(
            ResponsableAbsent.enseignant_id == request.enseignant_id,
            ResponsableAbsent.date_exam == request.date_examen,
            ResponsableAbsent.seance == seance_code,
        )
        .first()
    )

    if responsable_absent and derniere_generation:
        # Supprimer l'enregistrement ResponsableAbsent
        db.delete(responsable_absent)

        # Mettre à jour les statistiques
        if derniere_generation.nb_responsables_absents > 0:
            derniere_generation.nb_responsables_absents -= 1
        derniere_generation.nb_responsables_presents += 1

        # Recalculer le taux
        if derniere_generation.nb_responsables_total > 0:
            derniere_generation.taux_responsables_presents = round(
                (derniere_generation.nb_responsables_presents / derniere_generation.nb_responsables_total) * 100
            )
        messages_info.append(f"Absence responsable supprimée")

    # Gestion des SouhaitViole
    # Vérifier si l'enseignant a un vœu pour cette séance/date
    voeu_existant = (
        db.query(Voeu)
        .filter(
            Voeu.enseignant_id == request.enseignant_id,
            Voeu.seance == seance_code,
        )
        .filter(
            (Voeu.date_voeu == request.date_examen) | (Voeu.jour == jour)
        )
        .first()
    )

    if voeu_existant and derniere_generation:
        # L'enseignant a un vœu de non-disponibilité, on crée un SouhaitViole
        souhait_viole_existant = (
            db.query(SouhaitViole)
            .filter(
                SouhaitViole.generation_statistique_id == derniere_generation.id,
                SouhaitViole.enseignant_id == request.enseignant_id,
                SouhaitViole.date_exam == request.date_examen,
                SouhaitViole.seance == seance_code,
            )
            .first()
        )

        if not souhait_viole_existant:
            nouveau_souhait_viole = SouhaitViole(
                generation_statistique_id=derniere_generation.id,
                enseignant_id=request.enseignant_id,
                enseignant_nom=enseignant.nom,
                enseignant_prenom=enseignant.prenom,
                code_smartex=enseignant.code_smartex,
                date_exam=request.date_examen,
                seance=seance_code,
                jour=jour,
            )
            db.add(nouveau_souhait_viole)

            # Mettre à jour les statistiques
            derniere_generation.nb_souhaits_violes += 1
            if derniere_generation.nb_souhaits_respectes > 0:
                derniere_generation.nb_souhaits_respectes -= 1

            # Recalculer le taux
            if derniere_generation.nb_souhaits_total > 0:
                derniere_generation.taux_souhaits_respectes = round(
                    (derniere_generation.nb_souhaits_respectes / derniere_generation.nb_souhaits_total) * 100
                )
            messages_info.append(f"Vœu de non-disponibilité violé")

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

    # Gestion du DepassementMaxJour
    resultat_depassement = _verifier_et_gerer_depassement_max_jour(
        db, request.enseignant_id, request.date_examen, derniere_generation, "ajouter"
    )
    if resultat_depassement == "cree":
        messages_info.append(f"Dépassement max séances/jour détecté")
    elif resultat_depassement == "mis_a_jour":
        messages_info.append(f"Dépassement max séances/jour augmenté")

    db.commit()

    # Message avec informations
    message = f"Enseignant {enseignant.nom} {enseignant.prenom} ajouté avec succès"
    if messages_info:
        message += f" ({', '.join(messages_info)})"

    return AffectationOperationResponse(
        success=True,
        message=message,
        nb_affectations_modifiees=nb_affectations,
        est_responsable=doit_etre_responsable,
    )


@router.post("/verifier-contraintes-ajout")
def verifier_contraintes_ajout(
    request: AjouterEnseignantParDateHeureRequest, db: Session = Depends(get_db)
):
    """
    Vérifie les contraintes avant d'ajouter un enseignant à une séance :
    - Quota de l'enseignant
    - Contrainte de souhait (voeux)
    - Nombre maximum de séances par jour
    Retourne les informations de validation et les warnings/erreurs
    """
    from models.models import Voeu
    
    # Vérifier que l'enseignant existe
    enseignant = (
        db.query(Enseignant).filter(Enseignant.id == request.enseignant_id).first()
    )
    if not enseignant:
        raise HTTPException(
            status_code=404,
            detail=f"Enseignant avec ID {request.enseignant_id} introuvable",
        )

    # Récupérer la configuration du grade
    grade_config = (
        db.query(GradeConfig)
        .filter(GradeConfig.grade_code == enseignant.grade_code)
        .first()
    )

    # Calculer le quota max
    if enseignant.is_Exception and enseignant.quota_Exception is not None:
        quota_max = enseignant.quota_Exception
    else:
        quota_max = grade_config.nb_surveillances if grade_config else 0

    # Compter le nombre de séances déjà affectées (séances uniques par date/heure)
    # Une séance = combinaison unique de (dateExam, h_debut, h_fin)
    from sqlalchemy import func, distinct
    
    seances_affectees = (
        db.query(
            Examen.dateExam,
            Examen.h_debut,
            Examen.h_fin
        )
        .join(Affectation)
        .filter(Affectation.enseignant_id == request.enseignant_id)
        .distinct()
        .all()
    )
    
    nb_seances_actuelles = len(seances_affectees)

    # Vérifier le quota
    quota_depasse = (nb_seances_actuelles + 1) > quota_max
    pourcentage_apres_ajout = (
        round(((nb_seances_actuelles + 1) / quota_max * 100), 2) if quota_max > 0 else 0
    )

    # Vérifier les souhaits (voeux)
    # IMPORTANT: Si un voeu existe, cela signifie que l'enseignant NE SOUHAITE PAS être présent à cette séance
    
    # Déterminer le numéro de séance à partir de l'heure
    # request.h_debut est déjà un objet time, pas besoin de le parser
    h_debut_time = request.h_debut
    heures = h_debut_time.hour
    minutes = h_debut_time.minute
    heure_minutes = heures * 60 + minutes
    
    # Déterminer le code séance (S1, S2, S3, S4)
    if 510 <= heure_minutes < 630:  # 8:30 - 10:29
        code_seance = "S1"
    elif 630 <= heure_minutes < 750:  # 10:30 - 12:29
        code_seance = "S2"
    elif 750 <= heure_minutes < 870:  # 12:30 - 14:29
        code_seance = "S3"
    else:  # 14:30+
        code_seance = "S4"
    
    # Chercher un voeu pour cette date et cette séance
    voeu = (
        db.query(Voeu)
        .filter(
            Voeu.enseignant_id == request.enseignant_id,
            Voeu.date_voeu == request.date_examen,
            Voeu.seance == code_seance,
        )
        .first()
    )

    # Si un voeu existe, l'enseignant a exprimé qu'il NE SOUHAITE PAS être présent
    souhait_non_respecte = voeu is not None

    # Vérifier le nombre de séances par jour (séances uniques ce jour-là)
    seances_ce_jour = (
        db.query(
            Examen.h_debut,
            Examen.h_fin
        )
        .join(Affectation)
        .filter(
            Affectation.enseignant_id == request.enseignant_id,
            Examen.dateExam == request.date_examen,
        )
        .distinct()
        .all()
    )
    
    nb_seances_ce_jour = len(seances_ce_jour)

    nombre_max_par_jour = enseignant.nombre_max
    max_seances_jour_depasse = (nb_seances_ce_jour + 1) > nombre_max_par_jour

    # Construire la réponse
    warnings = []
    errors = []

    if quota_depasse:
        warnings.append(
            f"QUOTA DÉPASSÉ : L'enseignant aura {nb_seances_actuelles + 1}/{quota_max} séances ({pourcentage_apres_ajout}%)"
        )

    if souhait_non_respecte:
        # Traiter comme un warning au lieu d'une erreur pour laisser l'utilisateur décider
        warning_msg = f"SOUHAIT NON RESPECTÉ : L'enseignant a exprimé le souhait de NE PAS être disponible pour cette séance ({code_seance})"
        if voeu and voeu.motif:
            warning_msg += f" - Motif: {voeu.motif}"
        warnings.append(warning_msg)

    if max_seances_jour_depasse:
        warnings.append(
            f"MAX SÉANCES/JOUR DÉPASSÉ : L'enseignant aura {nb_seances_ce_jour + 1}/{nombre_max_par_jour} séances ce jour-là"
        )

    # Vérifier si l'enseignant est responsable d'un examen dans cette séance
    # D'abord, récupérer tous les examens de cette séance (même date/heure)
    examens_seance = (
        db.query(Examen)
        .filter(
            Examen.dateExam == request.date_examen,
            Examen.h_debut == request.h_debut,
        )
        .all()
    )
    
    # Vérifier si l'enseignant est responsable de l'un de ces examens
    est_responsable_examen = False
    examen_responsable_info = None
    
    for examen in examens_seance:
        # Vérifier si l'enseignant correspond au code smartex de l'examen (responsable)
        ens_responsable = (
            db.query(Enseignant)
            .filter(Enseignant.code_smartex == examen.enseignant)
            .first()
        )
        
        if ens_responsable and ens_responsable.id == request.enseignant_id:
            est_responsable_examen = True
            examen_responsable_info = {
                "salle": examen.cod_salle,
                "type_examen": examen.type_ex,
            }
            break

    return {
        "enseignant": {
            "id": enseignant.id,
            "nom": enseignant.nom,
            "prenom": enseignant.prenom,
            "grade_code": enseignant.grade_code,
        },
        "quota": {
            "actuel": nb_seances_actuelles,
            "max": quota_max,
            "apres_ajout": nb_seances_actuelles + 1,
            "pourcentage_apres_ajout": pourcentage_apres_ajout,
            "depasse": quota_depasse,
        },
        "seances_jour": {
            "actuel": nb_seances_ce_jour,
            "max": nombre_max_par_jour,
            "apres_ajout": nb_seances_ce_jour + 1,
            "depasse": max_seances_jour_depasse,
        },
        "souhait": {
            "existe": voeu is not None,
            "code_seance": code_seance,
            "motif": voeu.motif if voeu else None,
            "non_respecte": souhait_non_respecte,
        },
        "responsable_examen": {
            "est_responsable": est_responsable_examen,
            "info": examen_responsable_info,
        },
        "warnings": warnings,
        "errors": errors,
        "peut_ajouter": len(errors) == 0,
    }


@router.post("/verifier-contraintes-echange")
def verifier_contraintes_echange(request: ExchangeEnseignantsRequest, db: Session = Depends(get_db)):
    """
    Vérifie les contraintes pour les deux enseignants lors d'un échange de séances.
    Retourne les validations pour les deux enseignants.
    """
    from models.models import Voeu
    
    def calculer_code_seance(h_debut_time):
        """Détermine le code séance (S1, S2, S3, S4) à partir de l'heure de début."""
        heures = h_debut_time.hour
        minutes = h_debut_time.minute
        heure_minutes = heures * 60 + minutes
        
        if 510 <= heure_minutes < 630:  # 8:30 - 10:29
            return "S1"
        elif 630 <= heure_minutes < 750:  # 10:30 - 12:29
            return "S2"
        elif 750 <= heure_minutes < 870:  # 12:30 - 14:29
            return "S3"
        else:  # 14:30+
            return "S4"
    
    def verifier_enseignant_pour_seance(enseignant_id, date_examen, h_debut, h_fin, date_actuelle=None, h_debut_actuelle=None):
        """Vérifie les contraintes pour un enseignant dans une nouvelle séance."""
        enseignant = db.query(Enseignant).filter(Enseignant.id == enseignant_id).first()
        if not enseignant:
            raise HTTPException(
                status_code=404,
                detail=f"Enseignant avec ID {enseignant_id} introuvable",
            )
        
        # Récupérer la configuration du grade
        grade_config = (
            db.query(GradeConfig)
            .filter(GradeConfig.grade_code == enseignant.grade_code)
            .first()
        )

        # Calculer le quota max
        if enseignant.is_Exception and enseignant.quota_Exception is not None:
            quota_max = enseignant.quota_Exception
        else:
            quota_max = grade_config.nb_surveillances if grade_config else 0

        # Compter les séances déjà affectées (sans la séance actuelle)
        seances_affectees = (
            db.query(
                Examen.dateExam,
                Examen.h_debut,
                Examen.h_fin
            )
            .join(Affectation)
            .filter(Affectation.enseignant_id == enseignant_id)
            .distinct()
            .all()
        )
        
        nb_seances_actuelles = len(seances_affectees)

        # Le nombre de séances reste le même après l'échange (on échange, on n'ajoute pas)
        quota_depasse = nb_seances_actuelles > quota_max
        pourcentage_apres_echange = (
            round((nb_seances_actuelles / quota_max * 100), 2) if quota_max > 0 else 0
        )

        # Vérifier les souhaits (voeux)
        code_seance = calculer_code_seance(h_debut)
        
        voeu = (
            db.query(Voeu)
            .filter(
                Voeu.enseignant_id == enseignant_id,
                Voeu.date_voeu == date_examen,
                Voeu.seance == code_seance,
            )
            .first()
        )

        souhait_non_respecte = voeu is not None

        # Vérifier le nombre de séances par jour
        seances_ce_jour = (
            db.query(
                Examen.h_debut,
                Examen.h_fin
            )
            .join(Affectation)
            .filter(
                Affectation.enseignant_id == enseignant_id,
                Examen.dateExam == date_examen,
            )
            .distinct()
            .all()
        )
        
        nb_seances_ce_jour = len(seances_ce_jour)
        nombre_max_par_jour = enseignant.nombre_max
        max_seances_jour_depasse = nb_seances_ce_jour > nombre_max_par_jour

        # Vérifier si l'enseignant est responsable dans sa séance actuelle (celle qu'il va quitter)
        est_responsable_seance_actuelle = False
        nb_examens_responsable_actuelle = 0
        if date_actuelle and h_debut_actuelle:
            examens_seance_actuelle = (
                db.query(Examen)
                .filter(
                    Examen.dateExam == date_actuelle,
                    Examen.h_debut == h_debut_actuelle,
                )
                .all()
            )
            for examen in examens_seance_actuelle:
                if examen.enseignant == enseignant.code_smartex:
                    est_responsable_seance_actuelle = True
                    nb_examens_responsable_actuelle += 1

        # Vérifier si l'enseignant est responsable dans la nouvelle séance (celle où il va aller)
        est_responsable_nouvelle_seance = False
        nb_examens_responsable_nouvelle = 0
        examens_nouvelle_seance = (
            db.query(Examen)
            .filter(
                Examen.dateExam == date_examen,
                Examen.h_debut == h_debut,
            )
            .all()
        )
        for examen in examens_nouvelle_seance:
            if examen.enseignant == enseignant.code_smartex:
                est_responsable_nouvelle_seance = True
                nb_examens_responsable_nouvelle += 1

        # Construire warnings et errors
        warnings = []
        errors = []

        if quota_depasse:
            warnings.append(
                f"QUOTA DÉPASSÉ ({enseignant.nom} {enseignant.prenom}) : L'enseignant a déjà {nb_seances_actuelles}/{quota_max} séances ({pourcentage_apres_echange}%)"
            )

        if souhait_non_respecte:
            warning_msg = f"SOUHAIT NON RESPECTÉ ({enseignant.nom} {enseignant.prenom}) : L'enseignant a exprimé le souhait de NE PAS être disponible pour cette séance ({code_seance})"
            if voeu and voeu.motif:
                warning_msg += f" - Motif: {voeu.motif}"
            warnings.append(warning_msg)

        if max_seances_jour_depasse:
            warnings.append(
                f"MAX SÉANCES/JOUR DÉPASSÉ ({enseignant.nom} {enseignant.prenom}) : L'enseignant a déjà {nb_seances_ce_jour}/{nombre_max_par_jour} séances ce jour-là"
            )

        return {
            "enseignant": {
                "id": enseignant.id,
                "nom": enseignant.nom,
                "prenom": enseignant.prenom,
                "grade_code": enseignant.grade_code,
            },
            "quota": {
                "actuel": nb_seances_actuelles,
                "max": quota_max,
                "pourcentage": pourcentage_apres_echange,
                "depasse": quota_depasse,
            },
            "seances_jour": {
                "actuel": nb_seances_ce_jour,
                "max": nombre_max_par_jour,
                "depasse": max_seances_jour_depasse,
            },
            "souhait": {
                "existe": voeu is not None,
                "code_seance": code_seance,
                "motif": voeu.motif if voeu else None,
                "non_respecte": souhait_non_respecte,
            },
            "responsable_seance_actuelle": {
                "est_responsable": est_responsable_seance_actuelle,
                "nb_examens": nb_examens_responsable_actuelle,
            },
            "responsable_nouvelle_seance": {
                "est_responsable": est_responsable_nouvelle_seance,
                "nb_examens": nb_examens_responsable_nouvelle,
            },
            "warnings": warnings,
            "errors": errors,
        }
    
    # Vérifier l'enseignant 1 vers la séance 2 (il quitte la séance 1)
    validation_ens1 = verifier_enseignant_pour_seance(
        request.enseignant1_id,
        request.date2,
        request.h_debut2,
        request.h_fin2,
        date_actuelle=request.date1,
        h_debut_actuelle=request.h_debut1
    )
    
    # Vérifier l'enseignant 2 vers la séance 1 (il quitte la séance 2)
    validation_ens2 = verifier_enseignant_pour_seance(
        request.enseignant2_id,
        request.date1,
        request.h_debut1,
        request.h_fin1,
        date_actuelle=request.date2,
        h_debut_actuelle=request.h_debut2
    )
    
    # Combiner les warnings et errors
    all_warnings = validation_ens1["warnings"] + validation_ens2["warnings"]
    all_errors = validation_ens1["errors"] + validation_ens2["errors"]
    
    return {
        "enseignant1": validation_ens1,
        "enseignant2": validation_ens2,
        "warnings": all_warnings,
        "errors": all_errors,
        "peut_echanger": len(all_errors) == 0,
    }


@router.post("/exchange-enseignants", response_model=AffectationOperationResponse)
def exchange_enseignants(
    request: ExchangeEnseignantsRequest, db: Session = Depends(get_db)
):
    """
    Échange deux enseignants entre deux séances.
    Supprime les affectations de chaque enseignant dans leur séance respective
    et les ajoute à la séance de l'autre.
    Gère également les ResponsableAbsent :
    - Si un responsable est supprimé d'une séance, il est marqué comme absent
    - Si un responsable est ajouté à une séance, son absence est supprimée
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

    # Déterminer les codes de séance
    seance1_code = _get_seance_code_from_time(request.h_debut1)
    seance2_code = _get_seance_code_from_time(request.h_debut2)

    # Vérifier si les enseignants sont responsables dans leurs séances actuelles
    ens1_responsable_seance1 = any(
        examen.enseignant == enseignant1.code_smartex for examen in examens_seance1
    )
    nb_examens_ens1_seance1 = sum(
        1 for examen in examens_seance1 if examen.enseignant == enseignant1.code_smartex
    )

    ens2_responsable_seance2 = any(
        examen.enseignant == enseignant2.code_smartex for examen in examens_seance2
    )
    nb_examens_ens2_seance2 = sum(
        1 for examen in examens_seance2 if examen.enseignant == enseignant2.code_smartex
    )

    # Déterminer si les enseignants doivent être responsables dans leurs nouvelles séances
    ens1_responsable_seance2 = any(
        examen.enseignant == enseignant1.code_smartex for examen in examens_seance2
    )
    nb_examens_ens1_seance2 = sum(
        1 for examen in examens_seance2 if examen.enseignant == enseignant1.code_smartex
    )

    ens2_responsable_seance1 = any(
        examen.enseignant == enseignant2.code_smartex for examen in examens_seance1
    )
    nb_examens_ens2_seance1 = sum(
        1 for examen in examens_seance1 if examen.enseignant == enseignant2.code_smartex
    )

    # Récupérer la dernière génération de statistiques
    derniere_generation = (
        db.query(GenerationStatistique)
        .order_by(GenerationStatistique.date_generation.desc())
        .first()
    )

    messages_absence = []

    # Gestion des ResponsableAbsent
    if derniere_generation:
        # CAS 1: Enseignant 1 supprimé de séance 1
        # Si ens1 est responsable dans séance1 et participe aux surveillances, le marquer comme absent
        if ens1_responsable_seance1 and enseignant1.participe_surveillance:
            absence_existante = (
                db.query(ResponsableAbsent)
                .filter(
                    ResponsableAbsent.generation_statistique_id == derniere_generation.id,
                    ResponsableAbsent.enseignant_id == request.enseignant1_id,
                    ResponsableAbsent.date_exam == request.date1,
                    ResponsableAbsent.seance == seance1_code,
                )
                .first()
            )

            if not absence_existante:
                nouvelle_absence = ResponsableAbsent(
                    generation_statistique_id=derniere_generation.id,
                    enseignant_id=request.enseignant1_id,
                    enseignant_nom=enseignant1.nom,
                    enseignant_prenom=enseignant1.prenom,
                    code_smartex=enseignant1.code_smartex,
                    date_exam=request.date1,
                    seance=seance1_code,
                    nb_examens=nb_examens_ens1_seance1,
                    raison="autre",
                )
                db.add(nouvelle_absence)
                derniere_generation.nb_responsables_absents += 1
                if derniere_generation.nb_responsables_presents > 0:
                    derniere_generation.nb_responsables_presents -= 1
                messages_absence.append(f"Ens1 marqué absent séance1")

        # CAS 2: Enseignant 2 supprimé de séance 2
        # Si ens2 est responsable dans séance2 et participe aux surveillances, le marquer comme absent
        if ens2_responsable_seance2 and enseignant2.participe_surveillance:
            absence_existante = (
                db.query(ResponsableAbsent)
                .filter(
                    ResponsableAbsent.generation_statistique_id == derniere_generation.id,
                    ResponsableAbsent.enseignant_id == request.enseignant2_id,
                    ResponsableAbsent.date_exam == request.date2,
                    ResponsableAbsent.seance == seance2_code,
                )
                .first()
            )

            if not absence_existante:
                nouvelle_absence = ResponsableAbsent(
                    generation_statistique_id=derniere_generation.id,
                    enseignant_id=request.enseignant2_id,
                    enseignant_nom=enseignant2.nom,
                    enseignant_prenom=enseignant2.prenom,
                    code_smartex=enseignant2.code_smartex,
                    date_exam=request.date2,
                    seance=seance2_code,
                    nb_examens=nb_examens_ens2_seance2,
                    raison="autre",
                )
                db.add(nouvelle_absence)
                derniere_generation.nb_responsables_absents += 1
                if derniere_generation.nb_responsables_presents > 0:
                    derniere_generation.nb_responsables_presents -= 1
                messages_absence.append(f"Ens2 marqué absent séance2")

        # CAS 3: Enseignant 1 ajouté à séance 2
        # Si ens1 est responsable dans séance2, supprimer son absence si elle existe
        if ens1_responsable_seance2:
            absence_a_supprimer = (
                db.query(ResponsableAbsent)
                .filter(
                    ResponsableAbsent.enseignant_id == request.enseignant1_id,
                    ResponsableAbsent.date_exam == request.date2,
                    ResponsableAbsent.seance == seance2_code,
                )
                .first()
            )

            if absence_a_supprimer:
                db.delete(absence_a_supprimer)
                if derniere_generation.nb_responsables_absents > 0:
                    derniere_generation.nb_responsables_absents -= 1
                derniere_generation.nb_responsables_presents += 1
                messages_absence.append(f"Absence Ens1 supprimée séance2")

        # CAS 4: Enseignant 2 ajouté à séance 1
        # Si ens2 est responsable dans séance1, supprimer son absence si elle existe
        if ens2_responsable_seance1:
            absence_a_supprimer = (
                db.query(ResponsableAbsent)
                .filter(
                    ResponsableAbsent.enseignant_id == request.enseignant2_id,
                    ResponsableAbsent.date_exam == request.date1,
                    ResponsableAbsent.seance == seance1_code,
                )
                .first()
            )

            if absence_a_supprimer:
                db.delete(absence_a_supprimer)
                if derniere_generation.nb_responsables_absents > 0:
                    derniere_generation.nb_responsables_absents -= 1
                derniere_generation.nb_responsables_presents += 1
                messages_absence.append(f"Absence Ens2 supprimée séance1")

        # Recalculer le taux de présence des responsables
        if derniere_generation.nb_responsables_total > 0:
            derniere_generation.taux_responsables_presents = round(
                (derniere_generation.nb_responsables_presents / derniere_generation.nb_responsables_total) * 100
            )

    # Gestion des SouhaitViole
    messages_souhaits = []
    if derniere_generation:
        jour1 = _get_jour_from_date(request.date1)
        jour2 = _get_jour_from_date(request.date2)

        # CAS 1: Enseignant 1 supprimé de séance 1
        # Si ens1 a un voeu pour séance1, supprimer le SouhaitViole s'il existe
        voeu_ens1_seance1 = (
            db.query(Voeu)
            .filter(
                Voeu.enseignant_id == request.enseignant1_id,
                or_(
                    Voeu.date_voeu == request.date1,
                    Voeu.jour == jour1
                ),
                Voeu.seance == seance1_code,
            )
            .first()
        )

        if voeu_ens1_seance1:
            souhait_viole_existant = (
                db.query(SouhaitViole)
                .filter(
                    SouhaitViole.generation_statistique_id == derniere_generation.id,
                    SouhaitViole.enseignant_id == request.enseignant1_id,
                    SouhaitViole.date_exam == request.date1,
                    SouhaitViole.seance == seance1_code,
                )
                .first()
            )

            if souhait_viole_existant:
                db.delete(souhait_viole_existant)
                if derniere_generation.nb_souhaits_violes > 0:
                    derniere_generation.nb_souhaits_violes -= 1
                derniere_generation.nb_souhaits_respectes += 1
                messages_souhaits.append(f"Souhait Ens1 respecté séance1")

        # CAS 2: Enseignant 2 supprimé de séance 2
        # Si ens2 a un voeu pour séance2, supprimer le SouhaitViole s'il existe
        voeu_ens2_seance2 = (
            db.query(Voeu)
            .filter(
                Voeu.enseignant_id == request.enseignant2_id,
                or_(
                    Voeu.date_voeu == request.date2,
                    Voeu.jour == jour2
                ),
                Voeu.seance == seance2_code,
            )
            .first()
        )

        if voeu_ens2_seance2:
            souhait_viole_existant = (
                db.query(SouhaitViole)
                .filter(
                    SouhaitViole.generation_statistique_id == derniere_generation.id,
                    SouhaitViole.enseignant_id == request.enseignant2_id,
                    SouhaitViole.date_exam == request.date2,
                    SouhaitViole.seance == seance2_code,
                )
                .first()
            )

            if souhait_viole_existant:
                db.delete(souhait_viole_existant)
                if derniere_generation.nb_souhaits_violes > 0:
                    derniere_generation.nb_souhaits_violes -= 1
                derniere_generation.nb_souhaits_respectes += 1
                messages_souhaits.append(f"Souhait Ens2 respecté séance2")

        # CAS 3: Enseignant 1 ajouté à séance 2
        # Si ens1 a un voeu pour séance2, créer un SouhaitViole s'il n'existe pas
        voeu_ens1_seance2 = (
            db.query(Voeu)
            .filter(
                Voeu.enseignant_id == request.enseignant1_id,
                or_(
                    Voeu.date_voeu == request.date2,
                    Voeu.jour == jour2
                ),
                Voeu.seance == seance2_code,
            )
            .first()
        )

        if voeu_ens1_seance2:
            souhait_viole_existant = (
                db.query(SouhaitViole)
                .filter(
                    SouhaitViole.generation_statistique_id == derniere_generation.id,
                    SouhaitViole.enseignant_id == request.enseignant1_id,
                    SouhaitViole.date_exam == request.date2,
                    SouhaitViole.seance == seance2_code,
                )
                .first()
            )

            if not souhait_viole_existant:
                nouveau_souhait_viole = SouhaitViole(
                    generation_statistique_id=derniere_generation.id,
                    enseignant_id=request.enseignant1_id,
                    enseignant_nom=enseignant1.nom,
                    enseignant_prenom=enseignant1.prenom,
                    code_smartex=enseignant1.code_smartex,
                    date_exam=request.date2,
                    seance=seance2_code,
                    jour=jour2,
                )
                db.add(nouveau_souhait_viole)
                derniere_generation.nb_souhaits_violes += 1
                if derniere_generation.nb_souhaits_respectes > 0:
                    derniere_generation.nb_souhaits_respectes -= 1
                messages_souhaits.append(f"Souhait Ens1 violé séance2")

        # CAS 4: Enseignant 2 ajouté à séance 1
        # Si ens2 a un voeu pour séance1, créer un SouhaitViole s'il n'existe pas
        voeu_ens2_seance1 = (
            db.query(Voeu)
            .filter(
                Voeu.enseignant_id == request.enseignant2_id,
                or_(
                    Voeu.date_voeu == request.date1,
                    Voeu.jour == jour1
                ),
                Voeu.seance == seance1_code,
            )
            .first()
        )

        if voeu_ens2_seance1:
            souhait_viole_existant = (
                db.query(SouhaitViole)
                .filter(
                    SouhaitViole.generation_statistique_id == derniere_generation.id,
                    SouhaitViole.enseignant_id == request.enseignant2_id,
                    SouhaitViole.date_exam == request.date1,
                    SouhaitViole.seance == seance1_code,
                )
                .first()
            )

            if not souhait_viole_existant:
                nouveau_souhait_viole = SouhaitViole(
                    generation_statistique_id=derniere_generation.id,
                    enseignant_id=request.enseignant2_id,
                    enseignant_nom=enseignant2.nom,
                    enseignant_prenom=enseignant2.prenom,
                    code_smartex=enseignant2.code_smartex,
                    date_exam=request.date1,
                    seance=seance1_code,
                    jour=jour1,
                )
                db.add(nouveau_souhait_viole)
                derniere_generation.nb_souhaits_violes += 1
                if derniere_generation.nb_souhaits_respectes > 0:
                    derniere_generation.nb_souhaits_respectes -= 1
                messages_souhaits.append(f"Souhait Ens2 violé séance1")

        # Recalculer le taux de souhaits respectés
        if derniere_generation.nb_souhaits_total > 0:
            derniere_generation.taux_souhaits_respectes = round(
                (derniere_generation.nb_souhaits_respectes / derniere_generation.nb_souhaits_total) * 100
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

    # Gestion du DepassementMaxJour
    messages_depassements = []
    if derniere_generation:
        # Vérifier pour Ens1 sur date1 (supprimé de séance1)
        resultat_dep1 = _verifier_et_gerer_depassement_max_jour(
            db, request.enseignant1_id, request.date1, derniere_generation, "supprimer"
        )
        if resultat_dep1 == "supprime":
            messages_depassements.append(f"Dépassement Ens1 date1 résolu")
        elif resultat_dep1 == "mis_a_jour":
            messages_depassements.append(f"Dépassement Ens1 date1 réduit")
        
        # Vérifier pour Ens2 sur date2 (supprimé de séance2)
        resultat_dep2 = _verifier_et_gerer_depassement_max_jour(
            db, request.enseignant2_id, request.date2, derniere_generation, "supprimer"
        )
        if resultat_dep2 == "supprime":
            messages_depassements.append(f"Dépassement Ens2 date2 résolu")
        elif resultat_dep2 == "mis_a_jour":
            messages_depassements.append(f"Dépassement Ens2 date2 réduit")
        
        # Vérifier pour Ens1 sur date2 (ajouté à séance2)
        resultat_dep3 = _verifier_et_gerer_depassement_max_jour(
            db, request.enseignant1_id, request.date2, derniere_generation, "ajouter"
        )
        if resultat_dep3 == "cree":
            messages_depassements.append(f"Dépassement Ens1 date2 détecté")
        elif resultat_dep3 == "mis_a_jour":
            messages_depassements.append(f"Dépassement Ens1 date2 augmenté")
        
        # Vérifier pour Ens2 sur date1 (ajouté à séance1)
        resultat_dep4 = _verifier_et_gerer_depassement_max_jour(
            db, request.enseignant2_id, request.date1, derniere_generation, "ajouter"
        )
        if resultat_dep4 == "cree":
            messages_depassements.append(f"Dépassement Ens2 date1 détecté")
        elif resultat_dep4 == "mis_a_jour":
            messages_depassements.append(f"Dépassement Ens2 date1 augmenté")

    db.commit()

    message = (
        f"Échange effectué avec succès : "
        f"{enseignant1.nom} {enseignant1.prenom} "
        f"({request.date1} {request.h_debut1}) ↔ "
        f"{enseignant2.nom} {enseignant2.prenom} "
        f"({request.date2} {request.h_debut2})"
    )

    if messages_absence:
        message += f" [Absences: {', '.join(messages_absence)}]"
    
    if messages_souhaits:
        message += f" [Souhaits: {', '.join(messages_souhaits)}]"
    
    if messages_depassements:
        message += f" [Dépassements: {', '.join(messages_depassements)}]"

    return AffectationOperationResponse(
        success=True,
        message=message,
        nb_affectations_modifiees=nb_affectations,
        est_responsable=None,  # Non applicable pour un échange
    )
