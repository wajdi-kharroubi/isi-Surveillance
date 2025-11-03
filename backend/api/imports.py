from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from services import ImportService
from config import UPLOAD_DIR
from models.models import GenerationStatistique, Presence, SouhaitViole, ResponsableAbsent, DepassementMaxJour
import os
import shutil
import logging

router = APIRouter(prefix="/import", tags=["Import"])
logger = logging.getLogger(__name__)


def vider_statistiques_generation(db: Session):
    """Vide toutes les tables de statistiques de génération"""
    try:
        # Supprimer d'abord les tables enfants (à cause des clés étrangères)
        db.query(SouhaitViole).delete()
        db.query(ResponsableAbsent).delete()
        db.query(DepassementMaxJour).delete()
        db.query(Presence).delete()
        # Puis la table parent
        db.query(GenerationStatistique).delete()
        db.commit()
        logger.info("Statistiques de génération et présences vidées suite à l'importation")
    except Exception as e:
        logger.warning(f"Erreur lors de la suppression des statistiques: {str(e)}")
        db.rollback()



@router.post("/enseignants")
async def importer_enseignants(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importe les enseignants depuis un fichier Excel"""
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format Excel (.xlsx ou .xls)")
    
    # Vider les statistiques de génération
    vider_statistiques_generation(db)
    
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
    
    # Vider les statistiques de génération
    vider_statistiques_generation(db)
    
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
    
    # Vider les statistiques de génération
    vider_statistiques_generation(db)
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        count, erreurs, nb_doublons = ImportService.importer_examens(file_path, db)
        
        os.remove(file_path)
        
        # Construire le message avec info sur les doublons
        message = f"{count} examens importés avec succès"
        if nb_doublons > 0:
            message += f" ({nb_doublons} doublons ignorés)"
        
        return {
            "success": True,
            "message": message,
            "nb_importes": count,
            "nb_doublons": nb_doublons,
            "erreurs": erreurs
        }
    
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")
