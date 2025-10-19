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


