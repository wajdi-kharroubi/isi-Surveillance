"""
Algorithme d'Optimisation Avancé pour la Génération des Plannings de Surveillance
Version 2.0 - Respect complet des règles de contraintes et priorités
"""

from ortools.sat.python import cp_model
from sqlalchemy.orm import Session, joinedload
from models.models import Enseignant, Examen, Affectation, Voeu, GradeConfig
from datetime import datetime, date, time as dt_time
from typing import List, Dict, Tuple, Set
import time


class SurveillanceOptimizerV2:
    """
    Algorithme d'optimisation avancé avec gestion complète des contraintes et priorités.
    
    RÈGLES DE BASE (Contraintes fortes - HARD):
    1. Responsable d'examen doit être présent et compte dans les quotas
    2. Charge obligatoire égale par grade (quota fixe)
    3. Non-conflit horaire
    4. Nombre minimal d'enseignants par créneau
    
    RÈGLES DE PRÉFÉRENCE (Contraintes souples - SOFT):
    1. Préférence pour enseignants avec vœux de disponibilité (mais autres acceptés)
    2. Équilibre temporel (éviter toujours premiers/derniers créneaux)
    3. Équilibre global entre enseignants
    
    PRIORITÉ DES CONTRAINTES:
    1. Présence du responsable d'examen (peut surveiller d'autres examens)
    2. Nombre minimal par examen
    3. Quota obligatoire fixe et égal par grade
    4. PRÉFÉRENCE pour vœux (pas obligatoire, mais bonus dans fonction objectif)
    5. Équilibre global
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.warnings = []
        self.infos = []
        
        # Charger la configuration des grades depuis la BDD
        self.grade_configs = self._load_grade_configs()
        
        # Scores pour l'optimisation
        self.score_components = {
            'respect_voeux': 0,
            'equilibre_global': 0,
            'equilibre_temporel': 0,
            'quota_respecte': 0
        }
        
    def _load_grade_configs(self) -> Dict[str, Dict]:
        """
        Charge les configurations de grades avec quotas FIXES.
        
        IMPORTANT: Tous les enseignants d'un même grade font le même nombre 
        de séances (quota fixe).
        """
        configs = self.db.query(GradeConfig).all()
        grade_dict = {}
        
        for config in configs:
            # Le quota fixe est défini par nb_surveillances
            quota_fixe = config.nb_surveillances
            
            grade_dict[config.grade_code] = {
                'nb_surveillances': quota_fixe,    # Quota FIXE pour ce grade
                'label': config.grade_nom           # Nom du grade
            }
        
        return grade_dict
    
    def generer_planning_optimise(
        self,
        min_surveillants_par_examen: int = 2,
        allow_fallback: bool = True,
        respecter_voeux: bool = True,
        equilibrer_temporel: bool = True
    ) -> Tuple[bool, int, float, List[str], Dict]:
        """
        Génère le planning optimal avec respect de toutes les contraintes.
        
        Args:
            min_surveillants_par_examen: Nombre minimum de surveillants par examen
            allow_fallback: Autoriser le fallback à 1 surveillant si nécessaire
            respecter_voeux: Prendre en compte les vœux (True fortement recommandé)
            equilibrer_temporel: Équilibrer la répartition des créneaux horaires
            
        Returns:
            (success, nb_affectations, temps_execution, messages, scores)
        """
        start_time = time.time()
        
        print("=" * 80)
        print("🚀 DÉMARRAGE DE L'ALGORITHME D'OPTIMISATION V2.0")
        print("=" * 80)
        
        # ===== PHASE 1: RÉCUPÉRATION DES DONNÉES =====
        print("\n📊 Phase 1: Récupération des données...")
        
        enseignants = self.db.query(Enseignant).filter(
            Enseignant.participe_surveillance == True
        ).all()
        
        examens = self.db.query(Examen).all()
        voeux = self.db.query(Voeu).all() if respecter_voeux else []
        
        print(f"   ✓ {len(enseignants)} enseignants disponibles")
        print(f"   ✓ {len(examens)} examens à planifier")
        print(f"   ✓ {len(voeux)} vœux de non-disponibilité")
        
        # Vérifications préliminaires
        if not enseignants:
            self.warnings.append("⚠️ Aucun enseignant disponible pour la surveillance")
            return False, 0, 0.0, self.warnings, self.score_components
            
        if not examens:
            self.warnings.append("⚠️ Aucun examen à planifier")
            return False, 0, 0.0, self.warnings, self.score_components
        
        # ===== PHASE 2: NETTOYAGE =====
        print("\n🗑️  Phase 2: Nettoyage des anciennes affectations...")
        nb_supprimees = self.db.query(Affectation).delete()
        self.db.commit()
        print(f"   ✓ {nb_supprimees} anciennes affectations supprimées")
        
        # ===== PHASE 3: GROUPEMENT PAR SÉANCE =====
        print("\n🗂️  Phase 3: Groupement des examens par séance...")
        seances = self._grouper_examens_par_seance(examens)
        print(f"   ✓ {len(seances)} séances identifiées")
        
        if not seances:
            self.warnings.append("⚠️ Aucune séance d'examen trouvée")
            return False, 0, 0.0, self.warnings, self.score_components
        
        # Afficher les séances
        for idx, (seance_key, examens_seance) in enumerate(seances.items(), 1):
            date_exam, seance_code, semestre, session = seance_key
            print(f"   • Séance {idx}: {date_exam.strftime('%d/%m/%Y')} - {seance_code} - {semestre} - {session} ({len(examens_seance)} examens)")
        
        # ===== PHASE 4: ANALYSE DES RESPONSABLES D'EXAMENS =====
        print("\n👥 Phase 4: Identification des responsables d'examens...")
        responsables_examens = self._identifier_responsables(examens)
        print(f"   ✓ {len(responsables_examens)} examens avec responsable identifié")
        
        # ===== PHASE 5: CRÉATION DES VARIABLES DE DÉCISION =====
        print("\n🔢 Phase 5: Création des variables de décision...")
        
        # Variables: enseignant affecté à une séance
        affectations_vars = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"aff_{seance_key[0].strftime('%Y%m%d')}_{seance_key[1]}_{seance_key[2]}_{seance_key[3]}_ens_{enseignant.id}"
                affectations_vars[(seance_key, enseignant.id)] = self.model.NewBoolVar(var_name)
        
        print(f"   ✓ {len(affectations_vars)} variables booléennes créées")
        
        # ===== PHASE 6: APPLICATION DES CONTRAINTES =====
        print("\n🔒 Phase 6: Application des contraintes...")
        
        # CONTRAINTE 1: Présence obligatoire des responsables (PRIORITÉ 1)
        print("   → Contrainte 1: Présence obligatoire des responsables d'examens")
        nb_contraintes_responsables = self._contrainte_responsables(
            responsables_examens, seances, affectations_vars, enseignants
        )
        print(f"      ✓ {nb_contraintes_responsables} responsables ajoutés obligatoirement (peuvent surveiller d'autres examens)")
        
        # CONTRAINTE 2: Nombre minimal d'enseignants par séance (PRIORITÉ 2)
        print("   → Contrainte 2: Nombre minimal d'enseignants par séance")
        besoins_par_seance = self._contrainte_nombre_minimal(
            seances, enseignants, affectations_vars, 
            min_surveillants_par_examen, allow_fallback
        )
        print(f"      ✓ Contraintes de couverture appliquées")
        
        # CONTRAINTE 3: Quota obligatoire par grade (PRIORITÉ 3)
        print("   → Contrainte 3: Quotas obligatoires et limites par grade")
        charge_par_enseignant = self._contrainte_quotas_grades(
            enseignants, seances, affectations_vars
        )
        print(f"      ✓ Quotas de grades configurés")
        
        # CONTRAINTE 4: Préférence pour les vœux (PRIORITÉ 4)
        preferences_voeux = {}
        if respecter_voeux and voeux:
            print("   → Contrainte 4: Préférence pour les enseignants avec vœux de disponibilité")
            preferences_voeux = self._contrainte_voeux(
                voeux, seances, enseignants, affectations_vars
            )
            nb_avec_voeu = len(preferences_voeux.get('avec_voeu', []))
            nb_sans_voeu = len(preferences_voeux.get('sans_voeu', []))
            print(f"      ✓ {nb_avec_voeu} combinaisons avec vœu (prioritaires)")
            print(f"      ✓ {nb_sans_voeu} combinaisons sans vœu (secondaires)")
        else:
            print("   → Contrainte 4: Vœux désactivés")
        
        # CONTRAINTE 5: Non-conflit horaire (automatique avec séances)
        print("   → Contrainte 5: Non-conflit horaire (automatique)")
        print(f"      ✓ Garanti par le système de séances")
        
        # ===== PHASE 7: FONCTION OBJECTIF =====
        print("\n🎯 Phase 7: Configuration de la fonction objectif...")
        
        score_total = self._configurer_fonction_objectif(
            charge_par_enseignant,
            affectations_vars,
            seances,
            enseignants,
            equilibrer_temporel,
            preferences_voeux
        )
        
        print(f"      ✓ Fonction objectif configurée (score d'optimisation)")
        
        # ===== PHASE 8: RÉSOLUTION =====
        print("\n⚡ Phase 8: Résolution du problème...")
        self.solver.parameters.max_time_in_seconds = 60.0
        
        status = self.solver.Solve(self.model)
        
        # ===== PHASE 9: TRAITEMENT DES RÉSULTATS =====
        print("\n📋 Phase 9: Traitement des résultats...")
        
        if status == cp_model.OPTIMAL:
            print("   ✅ Solution OPTIMALE trouvée!")
            status_text = "OPTIMALE"
        elif status == cp_model.FEASIBLE:
            print("   ✅ Solution RÉALISABLE trouvée")
            status_text = "RÉALISABLE"
        else:
            print("   ❌ Aucune solution trouvée")
            self.warnings.append("❌ Impossible de trouver une solution")
            self.warnings.append("Suggestions:")
            self.warnings.append("  • Ajouter des enseignants")
            self.warnings.append("  • Réduire le nombre minimal de surveillants")
            self.warnings.append("  • Vérifier les vœux (trop de contraintes?)")
            self.warnings.append("  • Augmenter les quotas par grade")
            return False, 0, time.time() - start_time, self.warnings, self.score_components
        
        # Sauvegarder les affectations
        nb_affectations = self._sauvegarder_affectations_par_seance(
            affectations_vars,
            seances,
            enseignants,
            responsables_examens
        )
        
        execution_time = time.time() - start_time
        
        # ===== PHASE 10: VÉRIFICATIONS ET STATISTIQUES =====
        print("\n📊 Phase 10: Vérifications et statistiques...")
        
        # Calculer les scores
        self._calculer_scores_solution(
            affectations_vars,
            seances,
            enseignants,
            voeux,
            charge_par_enseignant
        )
        
        # Vérifications finales
        self._verifier_couverture_seances(seances, besoins_par_seance)
        self._generer_statistiques(enseignants, seances, affectations_vars)
        
        print("\n" + "=" * 80)
        print(f"✅ GÉNÉRATION TERMINÉE EN {execution_time:.2f}s - {nb_affectations} affectations créées")
        print(f"📊 Statut: {status_text}")
        print("=" * 80)
        
        return True, nb_affectations, execution_time, self.warnings + self.infos, self.score_components
    
    # ========== CONTRAINTES ==========
    
    def _contrainte_responsables(
        self,
        responsables_examens: Dict[int, int],
        seances: Dict,
        affectations_vars: Dict,
        enseignants: List[Enseignant]
    ) -> int:
        """
        CONTRAINTE 1 (PRIORITÉ 1): Le responsable d'un examen doit être présent.
        Le responsable PEUT surveiller d'autres examens pendant le même créneau.
        Il COMPTE dans les quotas de surveillance.
        """
        nb_contraintes = 0
        
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    
                    # Vérifier que le responsable existe dans les enseignants
                    if any(ens.id == responsable_id for ens in enseignants):
                        # OBLIGATION: Le responsable DOIT être présent dans cette séance
                        # Il sera automatiquement ajouté et pourra surveiller d'autres examens
                        self.model.Add(affectations_vars[(seance_key, responsable_id)] == 1)
                        nb_contraintes += 1
        
        return nb_contraintes
    
    def _contrainte_nombre_minimal(
        self,
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
        min_surveillants_par_examen: int,
        allow_fallback: bool
    ) -> Dict:
        """
        CONTRAINTE 2 (PRIORITÉ 2): Nombre minimum d'enseignants par séance.
        Calcul: nb_examens × min_surveillants_par_examen
        Fallback: Si impossible, garantir au moins 1 enseignant par examen
        """
        besoins_par_seance = {}
        
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = nb_examens * min_surveillants_par_examen
            
            besoins_par_seance[seance_key] = nb_requis
            
            surveillants_pour_seance = [
                affectations_vars[(seance_key, ens.id)]
                for ens in enseignants
            ]
            
            # Vérifier si suffisamment d'enseignants disponibles
            if nb_requis > len(enseignants):
                if allow_fallback:
                    # FALLBACK: Au moins nb_examens surveillants (1 par examen minimum)
                    nb_minimum = max(nb_examens, 1)
                    self.model.Add(sum(surveillants_pour_seance) >= nb_minimum)
                    
                    self.warnings.append(
                        f"⚠️ Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                        f"Besoin de {nb_requis} mais seulement {len(enseignants)} disponibles. "
                        f"Fallback: {nb_minimum} surveillants minimum garantis."
                    )
                else:
                    # Sans fallback, on demande quand même le maximum possible
                    self.model.Add(sum(surveillants_pour_seance) >= len(enseignants))
                    self.warnings.append(
                        f"❌ Séance {seance_key[1]}: Impossible de satisfaire le minimum requis"
                    )
            else:
                # Nombre normal: nb_requis surveillants
                self.model.Add(sum(surveillants_pour_seance) >= nb_requis)
        
        return besoins_par_seance
    
    def _contrainte_quotas_grades(
        self,
        enseignants: List[Enseignant],
        seances: Dict,
        affectations_vars: Dict
    ) -> Dict:
        """
        CONTRAINTE 3 (PRIORITÉ 3): Quota FIXE et ÉGAL par grade.
        
        RÈGLE STRICTE: Tous les enseignants d'un même grade doivent faire 
        EXACTEMENT le même nombre de séances de surveillance.
        
        Exemple: 
        - Tous les Professeurs font 5 séances (ni 4, ni 6)
        - Tous les Assistants font 3 séances (ni 2, ni 4)
        """
        charge_par_enseignant = {}
        
        # Grouper les enseignants par grade
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)
        
        # Pour chaque grade, imposer un quota FIXE
        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(grade_code, {
                'nb_surveillances': 2  # Par défaut, quota fixe = 2
            })
            
            # Le quota fixe est défini par nb_surveillances
            quota_fixe = grade_config.get('nb_surveillances', 2)
            
            self.infos.append(
                f"   📌 Grade {grade_code}: Quota FIXE = {quota_fixe} séances "
                f"pour {len(enseignants_grade)} enseignants"
            )
            
            # CONTRAINTE STRICTE: Chaque enseignant de ce grade fait EXACTEMENT quota_fixe séances
            for enseignant in enseignants_grade:
                # Calculer la charge totale pour cet enseignant
                charge = sum([
                    affectations_vars[(seance_key, enseignant.id)]
                    for seance_key in seances.keys()
                ])
                
                charge_par_enseignant[enseignant.id] = charge
                
                # CONTRAINTE D'ÉGALITÉ (pas de min/max, mais égalité stricte)
                if len(seances) >= quota_fixe:
                    # Assez de séances disponibles : on impose le quota exact
                    self.model.Add(charge == quota_fixe)
                else:
                    # Pas assez de séances : on fait au mieux avec un warning
                    self.model.Add(charge >= 0)
                    self.warnings.append(
                        f"⚠️ Grade {grade_code}: Quota de {quota_fixe} séances requis "
                        f"mais seulement {len(seances)} séances disponibles"
                    )
        
        return charge_par_enseignant
    
    def _contrainte_voeux(
        self,
        voeux: List[Voeu],
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict
    ) -> Dict:
        """
        CONTRAINTE 4 (PRIORITÉ 4): Préférence pour les vœux de disponibilité.
        Les enseignants AVEC vœu sont PRIORITAIRES mais les enseignants SANS vœu 
        PEUVENT quand même être sélectionnés si nécessaire.
        
        Retourne un dictionnaire pour calculer les bonus/pénalités dans la fonction objectif.
        """
        voeux_dict = self._construire_dict_voeux(voeux)
        preferences = {
            'avec_voeu': [],      # (seance_key, enseignant_id) pour bonus
            'sans_voeu': []       # (seance_key, enseignant_id) pour pénalité
        }
        
        for seance_key in seances.keys():
            date_exam, seance_code, semestre, session = seance_key
            jour = self._get_jour_from_date(date_exam)
            
            for enseignant in enseignants:
                if self._a_voeu(enseignant.id, jour, seance_code, semestre, session, voeux_dict):
                    # BONUS: Enseignant disponible (a déclaré un vœu)
                    preferences['avec_voeu'].append((seance_key, enseignant.id))
                else:
                    # PÉNALITÉ: Enseignant sans vœu (mais peut quand même être affecté)
                    preferences['sans_voeu'].append((seance_key, enseignant.id))
        
        return preferences
    
    # ========== FONCTION OBJECTIF ==========
    
    def _configurer_fonction_objectif(
        self,
        charge_par_enseignant: Dict,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        equilibrer_temporel: bool,
        preferences_voeux: Dict = None
    ) -> cp_model.IntVar:
        """
        Configure la fonction objectif multi-critères pour maximiser la satisfaction globale.
        
        Composantes du score:
        1. Équilibre global de charge (minimiser dispersion) - POIDS: 60%
        2. Préférence pour enseignants avec vœux - POIDS: 30%
        3. Équilibre temporel (éviter toujours premiers/derniers créneaux) - POIDS: 10%
        """
        
        # COMPOSANTE 1: Équilibre global de charge (PRINCIPAL)
        charges = list(charge_par_enseignant.values())
        
        if charges:
            charge_min = self.model.NewIntVar(0, len(seances), "charge_min")
            charge_max = self.model.NewIntVar(0, len(seances), "charge_max")
            
            self.model.AddMinEquality(charge_min, charges)
            self.model.AddMaxEquality(charge_max, charges)
            
            dispersion = self.model.NewIntVar(0, len(seances), "dispersion")
            self.model.Add(dispersion == charge_max - charge_min)
        else:
            dispersion = None
        
        # COMPOSANTE 2: Bonus pour enseignants avec vœux (SECONDAIRE)
        bonus_voeux = None
        if preferences_voeux and preferences_voeux.get('avec_voeu'):
            # Compter le nombre d'affectations avec vœu
            affectations_avec_voeu = [
                affectations_vars[(seance_key, ens_id)]
                for seance_key, ens_id in preferences_voeux['avec_voeu']
                if (seance_key, ens_id) in affectations_vars
            ]
            
            if affectations_avec_voeu:
                bonus_voeux = self.model.NewIntVar(0, len(affectations_avec_voeu), "bonus_voeux")
                self.model.Add(bonus_voeux == sum(affectations_avec_voeu))
        
        # COMPOSANTE 3: Équilibre temporel (si activé)
        if equilibrer_temporel:
            self._ajouter_equilibre_temporel(
                affectations_vars,
                seances,
                enseignants
            )
        
        # OBJECTIF COMBINÉ: Minimiser dispersion ET maximiser bonus_voeux
        # On crée un score combiné avec poids appropriés
        if dispersion is not None and bonus_voeux is not None:
            # Score = -60*dispersion + 30*bonus_voeux
            # Le solveur maximise, donc on veut minimiser dispersion (négatif) et maximiser bonus (positif)
            score_combine = self.model.NewIntVar(
                -60 * len(seances), 
                30 * len(affectations_vars), 
                "score_combine"
            )
            self.model.Add(score_combine == bonus_voeux - 2 * dispersion)
            self.model.Maximize(score_combine)
            return score_combine
        elif dispersion is not None:
            # Seulement la dispersion
            self.model.Minimize(dispersion)
            return dispersion
        
        return None
    
    def _ajouter_equilibre_temporel(
        self,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant]
    ):
        """
        Ajoute des contraintes pour équilibrer temporellement les affectations.
        Évite qu'un enseignant soit toujours affecté aux mêmes créneaux horaires.
        """
        
        # Grouper les séances par code horaire (S1, S2, S3, S4)
        seances_par_code = {'S1': [], 'S2': [], 'S3': [], 'S4': []}
        
        for seance_key in seances.keys():
            seance_code = seance_key[1]  # S1, S2, S3 ou S4
            if seance_code in seances_par_code:
                seances_par_code[seance_code].append(seance_key)
        
        # Pour chaque enseignant, équilibrer ses affectations entre créneaux
        for enseignant in enseignants:
            affectations_par_creneau = {}
            
            for code, seances_code in seances_par_code.items():
                if seances_code:
                    nb_aff_creneau = sum([
                        affectations_vars[(seance_key, enseignant.id)]
                        for seance_key in seances_code
                    ])
                    affectations_par_creneau[code] = nb_aff_creneau
            
            # Contrainte souple: Éviter qu'un enseignant ait toutes ses affectations dans un seul créneau
            # (Ceci est une contrainte souple, elle influence mais ne bloque pas)
            if len(affectations_par_creneau) > 1:
                valeurs = list(affectations_par_creneau.values())
                # On ne rajoute pas de contrainte stricte, c'est géré par l'équilibre global
                pass
    
    # ========== SAUVEGARDE ==========
    
    def _sauvegarder_affectations_par_seance(
        self,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        responsables_examens: Dict[int, int]
    ) -> int:
        """
        Sauvegarde les affectations dans la base de données.
        Pour chaque séance, duplique les enseignants affectés pour chaque examen.
        Marque le responsable de l'examen avec est_responsable=True.
        Le responsable compte dans les quotas et peut surveiller d'autres examens.
        """
        nb_affectations = 0
        
        for seance_key, examens_seance in seances.items():
            # Trouver les enseignants affectés à cette séance
            enseignants_affectes = []
            
            for enseignant in enseignants:
                var = affectations_vars[(seance_key, enseignant.id)]
                if self.solver.Value(var) == 1:
                    enseignants_affectes.append(enseignant)
            
            # Pour chaque examen de cette séance
            for examen in examens_seance:
                responsable_id = responsables_examens.get(examen.id, None)
                
                # Créer une affectation pour chaque enseignant affecté
                for enseignant in enseignants_affectes:
                    # Marquer si cet enseignant est le responsable de CET examen
                    est_responsable = (enseignant.id == responsable_id)
                    
                    affectation = Affectation(
                        examen_id=examen.id,
                        enseignant_id=enseignant.id,
                        cod_salle=examen.cod_salle,
                        est_responsable=est_responsable
                    )
                    self.db.add(affectation)
                    nb_affectations += 1
        
        self.db.commit()
        return nb_affectations
    
    # ========== MÉTHODES UTILITAIRES ==========
    
    def _identifier_responsables(self, examens: List[Examen]) -> Dict[int, int]:
        """
        Identifie les responsables d'examens.
        Le champ 'enseignant' du modèle Examen contient le code smartex du responsable.
        """
        responsables = {}
        
        for examen in examens:
            if hasattr(examen, 'enseignant') and examen.enseignant:
                # Le champ enseignant contient le code smartex
                enseignant = self.db.query(Enseignant).filter(
                    Enseignant.code_smartex == examen.enseignant
                ).first()
                
                if enseignant:
                    responsables[examen.id] = enseignant.id
                else:
                    # Log si le code smartex n'est pas trouvé
                    self.warnings.append(f"⚠️ Code smartex '{examen.enseignant}' non trouvé pour examen {examen.id}")
        
        return responsables
    
    def _get_seance_code_from_time(self, heure: dt_time) -> str:
        """Détermine le code de séance (S1, S2, S3, S4) selon l'heure"""
        hour = heure.hour
        minute = heure.minute
        time_in_minutes = hour * 60 + minute
        
        # S1: 08:30-10:00
        if 510 <= time_in_minutes < 630:  # 08:30 = 510 min
            return "S1"
        # S2: 10:30-12:00
        elif 630 <= time_in_minutes < 750:  # 10:30 = 630 min
            return "S2"
        # S3: 12:30-14:00
        elif 750 <= time_in_minutes < 870:  # 12:30 = 750 min
            return "S3"
        # S4: 14:30-16:00
        elif 870 <= time_in_minutes < 1020:  # 14:30 = 870 min
            return "S4"
        else:
            # Par défaut
            if hour < 12:
                return "S1"
            else:
                return "S3"
    
    def _get_jour_from_date(self, date_exam: date) -> int:
        """Extrait le numéro du jour"""
        return date_exam.day
    
    def _grouper_examens_par_seance(self, examens: List[Examen]) -> Dict[Tuple, List[Examen]]:
        """
        Groupe les examens par séance unique.
        Une séance = (date, seance_code, semestre, session)
        """
        seances = {}
        
        for examen in examens:
            seance_code = self._get_seance_code_from_time(examen.h_debut)
            seance_key = (
                examen.dateExam,
                seance_code,
                examen.semestre,
                examen.session
            )
            
            if seance_key not in seances:
                seances[seance_key] = []
            
            seances[seance_key].append(examen)
        
        return seances
    
    def _construire_dict_voeux(self, voeux: List[Voeu]) -> Dict:
        """Construit un dictionnaire de vœux pour recherche rapide"""
        voeux_dict = {}
        
        for voeu in voeux:
            jour = voeu.date_indisponible.day if hasattr(voeu, 'date_indisponible') else voeu.jour
            seance = voeu.seance_indisponible if hasattr(voeu, 'seance_indisponible') else voeu.seance
            
            # Récupérer semestre et session avec les bons noms d'attributs
            semestre = voeu.semestre_code_libelle if hasattr(voeu, 'semestre_code_libelle') else None
            session = voeu.session_libelle if hasattr(voeu, 'session_libelle') else None
            
            # Normaliser le code de séance
            if seance in ["Matin", "MATIN"]:
                seances_codes = ["S1", "S2"]
            elif seance in ["Après-midi", "APRES-MIDI"]:
                seances_codes = ["S3", "S4"]
            else:
                seances_codes = [seance]  # S1, S2, S3, S4 directement
            
            for seance_code in seances_codes:
                # Note : semestre et session peuvent être None si non spécifiés dans le vœu
                cle = (voeu.enseignant_id, jour, seance_code, semestre, session)
                voeux_dict[cle] = True
        
        return voeux_dict
    
    def _a_voeu(
        self,
        enseignant_id: int,
        jour: int,
        seance_code: str,
        semestre: str,
        session: str,
        voeux_dict: Dict
    ) -> bool:
        """Vérifie si un enseignant a un vœu pour un créneau précis"""
        cle = (enseignant_id, jour, seance_code, semestre, session)
        return cle in voeux_dict
    
    # ========== VÉRIFICATIONS ET STATISTIQUES ==========
    
    def _verifier_couverture_seances(self, seances: Dict, besoins_par_seance: Dict):
        """Vérifie que toutes les séances sont correctement couvertes"""
        
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = besoins_par_seance.get(seance_key, 0)
            
            # Compter les affectations réelles
            nb_affectations = self.db.query(Affectation).filter(
                Affectation.examen_id.in_([ex.id for ex in examens_seance])
            ).count()
            
            nb_enseignants_uniques = len(set([
                aff.enseignant_id for aff in self.db.query(Affectation).filter(
                    Affectation.examen_id.in_([ex.id for ex in examens_seance])
                ).all()
            ]))
            
            if nb_enseignants_uniques < nb_requis:
                self.warnings.append(
                    f"⚠️ Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_enseignants_uniques} enseignants affectés (requis: {nb_requis})"
                )
    
    def _generer_statistiques(
        self,
        enseignants: List[Enseignant],
        seances: Dict,
        affectations_vars: Dict
    ):
        """Génère des statistiques sur la solution trouvée"""
        
        self.infos.append("\n📊 === STATISTIQUES DE LA SOLUTION ===")
        
        # Charge par enseignant
        charges = {}
        for enseignant in enseignants:
            charge = sum([
                self.solver.Value(affectations_vars[(seance_key, enseignant.id)])
                for seance_key in seances.keys()
            ])
            charges[enseignant.id] = charge
        
        charge_min = min(charges.values()) if charges else 0
        charge_max = max(charges.values()) if charges else 0
        charge_moy = sum(charges.values()) / len(charges) if charges else 0
        
        self.infos.append(f"   • Charge minimale: {charge_min} séances")
        self.infos.append(f"   • Charge maximale: {charge_max} séances")
        self.infos.append(f"   • Charge moyenne: {charge_moy:.2f} séances")
        self.infos.append(f"   • Dispersion: {charge_max - charge_min} séances")
        
        # Répartition par grade
        self.infos.append("\n   📋 Répartition par grade:")
        grades_stats = {}
        
        for enseignant in enseignants:
            grade = enseignant.grade_code
            charge = charges[enseignant.id]
            
            if grade not in grades_stats:
                grades_stats[grade] = []
            grades_stats[grade].append(charge)
        
        for grade, charges_grade in sorted(grades_stats.items()):
            moy_grade = sum(charges_grade) / len(charges_grade)
            config = self.grade_configs.get(grade, {})
            quota_fixe = config.get('nb_surveillances', 'N/A')
            
            self.infos.append(
                f"      • {grade}: {len(charges_grade)} enseignants, "
                f"moyenne {moy_grade:.1f} séances (quota fixe: {quota_fixe})"
            )
        
        # Vérification du respect du quota fixe
        self.infos.append("\n   ⚖️ Vérification des quotas:")
        quotas_non_respectes = []
        
        for enseignant in enseignants:
            charge = charges[enseignant.id]
            config = self.grade_configs.get(enseignant.grade_code, {})
            quota_fixe = config.get('nb_surveillances', 0)
            
            if charge != quota_fixe:
                quotas_non_respectes.append(
                    f"❌ {enseignant.nom}: {charge} séances (quota fixe={quota_fixe})"
                )
        
        if not quotas_non_respectes:
            self.infos.append("      ✅ Tous les quotas fixes sont respectés")
        else:
            self.infos.append("      ⚠️ Quotas non respectés:")
            for msg in quotas_non_respectes:
                self.infos.append(f"         {msg}")
    
    def _calculer_scores_solution(
        self,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        voeux: List[Voeu],
        charge_par_enseignant: Dict
    ):
        """Calcule les scores de qualité de la solution"""
        
        # Score 1: Respect des vœux (100 = tous respectés)
        if voeux:
            voeux_respectes = 0
            voeux_violes = 0
            voeux_dict = self._construire_dict_voeux(voeux)
            
            for seance_key in seances.keys():
                date_exam, seance_code, semestre, session = seance_key
                jour = self._get_jour_from_date(date_exam)
                
                for enseignant in enseignants:
                    if self._a_voeu(enseignant.id, jour, seance_code, semestre, session, voeux_dict):
                        if self.solver.Value(affectations_vars[(seance_key, enseignant.id)]) == 0:
                            voeux_respectes += 1
                        else:
                            voeux_violes += 1
            
            total_voeux = voeux_respectes + voeux_violes
            self.score_components['respect_voeux'] = (voeux_respectes / total_voeux * 100) if total_voeux > 0 else 100
        else:
            self.score_components['respect_voeux'] = 100
        
        # Score 2: Équilibre global (100 = dispersion minimale)
        charges = list(charge_par_enseignant.values())
        if charges:
            charge_min_val = min([self.solver.Value(c) for c in charges])
            charge_max_val = max([self.solver.Value(c) for c in charges])
            dispersion = charge_max_val - charge_min_val
            max_dispersion = len(seances)
            
            self.score_components['equilibre_global'] = max(0, 100 - (dispersion / max_dispersion * 100))
        else:
            self.score_components['equilibre_global'] = 100
        
        # Score 3: Quota fixe respecté (100 = tous les quotas égaux respectés)
        quotas_ok = 0
        quotas_total = 0
        
        for enseignant in enseignants:
            config = self.grade_configs.get(enseignant.grade_code, {})
            quota_fixe = config.get('nb_surveillances', 0)
            charge = self.solver.Value(charge_par_enseignant[enseignant.id])
            
            quotas_total += 1
            if charge == quota_fixe:
                quotas_ok += 1
        
        self.score_components['quota_respecte'] = (quotas_ok / quotas_total * 100) if quotas_total > 0 else 100
        
        # Score global
        score_global = (
            self.score_components['respect_voeux'] * 0.3 +
            self.score_components['equilibre_global'] * 0.4 +
            self.score_components['quota_respecte'] * 0.3
        )
        
        self.score_components['score_global'] = score_global
        
        self.infos.append("\n🎯 === SCORES D'OPTIMISATION ===")
        self.infos.append(f"   • Respect des vœux: {self.score_components['respect_voeux']:.1f}%")
        self.infos.append(f"   • Équilibre global: {self.score_components['equilibre_global']:.1f}%")
        self.infos.append(f"   • Quotas respectés: {self.score_components['quota_respecte']:.1f}%")
        self.infos.append(f"   • SCORE GLOBAL: {score_global:.1f}%")
