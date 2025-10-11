from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from services import ImportService
from config import UPLOAD_DIR
import os
import shutil

router = APIRouter(prefix="/import", tags=["Import"])


@router.post("/enseignants")
async def importer_enseignants(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importe les enseignants depuis un fichier Excel"""
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format Excel (.xlsx ou .xls)")
    
    # Sauvegarder temporairement le fichier
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Importer
        count, erreurs = ImportService.importer_enseignants(file_path, db)
        
        # Nettoyer
        os.remove(file_path)
        
        return {
            "success": True,
            "message": f"{count} enseignants importés avec succès",
            "nb_importes": count,
            "erreurs": erreurs
        }
    
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")


@router.post("/voeux")
async def importer_voeux(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importe les vœux de non-surveillance depuis un fichier Excel"""
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format Excel (.xlsx ou .xls)")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        count, erreurs = ImportService.importer_voeux(file_path, db)
        
        os.remove(file_path)
        
        return {
            "success": True,
            "message": f"{count} vœux importés avec succès",
            "nb_importes": count,
            "erreurs": erreurs
        }
    
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")


@router.post("/examens")
async def importer_examens(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importe les examens depuis un fichier Excel"""
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format Excel (.xlsx ou .xls)")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        count, erreurs = ImportService.importer_examens(file_path, db)
        
        os.remove(file_path)
        
        return {
            "success": True,
            "message": f"{count} examens importés avec succès",
            "nb_importes": count,
            "erreurs": erreurs
        }
    
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")
