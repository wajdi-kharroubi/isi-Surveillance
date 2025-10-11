from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import pandas as pd
from sqlalchemy.orm import Session, joinedload
from models.models import Enseignant, Examen, Affectation
from datetime import datetime, date
from typing import List, Dict
import os
from config import EXPORT_DIR
import logging

logger = logging.getLogger(__name__)


class ExportService:
    """Service pour l'export de documents (PDF, Word, Excel)"""
    
    def __init__(self, db: Session):
        self.db = db
        self.export_dir = EXPORT_DIR
    
    @staticmethod
    def _convertir_session(code_session: str) -> str:
        """Convertit le code de session en texte complet
        
        Args:
            code_session: Code de la session (P, R, etc.)
            
        Returns:
            Texte complet de la session (Principale, Rattrapage, etc.)
        """
        conversions = {
            'P': 'Principale',
            'R': 'Rattrapage',
            'C': 'Contrôle'  # Au cas où
        }
        return conversions.get(code_session, code_session)
    
    @staticmethod
    def _determiner_numero_seance(h_debut) -> str:
        """Détermine le numéro de séance en fonction de l'heure de début
        
        Args:
            h_debut: Heure de début de la séance (time object)
            
        Returns:
            Numéro de séance (S1, S2, S3, S4)
        """
        from datetime import time
        
        # Convertir en minutes depuis minuit pour faciliter la comparaison
        heure_minutes = h_debut.hour * 60 + h_debut.minute
        
        # Définir les plages horaires
        # S1: 8:30-10:00 (510-600 minutes)
        # S2: 10:30-12:00 (630-720 minutes)
        # S3: 12:30-14:00 (750-840 minutes)  
        # S4: 14:30-16:00 (870-960 minutes)
        
        if 510 <= heure_minutes < 630:  # 8:30 - 10:29
            return "S1"
        elif 630 <= heure_minutes < 750:  # 10:30 - 12:29
            return "S2"
        elif 750 <= heure_minutes < 870:  # 12:30 - 14:29
            return "S3"
        elif 870 <= heure_minutes < 1020:  # 14:30 - 16:59
            return "S4"
        else:
            # Par défaut, retourner basé sur l'heure
            if heure_minutes < 630:
                return "S1"
            elif heure_minutes < 750:
                return "S2"
            elif heure_minutes < 870:
                return "S3"
            else:
                return "S4"
    
    def generer_planning_global_pdf(self, date_debut: date = None, date_fin: date = None) -> str:
        """Génère le planning global en PDF"""
        filename = f"planning_global_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(self.export_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Titre
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("PLANNING GLOBAL DES SURVEILLANCES", title_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Requête des examens avec filtres de date
        query = self.db.query(Examen)
        if date_debut:
            query = query.filter(Examen.dateExam >= date_debut)
        if date_fin:
            query = query.filter(Examen.dateExam <= date_fin)
        
        examens = query.order_by(Examen.dateExam, Examen.h_debut).all()
        
        # Grouper par date
        examens_par_date = {}
        for examen in examens:
            date_key = examen.dateExam
            if date_key not in examens_par_date:
                examens_par_date[date_key] = []
            examens_par_date[date_key].append(examen)
        
        # Générer le contenu pour chaque date
        for date_exam, liste_examens in sorted(examens_par_date.items()):
            # Titre de la date
            date_style = ParagraphStyle(
                'DateStyle',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=colors.HexColor('#0d47a1'),
                spaceAfter=10
            )
            elements.append(Paragraph(f"Date: {date_exam.strftime('%d/%m/%Y')}", date_style))
            
            # Tableau des examens
            data = [['Horaire', 'Salle', 'Session', 'Semestre', 'Surveillants']]
            
            for examen in liste_examens:
                affectations = self.db.query(Affectation).options(
                    joinedload(Affectation.enseignant)
                ).filter(
                    Affectation.examen_id == examen.id
                ).all()
                
                surveillants = []
                for aff in affectations:
                    ens = aff.enseignant
                    nom_complet = f"{ens.nom} {ens.prenom}"
                    if aff.est_responsable:
                        nom_complet += " (R)"
                    surveillants.append(nom_complet)
                
                # Enlever les doublons (car plusieurs enseignants peuvent être dans la même salle)
                surveillants = list(dict.fromkeys(surveillants))
                
                horaire = f"{examen.h_debut.strftime('%H:%M')} - {examen.h_fin.strftime('%H:%M')}"
                salle = examen.cod_salle
                # Convertir le code de session en texte complet
                session = self._convertir_session(examen.session)
                semestre = examen.semestre
                surveillants_str = "\n".join(surveillants[:3]) if surveillants else "Non affecté"
                if len(surveillants) > 3:
                    surveillants_str += f"\n+ {len(surveillants) - 3} autres"
                
                data.append([horaire, salle, session, semestre, surveillants_str])
            
            table = Table(data, colWidths=[3*cm, 2.5*cm, 2*cm, 3*cm, 7*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 0.5*cm))
        
        # Générer le PDF
        doc.build(elements)
        logger.info(f"✅ Planning global PDF généré: {filepath}")
        return filepath
    
    def generer_convocations_individuelles(self) -> List[str]:
        """Génère les convocations individuelles pour chaque enseignant (Word + PDF)"""
        filepaths = []
        
        enseignants = self.db.query(Enseignant).all()
        
        for enseignant in enseignants:
            # Récupérer les affectations
            affectations = self.db.query(Affectation).options(
                joinedload(Affectation.examen)
            ).filter(
                Affectation.enseignant_id == enseignant.id
            ).join(Examen).order_by(Examen.dateExam, Examen.h_debut).all()
            
            if not affectations:
                continue
            
            # Générer Word
            filename_word = f"convocation_{enseignant.nom}_{enseignant.prenom}_{datetime.now().strftime('%Y%m%d')}.docx"
            filepath_word = os.path.join(self.export_dir, filename_word)
            self._generer_convocation_word(enseignant, affectations, filepath_word)
            filepaths.append(filepath_word)
        
        logger.info(f"✅ {len(filepaths)} convocations générées")
        return filepaths
    
    def _generer_convocation_word(self, enseignant: Enseignant, affectations: List[Affectation], filepath: str):
        """Génère une convocation Word pour un enseignant"""
        doc = Document()
        
        # En-tête "Note à"
        note_para = doc.add_paragraph()
        note_para.add_run('Note à\n').bold = True
        note_para.add_run(f'M./Mme {enseignant.nom} {enseignant.prenom}')
        
        doc.add_paragraph()
        
        # Message d'accueil
        doc.add_paragraph('Cher(e) Collègue,')
        
        doc.add_paragraph()
        
        # Message principal
        doc.add_paragraph(
            "Vous êtes prié(e) d'assurer la surveillance et (ou) la responsabilité des examens "
            "selon le calendrier ci-joint."
        )
        
        doc.add_paragraph()
        
        # Regrouper les affectations par séance (date + horaires) pour éviter les doublons
        seances = {}
        for aff in affectations:
            examen = aff.examen
            key = (examen.dateExam, examen.h_debut, examen.h_fin)
            if key not in seances:
                seances[key] = {
                    'date': examen.dateExam,
                    'h_debut': examen.h_debut,
                    'h_fin': examen.h_fin
                }
        
        # Trier par date puis heure de début
        seances_list = sorted(seances.values(), key=lambda x: (x['date'], x['h_debut']))
        
        # Tableau des surveillances simplifié : Date | Heure | Durée
        table = doc.add_table(rows=1, cols=3)
        table.style = 'Light Grid Accent 1'
        
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = 'Date'
        hdr_cells[1].text = 'Heure'
        hdr_cells[2].text = 'Durée'
        
        # Rendre l'en-tête en gras
        for cell in hdr_cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.bold = True
        
        for seance in seances_list:
            row_cells = table.add_row().cells
            row_cells[0].text = seance['date'].strftime('%d/%m/%Y')
            row_cells[1].text = seance['h_debut'].strftime('%H:%M')
            
            # Calculer la durée
            h_debut = seance['h_debut']
            h_fin = seance['h_fin']
            # Convertir en minutes pour calculer la durée
            debut_minutes = h_debut.hour * 60 + h_debut.minute
            fin_minutes = h_fin.hour * 60 + h_fin.minute
            duree_minutes = fin_minutes - debut_minutes
            
            # Formater la durée (ex: "2h00" ou "1h30")
            heures = duree_minutes // 60
            minutes = duree_minutes % 60
            if minutes > 0:
                duree_str = f"{heures}h{minutes:02d}"
            else:
                duree_str = f"{heures}h00"
            
            row_cells[2].text = duree_str
        
        doc.add_paragraph()
        
        # Pied de page
        doc.add_paragraph("Nous comptons sur votre présence.")
        doc.add_paragraph()
        
        signature = doc.add_paragraph("Le Responsable des Examens")
        signature.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        
        # Sauvegarder
        doc.save(filepath)
    
    def generer_listes_par_creneau(self) -> List[str]:
        """Génère les listes de surveillants par créneau (Word) - Un fichier par jour avec toutes les séances"""
        filepaths = []
        
        # Récupérer tous les examens
        examens = self.db.query(Examen).order_by(
            Examen.dateExam, Examen.h_debut
        ).all()
        
        # Grouper d'abord par date, puis par créneau
        jours = {}
        for examen in examens:
            date_key = examen.dateExam
            if date_key not in jours:
                jours[date_key] = {}
            
            creneau_key = (examen.h_debut, examen.h_fin)
            if creneau_key not in jours[date_key]:
                jours[date_key][creneau_key] = []
            jours[date_key][creneau_key].append(examen)
        
        # Générer un document par jour avec toutes ses séances
        for date_exam, creneaux in sorted(jours.items()):
            filename = f"listes_seances_{date_exam.strftime('%Y%m%d')}.docx"
            filepath = os.path.join(self.export_dir, filename)
            
            # Créer un document avec toutes les séances du jour
            doc = Document()
            
            # Trier les créneaux par heure de début
            creneaux_tries = sorted(creneaux.items(), key=lambda x: x[0][0])
            
            for idx, ((h_debut, h_fin), liste_examens) in enumerate(creneaux_tries):
                # Ajouter le contenu de la séance
                self._ajouter_seance_au_document(doc, date_exam, h_debut, h_fin, liste_examens)
                
                # Ajouter un saut de page sauf pour la dernière séance
                if idx < len(creneaux_tries) - 1:
                    doc.add_page_break()
            
            # Sauvegarder le document
            doc.save(filepath)
            filepaths.append(filepath)
        
        logger.info(f"✅ {len(filepaths)} fichiers générés (un par jour)")
        return filepaths
    
    def _ajouter_seance_au_document(
        self, 
        doc: Document,
        date_exam: date, 
        h_debut, 
        h_fin, 
        examens: List[Examen]
    ):
        """Ajoute une séance à un document Word existant"""
        
        # Pour chaque groupe (même session/semestre) dans ce créneau
        # Regrouper les examens par session et semestre
        groupes = {}
        for examen in examens:
            cle = (examen.session, examen.semestre)
            if cle not in groupes:
                groupes[cle] = []
            groupes[cle].append(examen)
        
        # Générer un tableau pour chaque groupe session/semestre
        for (session, semestre), examens_groupe in groupes.items():
            # Convertir le code de session en texte complet
            session_text = self._convertir_session(session)
            
            # Déterminer le numéro de séance en fonction de l'heure
            numero_seance = self._determiner_numero_seance(h_debut)
            
            # En-tête avec les informations
            p = doc.add_paragraph()
            p.add_run(f"AU : 2024-2025 – Semestre : {semestre.split()[-1]} – Session : {session_text}").bold = True
            
            p2 = doc.add_paragraph()
            p2.add_run(f"Date : {date_exam.strftime('%d/%m/%Y')} – Heure : {h_debut.strftime('%H:%M')}-{h_fin.strftime('%H:%M')} Séance : {numero_seance}")
            
            doc.add_paragraph()
            
            # Récupérer tous les enseignants affectés à ce créneau
            enseignants_affectes = []
            for examen in examens_groupe:
                affectations = self.db.query(Affectation).options(
                    joinedload(Affectation.enseignant)
                ).filter(
                    Affectation.examen_id == examen.id
                ).all()
                
                for aff in affectations:
                    # Éviter les doublons
                    if not any(e['id'] == aff.enseignant.id for e in enseignants_affectes):
                        enseignants_affectes.append({
                            'id': aff.enseignant.id,
                            'nom': aff.enseignant.nom,
                            'prenom': aff.enseignant.prenom
                        })
            
            # Créer le tableau avec 3 colonnes : Enseignant | Salle | Signature
            if enseignants_affectes:
                table = doc.add_table(rows=1, cols=3)
                table.style = 'Light Grid Accent 1'
                
                # En-têtes
                hdr_cells = table.rows[0].cells
                hdr_cells[0].text = 'Enseignant'
                hdr_cells[1].text = 'Salle'
                hdr_cells[2].text = 'Signature'
                
                # Ajouter chaque enseignant
                for ens in sorted(enseignants_affectes, key=lambda x: (x['nom'], x['prenom'])):
                    row_cells = table.add_row().cells
                    row_cells[0].text = f"{ens['nom']} {ens['prenom']}"
                    row_cells[1].text = ''  # Champ vide
                    row_cells[2].text = ''  # Champ vide
            else:
                doc.add_paragraph("⚠️ Aucun surveillant affecté", style='Intense Quote')
            
            doc.add_paragraph()  # Espace entre les groupes
    
    def generer_excel_global(self, date_debut: date = None, date_fin: date = None) -> str:
        """Génère un fichier Excel avec toutes les affectations"""
        filename = f"planning_excel_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(self.export_dir, filename)
        
        # Récupérer les données
        query = self.db.query(Affectation).options(
            joinedload(Affectation.examen),
            joinedload(Affectation.enseignant)
        ).join(Examen)
        if date_debut:
            query = query.filter(Examen.dateExam >= date_debut)
        if date_fin:
            query = query.filter(Examen.dateExam <= date_fin)
        
        affectations = query.all()
        
        # Préparer les données
        data = []
        for aff in affectations:
            examen = aff.examen
            enseignant = aff.enseignant
            
            # Convertir le code de session en texte complet
            session_text = self._convertir_session(examen.session)
            
            data.append({
                'Date': examen.dateExam.strftime('%d/%m/%Y'),
                'Horaire Début': examen.h_debut.strftime('%H:%M'),
                'Horaire Fin': examen.h_fin.strftime('%H:%M'),
                'Salle': aff.cod_salle,
                'Session': session_text,
                'Type': examen.type_ex,
                'Semestre': examen.semestre,
                'Enseignant': f"{enseignant.nom} {enseignant.prenom}",
                'Grade': enseignant.grade_code,
                'Email': enseignant.email,
                'Rôle': "Responsable" if aff.est_responsable else "Surveillant"
            })
        
        # Créer le DataFrame
        df = pd.DataFrame(data)
        
        # Sauvegarder
        df.to_excel(filepath, index=False, sheet_name='Planning')
        
        logger.info(f"✅ Planning Excel généré: {filepath}")
        return filepath
