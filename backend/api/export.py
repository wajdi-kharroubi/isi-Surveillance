from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from services import ExportService
from models import ExportRequest
from datetime import date
from typing import Optional
import os

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
    """Génère les convocations individuelles pour tous les enseignants"""
    try:
        export_service = ExportService(db)
        filepaths = export_service.generer_convocations_individuelles()
        
        return {
            "success": True,
            "message": f"{len(filepaths)} convocations générées",
            "nb_fichiers": len(filepaths),
            "fichiers": [os.path.basename(f) for f in filepaths]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/listes-creneaux")
def exporter_listes_creneaux(db: Session = Depends(get_db)):
    """Génère les listes de surveillants par créneau"""
    try:
        export_service = ExportService(db)
        filepaths = export_service.generer_listes_par_creneau()
        
        return {
            "success": True,
            "message": f"{len(filepaths)} listes générées",
            "nb_fichiers": len(filepaths),
            "fichiers": [os.path.basename(f) for f in filepaths]
        }
    
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
