from ortools.sat.python import cp_model
from sqlalchemy.orm import Session, joinedload
from models.models import Enseignant, Examen, Affectation, Voeu, GradeConfig
from datetime import datetime, date, time as dt_time
from typing import List, Dict, Tuple
import time


class SurveillanceOptimizer:
    """
    Algorithme d'optimisation pour la génération des plannings de surveillance.
    Génère une liste d'enseignants disponibles par séance pour couvrir tous les examens.
    Utilise Google OR-Tools avec programmation par contraintes.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.warnings = []
        # Charger la configuration des grades depuis la BDD
        self.grade_configs = self._load_grade_configs()
        
    def _load_grade_configs(self) -> Dict[str, int]:
        """Charge les configurations de nb_surveillances depuis la BDD"""
        configs = self.db.query(GradeConfig).all()
        return {config.grade_code: config.nb_surveillances for config in configs}
        
    def generer_planning(
        self, 
        min_surveillants: int = 2,
        allow_fallback: bool = True
    ) -> Tuple[bool, int, float, List[str]]:
        """
        Génère le planning optimal de surveillance.
        Objectif: Générer une liste d'enseignants disponibles par séance
        pour couvrir tous les examens, sans affectation salle par salle.
        
        Returns:
            (success, nb_affectations, temps_execution, warnings)
        """
        start_time = time.time()
        
        # 1. Récupération des données
        enseignants = self.db.query(Enseignant).filter(
            Enseignant.participe_surveillance == True
        ).all()
        examens = self.db.query(Examen).all()
        voeux = self.db.query(Voeu).all()
        
        if not enseignants:
            self.warnings.append("⚠️ Aucun enseignant disponible pour la surveillance")
            return False, 0, 0.0, self.warnings
            
        if not examens:
            self.warnings.append("⚠️ Aucun examen à planifier")
            return False, 0, 0.0, self.warnings
        
        # 2. Suppression des anciennes affectations
        self.db.query(Affectation).delete()
        self.db.commit()
        
        # 3. Grouper les examens par séance (date + créneau horaire)
        seances = self._grouper_examens_par_seance(examens)
        
        if not seances:
            self.warnings.append("⚠️ Aucune séance d'examen trouvée")
            return False, 0, 0.0, self.warnings
        
        # 4. Pour chaque séance, déterminer le nombre total de surveillants nécessaires
        besoins_par_seance = {}
        for seance_key, examens_seance in seances.items():
            # Nombre total de salles/examens dans cette séance
            nb_examens = len(examens_seance)
            # Besoin minimum: min_surveillants par examen
            besoins_par_seance[seance_key] = nb_examens * min_surveillants
        
        # 5. Création des variables de décision: enseignant affecté à une séance
        affectations_vars = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"aff_seance_{seance_key[0]}_{seance_key[1]}_{seance_key[2]}_ens_{enseignant.id}"
                affectations_vars[(seance_key, enseignant.id)] = self.model.NewBoolVar(var_name)
        
        # 6. Contrainte: Nombre suffisant de surveillants par séance
        for seance_key, nb_requis in besoins_par_seance.items():
            surveillants_pour_seance = [
                affectations_vars[(seance_key, ens.id)] 
                for ens in enseignants
            ]
            
            # Au moins nb_requis surveillants pour couvrir tous les examens de la séance
            if allow_fallback and nb_requis > len(enseignants):
                # Si pas assez d'enseignants, prendre tous ceux disponibles
                self.model.Add(sum(surveillants_pour_seance) >= min(nb_requis, len(enseignants)))
                self.warnings.append(
                    f"⚠️ Séance {seance_key}: Besoin de {nb_requis} surveillants mais seulement {len(enseignants)} disponibles"
                )
            else:
                self.model.Add(sum(surveillants_pour_seance) >= nb_requis)
        
        # 7. Contrainte: Respect des vœux de non-disponibilité
        voeux_dict = self._construire_dict_voeux(voeux)
        
        for seance_key in seances.keys():
            date_exam, seance_code, semestre, session = seance_key
            jour = self._get_jour_from_date(date_exam)  # Extraire le numéro du jour
            
            for enseignant in enseignants:
                # Vérifier si l'enseignant a un vœu pour ce créneau
                if self._a_voeu(enseignant.id, jour, seance_code, semestre, session, voeux_dict):
                    # Enseignant indisponible pour cette séance
                    self.model.Add(affectations_vars[(seance_key, enseignant.id)] == 0)
        
        # 8. Contrainte: Limiter le nombre total de surveillances par enseignant selon le grade
        charge_par_enseignant = {}
        for enseignant in enseignants:
            charge = sum([
                affectations_vars[(seance_key, enseignant.id)] 
                for seance_key in seances.keys()
            ])
            charge_par_enseignant[enseignant.id] = charge
            
            # Limite selon le grade (utilise la config BDD)
            nb_max = self.grade_configs.get(enseignant.grade_code, 10)
            self.model.Add(charge <= nb_max)
        
        # 9. Objectif: Équilibrer la charge entre les enseignants
        charges = list(charge_par_enseignant.values())
        if charges:
            charge_min = self.model.NewIntVar(0, len(seances), "charge_min")
            charge_max = self.model.NewIntVar(0, len(seances), "charge_max")
            
            self.model.AddMinEquality(charge_min, charges)
            self.model.AddMaxEquality(charge_max, charges)
            
            dispersion = self.model.NewIntVar(0, len(seances), "dispersion")
            self.model.Add(dispersion == charge_max - charge_min)
            
            # Minimiser la dispersion pour équité
            self.model.Minimize(dispersion)
        
        # 10. Résolution
        self.solver.parameters.max_time_in_seconds = 30.0
        status = self.solver.Solve(self.model)
        
        # 11. Traitement des résultats
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            nb_affectations = self._sauvegarder_affectations_par_seance(
                affectations_vars, 
                seances,
                enseignants
            )
            
            execution_time = time.time() - start_time
            
            # Vérifications post-génération
            self._verifier_couverture_seances(seances, besoins_par_seance)
            
            return True, nb_affectations, execution_time, self.warnings
        else:
            self.warnings.append("❌ Impossible de trouver une solution optimale")
            self.warnings.append("Suggestions: Ajouter des enseignants ou réduire les contraintes")
            return False, 0, time.time() - start_time, self.warnings
    
    def _get_seance_code_from_time(self, heure: dt_time) -> str:
        """Détermine le code de séance (S1, S2, S3, S4) selon l'heure"""
        hour = heure.hour
        minute = heure.minute
        time_in_minutes = hour * 60 + minute
        
        # S1: 08:30-10:00
        if 510 <= time_in_minutes < 600:  # 08:30 = 510 min, 10:00 = 600 min
            return "S1"
        # S2: 10:30-12:00
        elif 630 <= time_in_minutes < 720:  # 10:30 = 630 min, 12:00 = 720 min
            return "S2"
        # S3: 12:30-14:00
        elif 750 <= time_in_minutes < 840:  # 12:30 = 750 min, 14:00 = 840 min
            return "S3"
        # S4: 14:30-16:00
        elif 870 <= time_in_minutes < 960:  # 14:30 = 870 min, 16:00 = 960 min
            return "S4"
        else:
            # Par défaut, on détermine par l'heure
            if hour < 12:
                return "S1"  # Matin
            else:
                return "S3"  # Après-midi
    
    def _get_jour_from_date(self, date_exam: date) -> int:
        """
        Extrait le numéro du jour à partir de la date.
        Assume que les examens sont numérotés jour 1, 2, 3, etc.
        """
        # Simple: utiliser le jour du mois comme indicateur
        # Cette logique peut être ajustée selon vos besoins
        return date_exam.day
    
    def _grouper_examens_par_seance(self, examens: List[Examen]) -> Dict[Tuple, List[Examen]]:
        """
        Groupe les examens par séance.
        Clé: (date, seance_code, semestre, session)
        Valeur: Liste des examens dans cette séance
        """
        groupes = {}
        for examen in examens:
            seance_code = self._get_seance_code_from_time(examen.h_debut)
            # Normaliser semestre et session
            semestre = examen.semestre.upper().strip()
            session = examen.session.upper().strip()
            
            cle = (examen.dateExam, seance_code, semestre, session)
            if cle not in groupes:
                groupes[cle] = []
            groupes[cle].append(examen)
        return groupes
    
    def _construire_dict_voeux(self, voeux: List[Voeu]) -> Dict:
        """
        Construit un dictionnaire pour accès rapide aux vœux.
        Clé: (enseignant_id, jour, seance, semestre, session)
        """
        voeux_dict = {}
        for voeu in voeux:
            # Normaliser les valeurs
            semestre = voeu.semestre_code_libelle.upper().strip() if voeu.semestre_code_libelle else ""
            session = voeu.session_libelle.upper().strip() if voeu.session_libelle else ""
            
            key = (voeu.enseignant_id, voeu.jour, voeu.seance, semestre, session)
            voeux_dict[key] = True
        return voeux_dict
    
    def _a_voeu(self, enseignant_id: int, jour: int, seance: str, 
                semestre: str, session: str, voeux_dict: Dict) -> bool:
        """Vérifie si un enseignant a un vœu pour un créneau donné"""
        key = (enseignant_id, jour, seance, semestre, session)
        return key in voeux_dict
    
    def _sauvegarder_affectations_par_seance(
        self, 
        affectations_vars: Dict, 
        seances: Dict[Tuple, List[Examen]],
        enseignants: List[Enseignant]
    ) -> int:
        """
        Sauvegarde les affectations en base de données.
        Pour chaque séance, affecte les enseignants sélectionnés à TOUS les examens de cette séance.
        """
        count = 0
        for seance_key, examens_seance in seances.items():
            # Trouver les enseignants affectés à cette séance
            enseignants_affectes = []
            for enseignant in enseignants:
                var = affectations_vars[(seance_key, enseignant.id)]
                if self.solver.Value(var) == 1:
                    enseignants_affectes.append(enseignant)
            
            # Affecter ces enseignants à tous les examens de la séance
            for examen in examens_seance:
                for enseignant in enseignants_affectes:
                    affectation = Affectation(
                        examen_id=examen.id,
                        enseignant_id=enseignant.id,
                        cod_salle=examen.cod_salle,  # Garde l'info de salle pour l'examen
                        est_responsable=False  # Peut être défini ultérieurement
                    )
                    self.db.add(affectation)
                    count += 1
        
        self.db.commit()
        return count
    
    def _verifier_couverture_seances(self, seances: Dict, besoins_par_seance: Dict):
        """Vérifie que toutes les séances ont suffisamment de surveillants"""
        for seance_key, examens_seance in seances.items():
            # Compter les surveillants affectés (distinct) pour cette séance
            # On prend le premier examen de la séance pour vérifier
            if examens_seance:
                premier_examen = examens_seance[0]
                nb_surveillants = self.db.query(Affectation).filter(
                    Affectation.examen_id == premier_examen.id
                ).count()
                
                besoin = besoins_par_seance.get(seance_key, 0)
                nb_examens = len(examens_seance)
                
                if nb_surveillants < besoin:
                    self.warnings.append(
                        f"⚠️ Séance {seance_key[0]} {seance_key[1]}: "
                        f"{nb_surveillants} surveillants pour {nb_examens} examen(s) "
                        f"(besoin: {besoin})"
                    )
                elif nb_surveillants == 0:
                    self.warnings.append(
                        f"❌ Séance {seance_key[0]} {seance_key[1]}: "
                        f"AUCUN surveillant affecté!"
                    )
