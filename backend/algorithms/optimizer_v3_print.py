"""
Algorithme d'Optimisation Avancé pour la Génération des Plannings de Surveillance
Version 3.0 - Quota maximum strict avec optimisation avancée
"""

import math
from ortools.sat.python import cp_model
from sqlalchemy.orm import Session, joinedload
from models.models import Enseignant, Examen, Affectation, Voeu, GradeConfig
from datetime import datetime, date, time as dt_time
from typing import List, Dict, Tuple, Set
import time


class SurveillanceOptimizerV3:
    """
    Algorithme d'optimisation avancé avec gestion complète des contraintes et priorités.

    ARCHITECTURE:
    - Les enseignants sont affectés à des SÉANCES (créneaux horaires)
    - Tous les enseignants d'une séance surveillent TOUS les examens de cette séance
    - Si une séance a 5 examens et que chaque examen nécessite 2 surveillants,
      alors la séance nécessite 10 enseignants (5 × 2)

    RÈGLES DE BASE (Contraintes fortes - HARD - OBLIGATOIRES):
    1. ÉGALITÉ STRICTE par grade (tous les enseignants d'un même grade font EXACTEMENT le même nombre de séances)
    2. Quota maximum strict par grade (pas de dépassement autorisé)
    3. Nombre d'enseignants par séance:
       - Mode normal: EXACTEMENT nb_examens × min_surveillants_par_examen
       - Mode adaptatif (si min_surveillants_par_examen > 2): 
         MIN = nb_examens × (quotas_totaux // besoin_ideal), MAX = nb_examens × min_surveillants_par_examen
       - Mode adaptatif (si min_surveillants_par_examen <= 2):
         MIN = nb_examens (1 par examen), MAX = nb_examens × min_surveillants_par_examen
    4. Non-conflit horaire

    RÈGLES DE PRÉFÉRENCE (Contraintes souples - SOFT):
    1. Respect des vœux de NON-disponibilité (vœux = créneaux où l'enseignant NE VEUT PAS surveiller)
    2. Présence obligatoire des responsables d'examen
    3. Équilibre entre séances de taille similaire
    4. Interdiction première + dernière séance isolées
    5. Regroupement des séances

    PRIORITÉ DES CONTRAINTES (ordre d'importance):
    1. ÉGALITÉ STRICTE par Grade (PRIORITÉ 1 - OBLIGATOIRE)
    2. Quota Maximum Strict par Grade (PRIORITÉ 1 - OBLIGATOIRE)
    3. Nombre d'Enseignants par Séance (PRIORITÉ 2 - OBLIGATOIRE)
    4. Respect des Vœux de NON-Disponibilité (PRIORITÉ 3)
    5. Présence Obligatoire des Responsables (PRIORITÉ 4)
    6. Équilibre entre Séances de Taille Similaire (PRIORITÉ 5)
    7. Interdiction Première + Dernière Séance Isolées (PRIORITÉ 6)
    8. Regroupement des Séances (PRIORITÉ 7)
    """

    def __init__(self, db: Session):
        self.db = db
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.warnings = []
        self.infos = []
        self.dispersions_par_grade = {}  # Stockage des dispersions par grade pour la fonction objectif

        # Charger la configuration des grades depuis la BDD
        self.grade_configs = self._load_grade_configs()

    def _load_grade_configs(self) -> Dict[str, Dict]:
        """
        Charge les configurations de grades avec quotas MAXIMUM stricts.

        IMPORTANT: Le quota représente le MAXIMUM de séances qu'un enseignant
        d'un grade peut faire. Aucun dépassement n'est autorisé.
        """
        configs = self.db.query(GradeConfig).all()
        grade_dict = {}

        for config in configs:
            # Le quota maximum est défini par nb_surveillances
            quota_maximum = config.nb_surveillances

            grade_dict[config.grade_code] = {
                "nb_surveillances": quota_maximum,  # Quota MAXIMUM pour ce grade
                "label": config.grade_nom,  # Nom du grade
            }

        return grade_dict

    def generer_planning_optimise(
        self,
        min_surveillants_par_examen: int = 2,
        allow_fallback: bool = True,
        respecter_voeux: bool = True,
        equilibrer_temporel: bool = False,
        activer_regroupement_temporel: bool = True,
        max_time_in_seconds: int = 900,
        relative_gap_limit: float = 0.01,
    ) -> Tuple[bool, int, float, List[str], Dict]:
        """
        Génère le planning optimal avec respect de toutes les contraintes.

        Args:
            min_surveillants_par_examen: Nombre minimum de surveillants par examen
            allow_fallback: Autoriser le fallback à 1 surveillant si nécessaire
            respecter_voeux: Prendre en compte les vœux (True fortement recommandé)
            equilibrer_temporel: Équilibrer la répartition des créneaux horaires
            activer_regroupement_temporel: Activer le bonus de regroupement des séances (défaut: True pour confort enseignants)
            max_time_in_seconds: Temps maximum de résolution en secondes (défaut: 900 = 15 minutes)
            relative_gap_limit: Gap relatif accepté pour arrêter l'optimisation (défaut: 0.01 = 1%)

        Returns:
            (success, nb_affectations, temps_execution, messages)
        """
        start_time = time.time()

        print("=" * 80)
        print("🚀 DÉMARRAGE DE L'ALGORITHME D'OPTIMISATION V3.0")
        print("=" * 80)

        # ===== PHASE 1: RÉCUPÉRATION DES DONNÉES =====
        print("\n📊 Phase 1: Récupération des données...")

        enseignants = (
            self.db.query(Enseignant)
            .filter(Enseignant.participe_surveillance == True)
            .all()
        )

        examens = self.db.query(Examen).order_by(Examen.dateExam, Examen.h_debut).all()

        voeux = self.db.query(Voeu).all() if respecter_voeux else []
        list_voeux = []
        # Trier les vœux (délégué à une méthode privée)
        if respecter_voeux and voeux:
            try:
                list_voeux = self._trier_et_afficher_voeux(voeux)
            except Exception:
                # Ne pas échouer l'algorithme si le traitement des vœux plante
                self.warnings.append(
                    "⚠️ Impossible de traiter les vœux (format inattendu)"
                )

        print(f"   ✓ {len(enseignants)} enseignants disponibles")
        print(f"   ✓ {len(examens)} examens à planifier")
        print(f"   ✓ {len(voeux)} vœux de non-disponibilité")

        # Vérifications préliminaires
        if not enseignants:
            self.warnings.append("⚠️ Aucun enseignant disponible pour la surveillance")
            return False, 0, 0.0, self.warnings

        if not examens:
            self.warnings.append("⚠️ Aucun examen à planifier")
            return False, 0, 0.0, self.warnings

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
            return False, 0, 0.0, self.warnings

        # Afficher les séances
        for idx, (seance_key, examens_seance) in enumerate(seances.items(), 1):
            date_exam, seance_code, semestre, session, jour_index = seance_key
            print(
                f"   • Séance {idx}: Jour {jour_index} - {date_exam.strftime('%d/%m/%Y')} - {seance_code} - {semestre} - {session} ({len(examens_seance)} examens)"
            )

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
                date_exam, seance_code, semestre, session, jour_index = seance_key
                var_name = f"aff_{date_exam.strftime('%Y%m%d')}_{seance_code}_{semestre}_{session}_j{jour_index}_ens_{enseignant.id}"
                affectations_vars[(seance_key, enseignant.id)] = self.model.NewBoolVar(
                    var_name
                )
        #      print(f"      • Variable: {var_name} | Clé: {seance_key}, Enseignant: {enseignant.id}")

        print(f"   ✓ {len(affectations_vars)} variables booléennes créées")

        # ===== PHASE 6: APPLICATION DES CONTRAINTES =====
        print("\n🔒 Phase 6: Application des contraintes...")

        # CONTRAINTE 1: ÉGALITÉ STRICTE par grade (PRIORITÉ 1 - OBLIGATOIRE)
        print("   → Contrainte 1: ÉGALITÉ STRICTE par grade (PRIORITÉ 1 - OBLIGATOIRE)")
        print("      ⚠️ Tous les enseignants d'un même grade feront EXACTEMENT le même nombre de séances")
        charge_par_enseignant = self._contrainte_quotas_grades(
            enseignants, seances, affectations_vars, responsables_examens
        )
        print(f"      ✓ Contrainte d'égalité stricte appliquée pour tous les grades")

        # CONTRAINTE 2: Nombre d'enseignants par séance (PRIORITÉ 2 - OBLIGATOIRE)
        print("   → Contrainte 2: Nombre d'enseignants par séance (PRIORITÉ 2 - OBLIGATOIRE)")
        besoins_par_seance, mode_adaptatif = self._contrainte_nombre_minimal(
            seances,
            enseignants,
            affectations_vars,
            min_surveillants_par_examen,
            allow_fallback,
        )
        print(f"      ✓ Contraintes de couverture appliquées")

        # CONTRAINTE 3: Respect des vœux de NON-disponibilité (PRIORITÉ 3)
        preferences_voeux = {}
        if respecter_voeux and list_voeux:
            print(
                "   → Contrainte 3: Respect des vœux de NON-disponibilité (PRIORITÉ 3)"
            )
            preferences_voeux = self._contrainte_voeux(
                list_voeux, seances, enseignants, affectations_vars
            )
            nb_avec_voeu = len(preferences_voeux.get("avec_voeu", []))
            nb_sans_voeu = len(preferences_voeux.get("sans_voeu", []))
            print(f"      ✓ {nb_avec_voeu} combinaisons à ÉVITER (vœux de non-disponibilité)")
            print(f"      ✓ {nb_sans_voeu} combinaisons sans contrainte de vœu")
        else:
            print("   → Contrainte 3: Vœux désactivés")

        # CONTRAINTE 4: Présence obligatoire des responsables (PRIORITÉ 4)
        print("   → Contrainte 4: Présence obligatoire des responsables d'examens (PRIORITÉ 4)")
        nb_contraintes_responsables = self._contrainte_responsables(
            responsables_examens, seances, affectations_vars, enseignants
        )
        print(
            f"      ✓ {nb_contraintes_responsables} responsables ajoutés obligatoirement (peuvent surveiller d'autres examens)"
        )

        # CONTRAINTE 5: Non-conflit horaire (automatique avec séances)
        print("   → Contrainte 5: Non-conflit horaire (automatique)")
        print(f"      ✓ Garanti par le système de séances")

        # CONTRAINTE 6: Équilibre entre séances (PRIORITÉ 5)
        print("   → Contrainte 6: Équilibre entre séances de taille similaire (PRIORITÉ 5)")
        self._contrainte_equilibre_entre_seances(
            seances,
            enseignants,
            affectations_vars,
            besoins_par_seance,
            min_surveillants_par_examen,
        )
        print(f"      ✓ Contraintes d'équilibre appliquées")

        # CONTRAINTE 7: Interdire première+dernière séance isolées (PRIORITÉ 6)
        print(
            "   → Contrainte 7: Interdiction première+dernière séance sans autres séances (PRIORITÉ 6)"
        )
        self._contrainte_interdire_premiere_derniere_isolees(
            seances, enseignants, affectations_vars
        )
        print(
            f"      ✓ Contrainte appliquée: impossible d'avoir SEULEMENT 1ère ET dernière séance d'un jour"
        )

        # CONTRAINTE 8: Favoriser séances consécutives (PRIORITÉ 7 - OPTIONNEL)
        bonus_consecutivite = None
        if activer_regroupement_temporel:
            print(
                "   → Contrainte 8: Regroupement des séances (PRIORITÉ 7 - OPTIONNEL - ACTIVÉ)"
            )
            bonus_consecutivite = self._contrainte_seances_consecutives(
                seances, enseignants, affectations_vars
            )
            print(
                f"      ✓ Bonus de regroupement calculé (favorise les séances groupées)"
            )
        else:
            print("   → Contrainte 8: Regroupement temporel (PRIORITÉ 7 - OPTIONNEL - DÉSACTIVÉ)")

        # ===== PHASE 7: FONCTION OBJECTIF =====
        print("\n🎯 Phase 7: Configuration de la fonction objectif...")

        score_total = self._configurer_fonction_objectif(
            charge_par_enseignant,
            affectations_vars,
            seances,
            enseignants,
            equilibrer_temporel,
            preferences_voeux,
            bonus_consecutivite,
            activer_regroupement_temporel,
            mode_adaptatif,
        )

        if activer_regroupement_temporel:
            print(f"      ✓ Fonction objectif configurée (ordre de priorité):")
            if mode_adaptatif:
                print(f"         MODE ADAPTATIF (quotas insuffisants):")
                print(f"         1. ÉVITER les vœux de non-disponibilité (PRIORITÉ 3) - 40% - PÉNALITÉ")
                print(f"         2. Minimiser la dispersion globale entre enseignants - 20%")
                print(f"         3. Maximiser l'utilisation des quotas - 20%")
                print(f"         4. Favoriser les séances regroupées (PRIORITÉ 7) - 20%")
            else:
                print(f"         MODE NORMAL (quotas suffisants):")
                print(f"         1. ÉVITER les vœux de non-disponibilité (PRIORITÉ 3) - 50% - PÉNALITÉ")
                print(f"         2. Minimiser la dispersion globale entre enseignants - 30%")
                print(f"         3. Favoriser les séances regroupées (PRIORITÉ 7) - 20%")
                print(f"         Note: Quotas déjà maximisés par CONTRAINTE 1 (pas d'optimisation)")
            print(f"         Note: Égalité par grade garantie par CONTRAINTE 1 (dispersion = 0)")
        else:
            print(f"      ✓ Fonction objectif configurée (ordre de priorité):")
            if mode_adaptatif:
                print(f"         MODE ADAPTATIF (quotas insuffisants):")
                print(f"         1. ÉVITER les vœux de non-disponibilité (PRIORITÉ 3) - 50% - PÉNALITÉ")
                print(f"         2. Minimiser la dispersion globale entre enseignants - 30%")
                print(f"         3. Maximiser l'utilisation des quotas - 20%")
            else:
                print(f"         MODE NORMAL (quotas suffisants):")
                print(f"         1. ÉVITER les vœux de non-disponibilité (PRIORITÉ 3) - 60% - PÉNALITÉ")
                print(f"         2. Minimiser la dispersion globale entre enseignants - 40%")
                print(f"         Note: Quotas déjà maximisés par CONTRAINTE 1 (pas d'optimisation)")
            print(f"         Note: Égalité par grade garantie par CONTRAINTE 1 (dispersion = 0)")

        # ===== PHASE 8: RÉSOLUTION =====
        print("\n⚡ Phase 8: Résolution du problème...")

        # Configuration ultra-optimisée du solveur pour performances maximales
        import os

        # Détection automatique du nombre de cœurs CPU
        nb_cores = os.cpu_count() or 8
        self.solver.parameters.num_search_workers = min(nb_cores, 16)  # Max 16 workers

        # Timeout optimisé (paramètre configurable)
        self.solver.parameters.max_time_in_seconds = max_time_in_seconds
        self.solver.parameters.log_search_progress = (
            False  # Désactiver les logs verbeux
        )

        # Stratégies pour accélérer la recherche
        self.solver.parameters.cp_model_presolve = True  # Pré-résolution
        self.solver.parameters.linearization_level = 2  # Linéarisation avancée
        self.solver.parameters.cp_model_probing_level = 2  # Probing avancé

        # NOUVEAUX PARAMÈTRES D'ACCÉLÉRATION ⚡⚡⚡
        self.solver.parameters.relative_gap_limit = (
            relative_gap_limit  # Gap relatif accepté (paramètre configurable)
        )
        self.solver.parameters.max_deterministic_time = (
            max_time_in_seconds / 2.0  # Temps déterministe = moitié du temps max
        )

        print(f"      → Utilisation de {min(nb_cores, 16)} workers CPU")
        print(
            f"      → Timeout: {max_time_in_seconds} secondes ({max_time_in_seconds / 60:.1f} min)"
        )
        print(f"      → Gap relatif accepté: {relative_gap_limit * 100:.1f}%")

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
            
            self.warnings.append(
                "❌ Impossible de trouver une solution avec TOUTES les contraintes"
            )
            self.warnings.append("=== 💡 SOLUTIONS POSSIBLES ===")
            self.warnings.append("� Suggestions pour résoudre le problème:")
            self.warnings.append("   • Vérifier la configuration des grades (quotas, nombre d'enseignants disponibles)")
            self.warnings.append(f"   • Augmenter le temps de résolution (actuellement: {max_time_in_seconds}s)")
            self.warnings.append(f"   • Réduire le nombre de surveillants par examen (actuellement: {min_surveillants_par_examen})")
            self.warnings.append("   • Augmenter le taux de tolérance pour l'équilibre entre séances")
            self.warnings.append(f"   • Activer le mode fallback (actuellement: {'activé' if allow_fallback else 'désactivé'})")
            self.warnings.append("   • Vérifier que tous les enseignants participants sont bien configurés (participe_surveillance=True)")
            self.warnings.append("===================================")
            return (
                False,
                0,
                time.time() - start_time,
                self.warnings,
            )

        # Sauvegarder les affectations
        nb_affectations = self._sauvegarder_affectations_par_seance(
            affectations_vars, seances, enseignants, responsables_examens
        )

        execution_time = time.time() - start_time

        # ===== PHASE 10: VÉRIFICATIONS ET STATISTIQUES =====
        print("\n📊 Phase 10: Vérifications et statistiques...")

        # Vérifications finales
        self._verifier_couverture_seances(seances, besoins_par_seance)
        self._generer_statistiques(enseignants, seances, affectations_vars)
        
        # Statistiques sur les vœux de non-disponibilité
        if respecter_voeux and preferences_voeux and preferences_voeux.get("avec_voeu"):
            self._generer_statistiques_voeux(
                affectations_vars, 
                preferences_voeux, 
                enseignants,
                len(list_voeux)
            )

        print("\n" + "=" * 80)
        print(
            f"✅ GÉNÉRATION TERMINÉE EN {execution_time:.2f}s - {nb_affectations} affectations créées"
        )
        print(f"📊 Statut: {status_text}")
        print("=" * 80)

        return (
            True,
            nb_affectations,
            execution_time,
            self.warnings + self.infos,
        )

    # ========== CONTRAINTES ==========

    def _contrainte_responsables(
        self,
        responsables_examens: Dict[int, int],
        seances: Dict,
        affectations_vars: Dict,
        enseignants: List[Enseignant],
    ) -> int:
        """
        CONTRAINTE 4 (PRIORITÉ 4): Le responsable d'un examen doit être présent.
        Le responsable PEUT surveiller d'autres examens pendant le même créneau.
        Il COMPTE dans les quotas de surveillance.
        """
        nb_responsables_contraints = 0

        # Pour chaque séance et chaque examen de la séance
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    # Trouver l'objet enseignant correspondant pour avoir son code_smartex
                    responsable_obj = next(
                        (ens for ens in enseignants if ens.id == responsable_id), None
                    )

                    # Préparer les informations de l'examen pour l'affichage
                    date_exam_str = (
                        examen.dateExam.strftime("%d/%m/%Y")
                        if examen.dateExam
                        else "Date inconnue"
                    )
                    heure_exam_str = (
                        examen.h_debut.strftime("%H:%M")
                        if examen.h_debut
                        else "Heure inconnue"
                    )
                    salle_exam = (
                        examen.cod_salle
                        if hasattr(examen, "cod_salle")
                        else "Salle inconnue"
                    )

                    # Vérifier que le responsable fait partie des enseignants disponibles
                    if responsable_obj:
                        # Ajouter la contrainte : le responsable doit être affecté à la séance de cet examen
                        var = affectations_vars.get((seance_key, responsable_id))
                        if var is not None:
                            self.model.Add(var == 1)
                            nb_responsables_contraints += 1
                        else:
                            code_smartex = (
                                responsable_obj.code_smartex
                                if responsable_obj.code_smartex
                                else f"ID_{responsable_id}"
                            )
                            nom_complet = (
                                f"{responsable_obj.nom} {responsable_obj.prenom}".strip()
                                if hasattr(responsable_obj, "prenom")
                                else responsable_obj.nom
                            )
                    else:
                        # Si l'enseignant n'est pas dans la liste des disponibles, chercher dans la BDD
                        code_smartex = (
                            examen.enseignant
                            if hasattr(examen, "enseignant") and examen.enseignant
                            else f"ID_{responsable_id}"
                        )

                        # Tenter de récupérer l'enseignant depuis la BDD pour avoir son nom complet
                        try:
                            from models.models import Enseignant

                            responsable_bdd = (
                                self.db.query(Enseignant)
                                .filter(Enseignant.id == responsable_id)
                                .first()
                            )
                            if responsable_bdd:
                                nom_complet = (
                                    f"{responsable_bdd.nom} {responsable_bdd.prenom}".strip()
                                    if hasattr(responsable_bdd, "prenom")
                                    and responsable_bdd.prenom
                                    else responsable_bdd.nom
                                )
                                code_smartex = (
                                    responsable_bdd.code_smartex
                                    if responsable_bdd.code_smartex
                                    else code_smartex
                                )
                            else:
                                pass
                        except Exception as e:
                            pass

        return nb_responsables_contraints

    def _contrainte_nombre_minimal(
        self,
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
        min_surveillants_par_examen: int,
        allow_fallback: bool,
    ) -> Dict:
        """
        CONTRAINTE 2 (PRIORITÉ 2 - OBLIGATOIRE): Nombre exact d'enseignants par séance.

        IMPORTANT: Les enseignants affectés à une séance surveillent TOUS les examens de cette séance.
        Le nombre total de surveillants requis pour une séance est EXACTEMENT:
        nb_examens × min_surveillants_par_examen

        Exemple concret:
        - Séance avec 15 examens et min_surveillants_par_examen = 2
        - Nombre idéal et maximum = 15 × 2 = 30 enseignants
        - Chaque examen aura exactement 2 surveillants (les 30 enseignants surveillent tous les 15 examens)

        ADAPTATION si nécessaire (MODE ADAPTATIF avec allow_fallback=True):
        
        CAS 1 - Si min_surveillants_par_examen > 2:
        - Calcul intelligent du minimum basé sur le ratio: quotas_totaux / besoin_ideal
        - Exemple: besoin_ideal=500, quotas_totaux=1005 → ratio=2.01 → minimum=2 surveillants/examen
        - Garantit une répartition proportionnelle et équitable
        
        CAS 2 - Si min_surveillants_par_examen <= 2:
        - Comportement classique: minimum 1 surveillant par examen
        - Réduction progressive selon les quotas disponibles
        
        Dans tous les cas:
        - En mode ADAPTATIF: NE JAMAIS DÉPASSER nb_examens × min_surveillants_par_examen
        """
        besoins_par_seance = {}

        # Calculer les quotas totaux disponibles
        quotas_totaux = 0
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(grade_code, {"nb_surveillances": 2})
            quota_fixe = grade_config.get("nb_surveillances", 2)
            quotas_totaux += len(enseignants_grade) * quota_fixe

        # Calculer le besoin total avec min_surveillants_par_examen
        nb_total_examens = sum([len(examens) for examens in seances.values()])
        besoin_ideal = nb_total_examens * min_surveillants_par_examen
        
        # Calculer le minimum adaptatif basé sur le ratio quotas/besoin
        # Si min_surveillants_par_examen > 2, on calcule un minimum proportionnel
        if min_surveillants_par_examen > 2:
            # Calcul du ratio: combien de fois on peut satisfaire le besoin idéal
            ratio_couverture = quotas_totaux / besoin_ideal if besoin_ideal > 0 else 1
            # Le minimum par examen sera proportionnel au ratio (au moins 1, au max min_surveillants_par_examen)
            min_par_examen_adaptatif = max(1, min(min_surveillants_par_examen, int(ratio_couverture * min_surveillants_par_examen)))
            besoin_minimal = nb_total_examens * min_par_examen_adaptatif
        else:
            # Pour min_surveillants_par_examen <= 2, on garde le comportement classique
            besoin_minimal = nb_total_examens  # Au minimum 1 surveillant par examen
            min_par_examen_adaptatif = 1

        # Vérifier s'il faut adapter (quotas insuffisants)
        # ⚠️ MODE ADAPTATIF SEULEMENT SI allow_fallback=True
        mode_adaptatif = allow_fallback and (quotas_totaux < besoin_ideal)

        if mode_adaptatif:
            if min_surveillants_par_examen > 2:
                # Mode adaptatif intelligent avec calcul proportionnel
                print(f"\n⚠️  MODE ADAPTATIF ACTIVÉ:")
                print(f"   → Quotas totaux ({quotas_totaux}) < besoin idéal ({besoin_ideal})")
                print(f"   → Ratio de couverture: {quotas_totaux}/{besoin_ideal} = {quotas_totaux/besoin_ideal:.2f}")
                print(f"   → Adaptation intelligente: minimum de {min_par_examen_adaptatif} surveillant(s) par examen")
                print(f"   → Maximum autorisé: {min_surveillants_par_examen} surveillant(s) par examen")
                print(f"   → Besoin minimal calculé: {besoin_minimal} enseignants (={nb_total_examens} examens × {min_par_examen_adaptatif})")
                print(f"   → Besoin maximal: {besoin_ideal} enseignants (={nb_total_examens} examens × {min_surveillants_par_examen})")
                
                # Ajouter aux warnings pour le rapport final
                self.warnings.append("⚠️  MODE ADAPTATIF ACTIVÉ (CALCUL INTELLIGENT)")
                self.warnings.append(f"   • Quotas totaux disponibles: {quotas_totaux} enseignants")
                self.warnings.append(f"   • Besoin idéal: {besoin_ideal} enseignants")
                self.warnings.append(f"   • MINIMUM: {min_par_examen_adaptatif} surveillant(s) par examen")
                self.warnings.append(f"   • MAXIMUM: {min_surveillants_par_examen} surveillant(s) par examen")
                self.warnings.append(f"   • Besoin minimal: {besoin_minimal} enseignants ({nb_total_examens} examens × {min_par_examen_adaptatif})")
                self.warnings.append(f"   • Besoin maximal: {besoin_ideal} enseignants ({nb_total_examens} examens × {min_surveillants_par_examen})")
            else:
                # Calculer combien d'examens peuvent avoir min_surveillants_par_examen
                # et combien devront se contenter de 1 seul
                nb_examens_min_complet = (quotas_totaux - besoin_minimal) // (
                    min_surveillants_par_examen - 1
                )
                nb_examens_min_reduit = nb_total_examens - nb_examens_min_complet

                print(f"\n⚠️  MODE ADAPTATIF ACTIVÉ:")
                print(f"   → Quotas totaux ({quotas_totaux}) < besoin idéal ({besoin_ideal})")
                print(f"   → Minimum par examen: 1 surveillant")
                print(f"   → Maximum par examen: {min_surveillants_par_examen} surveillants")
                print(f"   → Adaptation: ~{nb_examens_min_complet} examens avec {min_surveillants_par_examen} surveillants, "
                      f"~{nb_examens_min_reduit} examens avec 1 seul surveillant")
                
                # Ajouter aussi aux warnings pour le rapport final
                self.warnings.append(
                    f"⚠️ MODE ADAPTATIF: {nb_examens_min_complet} examens avec {min_surveillants_par_examen} surveillants, "
                    f"{nb_examens_min_reduit} avec 1 surveillant"
                )

        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)

            # Nombre idéal et maximum pour cette séance = nb_examens × min_surveillants_par_examen
            nb_requis_ideal = nb_examens * min_surveillants_par_examen
            
            # Nombre minimal adaptatif selon le mode
            if mode_adaptatif and min_surveillants_par_examen > 2:
                # Mode adaptatif intelligent: utiliser le minimum calculé proportionnellement
                nb_requis_minimal = nb_examens * min_par_examen_adaptatif
            else:
                # Mode classique: minimum 1 surveillant par examen
                nb_requis_minimal = nb_examens

            besoins_par_seance[seance_key] = nb_requis_ideal

            surveillants_pour_seance = [
                affectations_vars[(seance_key, ens.id)] for ens in enseignants
            ]

            # Vérifier si suffisamment d'enseignants disponibles
            if nb_requis_minimal > len(enseignants):
                # Pas assez d'enseignants pour garantir le minimum par examen
                self.model.Add(sum(surveillants_pour_seance) >= len(enseignants))

            elif mode_adaptatif:
                # MODE ADAPTATIF: Nombre flexible mais NE JAMAIS DÉPASSER l'idéal
                # RÈGLE 1: Minimum adaptatif (calculé selon le ratio quotas/besoin)
                self.model.Add(sum(surveillants_pour_seance) >= nb_requis_minimal)

                # RÈGLE 2: MAXIMUM ABSOLU = nb_examens × min_surveillants_par_examen
                # ⚠️ NE JAMAIS DÉPASSER CE MAXIMUM, même en mode adaptatif
                self.model.Add(sum(surveillants_pour_seance) <= nb_requis_ideal)
            else:
                # MODE NORMAL: EXACTEMENT nb_examens × min_surveillants_par_examen
                # Pour 15 examens avec min=2 → EXACTEMENT 30 enseignants (pas plus, pas moins)

                # CONTRAINTE STRICTE: EXACTEMENT nb_requis_ideal surveillants
                self.model.Add(sum(surveillants_pour_seance) == nb_requis_ideal)

        return besoins_par_seance, mode_adaptatif

    def _contrainte_quotas_grades(
        self,
        enseignants: List[Enseignant],
        seances: Dict,
        affectations_vars: Dict,
        responsables_examens: Dict[int, int],
    ) -> Dict:
        """
        CONTRAINTE 1 (PRIORITÉ 1 - OBLIGATOIRE): Égalité stricte du nombre de séances par grade.

        RÈGLE STRICTE: Tous les enseignants d'un même grade doivent faire EXACTEMENT le même nombre de séances.

        IMPORTANT:
        - Chaque enseignant d'un même grade doit avoir la même charge de surveillance
        - Le quota maximum du grade reste une limite supérieure stricte
        - Si un responsable a trop d'examens par rapport à cette égalité, cela créera un INFEASIBLE

        Exemple:
        - Grade "Professeur": quota maximum = 3 séances
        - Si 5 profs du même grade participent, ils feront TOUS exactement le même nombre (ex: tous 2 séances)
        - Impossible d'avoir 2 profs à 3 séances et 3 profs à 1 séance
        """
        charge_par_enseignant = {}

        # Grouper les enseignants par grade
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        # Pour chaque grade, imposer l'égalité stricte entre tous les enseignants
        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(
                grade_code,
                {
                    "nb_surveillances": 2  # Par défaut, quota fixe = 2
                },
            )
            quota_fixe = grade_config.get("nb_surveillances", 2)

            # Calculer les charges pour ce grade
            charges = []
            for enseignant in enseignants_grade:
                charge = sum(
                    [
                        affectations_vars[(seance_key, enseignant.id)]
                        for seance_key in seances.keys()
                    ]
                )
                charge_par_enseignant[enseignant.id] = charge
                charges.append(charge)

            # Imposer l'égalité stricte et le quota maximum
            if charges:
                # ⚠️ CONTRAINTE OBLIGATOIRE 1: Aucun enseignant ne doit dépasser le quota fixe de son grade
                for charge in charges:
                    self.model.Add(charge <= quota_fixe)

                # ⚠️ CONTRAINTE OBLIGATOIRE 2: ÉGALITÉ PARFAITE entre tous les enseignants du même grade
                # Cette contrainte est STRICTE et NON NÉGOCIABLE
                if len(charges) > 1:
                    # Tous les enseignants du même grade doivent avoir EXACTEMENT la même charge
                    # On force l'égalité entre chaque enseignant et le premier de la liste
                    charge_reference = charges[0]
                    for i, charge in enumerate(charges[1:], start=1):
                        # Contrainte d'égalité stricte (HARD CONSTRAINT)
                        self.model.Add(charge == charge_reference)
                    
                    # Plus besoin de calculer la dispersion car elle sera toujours 0
                    # On la conserve quand même pour compatibilité avec la fonction objectif
                    if not hasattr(self, "dispersions_par_grade"):
                        self.dispersions_par_grade = {}
                    # Créer une variable de dispersion qui sera forcément 0
                    dispersion_grade = self.model.NewIntVar(
                        0, 0, f"dispersion_{grade_code}"
                    )
                    self.dispersions_par_grade[grade_code] = dispersion_grade

        return charge_par_enseignant

    def _contrainte_voeux(
        self,
        list_voeux: List[Dict],
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
    ) -> Dict:
        """
        CONTRAINTE 3 (PRIORITÉ 3): Éviter les vœux de NON-disponibilité.

        IMPORTANT: Les vœux sont des créneaux où l'enseignant NE SOUHAITE PAS surveiller.
        - Un vœu signifie "Je NE VEUX PAS surveiller à ce créneau"
        - Les enseignants avec vœux pour un créneau doivent être ÉVITÉS pour ce créneau
        - Si impossible d'éviter (manque d'enseignants), l'affectation reste possible mais pénalisée

        Args:
            list_voeux: Liste de dictionnaires avec les attributs:
                - id: Code smartex de l'enseignant
                - nom: Nom de l'enseignant
                - date_voeu: Date du vœu (objet date)
                - seance: Code séance (S1, S2, S3, S4)
                - heure: Heure de la séance

        Retourne un dictionnaire pour calculer les pénalités dans la fonction objectif.
        """
        preferences = {
            "avec_voeu": [],  # (seance_key, enseignant_id) avec vœu de NON-disponibilité → PÉNALITÉ
            "sans_voeu": [],  # (seance_key, enseignant_id) sans vœu → NEUTRE
        }

        # Construire un mapping code_smartex -> enseignant_id
        code_to_id = {
            ens.code_smartex: ens.id for ens in enseignants if ens.code_smartex
        }

        # Construire un set de tuples (enseignant_id, date_voeu, seance) pour recherche rapide
        voeux_set = set()
        voeux_rejetes = []
        for voeu_dict in list_voeux:
            code_smartex = voeu_dict.get("id")
            date_voeu = voeu_dict.get("date_voeu")
            seance_val = voeu_dict.get("seance")

            # Debug: pourquoi certains vœux sont rejetés
            raison_rejet = []
            if not code_smartex:
                raison_rejet.append("code_smartex vide")
            elif code_smartex not in code_to_id:
                raison_rejet.append(
                    f"code_smartex '{code_smartex}' non trouvé dans enseignants"
                )
            if not date_voeu:
                raison_rejet.append("date_voeu vide")
            if not seance_val:
                raison_rejet.append("seance vide")

            if code_smartex and code_smartex in code_to_id and date_voeu and seance_val:
                enseignant_id = code_to_id[code_smartex]
                # Normaliser la séance
                seance = str(seance_val).upper().strip()
                voeux_set.add((enseignant_id, date_voeu, seance))
            else:
                voeux_rejetes.append((voeu_dict, raison_rejet))

        # Pour chaque combinaison (séance, enseignant), vérifier si un vœu existe
        for seance_key in seances.keys():
            date_exam, seance_code, semestre, session, jour_index = seance_key
            # Normaliser le code de séance pour comparaison
            seance_normalized = seance_code.upper().strip()
            
            for enseignant in enseignants:
                # Vérifier si l'enseignant a un vœu de NON-disponibilité pour cette date et cette séance
                lookup_key = (enseignant.id, date_exam, seance_normalized)
                
                if lookup_key in voeux_set:
                    # PÉNALITÉ: Enseignant a exprimé un vœu de NON-disponibilité pour ce créneau
                    # Il faut ÉVITER de l'affecter ici (mais c'est possible si nécessaire)
                    preferences["avec_voeu"].append((seance_key, enseignant.id))
                else:
                    # NEUTRE: Pas de vœu de non-disponibilité pour ce créneau (affectation sans pénalité)
                    preferences["sans_voeu"].append((seance_key, enseignant.id))

        return preferences

    def _contrainte_equilibre_entre_seances(
        self,
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
        besoins_par_seance: Dict,
        min_surveillants_par_examen: int,
    ):
        """
        CONTRAINTE 5 (PRIORITÉ 5): Équilibre adaptatif entre séances de taille similaire.

        Les séances ayant le même nombre d'examens doivent avoir approximativement
        le même nombre d'enseignants affectés, avec une tolérance adaptée au contexte.

        ADAPTATION AU MODE:
        - Mode NORMAL: Toutes les séances de même taille ont déjà le même nombre exact
                       → Contrainte redondante mais pas conflictuelle (ignorée)
        - Mode ADAPTATIF: Les séances ont des nombres variables d'enseignants
                         → Tolérance large pour éviter les conflits INFEASIBLE

        Stratégie:
        - Grouper les séances par nombre d'examens
        - Calculer si on est en mode adaptatif (besoin != nb_examens × min)
        - Appliquer une tolérance adaptée: large en adaptatif, stricte en normal
        """
        # Déterminer si on est en mode adaptatif global
        # Mode adaptatif = au moins une séance a un besoin flexible
        mode_adaptatif_global = False
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            besoin_ideal = nb_examens * min_surveillants_par_examen
            besoin_reel = besoins_par_seance.get(seance_key, besoin_ideal)
            # Si le besoin stocké est l'idéal, mais on pourrait avoir moins, c'est adaptatif
            # On détecte le mode adaptatif si les contraintes permettent une plage
            if besoin_reel != besoin_ideal or nb_examens < besoin_ideal:
                mode_adaptatif_global = True
                break

        # Grouper les séances par nombre d'examens
        seances_par_taille = {}
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            if nb_examens not in seances_par_taille:
                seances_par_taille[nb_examens] = []
            seances_par_taille[nb_examens].append(seance_key)

        # Pour chaque groupe de séances de même taille
        for nb_examens, seances_groupe in seances_par_taille.items():
            # Si une seule séance dans ce groupe, pas besoin d'équilibrer
            if len(seances_groupe) <= 1:
                continue

            # Calculer le besoin idéal pour ce groupe
            besoin_ideal = nb_examens * min_surveillants_par_examen

            # Vérifier si toutes les séances de ce groupe sont en mode normal (contrainte exacte)
            # Si oui, cette contrainte est redondante, on peut la sauter
            toutes_exactes = all(
                # On vérifie si la contrainte est "exacte" (pas une plage)
                besoin_ideal == nb_examens * min_surveillants_par_examen
                for seance_key in seances_groupe
            )

            # Calculer le nombre d'enseignants pour chaque séance du groupe
            nb_enseignants_par_seance = {}
            for seance_key in seances_groupe:
                surveillants_pour_seance = [
                    affectations_vars[(seance_key, ens.id)] for ens in enseignants
                ]
                nb_enseignants_par_seance[seance_key] = sum(surveillants_pour_seance)

            # Définir la tolérance en fonction du mode
            if mode_adaptatif_global:
                # MODE ADAPTATIF: Tolérance LARGE pour éviter les conflits
                # La tolérance doit être au moins égale à la plage possible
                # Plage = [nb_examens, nb_examens × min_surveillants_par_examen]
                # Donc tolérance = plage / 2 pour permettre de la flexibilité
                tolerance = max(
                    int(
                        nb_examens * (min_surveillants_par_examen - 1) * 0.5
                    ),  # 50% de la plage
                    nb_examens,  # Au minimum le nombre d'examens
                    5,  # Au moins 5 enseignants de différence
                )
                self.infos.append(
                    f"   🔄 Équilibre ADAPTATIF: {len(seances_groupe)} séances avec {nb_examens} examens "
                    f"(tolérance large: ±{tolerance} enseignants)"
                )
            else:
                # MODE NORMAL: Tolérance stricte (mais en pratique redondante)
                # Les séances ont déjà exactement le même nombre via la contrainte 2
                tolerance = max(2, int(nb_examens * 0.05))  # 5% ou 2 minimum
                self.infos.append(
                    f"   🔄 Équilibre NORMAL: {len(seances_groupe)} séances avec {nb_examens} examens "
                    f"(tolérance stricte: ±{tolerance} enseignants - redondante avec contrainte 2)"
                )

            # Appliquer les contraintes d'équilibre pour chaque paire
            for i, seance_key_1 in enumerate(seances_groupe):
                for seance_key_2 in seances_groupe[i + 1 :]:
                    nb_ens_1 = nb_enseignants_par_seance[seance_key_1]
                    nb_ens_2 = nb_enseignants_par_seance[seance_key_2]

                    # Contrainte: |nb_ens_1 - nb_ens_2| <= tolerance
                    # Équivalent à: nb_ens_1 - nb_ens_2 <= tolerance ET nb_ens_2 - nb_ens_1 <= tolerance
                    self.model.Add(nb_ens_1 - nb_ens_2 <= tolerance)
                    self.model.Add(nb_ens_2 - nb_ens_1 <= tolerance)

    def _contrainte_interdire_premiere_derniere_isolees(
        self, seances: Dict, enseignants: List[Enseignant], affectations_vars: Dict
    ):
        """
        CONTRAINTE 6 (PRIORITÉ 6): Interdire d'avoir UNIQUEMENT la première ET la dernière séance d'un jour.

        Règle stricte:
        - Si un enseignant a la 1ère séance ET la dernière séance d'un jour
        - Alors il DOIT avoir au moins une autre séance dans ce jour
        - Sinon, c'est INTERDIT (contrainte forte)

        Exemple:
        - Jour avec séances [S1, S2, S3, S4]
        - INTERDIT: avoir uniquement S1 + S4 (sans S2 ni S3)
        - AUTORISÉ: S1 + S2, S1 + S3, S1 + S2 + S4, etc.
        """

        # Grouper les séances par jour et identifier première/dernière
        seances_par_jour = {}
        for seance_key in seances.keys():
            jour_index = seance_key[4]  # Index du jour (1, 2, 3...)
            seance_code = seance_key[1]  # Code de la séance (S1, S2, S3, S4)

            if jour_index not in seances_par_jour:
                seances_par_jour[jour_index] = []
            seances_par_jour[jour_index].append((seance_key, seance_code))

        # Pour chaque jour avec au moins 3 séances (si < 3, pas de problème)
        nb_contraintes_ajoutees = 0
        for jour_index, seances_jour in seances_par_jour.items():
            if len(seances_jour) < 3:
                # Pas assez de séances pour que la contrainte ait du sens
                continue

            # Trier les séances par code (S1 < S2 < S3 < S4)
            seances_jour_triees = sorted(seances_jour, key=lambda x: x[1])
            premiere_seance_key = seances_jour_triees[0][0]
            derniere_seance_key = seances_jour_triees[-1][0]
            seances_intermediaires = [s[0] for s in seances_jour_triees[1:-1]]

            # Pour chaque enseignant
            for enseignant in enseignants:
                # Variables: enseignant affecté à première/dernière/intermédiaires
                a_premiere = affectations_vars.get((premiere_seance_key, enseignant.id))
                a_derniere = affectations_vars.get((derniere_seance_key, enseignant.id))

                if a_premiere is None or a_derniere is None:
                    continue

                # Variable: enseignant a au moins une séance intermédiaire
                a_intermediaire = [
                    affectations_vars.get((seance_key, enseignant.id))
                    for seance_key in seances_intermediaires
                    if affectations_vars.get((seance_key, enseignant.id)) is not None
                ]

                if not a_intermediaire:
                    continue

                # CONTRAINTE FORTE: Si (première ET dernière), alors au moins une intermédiaire
                # Logique: NOT(première AND dernière) OR (au moins une intermédiaire)
                # Équivalent: première + dernière <= 1 + sum(intermédiaires)
                # Si première=1 et dernière=1, alors sum(intermédiaires) >= 1

                self.model.Add(a_premiere + a_derniere <= 1 + sum(a_intermediaire))
                nb_contraintes_ajoutees += 1


    def _contrainte_seances_consecutives(
        self, seances: Dict, enseignants: List[Enseignant], affectations_vars: Dict
    ):
        """
        CONTRAINTE 7 (PRIORITÉ 7 - OPTIONNELLE): Favorise le regroupement des séances par jour.
        VERSION OPTIMISÉE pour performance.

        Objectifs:
        1. Favoriser les séances regroupées dans un même jour (plusieurs séances = BONUS)
        2. Pénaliser les séances isolées dans un jour (1 seule séance = PÉNALITÉ)

        Règle:
        - Si un enseignant a N >= 2 séances dans un même jour → BONUS = +N
        - Si un enseignant a 1 seule séance dans un jour → PÉNALITÉ = -2

        Retourne un score de regroupement pour la fonction objectif.
        """

        # Grouper les séances par jour (date uniquement, pas par code de séance)
        seances_par_jour = {}
        for seance_key in seances.keys():
            date_exam = seance_key[0]  # Date de l'examen
            jour_index = seance_key[4]  # Index du jour (1, 2, 3...)

            if jour_index not in seances_par_jour:
                seances_par_jour[jour_index] = []
            seances_par_jour[jour_index].append(seance_key)

        bonus_total = []

        # Pour chaque enseignant et chaque jour, calculer le bonus/pénalité de regroupement
        for enseignant in enseignants:
            for jour_index, seances_jour in seances_par_jour.items():
                # Nombre de séances de cet enseignant ce jour
                nb_seances_jour = sum(
                    [
                        affectations_vars[(seance_key, enseignant.id)]
                        for seance_key in seances_jour
                    ]
                )

                # Variable pour savoir si l'enseignant a au moins 1 séance ce jour
                a_une_seance = self.model.NewBoolVar(
                    f"ens_{enseignant.id}_jour_{jour_index}_a_seance"
                )
                self.model.Add(nb_seances_jour >= 1).OnlyEnforceIf(a_une_seance)
                self.model.Add(nb_seances_jour == 0).OnlyEnforceIf(a_une_seance.Not())

                # Variable pour savoir si l'enseignant a au moins 2 séances ce jour (regroupées)
                a_plusieurs_seances = self.model.NewBoolVar(
                    f"ens_{enseignant.id}_jour_{jour_index}_a_plusieurs"
                )
                self.model.Add(nb_seances_jour >= 2).OnlyEnforceIf(a_plusieurs_seances)
                self.model.Add(nb_seances_jour <= 1).OnlyEnforceIf(
                    a_plusieurs_seances.Not()
                )

                # Variable pour savoir si l'enseignant a exactement 1 séance ce jour (isolée)
                seance_isolee = self.model.NewBoolVar(
                    f"ens_{enseignant.id}_jour_{jour_index}_isolee"
                )
                # seance_isolee = a_une_seance AND NOT a_plusieurs_seances
                self.model.AddBoolAnd(
                    [a_une_seance, a_plusieurs_seances.Not()]
                ).OnlyEnforceIf(seance_isolee)
                self.model.AddBoolOr(
                    [a_une_seance.Not(), a_plusieurs_seances]
                ).OnlyEnforceIf(seance_isolee.Not())

                # Contribution au score pour ce jour:
                # - Si plusieurs séances (regroupées): bonus = +nb_seances_jour
                # - Si séance isolée: pénalité = -2
                # - Si aucune séance: neutre = 0

                max_seances_jour = len(seances_jour)
                contribution_jour = self.model.NewIntVar(
                    -2,  # Pire cas: séance isolée
                    max_seances_jour,  # Meilleur cas: toutes les séances du jour
                    f"contrib_ens_{enseignant.id}_jour_{jour_index}",
                )

                # Si séance isolée: contribution = -2
                # Si plusieurs séances: contribution = nb_seances_jour
                # Si aucune séance: contribution = 0
                self.model.Add(contribution_jour == -2).OnlyEnforceIf(seance_isolee)
                self.model.Add(contribution_jour == nb_seances_jour).OnlyEnforceIf(
                    a_plusieurs_seances
                )
                self.model.Add(contribution_jour == 0).OnlyEnforceIf(a_une_seance.Not())

                bonus_total.append(contribution_jour)

        # Créer une variable pour le score de regroupement
        score_regroupement = None

        if bonus_total:
            # Calculer les bornes du score
            nb_jours = len(seances_par_jour)
            nb_enseignants = len(enseignants)
            max_seances_par_jour = max([len(s) for s in seances_par_jour.values()])

            # Pire cas: tous les enseignants ont des séances isolées dans tous les jours
            min_score = -2 * nb_jours * nb_enseignants
            # Meilleur cas: tous les enseignants ont toutes leurs séances regroupées
            max_score = max_seances_par_jour * nb_jours * nb_enseignants

            score_regroupement = self.model.NewIntVar(
                min_score, max_score, "score_regroupement_jours"
            )
            self.model.Add(score_regroupement == sum(bonus_total))

        return score_regroupement




    # ========== FONCTION OBJECTIF ==========

    def _configurer_fonction_objectif(
        self,
        charge_par_enseignant: Dict,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        equilibrer_temporel: bool,
        preferences_voeux: Dict = None,
        bonus_consecutivite=None,
        activer_regroupement_temporel: bool = False,
        mode_adaptatif: bool = False,
    ) -> cp_model.IntVar:
        """
        Configure la fonction objectif multi-critères pour maximiser la satisfaction globale.
        
        ORDRE DES PRIORITÉS (selon les contraintes définies):
        - PRIORITÉ 1-2: ÉGALITÉ par grade + Quota maximum + Nombre d'enseignants (CONTRAINTES FORTES - garanties)
        - PRIORITÉ 3: Respect des vœux de NON-disponibilité (POIDS LE PLUS ÉLEVÉ)
        - PRIORITÉ 4: Responsables (CONTRAINTE FORTE - garantie)
        - PRIORITÉ 5: Équilibre entre séances (CONTRAINTE FORTE - garantie)
        - PRIORITÉ 6: Interdiction 1ère+dernière isolées (CONTRAINTE FORTE - garantie)
        - PRIORITÉ 7: Regroupement des séances (POIDS SECONDAIRE)

        ADAPTATION SELON LE MODE:
        
        MODE NORMAL (quotas suffisants):
        - Les quotas sont DÉJÀ maximisés par la CONTRAINTE 1 (égalité stricte)
        - Pas besoin d'optimiser l'utilisation des quotas (redondant)
        - Avec regroupement: Vœux (50%) + Dispersion (30%) + Regroupement (20%)
        - Sans regroupement: Vœux (60%) + Dispersion (40%)
        
        MODE ADAPTATIF (quotas insuffisants):
        - Les enseignants peuvent avoir MOINS que leur quota maximum
        - Important d'optimiser l'utilisation des quotas disponibles
        - Avec regroupement: Vœux (40%) + Dispersion (20%) + Quotas (20%) + Regroupement (20%)
        - Sans regroupement: Vœux (50%) + Dispersion (30%) + Quotas (20%)
        
        NOTE: L'équilibre par grade (dispersion intra-grade) est déjà garanti par la CONTRAINTE 1
              (Égalité stricte par grade) qui impose dispersion_grades = 0. Pas besoin de l'optimiser.
        """

        # COMPOSANTE 1: Maximisation de l'utilisation des quotas (NOUVEAU - PRIORITAIRE)
        # Objectif: Affecter autant de séances que possible à chaque enseignant (jusqu'à son quota max)
        charges = list(charge_par_enseignant.values())
        total_affectations = None

        if charges:
            # Calculer le nombre total d'affectations
            total_affectations = self.model.NewIntVar(
                0, len(enseignants) * len(seances), "total_affectations"
            )
            self.model.Add(total_affectations == sum(charges))

        # COMPOSANTE 2: Équilibre global de charge (IMPORTANT)
        dispersion = None
        if charges:
            charge_min = self.model.NewIntVar(0, len(seances), "charge_min")
            charge_max = self.model.NewIntVar(0, len(seances), "charge_max")

            self.model.AddMinEquality(charge_min, charges)
            self.model.AddMaxEquality(charge_max, charges)

            dispersion = self.model.NewIntVar(0, len(seances), "dispersion")
            self.model.Add(dispersion == charge_max - charge_min)

        # COMPOSANTE 2.5: Équilibre par grade
        # ⚠️ NOTE: Cette composante est REDONDANTE avec la CONTRAINTE 1 (Égalité stricte par grade)
        # La contrainte 1 impose que dispersion_grades = 0 (TOUJOURS)
        # Donc minimiser dispersion_grades n'a aucun effet supplémentaire
        # → Cette composante est DÉSACTIVÉE pour éviter la redondance
        dispersion_grades = None
        # if hasattr(self, "dispersions_par_grade") and self.dispersions_par_grade:
        #     nb_grades = len(self.dispersions_par_grade)
        #     max_quota = max(
        #         [
        #             config.get("nb_surveillances", 5)
        #             for config in self.grade_configs.values()
        #         ]
        #     )
        #
        #     dispersion_grades = self.model.NewIntVar(
        #         0,
        #         nb_grades * max_quota,  # Somme max des dispersions
        #         "dispersion_grades",
        #     )
        #     self.model.Add(
        #         dispersion_grades == sum(self.dispersions_par_grade.values())
        #     )

        # COMPOSANTE 3: Pénalité pour vœux de NON-disponibilité (SECONDAIRE)
        # On veut MINIMISER le nombre d'affectations sur des créneaux non-souhaités
        penalite_voeux = None
        if preferences_voeux and preferences_voeux.get("avec_voeu"):
            # Compter le nombre d'affectations sur créneaux avec vœu de non-disponibilité
            affectations_avec_voeu = [
                affectations_vars[(seance_key, ens_id)]
                for seance_key, ens_id in preferences_voeux["avec_voeu"]
                if (seance_key, ens_id) in affectations_vars
            ]

            if affectations_avec_voeu:
                penalite_voeux = self.model.NewIntVar(
                    0, len(affectations_avec_voeu), "penalite_voeux"
                )
                self.model.Add(penalite_voeux == sum(affectations_avec_voeu))

        # COMPOSANTE 4: Équilibre temporel (si activé)
        #if equilibrer_temporel:
            #self._ajouter_equilibre_temporel(affectations_vars, seances, enseignants)

        # OBJECTIF COMBINÉ: ÉVITER penalite_voeux (PRIORITÉ 3), minimiser dispersion globale,
        # maximiser total_affectations, maximiser bonus_consecutivite (optionnel - PRIORITÉ 7)
        #
        # Avec regroupement temporel:
        # Score = -40*penalite_voeux - 30*dispersion + 20*total_affectations + 10*bonus_consecutivite
        #
        # Sans regroupement temporel:
        # Score = -50*penalite_voeux - 35*dispersion + 15*total_affectations
        #
        # Le solveur maximise, donc on veut:
        # - MINIMISER penalite_voeux (négatif fort) - PRIORITÉ 3 - RESPECTER LES VŒUX
        # - Minimiser dispersion globale (négatif) - Équité globale entre tous les enseignants
        # - Maximiser total_affectations (positif) - Utiliser les quotas
        # - Maximiser bonus regroupement (positif) - PRIORITÉ 7 - Confort (si activé)
        #
        # NOTE: dispersion_grades n'est PAS incluse car la CONTRAINTE 1 garantit déjà 
        #       que dispersion_grades = 0 (égalité stricte par grade)
        # - Maximiser bonus regroupement (positif) - Bonus léger (si activé)
        # - Minimiser penalite_voeux (négatif) - Pénaliser les affectations sur créneaux non-souhaités

        # Construction de la fonction objectif selon les composantes disponibles
        composantes = []
        poids = []

        # PRIORITÉ 3: ÉVITER les vœux de NON-disponibilité (POIDS LE PLUS ÉLEVÉ)
        if penalite_voeux is not None:
            composantes.append(penalite_voeux)
            # MODE ADAPTATIF: Poids ajusté selon si regroupement temporel activé
            # MODE NORMAL: Poids plus élevé car pas besoin d'optimiser les quotas
            if mode_adaptatif:
                poids.append(-50 if not activer_regroupement_temporel else -40)
            else:
                poids.append(-60 if not activer_regroupement_temporel else -50)

        # Équilibre global de charge (minimiser dispersion globale entre TOUS les enseignants)
        if dispersion is not None:
            composantes.append(dispersion)
            # MODE ADAPTATIF: Poids réduit pour laisser place au regroupement
            # MODE NORMAL: Poids modéré (égalité par grade déjà garantie)
            if mode_adaptatif:
                poids.append(-30 if not activer_regroupement_temporel else -20)
            else:
                poids.append(-40 if not activer_regroupement_temporel else -30)

        # NOTE: dispersion_grades est DÉSACTIVÉE car redondante avec CONTRAINTE 1
        # La CONTRAINTE 1 (Égalité stricte par grade) impose déjà dispersion_grades = 0

        # Maximisation des quotas (SEULEMENT EN MODE ADAPTATIF)
        # En mode NORMAL, les quotas sont déjà maximisés par la CONTRAINTE 1 (redondant)
        if mode_adaptatif and total_affectations is not None:
            composantes.append(total_affectations)
            # Poids ajusté selon si regroupement temporel activé
            poids.append(20 if activer_regroupement_temporel else 20)

        # PRIORITÉ 7: Bonus regroupement (POIDS AUGMENTÉ pour meilleur confort enseignants)
        if activer_regroupement_temporel and bonus_consecutivite is not None:
            composantes.append(bonus_consecutivite)
            poids.append(20)  # Poids augmenté à 20% pour favoriser le confort (PRIORITÉ 7)

        if composantes:
            # Calculer les bornes du score combiné
            min_score = sum([p for p in poids if p < 0]) * len(seances) * 10
            max_score = (
                sum([p for p in poids if p > 0]) * len(enseignants) * len(seances)
            )

            score_combine = self.model.NewIntVar(min_score, max_score, "score_combine")

            # Construire l'expression du score
            expression = sum(
                [poids[i] * composantes[i] for i in range(len(composantes))]
            )
            self.model.Add(score_combine == expression)
            self.model.Maximize(score_combine)
            return score_combine

        return None

    def _ajouter_equilibre_temporel(
        self, affectations_vars: Dict, seances: Dict, enseignants: List[Enseignant]
    ):
        """
        Ajoute des contraintes pour équilibrer temporellement les affectations.
        Évite qu'un enseignant soit toujours affecté aux mêmes créneaux horaires.
        """

        # Grouper les séances par code horaire (S1, S2, S3, S4)
        seances_par_code = {"S1": [], "S2": [], "S3": [], "S4": []}

        for seance_key in seances.keys():
            seance_code = seance_key[1]  # S1, S2, S3 ou S4
            if seance_code in seances_par_code:
                seances_par_code[seance_code].append(seance_key)

        # Pour chaque enseignant, équilibrer ses affectations entre créneaux
        for enseignant in enseignants:
            affectations_par_creneau = {}

            for code, seances_code in seances_par_code.items():
                if seances_code:
                    nb_aff_creneau = sum(
                        [
                            affectations_vars[(seance_key, enseignant.id)]
                            for seance_key in seances_code
                        ]
                    )
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
        responsables_examens: Dict[int, int],
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
                    est_responsable = enseignant.id == responsable_id

                    affectation = Affectation(
                        examen_id=examen.id,
                        enseignant_id=enseignant.id,
                        cod_salle=examen.cod_salle,
                        est_responsable=est_responsable,
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
            if hasattr(examen, "enseignant") and examen.enseignant:
                # Le champ enseignant contient le code smartex
                enseignant = (
                    self.db.query(Enseignant)
                    .filter(Enseignant.code_smartex == examen.enseignant)
                    .first()
                )

                if enseignant:
                    responsables[examen.id] = enseignant.id
                else:
                    # Log si le code smartex n'est pas trouvé
                    date_str = examen.dateExam.strftime("%d/%m/%Y")
                    time_str = f"{examen.h_debut.strftime('%H:%M')}-{examen.h_fin.strftime('%H:%M')}"
                    self.warnings.append(
                        f"⚠️ Enseignant responsable non trouvé (code '{examen.enseignant}') - Examen du {date_str} de {time_str} en salle {examen.cod_salle}"
                    )

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

    def _seance_to_index(self, seance_val) -> int:
        """Mappe une valeur de séance (S1,S2,.., 'Matin', 'Après-midi'...) en indice pour trier."""
        if seance_val is None:
            return 99
        s = str(seance_val).upper()
        if s in ("S1", "1", "08:30", "08:30-10:00", "MATIN", "M"):
            return 1
        if s in ("S2", "2", "10:30", "10:30-12:00"):
            return 2
        if s in ("S3", "3", "12:30", "12:30-14:00", "APRES-MIDI", "APRES MIDI"):
            return 3
        if s in ("S4", "4", "14:30", "14:30-16:00"):
            return 4
        if "MATIN" in s:
            return 1
        if "APRES" in s:
            return 3
        if s.startswith("S") and len(s) > 1 and s[1].isdigit():
            try:
                return int(s[1])
            except Exception:
                return 99
        return 99

    def _trier_et_afficher_voeux(self, voeux: List[Voeu]) -> list:
        """Trie la liste des voeux par date puis par séance et retourne une liste de dictionnaires d'attributs pour chaque voeu."""

        def _voeu_sort_key(voeu):
            date_voeu = getattr(voeu, "date_voeu", None)
            seance_val = getattr(voeu, "seance_indisponible", None) or getattr(
                voeu, "seance", None
            )
            seance_idx = self._seance_to_index(seance_val)
            code_smartex = getattr(voeu, "code_smartex_ens", None)
            rel_enseignant = getattr(voeu, "enseignant", None)
            rel_code = None
            if isinstance(rel_enseignant, str):
                rel_code = rel_enseignant
            elif hasattr(rel_enseignant, "code_smartex"):
                rel_code = getattr(rel_enseignant, "code_smartex")
            sort_ident = (
                code_smartex
                if code_smartex is not None
                else (rel_code if rel_code is not None else "")
            )
            # Utiliser date_voeu ou une date par défaut si absente
            date_sort = date_voeu if date_voeu else date(1900, 1, 1)
            return (date_sort, seance_idx, sort_ident)

        try:
            voeux.sort(key=_voeu_sort_key)
        except Exception:
            return []

        result = []
        for v in voeux:
            date_voeu = getattr(v, "date_voeu", None)
            seance_val = getattr(v, "seance_indisponible", None) or getattr(
                v, "seance", None
            )
            code_smartex = getattr(v, "code_smartex_ens", None)
            rel_enseignant = getattr(v, "enseignant", None)
            if isinstance(rel_enseignant, str):
                rel_code = rel_enseignant
            elif hasattr(rel_enseignant, "code_smartex"):
                rel_code = getattr(rel_enseignant, "code_smartex")
            else:
                rel_code = None

            ident = code_smartex if code_smartex else (rel_code if rel_code else None)

            nom = None
            try:
                if code_smartex:
                    ense = (
                        self.db.query(Enseignant)
                        .filter(Enseignant.code_smartex == code_smartex)
                        .first()
                    )
                    if ense:
                        nom = ense.nom
                elif rel_code:
                    ense = (
                        self.db.query(Enseignant)
                        .filter(Enseignant.code_smartex == rel_code)
                        .first()
                    )
                    nom = ense.nom if ense else None
            except Exception:
                nom = None

            heure = None
            if hasattr(v, "heure") and getattr(v, "heure"):
                heure = getattr(v, "heure")
            else:
                s = str(seance_val).upper() if seance_val is not None else ""
                if "S1" in s:
                    heure = "08:30"
                elif "S2" in s:
                    heure = "10:30"
                elif "S3" in s:
                    heure = "12:30"
                elif "S4" in s:
                    heure = "14:30"

            result.append(
                {
                    "id": ident,
                    "nom": nom,
                    "date_voeu": date_voeu,
                    "seance": seance_val,
                    "heure": heure,
                }
            )
        return result

    def _grouper_examens_par_seance(
        self, examens: List[Examen]
    ) -> Dict[Tuple, List[Examen]]:
        """
        Groupe les examens par séance unique et trie par date puis par séance (S1 à S4).
        Une séance = (date, seance_code, semestre, session, jour_index)
        où jour_index est un numéro séquentiel (1, 2, 3, ...) pour chaque journée unique.
        """
        seances = {}

        for examen in examens:
            seance_code = self._get_seance_code_from_time(examen.h_debut)
            seance_key = (examen.dateExam, seance_code, examen.semestre, examen.session)

            if seance_key not in seances:
                seances[seance_key] = []

            seances[seance_key].append(examen)

        # Trier les séances par date puis par code de séance (S1, S2, S3, S4)
        def _seance_sort_key(seance_key):
            date_exam, seance_code, semestre, session = seance_key
            # Mapper les codes de séance en indices numériques pour le tri
            seance_order = {"S1": 1, "S2": 2, "S3": 3, "S4": 4}
            seance_index = seance_order.get(seance_code, 99)
            return (date_exam, seance_index, semestre, session)

        # Créer un dictionnaire trié
        seances_triees_temp = dict(
            sorted(seances.items(), key=lambda item: _seance_sort_key(item[0]))
        )

        # Ajouter l'index de jour (numérotation séquentielle des journées)
        seances_avec_index_jour = {}
        dates_uniques = []
        date_to_jour_index = {}

        # Identifier les dates uniques dans l'ordre
        for seance_key in seances_triees_temp.keys():
            date_exam = seance_key[0]
            if date_exam not in dates_uniques:
                dates_uniques.append(date_exam)
                date_to_jour_index[date_exam] = len(dates_uniques)  # Index commence à 1

        # Recréer les clés avec l'index de jour
        for seance_key, examens_list in seances_triees_temp.items():
            date_exam, seance_code, semestre, session = seance_key
            jour_index = date_to_jour_index[date_exam]

            # Nouvelle clé avec l'index de jour
            nouvelle_cle = (date_exam, seance_code, semestre, session, jour_index)
            seances_avec_index_jour[nouvelle_cle] = examens_list

        return seances_avec_index_jour

    # ========== VÉRIFICATIONS ET STATISTIQUES ==========

    def _verifier_couverture_seances(self, seances: Dict, besoins_par_seance: Dict):
        """Vérifie que toutes les séances sont correctement couvertes"""

        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = besoins_par_seance.get(seance_key, 0)

            # Compter les affectations réelles
            nb_affectations = (
                self.db.query(Affectation)
                .filter(Affectation.examen_id.in_([ex.id for ex in examens_seance]))
                .count()
            )

            nb_enseignants_uniques = len(
                set(
                    [
                        aff.enseignant_id
                        for aff in self.db.query(Affectation)
                        .filter(
                            Affectation.examen_id.in_([ex.id for ex in examens_seance])
                        )
                        .all()
                    ]
                )
            )


    def _generer_statistiques(
        self, enseignants: List[Enseignant], seances: Dict, affectations_vars: Dict
    ):
        """Génère des statistiques sur la solution trouvée"""
        # Cette méthode est conservée pour compatibilité mais n'affiche plus de messages
        # Les statistiques importantes (vœux) sont gérées par _generer_statistiques_voeux
        pass



    def _generer_statistiques_voeux(
        self, 
        affectations_vars: Dict, 
        preferences_voeux: Dict,
        enseignants: List[Enseignant],
        nb_list_voeux: int
    ):
        """
        Génère des statistiques détaillées sur le respect des vœux de non-disponibilité.
        
        Args:
            affectations_vars: Variables d'affectation du modèle
            preferences_voeux: Dictionnaire avec 'avec_voeu' (à éviter) et 'sans_voeu'
            enseignants: Liste des enseignants
            nb_list_voeux: Nombre total de vœux exprimés dans la base
        """
        print("\n🎯 Statistiques sur les vœux de non-disponibilité:")
        
        # Récupérer les affectations sur créneaux avec vœux de non-disponibilité
        affectations_avec_voeu = preferences_voeux.get("avec_voeu", [])
        
        if not affectations_avec_voeu:
            print("   ✅ Aucun vœu de non-disponibilité à gérer dans le planning")
            self.infos.append("\n" + "=" * 80)
            self.infos.append("🎯 STATISTIQUES DES VŒUX DE NON-DISPONIBILITÉ")
            self.infos.append("=" * 80)
            self.infos.append("")
            self.infos.append("✅ Aucun vœu de non-disponibilité à gérer dans le planning actuel")
            if nb_list_voeux > 0:
                self.infos.append(f"ℹ️  Total de vœux exprimés dans la base: {nb_list_voeux}")
                self.infos.append("ℹ️  Ces vœux concernent probablement des créneaux hors du planning actuel")
            self.infos.append("")
            self.infos.append("=" * 80)
            return
        
        # Compter le nombre total de vœux concernant le planning
        nb_total_voeux_planning = len(affectations_avec_voeu)
        
        # Compter combien de vœux ont été violés (enseignant affecté sur créneau non-souhaité)
        nb_voeux_violes = 0
        nb_voeux_respectes = 0
        
        voeux_violes_details = []
        
        for seance_key, enseignant_id in affectations_avec_voeu:
            var = affectations_vars.get((seance_key, enseignant_id))
            if var is not None:
                if self.solver.Value(var) == 1:
                    # L'enseignant a été affecté sur un créneau qu'il ne souhaitait pas
                    nb_voeux_violes += 1
                    
                    # Trouver les infos de l'enseignant
                    enseignant = next((e for e in enseignants if e.id == enseignant_id), None)
                    if enseignant:
                        date_exam, seance_code, semestre, session, jour_index = seance_key
                        voeux_violes_details.append({
                            'enseignant': f"{enseignant.nom} {enseignant.prenom}",
                            'code': enseignant.code_smartex,
                            'date': date_exam.strftime('%d/%m/%Y'),
                            'seance': seance_code,
                            'semestre': semestre,
                            'session': session,
                            'jour': jour_index
                        })
                else:
                    # Le vœu a été respecté (enseignant non affecté sur ce créneau)
                    nb_voeux_respectes += 1
        
        # Calcul des vœux hors planning : total des vœux exprimés - vœux matchés dans le planning
        nb_voeux_hors_planning = nb_list_voeux - nb_total_voeux_planning

        nb_voeux_respectes=nb_voeux_respectes+nb_voeux_hors_planning
        # Calculer les pourcentages
        pourcentage_respectes = (nb_voeux_respectes / nb_list_voeux * 100) if nb_list_voeux > 0 else 100
        pourcentage_violes = (nb_voeux_violes / nb_list_voeux * 100) if nb_list_voeux > 0 else 0
        
        # Affichage console simplifié
        print(f"   ✅ Vœux respectés: {nb_voeux_respectes} ({pourcentage_respectes:.1f}%)")
        print(f"   ⚠️ Vœux violés: {nb_voeux_violes} ({pourcentage_violes:.1f}%)")
        
        # Affichage détaillé pour l'interface (self.infos)
        self.infos.append("\n" + "=" * 80)
        self.infos.append("🎯 STATISTIQUES DES Souhait DE NON-DISPONIBILITÉ")
        self.infos.append("=" * 80)
        self.infos.append("")
        
     
        
        # Résultats avec emoji et couleurs
        self.infos.append("📈 RÉSULTATS:")
        self.infos.append(f"   ✅ Souhait respectés: {nb_voeux_respectes} ({pourcentage_respectes:.1f}%)")
        self.infos.append(f"   ⚠️ Souhait violés: {nb_voeux_violes} ({pourcentage_violes:.1f}%)")
        self.infos.append("")
        
        # Si des vœux ont été violés, afficher TOUS les détails
        if nb_voeux_violes > 0:
            self.infos.append("-" * 80)
            self.infos.append(f"⚠️ LISTE COMPLÈTE DES {nb_voeux_violes} SOUHAITS NON RESPECTÉS:")
            self.infos.append("-" * 80)
            self.infos.append("")
            self.infos.append("Ces enseignants ont été affectés sur des créneaux qu'ils ne souhaitaient pas:")
            self.infos.append("")
            
            # Trier par date, puis par séance, puis par nom
            voeux_violes_details.sort(key=lambda x: (x['date'], x['seance'], x['enseignant']))
            
            for i, detail in enumerate(voeux_violes_details, 1):
                self.infos.append(
                    f"   {i:3d}. {detail['enseignant']:35s} | Code: {detail['code']:12s} | "
                    f"Date: {detail['date']:10s} | Séance: {detail['seance']:3s} | "
                    f"{detail['semestre']} - {detail['session']}"
                )
            
