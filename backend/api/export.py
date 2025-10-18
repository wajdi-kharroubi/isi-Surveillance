from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from database import get_db
from services import ExportService
from datetime import date, datetime
from typing import Optional
import os
import zipfile
import tempfile

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/planning-pdf")
def exporter_planning_pdf(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Exporte le planning global en PDF"""
    try:
        export_service = ExportService(db)
        filepath = export_service.generer_planning_global_pdf(date_debut, date_fin)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF")
        
        return FileResponse(
            path=filepath,
            media_type='application/pdf',
            filename=os.path.basename(filepath)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/convocations")
def exporter_convocations(db: Session = Depends(get_db)):
    """Génère les convocations individuelles pour tous les enseignants et retourne un fichier ZIP"""
    try:
        export_service = ExportService(db)
        filepaths = export_service.generer_convocations_individuelles()
        
        if not filepaths:
            raise HTTPException(status_code=404, detail="Aucune convocation à générer")
        
        # Créer un fichier ZIP temporaire
        zip_filename = f"convocations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(tempfile.gettempdir(), zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filepath in filepaths:
                if os.path.exists(filepath):
                    zipf.write(filepath, os.path.basename(filepath))
        
        # Supprimer les fichiers individuels après création du ZIP
        for filepath in filepaths:
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as e:
                print(f"Erreur lors de la suppression de {filepath}: {str(e)}")
        
        return FileResponse(
            path=zip_path,
            media_type='application/zip',
            filename=zip_filename,
            background=None  # Le fichier sera supprimé après l'envoi
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/listes-creneaux")
def exporter_listes_creneaux(db: Session = Depends(get_db)):
    """Génère les listes de surveillants par créneau et retourne un fichier ZIP"""
    try:
        export_service = ExportService(db)
        filepaths = export_service.generer_listes_par_creneau()
        
        if not filepaths:
            raise HTTPException(status_code=404, detail="Aucune liste à générer")
        
        # Créer un fichier ZIP temporaire
        zip_filename = f"listes_creneaux_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(tempfile.gettempdir(), zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filepath in filepaths:
                if os.path.exists(filepath):
                    zipf.write(filepath, os.path.basename(filepath))
        
        # Supprimer les fichiers individuels après création du ZIP
        for filepath in filepaths:
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as e:
                print(f"Erreur lors de la suppression de {filepath}: {str(e)}")
        
        return FileResponse(
            path=zip_path,
            media_type='application/zip',
            filename=zip_filename,
            background=None  # Le fichier sera supprimé après l'envoi
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/convocation/{enseignant_id}")
def exporter_convocation_enseignant(
    enseignant_id: int,
    db: Session = Depends(get_db)
):
    """Exporte la convocation d'un enseignant spécifique"""
    try:
        export_service = ExportService(db)
        filepath = export_service.generer_convocation_enseignant(enseignant_id)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération de la convocation")
        
        # Fonction pour supprimer le fichier après l'envoi
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"Erreur lors de la suppression de {path}: {str(e)}")
        
        return FileResponse(
            path=filepath,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename=os.path.basename(filepath),
            background=BackgroundTask(cleanup, filepath)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/liste-creneau")
def exporter_liste_creneau(
    date_exam: date = Query(..., description="Date de l'examen"),
    seance: str = Query(..., description="Numéro de séance (S1, S2, S3, S4)"),
    db: Session = Depends(get_db)
):
    """Exporte la liste des surveillants pour un créneau spécifique"""
    try:
        # Valider le format de la séance
        seance_upper = seance.upper()
        if seance_upper not in ['S1', 'S2', 'S3', 'S4']:
            raise HTTPException(
                status_code=400, 
                detail=f"Séance invalide '{seance}'. Doit être S1, S2, S3 ou S4"
            )
        
        export_service = ExportService(db)
        filepath = export_service.generer_liste_creneau_specifique(date_exam, seance_upper)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération de la liste")
        
        # Fonction pour supprimer le fichier après l'envoi
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"Erreur lors de la suppression de {path}: {str(e)}")
        
        return FileResponse(
            path=filepath,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename=os.path.basename(filepath),
            background=BackgroundTask(cleanup, filepath)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/planning-excel")
def exporter_planning_excel(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Exporte le planning complet en Excel"""
    try:
        export_service = ExportService(db)
        filepath = export_service.generer_excel_global(date_debut, date_fin)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération du fichier Excel")
        
        return FileResponse(
            path=filepath,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=os.path.basename(filepath)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.get("/fichiers")
def lister_fichiers_exports():
    """Liste tous les fichiers d'export disponibles"""
    from config import EXPORT_DIR
    
    try:
        fichiers = []
        if os.path.exists(EXPORT_DIR):
            for filename in os.listdir(EXPORT_DIR):
                filepath = os.path.join(EXPORT_DIR, filename)
                if os.path.isfile(filepath):
                    fichiers.append({
                        "nom": filename,
                        "taille": os.path.getsize(filepath),
                        "date_creation": os.path.getctime(filepath)
                    })
        
        return {
            "nb_fichiers": len(fichiers),
            "fichiers": fichiers
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.get("/fichiers/{filename}")
def telecharger_fichier(filename: str):
    """Télécharge un fichier d'export spécifique"""
    from config import EXPORT_DIR
    
    filepath = os.path.join(EXPORT_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    
    # Déterminer le type MIME
    if filename.endswith('.pdf'):
        media_type = 'application/pdf'
    elif filename.endswith('.xlsx'):
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif filename.endswith('.docx'):
        media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else:
        media_type = 'application/octet-stream'
    
    return FileResponse(
        path=filepath,
        media_type=media_type,
        filename=filename
    )
