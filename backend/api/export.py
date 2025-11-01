from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from database import get_db
from services import ExportService
from services.gmail_oauth_service import GmailOAuthService, GmailConvocationService
from datetime import date, datetime
from typing import Optional, Dict
from pydantic import BaseModel, EmailStr
import os
import zipfile
import tempfile

router = APIRouter(prefix="/export", tags=["Export"])


# Modèles Pydantic pour la validation
class OAuthRequest(BaseModel):
    """Requête pour obtenir l'URL d'autorisation OAuth2"""
    redirect_uri: Optional[str] = None


class OAuthCallback(BaseModel):
    """Callback OAuth2 avec le code d'autorisation"""
    code: str


class TokenInfo(BaseModel):
    """Informations du token OAuth2"""
    token: str
    refresh_token: Optional[str] = None
    token_uri: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    scopes: Optional[list] = None
    expiry: Optional[str] = None


class SendEmailsRequest(BaseModel):
    """Requête d'envoi d'emails avec token OAuth2"""
    token_info: Dict
    avec_pieces_jointes: bool = False
    creer_evenements_calendar: bool = False


class EmailResult(BaseModel):
    """Résultat de l'envoi d'emails"""
    total: int
    success: int
    failed: int
    details: list



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


# ===== NOUVEAUX ENDPOINTS POUR EXPORT PDF =====

@router.post("/convocationsPDF")
def exporter_convocations_pdf(db: Session = Depends(get_db)):
    """Génère les convocations individuelles en PDF pour tous les enseignants et retourne un fichier ZIP"""
    try:
        export_service = ExportService(db)
        filepaths = export_service.generer_convocations_individuelles_pdf()
        
        if not filepaths:
            raise HTTPException(status_code=404, detail="Aucune convocation à générer")
        
        # Créer un fichier ZIP temporaire
        zip_filename = f"convocations_PDF_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
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
            background=None
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/listes-creneauxPDF")
def exporter_listes_creneaux_pdf(db: Session = Depends(get_db)):
    """Génère les listes de surveillants par créneau en PDF et retourne un fichier ZIP"""
    try:
        export_service = ExportService(db)
        filepaths = export_service.generer_listes_par_creneau_pdf()
        
        if not filepaths:
            raise HTTPException(status_code=404, detail="Aucune liste à générer")
        
        # Créer un fichier ZIP temporaire
        zip_filename = f"listes_creneaux_PDF_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
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
            background=None
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/convocationPDF/{enseignant_id}")
def exporter_convocation_enseignant_pdf(
    enseignant_id: int,
    db: Session = Depends(get_db)
):
    """Exporte la convocation PDF d'un enseignant spécifique"""
    try:
        export_service = ExportService(db)
        filepath = export_service.generer_convocation_enseignant_pdf(enseignant_id)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération de la convocation PDF")
        
        # Fonction pour supprimer le fichier après l'envoi
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"Erreur lors de la suppression de {path}: {str(e)}")
        
        return FileResponse(
            path=filepath,
            media_type='application/pdf',
            filename=os.path.basename(filepath),
            background=BackgroundTask(cleanup, filepath)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/liste-creneauPDF")
def exporter_liste_creneau_pdf(
    date_exam: date = Query(..., description="Date de l'examen"),
    seance: str = Query(..., description="Numéro de séance (S1, S2, S3, S4)"),
    db: Session = Depends(get_db)
):
    """Exporte la liste PDF des surveillants pour un créneau spécifique"""
    try:
        # Valider le format de la séance
        seance_upper = seance.upper()
        if seance_upper not in ['S1', 'S2', 'S3', 'S4']:
            raise HTTPException(
                status_code=400, 
                detail=f"Séance invalide '{seance}'. Doit être S1, S2, S3 ou S4"
            )
        
        export_service = ExportService(db)
        filepath = export_service.generer_liste_creneau_specifique_pdf(date_exam, seance_upper)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération de la liste PDF")
        
        # Fonction pour supprimer le fichier après l'envoi
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"Erreur lors de la suppression de {path}: {str(e)}")
        
        return FileResponse(
            path=filepath,
            media_type='application/pdf',
            filename=os.path.basename(filepath),
            background=BackgroundTask(cleanup, filepath)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


# ===== NOUVEAUX ENDPOINTS POUR EXPORT CSV ET XLSX =====

@router.get("/convocations/csv")
def exporter_convocations_csv(db: Session = Depends(get_db)):
    """Exporte toutes les convocations au format CSV avec la structure des souhaits"""
    try:
        export_service = ExportService(db)
        filepath = export_service.generer_convocations_csv()
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération du fichier CSV")
        
        # Fonction pour supprimer le fichier après l'envoi
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"Erreur lors de la suppression de {path}: {str(e)}")
        
        return FileResponse(
            path=filepath,
            media_type='text/csv',
            filename=os.path.basename(filepath),
            background=BackgroundTask(cleanup, filepath)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.get("/convocations/xlsx")
def exporter_convocations_xlsx(db: Session = Depends(get_db)):
    """Exporte toutes les convocations au format XLSX avec la structure des souhaits"""
    try:
        export_service = ExportService(db)
        filepath = export_service.generer_convocations_xlsx()
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Erreur lors de la génération du fichier Excel")
        
        # Fonction pour supprimer le fichier après l'envoi
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"Erreur lors de la suppression de {path}: {str(e)}")
        
        return FileResponse(
            path=filepath,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=os.path.basename(filepath),
            background=BackgroundTask(cleanup, filepath)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


# ===== NOUVEAUX ENDPOINTS POUR GMAIL OAUTH2 =====

@router.get("/gmail/auth-url")
def get_gmail_auth_url():
    """
    Génère l'URL d'autorisation OAuth2 Google
    
    Returns:
        URL d'autorisation pour rediriger l'utilisateur
    """
    try:
        gmail_service = GmailOAuthService()
        auth_url, state = gmail_service.get_authorization_url()
        
        return {
            "authorization_url": auth_url,
            "state": state
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/gmail/oauth-callback")
def handle_oauth_callback(callback: OAuthCallback):
    """
    Gère le callback OAuth2 et échange le code contre un token
    
    Args:
        callback: Code d'autorisation reçu de Google
    
    Returns:
        Informations du token à sauvegarder côté client
    """
    try:
        gmail_service = GmailOAuthService()
        token_info = gmail_service.exchange_code_for_token(callback.code)
        
        # Récupérer l'email de l'utilisateur
        email = gmail_service.get_user_email()
        
        return {
            "success": True,
            "token_info": token_info,
            "user_email": email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/gmail/envoyer-convocations")
def envoyer_convocations_gmail(
    request: SendEmailsRequest,
    db: Session = Depends(get_db)
):
    """
    Envoie les convocations par email via Gmail API avec OAuth2
    
    Args:
        request: Token OAuth2 et options d'envoi
        db: Session de base de données
    
    Returns:
        Résultats de l'envoi avec détails par enseignant
    """
    try:
        # Créer le service Gmail OAuth
        gmail_service = GmailOAuthService()
        gmail_service.set_credentials_from_token(request.token_info)
        
        # Créer le service de convocation
        convocation_service = GmailConvocationService(db, gmail_service)
        
        # Envoyer toutes les convocations
        resultats = convocation_service.envoyer_toutes_convocations(
            avec_pieces_jointes=request.avec_pieces_jointes,
            creer_evenements_calendar=request.creer_evenements_calendar
        )
        
        return resultats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/gmail/tester-token")
def tester_token_gmail(token_info: Dict):
    """
    Teste si le token Gmail OAuth2 est valide
    
    Args:
        token_info: Informations du token
    
    Returns:
        Statut du token et email de l'utilisateur
    """
    try:
        gmail_service = GmailOAuthService()
        gmail_service.set_credentials_from_token(token_info)
        
        # Récupérer l'email de l'utilisateur
        email = gmail_service.get_user_email()
        
        if email:
            return {
                "success": True,
                "user_email": email,
                "message": "Token valide"
            }
        else:
            return {
                "success": False,
                "message": "Token invalide ou expiré"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
