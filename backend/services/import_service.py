import pandas as pd
from sqlalchemy.orm import Session
from models.models import Enseignant, Voeu, Examen, Affectation
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
        - code_smartex_ens: Code SmartEx (identifiant) - optionnel, généré automatiquement si absent
        - abrv_ens: Abréviation de l'enseignant (ex: P.NOM) - optionnel
        - participe_surveillance: "vrai" ou "faux" (optionnel, vrai par défaut)
        
        Le nom complet du grade (grade_ens) est déduit automatiquement du code.
        Si code_smartex_ens est absent ou vide, un code unique entier est généré automatiquement.
        
        Returns:
            (nombre_importes, erreurs)
        """
        erreurs = []
        count = 0
        
        try:
            # SUPPRIMER TOUTES LES AFFECTATIONS EXISTANTES
            nb_affectations_supprimees = db.query(Affectation).delete()
            logger.info(f"🗑️  {nb_affectations_supprimees} affectations supprimées avant import des enseignants")
            
            # SUPPRIMER TOUS LES ENSEIGNANTS EXISTANTS
            nb_supprimes = db.query(Enseignant).delete()
            logger.info(f"🗑️  {nb_supprimes} enseignants supprimés avant import")
            db.commit()
            
            df = pd.read_excel(file_path)
            
            # Vérification des colonnes obligatoires (code_smartex_ens n'est plus obligatoire)
            colonnes_requises = [
                'nom_ens', 'prenom_ens', 'email_ens', 
                'grade_code_ens'
            ]
            colonnes_manquantes = [col for col in colonnes_requises if col not in df.columns]
            
            if colonnes_manquantes:
                erreurs.append(f"Colonnes manquantes: {', '.join(colonnes_manquantes)}")
                return 0, erreurs
            
            # Trouver le code unique de départ pour les enseignants sans code_smartex
            # Chercher le maximum des codes existants dans le fichier
            codes_existants = []
            if 'code_smartex_ens' in df.columns:
                for val in df['code_smartex_ens']:
                    if pd.notna(val) and val != '' and str(val).strip() != '':
                        try:
                            code_int = int(float(val))
                            codes_existants.append(code_int)
                        except (ValueError, TypeError):
                            # Ignorer les codes non numériques
                            pass
            
            # Définir le code de départ
            if codes_existants:
                max_code_smartex = max(codes_existants)
                next_code_smartex = max_code_smartex + 1
                logger.info(f"🔢 Code maximum trouvé: {max_code_smartex}, prochain code: {next_code_smartex}")
            else:
                next_code_smartex = 10000
                logger.info(f"🔢 Aucun code existant, démarrage à: {next_code_smartex}")
            
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
                    
                    # Gérer code_smartex_ens - générer un code unique si absent ou vide
                    code_smartex = None
                    if 'code_smartex_ens' in df.columns:
                        code_smartex_raw = row['code_smartex_ens']
                        if pd.notna(code_smartex_raw) and str(code_smartex_raw).strip() != '':
                            try:
                                # Convertir en entier pour éviter les .0
                                code_smartex = str(int(float(code_smartex_raw)))
                            except (ValueError, TypeError):
                                code_smartex = str(code_smartex_raw).strip()
                    
                    # Si code_smartex est toujours None ou vide, générer un code unique
                    if not code_smartex or code_smartex.strip() == '':
                        code_smartex = str(next_code_smartex)
                        next_code_smartex += 1
                        logger.info(f"📝 Code SmartEx généré automatiquement pour {row['prenom_ens']} {row['nom_ens']}: {code_smartex}")
                    
                    # Récupérer l'abréviation de l'enseignant (optionnel)
                    abrv_ens = None
                    if 'abrv_ens' in df.columns:
                        abrv_ens_raw = row['abrv_ens']
                        if pd.notna(abrv_ens_raw) and str(abrv_ens_raw).strip() != '':
                            abrv_ens = str(abrv_ens_raw).strip()
                    
                    # Définir nombre_max en fonction de participe_surveillance
                    # Si l'enseignant ne participe pas aux surveillances, nombre_max = 0
                    nombre_max = 0 if not participe else 4
                    
                    # Créer l'enseignant (pas besoin de vérifier l'existence, tout est supprimé avant)
                    enseignant = Enseignant(
                        nom=str(row['nom_ens']).strip(),
                        prenom=str(row['prenom_ens']).strip(),
                        email=str(row['email_ens']).strip().lower(),
                        grade=grade_nom,
                        grade_code=grade_code,
                        code_smartex=code_smartex,
                        abrv_ens=abrv_ens,
                        participe_surveillance=participe,
                        nombre_max=nombre_max
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
        - Enseignant: Abréviation de l'enseignant (ex: P.NOM)
        - Semestre: Semestre1 ou Semestre2
        - Session: Partiel ou Examen ou Rattrapage
        - Date: format j/m/a (ex: 15/01/2025)
        - Jour: Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi
        - Séances: Liste de séances séparées par des virgules (ex: S1,S3 ou S2,S4)
        - Nombre-Max: Nombre maximum de séances par jour (optionnel, défaut: 4)
        
        Returns:
            (nombre_importes, erreurs)
        """
        erreurs = []
        count = 0
        
        try:
            # SUPPRIMER TOUTES LES AFFECTATIONS EXISTANTES
            nb_affectations_supprimees = db.query(Affectation).delete()
            logger.info(f"🗑️  {nb_affectations_supprimees} affectations supprimées avant import des vœux")
            
            # SUPPRIMER TOUS LES VŒUX EXISTANTS
            nb_supprimes = db.query(Voeu).delete()
            logger.info(f"🗑️  {nb_supprimes} vœux supprimés avant import")
            db.commit()
            
            df = pd.read_excel(file_path)
            
            # Vérification des colonnes obligatoires
            colonnes_requises = ['Enseignant', 'Semestre', 'Session', 'Date', 'Jour', 'Séances']
            colonnes_manquantes = [col for col in colonnes_requises if col not in df.columns]
            
            if colonnes_manquantes:
                erreurs.append(f"Colonnes manquantes: {', '.join(colonnes_manquantes)}")
                return 0, erreurs
            
            # Liste des jours valides
            jours_valides = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
            
            # ÉTAPE 1: Pré-analyser le fichier pour extraire le Nombre-Max de chaque enseignant
            # Dictionnaire pour stocker le nombre_max de chaque enseignant
            enseignants_nombre_max_dict = {}
            
            if 'Nombre-Max' in df.columns:
                logger.info("🔍 Pré-analyse des valeurs Nombre-Max pour chaque enseignant...")
                
                for idx, row in df.iterrows():
                    abrv_ens = str(row['Enseignant']).strip()
                    
                    # Vérifier si l'enseignant existe
                    enseignant = db.query(Enseignant).filter(
                        Enseignant.abrv_ens == abrv_ens
                    ).first()
                    
                    if enseignant and enseignant.id not in enseignants_nombre_max_dict:
                        # Chercher une valeur Nombre-Max valide pour cet enseignant dans toutes ses lignes
                        enseignant_rows = df[df['Enseignant'].str.strip() == abrv_ens]
                        nombre_max_trouve = None
                        
                        for _, ens_row in enseignant_rows.iterrows():
                            if pd.notna(ens_row['Nombre-Max']) and str(ens_row['Nombre-Max']).strip() != '':
                                try:
                                    nb = int(ens_row['Nombre-Max'])
                                    if 0 <= nb <= 10:
                                        nombre_max_trouve = nb
                                        logger.info(f"   ✓ Enseignant {abrv_ens}: Nombre-Max trouvé = {nb}")
                                        break
                                except (ValueError, TypeError):
                                    continue
                        
                        enseignants_nombre_max_dict[enseignant.id] = nombre_max_trouve
            
            # ÉTAPE 2: Dictionnaire pour stocker le nombre_max finalement assigné
            enseignants_nombre_max = {}
            
            # Import ligne par ligne
            for idx, row in df.iterrows():
                try:
                    # Rechercher l'enseignant par abréviation (abrv_ens)
                    abrv_ens = str(row['Enseignant']).strip()
                    
                    enseignant = db.query(Enseignant).filter(
                        Enseignant.abrv_ens == abrv_ens
                    ).first()
                    
                    if not enseignant:
                        erreurs.append(f"Ligne {idx + 2}: Enseignant avec abréviation '{abrv_ens}' introuvable")
                        continue
                    
                    # Définir le Nombre-Max si pas encore défini pour cet enseignant
                    if enseignant.id not in enseignants_nombre_max:
                        # Si l'enseignant ne participe pas aux surveillances, nombre_max = 0
                        if not enseignant.participe_surveillance:
                            nombre_max = 0
                            logger.info(f"📊 Enseignant {abrv_ens}: Ne participe pas aux surveillances, Nombre-Max forcé à 0")
                        else:
                            # Utiliser la valeur trouvée dans la pré-analyse, sinon valeur par défaut
                            nombre_max_preanalyse = enseignants_nombre_max_dict.get(enseignant.id)
                            
                            if nombre_max_preanalyse is not None:
                                nombre_max = nombre_max_preanalyse
                                logger.info(f"📊 Enseignant {abrv_ens}: Nombre-Max défini à {nombre_max}")
                            else:
                                nombre_max = 4  # Valeur par défaut
                                logger.info(f"📊 Enseignant {abrv_ens}: Aucun Nombre-Max valide trouvé, utilisation de la valeur par défaut (4)")
                        
                        # Stocker le nombre_max pour cet enseignant
                        enseignants_nombre_max[enseignant.id] = nombre_max
                        
                        # Mettre à jour l'enseignant avec le nombre_max
                        enseignant.nombre_max = nombre_max
                        db.add(enseignant)
                    
                    # Récupérer et valider le jour (capitaliser la première lettre)
                    jour = str(row['Jour']).strip().capitalize()
                    if jour not in jours_valides:
                        erreurs.append(f"Ligne {idx + 2}: Jour invalide '{row['Jour']}' (doit être Lundi, Mardi, Mercredi, Jeudi, Vendredi ou Samedi)")
                        continue
                    
                    # Récupérer semestre et session
                    semestre = str(row['Semestre']).strip()
                    session = str(row['Session']).strip()
                    
                    # Récupérer la date (OBLIGATOIRE)
                    if pd.isna(row['Date']) or str(row['Date']).strip() == '':
                        erreurs.append(f"Ligne {idx + 2}: La colonne Date est obligatoire et ne peut pas être vide")
                        continue
                    
                    try:
                        date_voeu = pd.to_datetime(row['Date'], dayfirst=True).date()
                    except Exception as e:
                        erreurs.append(f"Ligne {idx + 2}: Format de date invalide '{row['Date']}' - utilisez le format DD/MM/YYYY ou YYYY-MM-DD")
                        continue
                    
                    # Récupérer les séances (ex: "S1,S3" ou "S2,S4" ou "S1,S2,S3,S4")
                    seances_str = str(row['Séances']).strip().upper()
                    seances_list = [s.strip() for s in seances_str.split(',')]
                    
                    # Valider les séances
                    seances_valides = ['S1', 'S2', 'S3', 'S4']
                    for seance in seances_list:
                        if seance not in seances_valides:
                            erreurs.append(f"Ligne {idx + 2}: Séance invalide '{seance}' (doit être S1, S2, S3 ou S4)")
                            continue
                    
                    # Créer un vœu pour chaque séance
                    for seance in seances_list:
                        voeu = Voeu(
                            enseignant_id=enseignant.id,
                            code_smartex_ens=enseignant.code_smartex,
                            jour=jour,
                            seance=seance,
                            semestre_code_libelle=semestre,
                            session_libelle=session,
                            date_voeu=date_voeu
                        )
                        db.add(voeu)
                        count += 1
                    
                except Exception as e:
                    erreurs.append(f"Ligne {idx + 2}: {str(e)}")
            
            db.commit()
            logger.info(f"✅ {count} vœux importés avec succès")
            logger.info(f"📊 {len(enseignants_nombre_max)} enseignants mis à jour avec leur Nombre-Max")
            
        except Exception as e:
            erreurs.append(f"Erreur lors de la lecture du fichier: {str(e)}")
            logger.error(f"Erreur import vœux: {str(e)}")
        
        return count, erreurs
    
    @staticmethod
    def importer_examens(file_path: str, db: Session) -> Tuple[int, List[str], int]:
        """
        Importe les examens depuis un fichier Excel.
        ATTENTION : Supprime tous les examens existants avant l'import !
        
        Les examens dupliqués (même date, même heure début/fin, même salle) sont automatiquement ignorés.
        
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
            (nombre_importes, erreurs, nombre_doublons)
        """
        erreurs = []
        count = 0
        nb_doublons = 0  # Initialiser le compteur de doublons
        
        try:
            # SUPPRIMER TOUTES LES AFFECTATIONS EXISTANTES
            nb_affectations_supprimees = db.query(Affectation).delete()
            logger.info(f"🗑️  {nb_affectations_supprimees} affectations supprimées avant import des examens")
            
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
            
            # Import ligne par ligne avec détection des doublons
            examens_vus = set()  # Pour détecter les doublons (date, h_debut, h_fin, cod_salle)
            nb_doublons = 0
            
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
                    
                    # Créer une signature unique pour détecter les doublons
                    # Un doublon = même date, même heure début/fin, même salle
                    signature_examen = (date_exam, h_debut, h_fin, cod_salle)
                    
                    # Vérifier si cet examen existe déjà (doublon)
                    if signature_examen in examens_vus:
                        nb_doublons += 1
                        logger.debug(f"  ⏭️  Doublon ignoré (ligne {idx + 2}): {date_exam} {h_debut}-{h_fin} salle {cod_salle}")
                        continue  # Ignorer ce doublon
                    
                    # Ajouter à l'ensemble des examens vus
                    examens_vus.add(signature_examen)
                    
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
                msg_doublons = f" ({nb_doublons} doublons ignorés)" if nb_doublons > 0 else ""
                logger.info(f"✅ {count} examens importés avec succès{msg_doublons}")
            else:
                logger.warning(f"⚠️ Aucun examen importé. Erreurs: {erreurs}")
            
        except Exception as e:
            erreurs.append(f"Erreur lors de la lecture du fichier: {str(e)}")
            logger.error(f"Erreur import examens: {str(e)}")
        
        return count, erreurs, nb_doublons