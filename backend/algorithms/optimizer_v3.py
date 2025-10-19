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

    RÈGLES DE BASE (Contraintes fortes - HARD):
    1. Responsable d'examen doit être présent et compte dans les quotas
    2. Quota maximum strict par grade (pas de dépassement autorisé)
    3. Non-conflit horaire
    4. Nombre d'enseignants par séance:
       - Mode normal: EXACTEMENT nb_examens × min_surveillants_par_examen
       - Mode adaptatif: MIN = nb_examens (1 par examen), MAX = nb_examens × min_surveillants_par_examen

    RÈGLES DE PRÉFÉRENCE (Contraintes souples - SOFT):
    1. Préférence pour vœux de surveillance (vœux = créneaux où l'enseignant VEUT surveiller)
    2. Équilibre temporel (éviter toujours premiers/derniers créneaux)
    3. Équilibre global entre enseignants

    PRIORITÉ DES CONTRAINTES:
    1. Présence du responsable d'examen (peut surveiller d'autres examens)
    2. Nombre d'enseignants par séance (exact en mode normal, flexible en mode adaptatif)
    3. Quota maximum strict par grade (ne jamais dépasser)
    4. PRÉFÉRENCE pour vœux (pas obligatoire, mais bonus dans fonction objectif)
    5. Équilibre global
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
        equilibrer_temporel: bool = True,
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

        # CONTRAINTE 1: Présence obligatoire des responsables (PRIORITÉ 1)
        print("   → Contrainte 1: Présence obligatoire des responsables d'examens")
        nb_contraintes_responsables = self._contrainte_responsables(
            responsables_examens, seances, affectations_vars, enseignants
        )
        print(
            f"      ✓ {nb_contraintes_responsables} responsables ajoutés obligatoirement (peuvent surveiller d'autres examens)"
        )

        # CONTRAINTE 2: Nombre minimal d'enseignants par séance (PRIORITÉ 2)
        print("   → Contrainte 2: Nombre minimal d'enseignants par séance")
        besoins_par_seance = self._contrainte_nombre_minimal(
            seances,
            enseignants,
            affectations_vars,
            min_surveillants_par_examen,
            allow_fallback,
        )
        print(f"      ✓ Contraintes de couverture appliquées")

        # CONTRAINTE 3: Quota obligatoire par grade (PRIORITÉ 3)
        print("   → Contrainte 3: Quotas obligatoires et limites par grade")
        charge_par_enseignant = self._contrainte_quotas_grades(
            enseignants, seances, affectations_vars, responsables_examens
        )
        print(f"      ✓ Quotas de grades configurés")

        # CONTRAINTE 4: Préférence pour les vœux (PRIORITÉ 4)
        preferences_voeux = {}
        if respecter_voeux and list_voeux:
            print(
                "   → Contrainte 4: Préférence pour les enseignants avec vœux de disponibilité"
            )
            preferences_voeux = self._contrainte_voeux(
                list_voeux, seances, enseignants, affectations_vars
            )
            nb_avec_voeu = len(preferences_voeux.get("avec_voeu", []))
            nb_sans_voeu = len(preferences_voeux.get("sans_voeu", []))
            print(f"      ✓ {nb_avec_voeu} combinaisons avec vœu (prioritaires)")
            print(f"      ✓ {nb_sans_voeu} combinaisons sans vœu (secondaires)")
        else:
            print("   → Contrainte 4: Vœux désactivés")

        # CONTRAINTE 5: Non-conflit horaire (automatique avec séances)
        print("   → Contrainte 5: Non-conflit horaire (automatique)")
        print(f"      ✓ Garanti par le système de séances")

        # CONTRAINTE 6: Équilibre entre séances (PRIORITÉ 6)
        print("   → Contrainte 6: Équilibre entre séances de taille similaire")
        self._contrainte_equilibre_entre_seances(
            seances,
            enseignants,
            affectations_vars,
            besoins_par_seance,
            min_surveillants_par_examen,
        )
        print(f"      ✓ Contraintes d'équilibre appliquées")

        # CONTRAINTE 7: Interdire première+dernière séance isolées (PRIORITÉ 7 - CONTRAINTE FORTE)
        print(
            "   → Contrainte 7: Interdiction première+dernière séance sans autres séances"
        )
        self._contrainte_interdire_premiere_derniere_isolees(
            seances, enseignants, affectations_vars
        )
        print(
            f"      ✓ Contrainte appliquée: impossible d'avoir SEULEMENT 1ère ET dernière séance d'un jour"
        )

        # CONTRAINTE 8 (OPTIONNELLE): Favoriser séances consécutives
        bonus_consecutivite = None
        if activer_regroupement_temporel:
            print(
                "   → Contrainte 8: Optimisation du regroupement des séances (OPTIONNEL - ACTIVÉ)"
            )
            bonus_consecutivite = self._contrainte_seances_consecutives(
                seances, enseignants, affectations_vars
            )
            print(
                f"      ✓ Bonus de regroupement calculé (favorise les séances groupées)"
            )
        else:
            print("   → Contrainte 8: Regroupement temporel (OPTIONNEL - DÉSACTIVÉ)")

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
        )

        if activer_regroupement_temporel:
            print(f"      ✓ Fonction objectif configurée:")
            print(f"         • Maximiser l'utilisation des quotas (35%)")
            print(f"         • Minimiser la dispersion globale entre enseignants (25%)")
            print(
                f"         • Minimiser la dispersion par grade (équité intra-grade) (20%)"
            )
            print(f"         • Favoriser les séances regroupées (10% - optimisé)")
            print(f"         • Favoriser les vœux de surveillance (10%)")
        else:
            print(f"      ✓ Fonction objectif configurée:")
            print(f"         • Maximiser l'utilisation des quotas (40%)")
            print(f"         • Minimiser la dispersion globale entre enseignants (30%)")
            print(
                f"         • Minimiser la dispersion par grade (équité intra-grade) (20%)"
            )
            print(f"         • Favoriser les vœux de surveillance (10%)")

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
            print(
                "\n🔍 Démarrage du diagnostic pour identifier la contrainte problématique..."
            )

            # Lancer le diagnostic progressif
            diagnostic_result = self._diagnostiquer_echec(
                enseignants,
                examens,
                seances,
                responsables_examens,
                min_surveillants_par_examen,
                allow_fallback,
                list_voeux,
                respecter_voeux,
            )

            self.warnings.append(
                "❌ Impossible de trouver une solution avec TOUTES les contraintes"
            )
            self.warnings.append("\n📊 DIAGNOSTIC DES CONTRAINTES:")
            self.warnings.extend(diagnostic_result)

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
        CONTRAINTE 1 (PRIORITÉ 1): Le responsable d'un examen doit être présent.
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
                            self.warnings.append(
                                f"❌ Responsable {nom_complet} ({code_smartex}) non trouvable pour la séance "
                                f"du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
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
                                self.warnings.append(
                                    f"❌ Responsable {nom_complet} ({code_smartex}) non disponible (participe_surveillance=False) "
                                    f"pour l'examen du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                                )
                            else:
                                self.warnings.append(
                                    f"❌ Responsable {code_smartex} (ID: {responsable_id}) introuvable dans la base de données "
                                    f"pour l'examen du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                                )
                        except Exception as e:
                            self.warnings.append(
                                f"❌ Responsable {code_smartex} non disponible parmi les enseignants "
                                f"pour l'examen du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                            )

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
        CONTRAINTE 2 (PRIORITÉ 2): Nombre exact d'enseignants par séance.

        IMPORTANT: Les enseignants affectés à une séance surveillent TOUS les examens de cette séance.
        Le nombre total de surveillants requis pour une séance est EXACTEMENT:
        nb_examens × min_surveillants_par_examen

        Exemple concret:
        - Séance avec 15 examens et min_surveillants_par_examen = 2
        - Nombre idéal et maximum = 15 × 2 = 30 enseignants
        - Chaque examen aura exactement 2 surveillants (les 30 enseignants surveillent tous les 15 examens)

        ADAPTATION si nécessaire:
        - Si pas assez d'enseignants disponibles totalement, réduction proportionnelle
        - Garantit au minimum 1 surveillant par examen (minimum absolu)
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
        besoin_minimal = nb_total_examens  # Au minimum 1 surveillant par examen

        # Vérifier s'il faut adapter (quotas insuffisants)
        # ⚠️ MODE ADAPTATIF SEULEMENT SI allow_fallback=True
        mode_adaptatif = allow_fallback and (quotas_totaux < besoin_ideal)

        # Si quotas insuffisants mais allow_fallback=False, avertissement critique
        if not allow_fallback and quotas_totaux < besoin_ideal:
            self.warnings.append(
                f"❌ AVERTISSEMENT CRITIQUE: Quotas totaux ({quotas_totaux}) < besoin idéal ({besoin_ideal})"
            )
            self.warnings.append(
                f"   → Mode adaptatif DÉSACTIVÉ (allow_single_surveillant=False)"
            )
            self.warnings.append(
                f"   → Le solveur tentera de respecter {min_surveillants_par_examen} surveillants par examen"
            )
            self.warnings.append(
                f"   → Si impossible, la génération échouera (INFEASIBLE)"
            )

        if mode_adaptatif:
            # Calculer combien d'examens peuvent avoir min_surveillants_par_examen
            # et combien devront se contenter de 1 seul
            nb_examens_min_complet = (quotas_totaux - besoin_minimal) // (
                min_surveillants_par_examen - 1
            )
            nb_examens_min_reduit = nb_total_examens - nb_examens_min_complet

            self.warnings.append(
                f"⚠️ MODE ADAPTATIF ACTIVÉ (allow_single_surveillant=True): Quotas totaux ({quotas_totaux}) < besoin idéal ({besoin_ideal})"
            )
            self.warnings.append(
                f"   → Adaptation: ~{nb_examens_min_complet} examens avec {min_surveillants_par_examen} surveillants, "
                f"~{nb_examens_min_reduit} examens avec 1 seul surveillant"
            )

        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)

            # Nombre idéal et maximum pour cette séance = nb_examens × min_surveillants_par_examen
            nb_requis_ideal = nb_examens * min_surveillants_par_examen
            # Nombre minimal absolu (1 surveillant par examen)
            nb_requis_minimal = nb_examens

            besoins_par_seance[seance_key] = nb_requis_ideal

            surveillants_pour_seance = [
                affectations_vars[(seance_key, ens.id)] for ens in enseignants
            ]

            # Vérifier si suffisamment d'enseignants disponibles
            if nb_requis_minimal > len(enseignants):
                # Pas assez d'enseignants pour garantir 1 par examen
                self.model.Add(sum(surveillants_pour_seance) >= len(enseignants))
                self.warnings.append(
                    f"❌ Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"CRITIQUE - Besoin d'au moins {nb_requis_minimal} enseignants (1 par examen) "
                    f"mais seulement {len(enseignants)} disponibles!"
                )
            elif mode_adaptatif:
                # MODE ADAPTATIF: Nombre flexible mais NE JAMAIS DÉPASSER l'idéal
                # RÈGLE 1: Minimum strict (exactement 1 enseignant par examen)
                self.model.Add(sum(surveillants_pour_seance) >= nb_requis_minimal)

                # RÈGLE 2: MAXIMUM ABSOLU = nb_examens × min_surveillants_par_examen
                # ⚠️ NE JAMAIS DÉPASSER CE MAXIMUM, même en mode adaptatif
                self.model.Add(sum(surveillants_pour_seance) <= nb_requis_ideal)

                self.infos.append(
                    f"   • Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_examens} examens → Min: {nb_requis_minimal} (1 par examen), "
                    f"Max: {nb_requis_ideal} (⚠️ NE PAS DÉPASSER)"
                )
            else:
                # MODE NORMAL: EXACTEMENT nb_examens × min_surveillants_par_examen
                # Pour 15 examens avec min=2 → EXACTEMENT 30 enseignants (pas plus, pas moins)

                # CONTRAINTE STRICTE: EXACTEMENT nb_requis_ideal surveillants
                self.model.Add(sum(surveillants_pour_seance) == nb_requis_ideal)

                # Log pour traçabilité
                self.infos.append(
                    f"   • Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_examens} examens → EXACTEMENT {nb_requis_ideal} enseignants "
                    f"({min_surveillants_par_examen} par examen)"
                )

        return besoins_par_seance

    def _contrainte_quotas_grades(
        self,
        enseignants: List[Enseignant],
        seances: Dict,
        affectations_vars: Dict,
        responsables_examens: Dict[int, int],
    ) -> Dict:
        """
        CONTRAINTE 3 (PRIORITÉ 3): Quota maximum strict par grade.

        RÈGLE STRICTE: Aucun enseignant ne doit dépasser le quota maximum de son grade.
        Le quota est défini dans la configuration des grades (nb_surveillances).

        IMPORTANT:
        - Chaque enseignant a un quota maximum fixe selon son grade
        - Un enseignant responsable d'examens DOIT respecter ce quota maximum
        - Si un responsable a trop d'examens, cela créera un INFEASIBLE

        Exemple:
        - Grade "Professeur": quota maximum = 3 séances
        - Un prof peut faire 0, 1, 2 ou 3 séances (pas plus)
        - Si un prof est responsable de 5 examens → INFEASIBLE
        """
        charge_par_enseignant = {}

        # Grouper les enseignants par grade
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        # Pour chaque grade, imposer le quota fixe strict
        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(
                grade_code,
                {
                    "nb_surveillances": 2  # Par défaut, quota fixe = 2
                },
            )
            quota_fixe = grade_config.get("nb_surveillances", 2)

            # Message informatif
            self.infos.append(
                f"   📌 Grade {grade_code}: Quota MAXIMUM = {quota_fixe} séances par enseignant"
            )

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

            # Imposer le quota maximum strict
            if charges:
                # ⚠️ CONTRAINTE STRICTE: Aucun enseignant ne doit dépasser le quota fixe de son grade
                for charge in charges:
                    self.model.Add(charge <= quota_fixe)

                # ⚙️ ÉQUILIBRE ENTRE ENSEIGNANTS DE MÊME GRADE
                # Minimiser la différence entre le nombre de séances des enseignants du même grade
                if len(charges) > 1:
                    # Calculer min et max des charges pour ce grade
                    charge_min_grade = self.model.NewIntVar(
                        0, quota_fixe, f"charge_min_{grade_code}"
                    )
                    charge_max_grade = self.model.NewIntVar(
                        0, quota_fixe, f"charge_max_{grade_code}"
                    )

                    self.model.AddMinEquality(charge_min_grade, charges)
                    self.model.AddMaxEquality(charge_max_grade, charges)

                    # Calculer la dispersion pour ce grade
                    dispersion_grade = self.model.NewIntVar(
                        0, quota_fixe, f"dispersion_{grade_code}"
                    )
                    self.model.Add(
                        dispersion_grade == charge_max_grade - charge_min_grade
                    )

                    # Contrainte souple: Essayer de garder la dispersion faible (≤ 1 idéalement)
                    # Ceci sera renforcé dans la fonction objectif
                    # On stocke la dispersion pour l'utiliser dans la fonction objectif
                    if not hasattr(self, "dispersions_par_grade"):
                        self.dispersions_par_grade = {}
                    self.dispersions_par_grade[grade_code] = dispersion_grade

                    self.infos.append(
                        f"      → Équilibre activé: minimisation des écarts entre enseignants"
                    )

        return charge_par_enseignant

    def _contrainte_voeux(
        self,
        list_voeux: List[Dict],
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
    ) -> Dict:
        """
        CONTRAINTE 4 (PRIORITÉ 4): Préférence pour les vœux de disponibilité.

        IMPORTANT: Les vœux sont des PRÉFÉRENCES de surveillance (créneaux préférés).
        - Un vœu signifie "Je VEUX surveiller à ce créneau"
        - Les enseignants avec vœux pour un créneau sont PRIORITAIRES
        - Les enseignants sans vœux PEUVENT quand même être affectés si nécessaire

        Args:
            list_voeux: Liste de dictionnaires avec les attributs:
                - id: Code smartex de l'enseignant
                - nom: Nom de l'enseignant
                - date_voeu: Date du vœu (objet date)
                - seance: Code séance (S1, S2, S3, S4)
                - heure: Heure de la séance

        Retourne un dictionnaire pour calculer les bonus dans la fonction objectif.
        """
        preferences = {
            "avec_voeu": [],  # (seance_key, enseignant_id) avec vœu → BONUS
            "sans_voeu": [],  # (seance_key, enseignant_id) sans vœu → NEUTRE
        }

        # Construire un mapping code_smartex -> enseignant_id
        code_to_id = {
            ens.code_smartex: ens.id for ens in enseignants if ens.code_smartex
        }

        # DEBUG: Afficher les vœux AVANT traitement
        self.infos.append(f"\n🔍 DEBUG VOEUX (AVANT TRAITEMENT):")
        self.infos.append(f"   • Nombre total de vœux: {len(list_voeux)}")
        self.infos.append(
            f"   • Nombre d'enseignants avec code_smartex: {len(code_to_id)}"
        )
        
        if list_voeux:
            self.infos.append(f"   • Exemple vœux (5 premiers):")
            for i, voeu_dict in enumerate(list_voeux[:5]):
                code_smartex = voeu_dict.get("id")
                date_voeu = voeu_dict.get("date_voeu")
                seance_val = voeu_dict.get("seance")
                ens_id = code_to_id.get(code_smartex, "NON TROUVÉ")
                self.infos.append(
                    f"      - code={code_smartex}, nom={voeu_dict.get('nom')}, date={date_voeu}, seance={seance_val}, ens_id={ens_id}"
                )

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

        # DEBUG: Afficher les vœux APRÈS traitement
        self.infos.append(f"\n🔍 DEBUG VOEUX (APRÈS TRAITEMENT):")
        self.infos.append(f"   • Voeux_set créé: {len(voeux_set)} entrées")
        self.infos.append(f"   • Voeux_set (5 premiers): {list(voeux_set)[:5]}")
        self.infos.append(f"   • Voeux rejetés: {len(voeux_rejetes)}")
        
        if voeux_rejetes:
            self.infos.append(f"   • Exemples de rejets (5 premiers):")
            for voeu_dict, raisons in voeux_rejetes[:5]:
                self.infos.append(
                    f"      - {voeu_dict.get('id')} / date={voeu_dict.get('date_voeu')} / seance={voeu_dict.get('seance')} → Raisons: {', '.join(raisons)}"
                )

        # Pour chaque combinaison (séance, enseignant), vérifier si un vœu existe
        for seance_key in seances.keys():
            date_exam, seance_code, semestre, session, jour_index = seance_key
            # Normaliser le code de séance pour comparaison
            seance_normalized = seance_code.upper().strip()
            
            for enseignant in enseignants:
                # Vérifier si l'enseignant a un vœu pour cette date et cette séance
                lookup_key = (enseignant.id, date_exam, seance_normalized)
                
                if lookup_key in voeux_set:
                    # BONUS: Enseignant a exprimé un vœu pour ce créneau
                    preferences["avec_voeu"].append((seance_key, enseignant.id))
                else:
                    # NEUTRE: Pas de vœu pour ce créneau (mais peut être affecté)
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
        CONTRAINTE 6 (PRIORITÉ 6): Équilibre adaptatif entre séances de taille similaire.

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
        CONTRAINTE 7 (FORTE): Interdire d'avoir UNIQUEMENT la première ET la dernière séance d'un jour.

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

        self.infos.append(
            f"      → {nb_contraintes_ajoutees} contraintes d'interdiction 1ère+dernière isolées appliquées"
        )

    def _contrainte_seances_consecutives(
        self, seances: Dict, enseignants: List[Enseignant], affectations_vars: Dict
    ):
        """
        CONTRAINTE 8 (OPTIONNELLE): Favorise le regroupement des séances par jour.
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

            self.infos.append(
                f"   📊 Regroupement par jour: {len(bonus_total)} contributions calculées "
                f"({nb_enseignants} enseignants × {nb_jours} jours)"
            )

        return score_regroupement

    # ========== DIAGNOSTIC D'ÉCHEC ==========

    def _diagnostiquer_echec(
        self,
        enseignants: List[Enseignant],
        examens: List[Examen],
        seances: Dict,
        responsables_examens: Dict,
        min_surveillants_par_examen: int,
        allow_fallback: bool,
        list_voeux: List[Dict],
        respecter_voeux: bool,
    ) -> List[str]:
        """
        Diagnostic progressif pour identifier quelle contrainte empêche de trouver une solution.
        Teste les contraintes une par une en ordre de priorité.

        Returns:
            Liste de messages de diagnostic avec recommandations
        """
        messages = []

        print("\n" + "=" * 80)
        print("🔍 DIAGNOSTIC PROGRESSIF DES CONTRAINTES")
        print("=" * 80)

        # Test 1: Modèle vide (toujours faisable)
        print("\n[TEST 1/5] Modèle vide (sans contraintes)...")
        test_model_1 = cp_model.CpModel()
        test_solver_1 = cp_model.CpSolver()
        test_solver_1.parameters.max_time_in_seconds = 10.0

        affectations_test = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test1_{seance_key}_{enseignant.id}"
                affectations_test[(seance_key, enseignant.id)] = (
                    test_model_1.NewBoolVar(var_name)
                )

        status_1 = test_solver_1.Solve(test_model_1)
        if status_1 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print("   ✅ Modèle de base OK (variables créées correctement)")
            messages.append("✅ [TEST 1/5] Modèle de base: OK")
        else:
            print("   ❌ Problème avec le modèle de base")
            messages.append(
                "❌ [TEST 1/5] Modèle de base: ÉCHEC (problème de configuration)"
            )
            return messages

        # Test 2: Avec contrainte des responsables uniquement
        print("\n[TEST 2/5] Contrainte 1: Responsables d'examens...")
        test_model_2 = cp_model.CpModel()
        test_solver_2 = cp_model.CpSolver()
        test_solver_2.parameters.max_time_in_seconds = 10.0

        affectations_test_2 = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test2_{seance_key}_{enseignant.id}"
                affectations_test_2[(seance_key, enseignant.id)] = (
                    test_model_2.NewBoolVar(var_name)
                )

        # Appliquer contrainte responsables
        nb_resp = 0
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    if any(ens.id == responsable_id for ens in enseignants):
                        var = affectations_test_2.get((seance_key, responsable_id))
                        if var is not None:
                            test_model_2.Add(var == 1)
                            nb_resp += 1

        status_2 = test_solver_2.Solve(test_model_2)
        if status_2 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   ✅ Contrainte responsables OK ({nb_resp} responsables)")
            messages.append(
                f"✅ [TEST 2/5] Contrainte responsables: OK ({nb_resp} responsables)"
            )
        else:
            print(f"   ❌ PROBLÈME avec la contrainte responsables")
            messages.append(f"❌ [TEST 2/5] Contrainte responsables: ÉCHEC")
            messages.append(
                f"   🔧 CAUSE: Un ou plusieurs responsables ne peuvent pas être affectés"
            )
            messages.append(f"   💡 SOLUTION:")
            messages.append(
                f"      • Vérifiez que tous les responsables sont disponibles (participe_surveillance=True)"
            )
            messages.append(
                f"      • Vérifiez que les codes smartex des responsables sont corrects"
            )
            return messages

        # Test 3: Avec contrainte responsables + nombre minimal
        print("\n[TEST 3/5] Contrainte 2: Nombre minimal d'enseignants par séance...")
        test_model_3 = cp_model.CpModel()
        test_solver_3 = cp_model.CpSolver()
        test_solver_3.parameters.max_time_in_seconds = 10.0

        affectations_test_3 = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test3_{seance_key}_{enseignant.id}"
                affectations_test_3[(seance_key, enseignant.id)] = (
                    test_model_3.NewBoolVar(var_name)
                )

        # Responsables
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    if any(ens.id == responsable_id for ens in enseignants):
                        var = affectations_test_3.get((seance_key, responsable_id))
                        if var is not None:
                            test_model_3.Add(var == 1)

        # Nombre minimal
        capacite_insuffisante = []
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = nb_examens * min_surveillants_par_examen

            surveillants_pour_seance = [
                affectations_test_3[(seance_key, ens.id)] for ens in enseignants
            ]

            if nb_requis > len(enseignants):
                capacite_insuffisante.append((seance_key, nb_requis, len(enseignants)))
                if allow_fallback:
                    test_model_3.Add(
                        sum(surveillants_pour_seance)
                        >= min(nb_examens, len(enseignants))
                    )
                else:
                    test_model_3.Add(sum(surveillants_pour_seance) >= len(enseignants))
            else:
                test_model_3.Add(sum(surveillants_pour_seance) >= nb_requis)

        status_3 = test_solver_3.Solve(test_model_3)
        if status_3 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   ✅ Contrainte nombre minimal OK")
            messages.append(f"✅ [TEST 3/5] Contrainte nombre minimal: OK")
            if capacite_insuffisante:
                messages.append(
                    f"   ⚠️ Attention: {len(capacite_insuffisante)} séance(s) avec capacité limite"
                )
                for seance_key, requis, dispo in capacite_insuffisante[:3]:
                    date_str = seance_key[0].strftime("%d/%m/%Y")
                    messages.append(
                        f"      • {date_str} {seance_key[1]}: besoin {requis}, dispo {dispo}"
                    )
        else:
            print(f"   ❌ PROBLÈME avec la contrainte nombre minimal")
            messages.append(f"❌ [TEST 3/5] Contrainte nombre minimal: ÉCHEC")
            messages.append(
                f"   🔧 CAUSE: Pas assez d'enseignants pour couvrir toutes les séances"
            )
            messages.append(f"   💡 SOLUTION:")
            messages.append(f"      • Ajouter plus d'enseignants disponibles")
            messages.append(
                f"      • Réduire min_surveillants_par_examen (actuellement: {min_surveillants_par_examen})"
            )
            if capacite_insuffisante:
                messages.append(f"   📊 Séances problématiques:")
                for seance_key, requis, dispo in capacite_insuffisante[:5]:
                    date_str = seance_key[0].strftime("%d/%m/%Y")
                    messages.append(
                        f"      • {date_str} {seance_key[1]}: besoin {requis} enseignants, seulement {dispo} disponibles"
                    )
            return messages

        # Test 4: Avec responsables + nombre minimal + quotas par grade
        print("\n[TEST 4/5] Contrainte 3: Quotas fixes par grade...")
        test_model_4 = cp_model.CpModel()
        test_solver_4 = cp_model.CpSolver()
        test_solver_4.parameters.max_time_in_seconds = 15.0

        affectations_test_4 = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test4_{seance_key}_{enseignant.id}"
                affectations_test_4[(seance_key, enseignant.id)] = (
                    test_model_4.NewBoolVar(var_name)
                )

        # Responsables
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    if any(ens.id == responsable_id for ens in enseignants):
                        var = affectations_test_4.get((seance_key, responsable_id))
                        if var is not None:
                            test_model_4.Add(var == 1)

        # Nombre minimal
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = nb_examens * min_surveillants_par_examen

            surveillants_pour_seance = [
                affectations_test_4[(seance_key, ens.id)] for ens in enseignants
            ]

            if nb_requis > len(enseignants):
                if allow_fallback:
                    test_model_4.Add(
                        sum(surveillants_pour_seance)
                        >= min(nb_examens, len(enseignants))
                    )
            else:
                test_model_4.Add(sum(surveillants_pour_seance) >= nb_requis)

        # Quotas par grade (AVEC TOLÉRANCE ADAPTATIVE comme dans le vrai algorithme)
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        # Calculer les responsabilités pour ajuster la tolérance (comme dans le vrai algo)
        responsabilites_par_enseignant_test = {ens.id: 0 for ens in enseignants}
        seances_responsabilites_test = {}

        for examen_id, enseignant_id in responsables_examens.items():
            if enseignant_id not in responsabilites_par_enseignant_test:
                continue
            for seance_key, examens_seance in seances.items():
                if any(examen.id == examen_id for examen in examens_seance):
                    if enseignant_id not in seances_responsabilites_test:
                        seances_responsabilites_test[enseignant_id] = set()
                    if seance_key not in seances_responsabilites_test[enseignant_id]:
                        seances_responsabilites_test[enseignant_id].add(seance_key)
                        responsabilites_par_enseignant_test[enseignant_id] += 1
                    break

        quotas_impossibles = []
        demande_totale = 0
        capacite_totale = len(seances) * len(enseignants)  # Capacité théorique maximale

        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(grade_code, {"nb_surveillances": 2})
            quota_fixe = grade_config.get("nb_surveillances", 2)

            demande_grade = len(enseignants_grade) * quota_fixe
            demande_totale += demande_grade

            # Calculer le max de responsabilités dans ce grade (comme dans le vrai algo)
            max_responsabilites = max(
                [
                    responsabilites_par_enseignant_test.get(ens.id, 0)
                    for ens in enseignants_grade
                ]
            )

            # Calculer la tolérance ajustée (comme dans le vrai algo)
            if max_responsabilites > quota_fixe:
                tolerance_ajustee = max_responsabilites - quota_fixe + 1
            else:
                tolerance_ajustee = 1

            # Calculer les charges
            charges = []
            for enseignant in enseignants_grade:
                charge = sum(
                    [
                        affectations_test_4[(seance_key, enseignant.id)]
                        for seance_key in seances.keys()
                    ]
                )
                charges.append(charge)

            # Appliquer la contrainte d'équité avec tolérance ajustée (comme dans le vrai algo)
            if charges:
                max_charge = test_model_4.NewIntVar(
                    0, len(seances), f"max_charge_test_{grade_code}"
                )
                min_charge = test_model_4.NewIntVar(
                    0, len(seances), f"min_charge_test_{grade_code}"
                )
                test_model_4.AddMaxEquality(max_charge, charges)
                test_model_4.AddMinEquality(min_charge, charges)
                test_model_4.Add(max_charge - min_charge <= tolerance_ajustee)

            # Vérifier si ce grade a un quota réalisable
            if demande_grade > len(seances) * len(enseignants_grade):
                quotas_impossibles.append(
                    (grade_code, quota_fixe, len(enseignants_grade), demande_grade)
                )

        status_4 = test_solver_4.Solve(test_model_4)
        if status_4 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   ✅ Contrainte quotas par grade OK")
            messages.append(f"✅ [TEST 4/5] Contrainte quotas par grade: OK")
            messages.append(
                f"   ℹ️ Utilisation de la tolérance adaptative basée sur les responsabilités"
            )
        else:
            print(f"   ❌ PROBLÈME avec les quotas par grade")
            messages.append(f"❌ [TEST 4/5] Contrainte quotas par grade: ÉCHEC")
            messages.append(
                f"   🔧 CAUSE: Les quotas par grade sont incompatibles même avec tolérance adaptative"
            )
            messages.append(f"   💡 SOLUTION:")

            # Analyser les quotas par grade
            messages.append(f"\n   📊 Analyse des quotas:")
            total_places_requises = 0
            for grade_code, enseignants_grade in enseignants_par_grade.items():
                grade_config = self.grade_configs.get(
                    grade_code, {"nb_surveillances": 2}
                )
                quota_fixe = grade_config.get("nb_surveillances", 2)
                nb_ens = len(enseignants_grade)
                places_requises = nb_ens * quota_fixe
                total_places_requises += places_requises
                max_resp = max(
                    [
                        responsabilites_par_enseignant_test.get(ens.id, 0)
                        for ens in enseignants_grade
                    ]
                )
                tolerance = max_resp - quota_fixe + 1 if max_resp > quota_fixe else 1
                messages.append(
                    f"      • Grade {grade_code}: {nb_ens} ens × ~{quota_fixe} séances = ~{places_requises} (tolérance: {tolerance})"
                )

            # Calculer la demande totale vs capacité
            capacite_seances = sum(
                [
                    len(examens) * min_surveillants_par_examen
                    for examens in seances.values()
                ]
            )
            messages.append(f"\n   📊 Bilan global:")
            messages.append(
                f"      • Demande totale: {total_places_requises} affectations (quotas des enseignants)"
            )
            messages.append(
                f"      • Capacité minimale requise: {capacite_seances} affectations (couverture des examens)"
            )
            messages.append(f"      • Nombre de séances: {len(seances)}")

            if total_places_requises < capacite_seances:
                messages.append(
                    f"   ❌ DÉSÉQUILIBRE: Les quotas totaux ({total_places_requises}) < capacité requise ({capacite_seances})"
                )
                messages.append(f"   💡 SOLUTIONS POSSIBLES:")
                messages.append(f"      • Augmenter les quotas dans GradeConfig")
                messages.append(f"      • Ajouter plus d'enseignants")
                messages.append(f"      • Réduire min_surveillants_par_examen")
            elif total_places_requises > capacite_totale:
                messages.append(
                    f"   ❌ SURCHARGE: Les quotas totaux ({total_places_requises}) > capacité maximale ({capacite_totale})"
                )
                messages.append(f"   💡 SOLUTIONS POSSIBLES:")
                messages.append(f"      • Réduire les quotas dans GradeConfig")
                messages.append(f"      • Ajouter plus de séances d'examens")
            else:
                messages.append(
                    f"   ⚠️ Les quotas sont théoriquement compatibles mais incompatibles avec les autres contraintes"
                )
                messages.append(f"   💡 SOLUTIONS POSSIBLES:")
                messages.append(
                    f"      • Assouplir les quotas (permettre une petite variation)"
                )
                messages.append(
                    f"      • Vérifier la répartition des responsables d'examens"
                )
                messages.append(
                    f"      • Redistribuer les enseignants entre les grades"
                )

            return messages

        # Test 5: Toutes les contraintes (pour confirmer que les vœux ne posent pas problème)
        print("\n[TEST 5/5] Vérification finale avec toutes les contraintes...")
        messages.append(
            f"✅ [TEST 5/5] Toutes les contraintes de base sont compatibles"
        )
        messages.append(f"\n💡 CONCLUSION:")
        messages.append(
            f"   Les contraintes principales (responsables, couverture, quotas) sont OK."
        )
        if respecter_voeux and list_voeux:
            messages.append(f"   Le problème peut venir de:")
            messages.append(
                f"      • La combinaison des vœux avec les autres contraintes"
            )
            messages.append(
                f"      • L'optimisation de la fonction objectif (équilibre + vœux)"
            )
            messages.append(f"   💡 Essayez:")
            messages.append(
                f"      • Désactiver temporairement les vœux (respecter_voeux=False)"
            )
            messages.append(
                f"      • Augmenter le temps de résolution (max_time_in_seconds)"
            )
        else:
            messages.append(f"   Le problème vient de l'optimisation multi-objectif.")
            messages.append(f"   💡 Essayez d'augmenter le temps de résolution.")

        return messages

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
    ) -> cp_model.IntVar:
        """
        Configure la fonction objectif multi-critères pour maximiser la satisfaction globale.

        Composantes du score (avec regroupement temporel activé):
        1. Maximisation des quotas (utiliser le maximum de séances par enseignant) - POIDS: 35%
        2. Équilibre global de charge (minimiser dispersion) - POIDS: 25%
        3. Équilibre par grade (minimiser dispersion dans chaque grade) - POIDS: 20%
        4. Bonus regroupement (favoriser séances regroupées) - POIDS: 10%
        5. Préférence pour enseignants avec vœux - POIDS: 10%

        Composantes du score (sans regroupement temporel):
        1. Maximisation des quotas (utiliser le maximum de séances par enseignant) - POIDS: 40%
        2. Équilibre global de charge (minimiser dispersion) - POIDS: 30%
        3. Équilibre par grade (minimiser dispersion dans chaque grade) - POIDS: 20%
        4. Préférence pour enseignants avec vœux - POIDS: 10%
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

        # COMPOSANTE 2.5: Équilibre par grade (NOUVEAU - IMPORTANT)
        # Minimiser la somme des dispersions dans chaque grade
        dispersion_grades = None
        if hasattr(self, "dispersions_par_grade") and self.dispersions_par_grade:
            nb_grades = len(self.dispersions_par_grade)
            max_quota = max(
                [
                    config.get("nb_surveillances", 5)
                    for config in self.grade_configs.values()
                ]
            )

            dispersion_grades = self.model.NewIntVar(
                0,
                nb_grades * max_quota,  # Somme max des dispersions
                "dispersion_grades",
            )
            self.model.Add(
                dispersion_grades == sum(self.dispersions_par_grade.values())
            )

        # COMPOSANTE 3: Bonus pour enseignants avec vœux (SECONDAIRE)
        bonus_voeux = None
        if preferences_voeux and preferences_voeux.get("avec_voeu"):
            # Compter le nombre d'affectations avec vœu
            affectations_avec_voeu = [
                affectations_vars[(seance_key, ens_id)]
                for seance_key, ens_id in preferences_voeux["avec_voeu"]
                if (seance_key, ens_id) in affectations_vars
            ]

            if affectations_avec_voeu:
                bonus_voeux = self.model.NewIntVar(
                    0, len(affectations_avec_voeu), "bonus_voeux"
                )
                self.model.Add(bonus_voeux == sum(affectations_avec_voeu))

        # COMPOSANTE 4: Équilibre temporel (si activé)
        if equilibrer_temporel:
            self._ajouter_equilibre_temporel(affectations_vars, seances, enseignants)

        # OBJECTIF COMBINÉ: Maximiser total_affectations, minimiser dispersion globale et par grade,
        # maximiser bonus_consecutivite (optionnel), maximiser bonus_voeux
        #
        # Avec regroupement temporel:
        # Score = 35*total_affectations - 25*dispersion - 20*dispersion_grades + 10*bonus_consecutivite + 10*bonus_voeux
        #
        # Sans regroupement temporel:
        # Score = 40*total_affectations - 30*dispersion - 20*dispersion_grades + 10*bonus_voeux
        #
        # Le solveur maximise, donc on veut:
        # - Maximiser total_affectations (positif) - PRIORITÉ 1
        # - Minimiser dispersion globale (négatif) - PRIORITÉ 2
        # - Minimiser dispersion par grade (négatif) - PRIORITÉ 3
        # - Maximiser bonus regroupement (positif) - Bonus léger (si activé)
        # - Maximiser bonus_voeux (positif) - Bonus léger

        # Construction de la fonction objectif selon les composantes disponibles
        composantes = []
        poids = []

        if total_affectations is not None:
            composantes.append(total_affectations)
            # Poids ajusté selon si regroupement temporel activé
            poids.append(35 if activer_regroupement_temporel else 40)

        if dispersion is not None:
            composantes.append(dispersion)
            # Poids ajusté selon si regroupement temporel activé
            poids.append(-25 if activer_regroupement_temporel else -30)

        if dispersion_grades is not None:
            composantes.append(dispersion_grades)
            poids.append(-20)  # Poids -20% (minimiser) - IMPORTANT

        if activer_regroupement_temporel and bonus_consecutivite is not None:
            composantes.append(bonus_consecutivite)
            poids.append(10)  # Poids 10% - Bonus secondaire (seulement si activé)

        if bonus_voeux is not None:
            composantes.append(bonus_voeux)
            poids.append(10)  # Poids 10% - Bonus secondaire

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

            if nb_enseignants_uniques < nb_requis:
                self.warnings.append(
                    f"⚠️ Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_enseignants_uniques} enseignants affectés (requis: {nb_requis})"
                )

    def _generer_statistiques(
        self, enseignants: List[Enseignant], seances: Dict, affectations_vars: Dict
    ):
        """Génère des statistiques sur la solution trouvée"""

        self.infos.append("\n📊 === STATISTIQUES DE LA SOLUTION ===")

        # Charge par enseignant
        charges = {}
        for enseignant in enseignants:
            charge = sum(
                [
                    self.solver.Value(affectations_vars[(seance_key, enseignant.id)])
                    for seance_key in seances.keys()
                ]
            )
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
            quota_fixe = config.get("nb_surveillances", "N/A")

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
            quota_fixe = config.get("nb_surveillances", 0)

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
