"""
Service d'authentification et d'envoi d'emails via Gmail API avec OAuth2
"""
import os
import base64
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, List
from datetime import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from sqlalchemy.orm import Session, joinedload
from models.models import Enseignant, Examen, Affectation

logger = logging.getLogger(__name__)

# Configuration OAuth2
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events'
]

# Ces valeurs seront à configurer dans un fichier .env ou config
CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/oauth2callback")],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
    }
}


class GmailOAuthService:
    """Service pour l'authentification OAuth2 et l'envoi d'emails via Gmail API"""
    
    def __init__(self):
        self.credentials = None
        self.service = None
        self.calendar_service = None
    
    def get_authorization_url(self, state: str = None) -> str:
        """
        Génère l'URL d'autorisation OAuth2 pour rediriger l'utilisateur
        
        Args:
            state: État optionnel pour la sécurité CSRF
            
        Returns:
            URL d'autorisation Google
        """
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=CLIENT_CONFIG["web"]["redirect_uris"][0]
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='select_account'  # Force le choix du compte
        )
        
        return authorization_url, state
    
    def exchange_code_for_token(self, code: str) -> Dict:
        """
        Échange le code d'autorisation contre un token d'accès
        
        Args:
            code: Code d'autorisation reçu de Google
            
        Returns:
            Dictionnaire contenant les informations du token
        """
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=CLIENT_CONFIG["web"]["redirect_uris"][0]
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Sauvegarder les credentials
        self.credentials = credentials
        
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes,
            'expiry': credentials.expiry.isoformat() if credentials.expiry else None
        }
    
    def set_credentials_from_token(self, token_info: Dict):
        """
        Configure les credentials à partir des informations du token
        
        Args:
            token_info: Dictionnaire contenant les informations du token
        """
        self.credentials = Credentials(
            token=token_info.get('token'),
            refresh_token=token_info.get('refresh_token'),
            token_uri=token_info.get('token_uri'),
            client_id=token_info.get('client_id'),
            client_secret=token_info.get('client_secret'),
            scopes=token_info.get('scopes')
        )
        
        # Rafraîchir le token si nécessaire
        if self.credentials.expired and self.credentials.refresh_token:
            self.credentials.refresh(Request())
    
    def build_service(self):
        """Construit le service Gmail API"""
        if not self.credentials:
            raise ValueError("Credentials non configurés")
        
        self.service = build('gmail', 'v1', credentials=self.credentials)
        return self.service
    
    def build_calendar_service(self):
        """Construit le service Google Calendar API"""
        if not self.credentials:
            raise ValueError("Credentials non configurés")
        
        self.calendar_service = build('calendar', 'v3', credentials=self.credentials)
        return self.calendar_service
    
    def create_message_with_attachment(
        self,
        to: str,
        subject: str,
        body_html: str,
        attachments: Optional[List[str]] = None
    ) -> Dict:
        """
        Crée un message email avec pièces jointes
        
        Args:
            to: Destinataire
            subject: Sujet de l'email
            body_html: Corps HTML de l'email
            attachments: Liste des chemins des fichiers à attacher
            
        Returns:
            Message encodé prêt à être envoyé
        """
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Corps HTML
        msg_html = MIMEText(body_html, 'html')
        message.attach(msg_html)
        
        # Pièces jointes
        if attachments:
            for filepath in attachments:
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename={os.path.basename(filepath)}'
                        )
                        message.attach(part)
        
        # Encoder en base64
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        return {'raw': raw_message}
    
    def send_message(
        self,
        to: str,
        subject: str,
        body_html: str,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Envoie un email via Gmail API
        
        Args:
            to: Destinataire
            subject: Sujet
            body_html: Corps HTML
            attachments: Liste des fichiers à attacher
            
        Returns:
            True si succès, False sinon
        """
        try:
            if not self.service:
                self.build_service()
            
            message = self.create_message_with_attachment(to, subject, body_html, attachments)
            
            sent_message = self.service.users().messages().send(
                userId='me',
                body=message
            ).execute()
            
            logger.info(f"✅ Email envoyé à {to} (ID: {sent_message['id']})")
            return True
            
        except HttpError as error:
            logger.error(f"❌ Erreur Gmail API: {error}")
            return False
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'envoi: {str(e)}")
            return False
    
    def get_user_email(self) -> Optional[str]:
        """
        Récupère l'adresse email de l'utilisateur connecté
        
        Returns:
            Adresse email ou None
        """
        try:
            if not self.service:
                self.build_service()
            
            profile = self.service.users().getProfile(userId='me').execute()
            return profile.get('emailAddress')
            
        except Exception as e:
            logger.error(f"Erreur récupération email: {str(e)}")
            return None
    
    def create_calendar_event(
        self,
        summary: str,
        description: str,
        start_datetime: datetime,
        end_datetime: datetime,
        attendee_email: str,
        location: Optional[str] = None
    ) -> Optional[str]:
        """
        Crée un événement dans Google Calendar et envoie une invitation
        
        Args:
            summary: Titre de l'événement
            description: Description de l'événement
            start_datetime: Date et heure de début
            end_datetime: Date et heure de fin
            attendee_email: Email du participant à inviter
            location: Lieu optionnel
            
        Returns:
            ID de l'événement créé ou None en cas d'erreur
        """
        try:
            if not self.calendar_service:
                self.build_calendar_service()
            
            # Construire l'événement
            event = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_datetime.isoformat(),
                    'timeZone': 'Europe/Paris',
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'Europe/Paris',
                },
                'attendees': [
                    {'email': attendee_email}
                ],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 1 jour avant
                        {'method': 'popup', 'minutes': 60},        # 1 heure avant
                    ],
                },
            }
            
            if location:
                event['location'] = location
            
            # Créer l'événement
            event = self.calendar_service.events().insert(
                calendarId='primary',
                body=event,
                sendUpdates='all'  # Envoie les invitations par email
            ).execute()
            
            logger.info(f"✅ Événement Calendar créé: {event.get('id')} pour {attendee_email}")
            return event.get('id')
            
        except HttpError as error:
            logger.error(f"❌ Erreur Google Calendar API: {error}")
            return None
        except Exception as e:
            logger.error(f"❌ Erreur création événement: {str(e)}")
            return None


class GmailConvocationService:
    """Service pour l'envoi des convocations via Gmail API"""
    
    def __init__(self, db: Session, gmail_service: GmailOAuthService):
        self.db = db
        self.gmail_service = gmail_service
    
    def generer_corps_email(
        self,
        enseignant: Enseignant,
        affectations: List[Affectation]
    ) -> str:
        """
        Génère le corps HTML de l'email de convocation
        
        Args:
            enseignant: L'enseignant concerné
            affectations: Liste des affectations de l'enseignant
            
        Returns:
            Corps HTML de l'email
        """
        # Construire le HTML
        html = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .header {{
                    background-color: #1a237e;
                    color: white;
                    padding: 20px;
                    text-align: center;
                }}
                .content {{
                    padding: 20px;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }}
                th {{
                    background-color: #1a237e;
                    color: white;
                    padding: 12px;
                    text-align: left;
                }}
                td {{
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                }}
                tr:hover {{
                    background-color: #f5f5f5;
                }}
                .footer {{
                    margin-top: 30px;
                    padding: 20px;
                    background-color: #f5f5f5;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Convocation de Surveillance</h1>
            </div>
            
            <div class="content">
                <p>Bonjour <strong>{enseignant.prenom} {enseignant.nom}</strong>,</p>
                
                <p>Vous êtes convoqué(e) pour assurer la surveillance des examens selon le planning suivant :</p>
        """
        
        # Regrouper les affectations par séance (date + horaires) pour éviter les doublons
        seances = {}
        for aff in affectations:
            exam = aff.examen
            key = (exam.dateExam, exam.h_debut, exam.h_fin)
            if key not in seances:
                seances[key] = {
                    'date': exam.dateExam,
                    'h_debut': exam.h_debut,
                    'h_fin': exam.h_fin
                }
        
        # Trier par date puis heure de début
        seances_list = sorted(seances.values(), key=lambda x: (x['date'], x['h_debut']))
        
        # Tableau simplifié avec toutes les séances uniques
        html += """
                <table>
                    <tr>
                        <th>Date</th>
                        <th>Heure</th>
                        <th>Durée</th>
                    </tr>
        """
        
        for seance in seances_list:
            # Calculer la durée
            duree_minutes = int((seance['h_fin'].hour * 60 + seance['h_fin'].minute) - 
                               (seance['h_debut'].hour * 60 + seance['h_debut'].minute))
            duree_heures = duree_minutes // 60
            duree_reste = duree_minutes % 60
            
            if duree_heures > 0 and duree_reste > 0:
                duree_str = f"{duree_heures}h{duree_reste:02d}"
            elif duree_heures > 0:
                duree_str = f"{duree_heures}h"
            else:
                duree_str = f"{duree_reste}min"
            
            # Obtenir le jour de la semaine
            jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
            jour = jours[seance['date'].weekday()]
            
            html += f"""
                <tr>
                    <td>{jour} {seance['date'].strftime('%d/%m/%Y')}</td>
                    <td>{seance['h_debut'].strftime('%H:%M')} - {seance['h_fin'].strftime('%H:%M')}</td>
                    <td>{duree_str}</td>
                </tr>
            """
        
        html += "</table>"
        
        html += """
                <p>Merci de vous présenter <strong>15 minutes avant le début</strong> de chaque séance de surveillance.</p>
                
                <p>En cas d'empêchement, veuillez contacter immédiatement le service des examens.</p>
                
                <p>Cordialement,<br>
                <strong>Service de Gestion des Examens</strong></p>
            </div>
            
            <div class="footer">
                <p>Cet email a été généré automatiquement. Merci de ne pas y répondre.</p>
                <p>© """ + str(datetime.now().year) + """ - Système de Gestion des Surveillances</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def envoyer_convocation(
        self,
        enseignant_id: int,
        avec_piece_jointe: bool = False,
        filepath_convocation: Optional[str] = None,
        creer_evenements_calendar: bool = False
    ) -> Dict[str, any]:
        """
        Envoie une convocation à un enseignant via Gmail API
        
        Args:
            enseignant_id: ID de l'enseignant
            avec_piece_jointe: Si True, attache le PDF
            filepath_convocation: Chemin du fichier PDF
            creer_evenements_calendar: Si True, crée des événements Google Calendar
            
        Returns:
            Dictionnaire avec le résultat de l'envoi
        """
        try:
            # Récupérer l'enseignant
            enseignant = self.db.query(Enseignant).filter(
                Enseignant.id == enseignant_id
            ).first()
            
            if not enseignant:
                return {
                    'success': False,
                    'enseignant_id': enseignant_id,
                    'error': 'Enseignant non trouvé'
                }
            
            if not enseignant.email:
                return {
                    'success': False,
                    'enseignant_id': enseignant_id,
                    'enseignant': f"{enseignant.prenom} {enseignant.nom}",
                    'error': 'Email non renseigné'
                }
            
            # Récupérer les affectations
            affectations = self.db.query(Affectation).options(
                joinedload(Affectation.examen)
            ).filter(
                Affectation.enseignant_id == enseignant_id
            ).all()
            
            if not affectations:
                return {
                    'success': False,
                    'enseignant_id': enseignant_id,
                    'enseignant': f"{enseignant.prenom} {enseignant.nom}",
                    'error': 'Aucune affectation'
                }
            
            # Générer le corps de l'email
            body = self.generer_corps_email(enseignant, affectations)
            
            # Sujet de l'email
            subject = f"Convocation de Surveillance - {enseignant.prenom} {enseignant.nom}"
            
            # Pièces jointes
            attachments = []
            if avec_piece_jointe and filepath_convocation and os.path.exists(filepath_convocation):
                attachments.append(filepath_convocation)
            
            # Envoyer l'email via Gmail API
            success = self.gmail_service.send_message(
                to=enseignant.email,
                subject=subject,
                body_html=body,
                attachments=attachments
            )
            
            if not success:
                return {
                    'success': False,
                    'enseignant_id': enseignant_id,
                    'enseignant': f"{enseignant.prenom} {enseignant.nom}",
                    'error': 'Échec envoi Gmail API'
                }
            
            # Regrouper les affectations par séance pour éviter les doublons
            seances = {}
            for aff in affectations:
                exam = aff.examen
                key = (exam.dateExam, exam.h_debut, exam.h_fin)
                if key not in seances:
                    seances[key] = {
                        'date': exam.dateExam,
                        'h_debut': exam.h_debut,
                        'h_fin': exam.h_fin
                    }
            
            # Créer les événements Google Calendar si demandé
            calendar_events_created = 0
            calendar_errors = []
            
            if creer_evenements_calendar:
                # Créer un événement par séance unique
                for seance in seances.values():
                    # Combiner date et heure
                    start_dt = datetime.combine(seance['date'], seance['h_debut'])
                    end_dt = datetime.combine(seance['date'], seance['h_fin'])
                    
                    # Créer le titre de l'événement
                    event_summary = f"Surveillance d'examen"
                    
                    # Description détaillée
                    event_description = f"Surveillance d'examen\nEnseignant: {enseignant.prenom} {enseignant.nom}"
                    
                    # Créer l'événement
                    event_id = self.gmail_service.create_calendar_event(
                        summary=event_summary,
                        description=event_description,
                        start_datetime=start_dt,
                        end_datetime=end_dt,
                        attendee_email=enseignant.email,
                        location=None  # Peut être ajouté si vous avez des infos de salle
                    )
                    
                    if event_id:
                        calendar_events_created += 1
                    else:
                        calendar_errors.append(f"Échec événement du {seance['date'].strftime('%d/%m/%Y')}")
            
            result = {
                'success': True,
                'enseignant_id': enseignant_id,
                'enseignant': f"{enseignant.prenom} {enseignant.nom}",
                'email': enseignant.email
            }
            
            if creer_evenements_calendar:
                result['calendar_events_created'] = calendar_events_created
                result['calendar_events_total'] = len(seances)
                if calendar_errors:
                    result['calendar_errors'] = calendar_errors
            
            return result
                
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de la convocation: {str(e)}")
            return {
                'success': False,
                'enseignant_id': enseignant_id,
                'error': str(e)
            }
    
    def envoyer_toutes_convocations(
        self,
        avec_pieces_jointes: bool = False,
        creer_evenements_calendar: bool = False,
        session_personnalisee: str = None,
        semestre_personnalise: str = None
    ) -> Dict[str, any]:
        """
        Envoie les convocations à tous les enseignants ayant des affectations
        
        Args:
            avec_pieces_jointes: Si True, attache les fichiers PDF
            creer_evenements_calendar: Si True, crée des événements Google Calendar
            session_personnalisee: Session personnalisée à utiliser pour le nom de fichier
            semestre_personnalise: Semestre personnalisé à utiliser pour le nom de fichier
            
        Returns:
            Dictionnaire avec les résultats de l'envoi
        """
        logger.info("📧 Début de l'envoi des convocations via Gmail API...")
        
        # Récupérer tous les enseignants ayant des affectations
        enseignants_avec_affectations = self.db.query(Enseignant).join(
            Affectation
        ).filter(
            Enseignant.participe_surveillance == True
        ).distinct().all()
        
        resultats = {
            'total': len(enseignants_avec_affectations),
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        for enseignant in enseignants_avec_affectations:
            # Si on veut attacher les convocations, on doit les générer en PDF
            filepath_convocation = None
            if avec_pieces_jointes:
                try:
                    from services.export_service import ExportService
                    export_service = ExportService(self.db)
                    filepath_convocation = export_service.generer_convocation_enseignant_pdf(
                        enseignant.id,
                        session_personnalisee=session_personnalisee,
                        semestre_personnalise=semestre_personnalise
                    )
                except Exception as e:
                    logger.error(f"Erreur génération convocation PDF pour {enseignant.nom}: {str(e)}")
            
            # Envoyer la convocation
            resultat = self.envoyer_convocation(
                enseignant_id=enseignant.id,
                avec_piece_jointe=avec_pieces_jointes,
                filepath_convocation=filepath_convocation,
                creer_evenements_calendar=creer_evenements_calendar
            )
            
            resultats['details'].append(resultat)
            
            if resultat['success']:
                resultats['success'] += 1
            else:
                resultats['failed'] += 1
            
            # Nettoyer le fichier temporaire
            if filepath_convocation and os.path.exists(filepath_convocation):
                try:
                    os.remove(filepath_convocation)
                except Exception as e:
                    logger.error(f"Erreur suppression fichier: {str(e)}")
        
        logger.info(f"✅ Envoi terminé: {resultats['success']}/{resultats['total']} réussis")
        
        return resultats
