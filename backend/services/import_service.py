import pandas as pd
from sqlalchemy.orm import Session
from models.models import Enseignant, Voeu, Examen, Salle
from typing import List, Dict, Tuple
from datetime import datetime
import logging
from config import GRADES

logger = logging.getLogger(__name__)


class ImportService:
    """Service pour l'importation de fichiers Excel"""
    
    @staticmethod
    def importer_enseignants(file_path: str, db: Session) -> Tuple[int, List[str]]:
        """
        Importe les enseignants depuis un fichier Excel.
        ATTENTION : Supprime tous les enseignants existants avant l'import !
        
        Colonnes attendues:
        - nom_ens: Nom de famille
        - prenom_ens: Prénom
        - email_ens: Email (identifiant unique)
        - grade_code_ens: Code du grade (PES, MA, PA, AH, AS, TE, PH)
        - code_smartex_ens: Code SmartEx (identifiant)
        - participe_surveillance: "vrai" ou "faux" (optionnel, vrai par défaut)
        
        Le nom complet du grade (grade_ens) est déduit automatiquement du code.
        
        Returns:
            (nombre_importes, erreurs)
        """
        erreurs = []
        count = 0
        
        try:
            # SUPPRIMER TOUS LES ENSEIGNANTS EXISTANTS
            nb_supprimes = db.query(Enseignant).delete()
            logger.info(f"🗑️  {nb_supprimes} enseignants supprimés avant import")
            db.commit()
            
            df = pd.read_excel(file_path)
            
            # Vérification des colonnes obligatoires (sans grade_ens)
            colonnes_requises = [
                'nom_ens', 'prenom_ens', 'email_ens', 
                'grade_code_ens', 'code_smartex_ens'
            ]
            colonnes_manquantes = [col for col in colonnes_requises if col not in df.columns]
            
            if colonnes_manquantes:
                erreurs.append(f"Colonnes manquantes: {', '.join(colonnes_manquantes)}")
                return 0, erreurs
            
            # Import ligne par ligne
            for idx, row in df.iterrows():
                try:
                    # Récupérer le code du grade et valider
                    grade_code = str(row['grade_code_ens']).strip().upper()
                    
                    if grade_code not in GRADES:
                        erreurs.append(
                            f"Ligne {idx + 2}: Grade '{grade_code}' invalide. "
                            f"Valeurs acceptées: {', '.join(GRADES.keys())}"
                        )
                        continue
                    
                    # Déduire le nom complet du grade depuis le code
                    grade_nom = GRADES[grade_code]["nom"]
                    
                    # Gérer participe_surveillance (vrai/faux ou True/False)
                    participe = True  # Valeur par défaut
                    if 'participe_surveillance' in df.columns:
                        val = str(row['participe_surveillance']).strip().lower()
                        if val in ['faux', 'false', '0', 'non', 'no']:
                            participe = False
                        elif val in ['vrai', 'true', '1', 'oui', 'yes']:
                            participe = True
                    
                    # Convertir code_smartex en entier pour éviter les .0
                    code_smartex_raw = row['code_smartex_ens']
                    try:
                        code_smartex = str(int(float(code_smartex_raw)))
                    except (ValueError, TypeError):
                        code_smartex = str(code_smartex_raw).strip()
                    
                    # Créer l'enseignant (pas besoin de vérifier l'existence, tout est supprimé avant)
                    enseignant = Enseignant(
                        nom=str(row['nom_ens']).strip(),
                        prenom=str(row['prenom_ens']).strip(),
                        email=str(row['email_ens']).strip().lower(),
                        grade=grade_nom,
                        grade_code=grade_code,
                        code_smartex=code_smartex,
                        participe_surveillance=participe
                    )
                    db.add(enseignant)
                    count += 1
                    
                except Exception as e:
                    erreurs.append(f"Ligne {idx + 2}: {str(e)}")
            
            db.commit()
            logger.info(f"✅ {count} enseignants importés avec succès")
            
        except Exception as e:
            erreurs.append(f"Erreur lors de la lecture du fichier: {str(e)}")
            logger.error(f"Erreur import enseignants: {str(e)}")
        
        return count, erreurs
    
    @staticmethod
    def importer_voeux(file_path: str, db: Session) -> Tuple[int, List[str]]:
        """
        Importe les vœux de non-surveillance depuis un fichier Excel.
        ATTENTION : Supprime tous les vœux existants avant l'import !
        
        Colonnes attendues:
        - code_smartex_ens
        - nom_ens (optionnel)
        - prenom_ens (optionnel)
        - jours_dispo (format: YYYY-MM-DD ou DD/MM/YYYY)
        - seance_dispo (Matin ou Après-midi)
        
        Returns:
            (nombre_importes, erreurs)
        """
        erreurs = []
        count = 0
        
        try:
            # SUPPRIMER TOUS LES VŒUX EXISTANTS
            nb_supprimes = db.query(Voeu).delete()
            logger.info(f"🗑️  {nb_supprimes} vœux supprimés avant import")
            db.commit()
            
            df = pd.read_excel(file_path)
            
            # Vérification des colonnes obligatoires
            colonnes_requises = [
                'semestre_code.libelle', 'session.libelle', 
                'enseignant_uuid.nom_ens', 'enseignant_uuid.prenom_ens', 
                'jour', 'seance'
            ]
            colonnes_manquantes = [col for col in colonnes_requises if col not in df.columns]
            
            if colonnes_manquantes:
                erreurs.append(f"Colonnes manquantes: {', '.join(colonnes_manquantes)}")
                return 0, erreurs
            
            # Mapping des séances vers les horaires
            seance_mapping = {
                'S1': 'Matin',      # 08:30-10:00
                'S2': 'Matin',      # 10:30-12:00
                'S3': 'Après-midi', # 12:30-14:00
                'S4': 'Après-midi'  # 14:30-16:00
            }
            
            # Import ligne par ligne
            for idx, row in df.iterrows():
                try:
                    # Rechercher l'enseignant par nom et prénom
                    nom = str(row['enseignant_uuid.nom_ens']).strip()
                    prenom = str(row['enseignant_uuid.prenom_ens']).strip()
                    
                    enseignant = db.query(Enseignant).filter(
                        Enseignant.nom == nom,
                        Enseignant.prenom == prenom
                    ).first()
                    
                    if not enseignant:
                        erreurs.append(f"Ligne {idx + 2}: Enseignant {prenom} {nom} introuvable")
                        continue
                    
                    # Récupérer le jour (indice entier)
                    jour = int(row['jour'])
                    
                    # Récupérer et valider la séance
                    seance = str(row['seance']).strip().upper()
                    if seance not in seance_mapping:
                        erreurs.append(f"Ligne {idx + 2}: Séance invalide '{seance}' (doit être S1, S2, S3 ou S4)")
                        continue
                    
                    # Récupérer semestre et session directement depuis Excel
                    semestre_code_libelle = str(row['semestre_code.libelle']).strip()
                    session_libelle = str(row['session.libelle']).strip()
                    
                    # Créer le vœu (ajout du code_smartex_ens)
                    voeu = Voeu(
                        enseignant_id=enseignant.id,
                        code_smartex_ens=enseignant.code_smartex,
                        jour=jour,
                        seance=seance,
                        semestre_code_libelle=semestre_code_libelle,
                        session_libelle=session_libelle
                    )
                    db.add(voeu)
                    count += 1
                    
                except Exception as e:
                    erreurs.append(f"Ligne {idx + 2}: {str(e)}")
            
            db.commit()
            logger.info(f"✅ {count} vœux importés avec succès")
            
        except Exception as e:
            erreurs.append(f"Erreur lors de la lecture du fichier: {str(e)}")
            logger.error(f"Erreur import vœux: {str(e)}")
        
        return count, erreurs
    
    @staticmethod
    def importer_examens(file_path: str, db: Session) -> Tuple[int, List[str]]:
        """
        Importe les examens depuis un fichier Excel.
        ATTENTION : Supprime tous les examens existants avant l'import !
        
        Colonnes attendues:
        - dateExam (format: YYYY-MM-DD ou DD/MM/YYYY)
        - h_début (format: HH:MM)
        - h_fin (format: HH:MM)
        - session (P ou C, ou Principale/Contrôle)
        - type_ex
        - semestre
        - enseignant (code_smartex)
        - cod_salle
        
        Returns:
            (nombre_importes, erreurs)
        """
        erreurs = []
        count = 0
        
        try:
            # SUPPRIMER TOUS LES EXAMENS EXISTANTS
            nb_supprimes = db.query(Examen).delete()
            logger.info(f"🗑️  {nb_supprimes} examens supprimés avant import")
            db.commit()
            
            df = pd.read_excel(file_path)
            
            # Normaliser les noms de colonnes (gérer différents formats)
            # Remplacer 'h_debut' par 'h_début' et 'type ex' par 'type_ex'
            df.columns = df.columns.str.strip()  # Supprimer espaces
            column_mapping = {
                'h_debut': 'h_début',
                'type ex': 'type_ex',
                'type_ex': 'type_ex',  # Garder si déjà correct
            }
            df.rename(columns=column_mapping, inplace=True)
            
            logger.info(f"📋 Colonnes détectées: {df.columns.tolist()}")
            
            # Vérification des colonnes obligatoires
            colonnes_requises = [
                'dateExam', 'h_début', 'h_fin', 'session', 
                'type_ex', 'semestre', 'enseignant', 'cod_salle'
            ]
            colonnes_manquantes = [col for col in colonnes_requises if col not in df.columns]
            
            if colonnes_manquantes:
                erreurs.append(f"Colonnes manquantes: {', '.join(colonnes_manquantes)}")
                logger.error(f"❌ Colonnes manquantes: {colonnes_manquantes}")
                logger.info(f"📋 Colonnes disponibles: {df.columns.tolist()}")
                return 0, erreurs
            
            # Import ligne par ligne
            for idx, row in df.iterrows():
                try:
                    logger.debug(f"Traitement ligne {idx + 1}: dateExam={row['dateExam']}, h_début={row['h_début']}")
                    
                    # Parser la date (format j/m/a ou j/m/a h:m:s)
                    date_exam = pd.to_datetime(row['dateExam'], dayfirst=True).date()
                    logger.debug(f"  date_exam parsée: {date_exam}")
                    
                    # Parser les heures (format j/m/a h:m:s)
                    h_debut = pd.to_datetime(row['h_début'], dayfirst=True).time()
                    h_fin = pd.to_datetime(row['h_fin'], dayfirst=True).time()
                    logger.debug(f"  heures parsées: {h_debut} - {h_fin}")
                    
                    # Session : garder tel quel (P, C, Principale, Contrôle)
                    session = str(row['session']).strip()
                    
                    # Type d'examen : garder tel quel
                    type_ex = str(row['type_ex']).strip()
                    
                    # Semestre : garder tel quel
                    semestre = str(row['semestre']).strip()
                    
                    # Code salle : garder tel quel (string)
                    cod_salle = str(row['cod_salle']).strip()
                    
                    # Enseignant : stocker le code_smartex directement (string)
                    enseignant_code = str(int(row['enseignant']))  # Convertir en int puis string pour éviter les .0
                    
                    logger.debug(f"  Création examen: session={session}, type={type_ex}, semestre={semestre}, enseignant={enseignant_code}, salle={cod_salle}")
                    
                    # Créer l'examen avec les colonnes exactes d'Excel
                    examen = Examen(
                        dateExam=date_exam,
                        h_debut=h_debut,
                        h_fin=h_fin,
                        session=session,
                        type_ex=type_ex,
                        semestre=semestre,
                        enseignant=enseignant_code,
                        cod_salle=cod_salle
                    )
                    db.add(examen)
                    count += 1
                    logger.debug(f"  ✅ Examen {count} ajouté")
                    
                except Exception as e:
                    erreur_msg = f"Ligne {idx + 2}: {str(e)}"
                    erreurs.append(erreur_msg)
                    logger.error(f"❌ {erreur_msg}")
            
            if count > 0:
                db.commit()
                logger.info(f"✅ {count} examens importés avec succès")
            else:
                logger.warning(f"⚠️ Aucun examen importé. Erreurs: {erreurs}")
            
        except Exception as e:
            erreurs.append(f"Erreur lors de la lecture du fichier: {str(e)}")
            logger.error(f"Erreur import examens: {str(e)}")
        
        return count, erreurs
